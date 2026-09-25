"use client";

import React, { useState, useEffect, useMemo, useCallback } from "react";
import { Shell } from "@/components/layout/Shell";
import { useAuth } from "@/components/providers/AuthProvider";
import { createClient } from "@/lib/supabase/client";
import {
  Trash2,
  RotateCcw,
  AlertTriangle,
  Search,
  Check,
  AlertCircle,
  Clock,
  User,
  Layers,
  FileCheck,
  UserX
} from "lucide-react";
import { cn } from "@/lib/utils";

interface TrashRow {
  id: string;
  company_id: string;
  type: string;
  key: string | null;
  label: string | null;
  details: string | null;
  payload: any;
  reason: string | null;
  deleted_by: string | null;
  deleted_at: string;
  deleter?: {
    full_name: string | null;
  };
}

export default function TrashPage() {
  const { company, profile, setSyncing } = useAuth();
  const [trashItems, setTrashItems] = useState<TrashRow[]>([]);
  const [selectedChip, setSelectedChip] = useState<"All" | "Candidate" | "Offer" | "Master">("All");
  const [searchQuery, setSearchQuery] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [actionInProgress, setActionInProgress] = useState<string | null>(null);

  const supabase = createClient();

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3500);
  };

  const showError = (msg: string) => {
    setErrorMessage(msg);
    setTimeout(() => setErrorMessage(null), 4000);
  };

  const fetchTrash = useCallback(async () => {
    if (!company?.id) return;
    try {
      setIsLoading(true);
      const { data, error } = await supabase
        .from("trash")
        .select("*, deleter:profiles!trash_deleted_by_fkey(full_name)")
        .eq("company_id", company.id)
        .order("deleted_at", { ascending: false });

      if (error) throw error;
      setTrashItems((data as any) || []);
    } catch (err: any) {
      showError(err.message || "Failed to load trash");
    } finally {
      setIsLoading(false);
    }
  }, [company?.id, supabase]);

  useEffect(() => {
    fetchTrash();

    if (!company?.id) return;
    const channel = supabase
      .channel("trash-realtime")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "trash", filter: `company_id=eq.${company.id}` },
        () => fetchTrash()
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [company?.id, fetchTrash, supabase]);

  // Filtered trash items
  const filteredItems = useMemo(() => {
    return trashItems.filter((item) => {
      const matchType = selectedChip === "All" || item.type.toLowerCase() === selectedChip.toLowerCase();
      const q = searchQuery.toLowerCase().trim();
      const matchSearch =
        !q ||
        (item.label && item.label.toLowerCase().includes(q)) ||
        (item.details && item.details.toLowerCase().includes(q)) ||
        (item.reason && item.reason.toLowerCase().includes(q));
      return matchType && matchSearch;
    });
  }, [trashItems, selectedChip, searchQuery]);

  // Counts by category
  const counts = useMemo(() => {
    return {
      All: trashItems.length,
      Candidate: trashItems.filter((i) => i.type.toLowerCase() === "candidate").length,
      Offer: trashItems.filter((i) => i.type.toLowerCase() === "offer").length,
      Master: trashItems.filter((i) => i.type.toLowerCase() === "master").length,
    };
  }, [trashItems]);

  // Restore item
  const handleRestore = async (item: TrashRow) => {
    try {
      setActionInProgress(item.id);
      setSyncing(true);

      const payload = item.payload;

      if (item.type.toLowerCase() === "master") {
        // Check if it's a responsibility
        if (payload.designation && payload.text) {
          await supabase.from("responsibilities").insert(payload);
        } else if (payload.key && payload.title && payload.text) {
          // Letter text
          await supabase.from("letter_texts").upsert(payload, { onConflict: "company_id,key" });
        } else {
          // Standard master
          await supabase.from("masters").insert(payload);
        }
      } else if (item.type.toLowerCase() === "candidate") {
        // Restore candidate row
        await supabase.from("candidates").insert(payload);
      } else if (item.type.toLowerCase() === "offer") {
        // Restore offer row
        await supabase.from("offers").insert(payload);
      }

      // Remove from trash
      const { error: delErr } = await supabase.from("trash").delete().eq("id", item.id);
      if (delErr) throw delErr;

      setTrashItems((prev) => prev.filter((i) => i.id !== item.id));
      showToast(`Restored "${item.label || item.type}" successfully`);
    } catch (err: any) {
      showError(err.message || "Failed to restore item");
    } finally {
      setActionInProgress(null);
      setSyncing(false);
    }
  };

  // Delete forever
  const handleDeleteForever = async (item: TrashRow) => {
    if (!confirm(`Permanently delete "${item.label || item.type}"? This cannot be undone.`)) {
      return;
    }

    try {
      setActionInProgress(item.id);
      setSyncing(true);

      // If candidate has resume in storage, remove it
      if (item.type.toLowerCase() === "candidate" && item.payload?.resume_path) {
        await supabase.storage.from("resumes").remove([item.payload.resume_path]);
      }

      // If offer has pdf in storage, remove it
      if (item.type.toLowerCase() === "offer" && item.payload?.pdf_path) {
        await supabase.storage.from("offers").remove([item.payload.pdf_path]);
      }

      const { error } = await supabase.from("trash").delete().eq("id", item.id);
      if (error) throw error;

      setTrashItems((prev) => prev.filter((i) => i.id !== item.id));
      showToast("Item permanently deleted");
    } catch (err: any) {
      showError(err.message || "Failed to permanently delete item");
    } finally {
      setActionInProgress(null);
      setSyncing(false);
    }
  };

  // Empty trash
  const handleEmptyTrash = async () => {
    if (!trashItems.length) return;
    if (
      !confirm(
        `Are you absolutely sure you want to permanently delete all ${trashItems.length} items from Trash? This cannot be undone.`
      )
    ) {
      return;
    }

    try {
      setSyncing(true);
      const { error } = await supabase.from("trash").delete().eq("company_id", company!.id);
      if (error) throw error;

      setTrashItems([]);
      showToast("Trash has been emptied");
    } catch (err: any) {
      showError(err.message || "Failed to empty trash");
    } finally {
      setSyncing(false);
    }
  };

  return (
    <Shell>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2.5">
              <div className="w-9 h-9 rounded-xl bg-red-600 text-white flex items-center justify-center shadow-sm">
                <Trash2 className="w-5 h-5" />
              </div>
              <h1 className="text-2xl font-bold text-[#0A2E5A] tracking-tight">Trash</h1>
            </div>
            <p className="text-xs text-gray-500 mt-1">
              Items remain in trash until restored or permanently deleted. Associated files are purged on permanent deletion.
            </p>
          </div>

          {trashItems.length > 0 && (
            <button
              onClick={handleEmptyTrash}
              className="flex items-center gap-1.5 px-3.5 py-2 bg-red-600 hover:bg-red-700 text-white text-xs font-bold rounded-xl shadow-sm transition-all shrink-0"
            >
              <AlertTriangle className="w-4 h-4" />
              <span>Empty trash</span>
            </button>
          )}
        </div>

        {/* Alerts */}
        {toastMessage && (
          <div className="p-3.5 bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs rounded-xl flex items-center gap-2 shadow-sm animate-in fade-in">
            <Check className="w-4 h-4 text-emerald-600 shrink-0" />
            <span>{toastMessage}</span>
          </div>
        )}
        {errorMessage && (
          <div className="p-3.5 bg-red-50 border border-red-200 text-red-800 text-xs rounded-xl flex items-center gap-2 shadow-sm animate-in fade-in">
            <AlertCircle className="w-4 h-4 text-red-600 shrink-0" />
            <span>{errorMessage}</span>
          </div>
        )}

        {/* Filter Chips & Search Bar */}
        <div className="bg-white rounded-2xl p-4 shadow-sm border border-gray-100 flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar">
            {(["All", "Candidate", "Offer", "Master"] as const).map((chip) => {
              const count = counts[chip];
              const isActive = selectedChip === chip;
              return (
                <button
                  key={chip}
                  onClick={() => setSelectedChip(chip)}
                  className={cn(
                    "flex items-center gap-2 px-3.5 py-1.5 rounded-xl text-xs font-semibold whitespace-nowrap transition-all",
                    isActive
                      ? "bg-[#0A2E5A] text-white shadow-sm"
                      : "bg-gray-50 text-gray-600 hover:bg-gray-100"
                  )}
                >
                  <span>{chip === "All" ? "All items" : `${chip}s`}</span>
                  <span
                    className={cn(
                      "px-1.5 py-0.2 rounded-full text-[10px] font-bold",
                      isActive ? "bg-white/20 text-white" : "bg-gray-200 text-gray-700"
                    )}
                  >
                    {count}
                  </span>
                </button>
              );
            })}
          </div>

          <div className="relative w-full md:w-64">
            <Search className="w-4 h-4 text-gray-400 absolute left-3 top-2.5" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search in trash..."
              className="w-full pl-9 pr-3.5 py-1.5 bg-gray-50 border border-gray-200 rounded-xl text-xs focus:ring-2 focus:ring-[#F5741A] focus:bg-white"
            />
          </div>
        </div>

        {/* Trash Items List */}
        <div className="space-y-3">
          {isLoading ? (
            <div className="py-16 text-center text-xs text-gray-400">Loading trash items...</div>
          ) : filteredItems.length === 0 ? (
            <div className="bg-white rounded-2xl p-12 text-center border border-gray-100 shadow-sm space-y-2">
              <div className="w-12 h-12 rounded-full bg-emerald-50 text-emerald-600 flex items-center justify-center mx-auto">
                <Check className="w-6 h-6" />
              </div>
              <h3 className="text-sm font-bold text-gray-900">Trash is clean</h3>
              <p className="text-xs text-gray-500">No deleted items match your active filters.</p>
            </div>
          ) : (
            filteredItems.map((item) => {
              const isCandidate = item.type.toLowerCase() === "candidate";
              const isOffer = item.type.toLowerCase() === "offer";
              const isMaster = item.type.toLowerCase() === "master";

              const badgeColor = isCandidate
                ? "bg-blue-50 text-[#1B8BD8] border-blue-200"
                : isOffer
                ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                : "bg-purple-50 text-purple-700 border-purple-200";

              const Icon = isCandidate ? UserX : isOffer ? FileCheck : Layers;
              const isBusy = actionInProgress === item.id;

              return (
                <div
                  key={item.id}
                  className="bg-white rounded-2xl p-5 shadow-sm border border-gray-100 flex flex-col md:flex-row md:items-center justify-between gap-4 hover:shadow-md transition-shadow"
                >
                  <div className="flex items-start gap-3.5 flex-1 min-w-0">
                    <div className="w-9 h-9 rounded-xl bg-gray-50 border border-gray-200 flex items-center justify-center text-gray-600 shrink-0 mt-0.5">
                      <Icon className="w-4 h-4" />
                    </div>

                    <div className="space-y-1 flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span
                          className={cn(
                            "px-2 py-0.5 rounded-full text-[10px] font-bold border uppercase tracking-wider",
                            badgeColor
                          )}
                        >
                          {item.type}
                        </span>
                        <h4 className="text-xs font-bold text-gray-900 truncate">
                          {item.label || "Untitled item"}
                        </h4>
                      </div>

                      {item.details && (
                        <p className="text-xs text-gray-600 leading-relaxed line-clamp-2">
                          {item.details}
                        </p>
                      )}

                      <div className="flex items-center gap-3 text-[11px] text-gray-400 flex-wrap pt-1">
                        <div className="flex items-center gap-1">
                          <Clock className="w-3 h-3" />
                          <span>
                            Deleted {new Date(item.deleted_at).toLocaleString("en-IN", {
                              day: "numeric",
                              month: "short",
                              year: "numeric",
                              hour: "2-digit",
                              minute: "2-digit",
                            })}
                          </span>
                        </div>

                        {item.deleter?.full_name && (
                          <div className="flex items-center gap-1">
                            <User className="w-3 h-3" />
                            <span>by {item.deleter.full_name}</span>
                          </div>
                        )}

                        {item.reason && (
                          <span className="italic text-gray-500">Reason: {item.reason}</span>
                        )}
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 shrink-0 border-t md:border-t-0 pt-3 md:pt-0">
                    <button
                      disabled={isBusy}
                      onClick={() => handleRestore(item)}
                      className="flex-1 md:flex-initial flex items-center justify-center gap-1.5 px-3.5 py-2 bg-emerald-50 hover:bg-emerald-100 text-emerald-800 text-xs font-bold rounded-xl border border-emerald-200 transition-colors"
                    >
                      <RotateCcw className="w-3.5 h-3.5" />
                      <span>{isBusy ? "Restoring..." : "Restore"}</span>
                    </button>

                    <button
                      disabled={isBusy}
                      onClick={() => handleDeleteForever(item)}
                      className="flex-1 md:flex-initial flex items-center justify-center gap-1.5 px-3.5 py-2 bg-red-50 hover:bg-red-100 text-red-700 text-xs font-bold rounded-xl border border-red-200 transition-colors"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                      <span>Delete forever</span>
                    </button>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>
    </Shell>
  );
}
