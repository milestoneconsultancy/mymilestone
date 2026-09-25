"use client";

import React, { useState, useEffect, useMemo, useCallback } from "react";
import Link from "next/link";
import { Shell } from "@/components/layout/Shell";
import { useAuth } from "@/components/providers/AuthProvider";
import { createClient } from "@/lib/supabase/client";
import { CandidateProfileSheet } from "@/components/candidates/CandidateProfileSheet";
import {
  Users,
  Search,
  Filter,
  Plus,
  ArrowUpDown,
  CheckSquare,
  Square,
  Trash2,
  Phone,
  Sparkles,
  FileCheck,
  Calendar,
  X,
  Check,
  Building,
  UserCheck
} from "lucide-react";
import { cn } from "@/lib/utils";

type StatusFilter = "All" | "Pending Call" | "Pending" | "Hold" | "Selected" | "Rejected" | "Offer issued";

interface CandidateRow {
  id: string;
  interview_no: number;
  interview_date: string;
  candidate_name: string;
  mobile_no: string;
  email: string | null;
  position_applied_for: string | null;
  site: string | null;
  total_experience_years: number | null;
  final_status: string;
  ai_score: number | null;
  created_at: string;
  active_offer?: {
    ref_no: string;
    status: string;
  } | null;
  last_call?: {
    outcome: string;
    created_at: string;
  } | null;
}

export default function CandidatesPage() {
  const { company, profile, setSyncing } = useAuth();
  const [candidates, setCandidates] = useState<CandidateRow[]>([]);
  const [positions, setPositions] = useState<string[]>([]);
  const [sites, setSites] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Filters
  const [selectedStatus, setSelectedStatus] = useState<StatusFilter>("All");
  const [selectedPosition, setSelectedPosition] = useState<string>("All");
  const [selectedSite, setSelectedSite] = useState<string>("All");
  const [searchQuery, setSearchQuery] = useState("");
  const [sortBy, setSortBy] = useState<"newest" | "oldest" | "name" | "exp" | "ai">("newest");

  // Selection mode
  const [isSelectMode, setIsSelectMode] = useState(false);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [isDeletingBulk, setIsDeletingBulk] = useState(false);

  // Profile Sheet Modal
  const [selectedCandidateId, setSelectedCandidateId] = useState<string | null>(null);

  // Feedback
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const supabase = createClient();

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3500);
  };

  const fetchData = useCallback(async () => {
    if (!company?.id) return;
    try {
      setIsLoading(true);

      const [cRes, mRes, oRes, lRes] = await Promise.all([
        supabase.from("candidates").select("*").eq("company_id", company.id).order("interview_no", { ascending: false }),
        supabase.from("masters").select("type, value").eq("company_id", company.id),
        supabase.from("offers").select("candidate_id, ref_no, status").eq("company_id", company.id).eq("is_active", true),
        supabase.from("call_logs").select("candidate_id, outcome, created_at").eq("company_id", company.id).order("created_at", { ascending: false }),
      ]);

      if (mRes.data) {
        setPositions(mRes.data.filter((m: any) => m.type === "Designation").map((m: any) => m.value));
        setSites(mRes.data.filter((m: any) => m.type === "Site").map((m: any) => m.value));
      }

      // Map active offers and last call logs
      const offerMap: Record<string, any> = {};
      oRes.data?.forEach((o: any) => {
        offerMap[o.candidate_id] = o;
      });

      const callMap: Record<string, any> = {};
      lRes.data?.forEach((l: any) => {
        if (!callMap[l.candidate_id]) callMap[l.candidate_id] = l;
      });

      if (cRes.data) {
        const enriched: CandidateRow[] = cRes.data.map((c: any) => ({
          ...c,
          active_offer: offerMap[c.id] || null,
          last_call: callMap[c.id] || null,
        }));
        setCandidates(enriched);
      }
    } catch (err: any) {
      console.error("Error loading candidates", err);
    } finally {
      setIsLoading(false);
    }
  }, [company?.id, supabase]);

  useEffect(() => {
    fetchData();

    if (!company?.id) return;
    const channel = supabase
      .channel("candidates-realtime")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "candidates", filter: `company_id=eq.${company.id}` },
        () => fetchData()
      )
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "offers", filter: `company_id=eq.${company.id}` },
        () => fetchData()
      )
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "call_logs", filter: `company_id=eq.${company.id}` },
        () => fetchData()
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [company?.id, fetchData, supabase]);

  // Counts for status chips
  const counts = useMemo(() => {
    const map: Record<StatusFilter, number> = {
      All: candidates.length,
      "Pending Call": 0,
      Pending: 0,
      Hold: 0,
      Selected: 0,
      Rejected: 0,
      "Offer issued": 0,
    };

    candidates.forEach((c) => {
      if (c.final_status in map) {
        map[c.final_status as StatusFilter]++;
      }
      if (c.active_offer) {
        map["Offer issued"]++;
      }
    });

    return map;
  }, [candidates]);

  // Filtered & sorted candidates
  const filteredCandidates = useMemo(() => {
    let list = [...candidates];

    // Status filter
    if (selectedStatus === "Offer issued") {
      list = list.filter((c) => Boolean(c.active_offer));
    } else if (selectedStatus !== "All") {
      list = list.filter((c) => c.final_status === selectedStatus);
    }

    // Position filter
    if (selectedPosition !== "All") {
      list = list.filter((c) => c.position_applied_for === selectedPosition);
    }

    // Site filter
    if (selectedSite !== "All") {
      list = list.filter((c) => c.site === selectedSite);
    }

    // Search query (name, mobile, email, position, ID)
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase().trim();
      list = list.filter((c) => {
        return (
          c.candidate_name?.toLowerCase().includes(q) ||
          c.mobile_no?.includes(q) ||
          c.email?.toLowerCase().includes(q) ||
          c.position_applied_for?.toLowerCase().includes(q) ||
          `#${c.interview_no}`.includes(q) ||
          String(c.interview_no) === q
        );
      });
    }

    // Sort
    list.sort((a, b) => {
      if (sortBy === "newest") return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
      if (sortBy === "oldest") return new Date(a.created_at).getTime() - new Date(b.created_at).getTime();
      if (sortBy === "name") return (a.candidate_name || "").localeCompare(b.candidate_name || "");
      if (sortBy === "exp") return (b.total_experience_years || 0) - (a.total_experience_years || 0);
      if (sortBy === "ai") return (b.ai_score || 0) - (a.ai_score || 0);
      return 0;
    });

    return list;
  }, [candidates, selectedStatus, selectedPosition, selectedSite, searchQuery, sortBy]);

  // Toggle selection
  const handleToggleSelect = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setSelectedIds((prev) =>
      prev.includes(id) ? prev.filter((i) => i !== id) : [...prev, id]
    );
  };

  // Select all toggle
  const handleSelectAll = () => {
    if (selectedIds.length === filteredCandidates.length) {
      setSelectedIds([]);
    } else {
      setSelectedIds(filteredCandidates.map((c) => c.id));
    }
  };

  // Bulk Delete to Trash
  const handleBulkDelete = async () => {
    if (selectedIds.length === 0) return;
    const reason = prompt(
      `Are you sure you want to move ${selectedIds.length} candidates to Trash? Optional reason:`,
      "Bulk deletion"
    );
    if (reason === null) return;

    try {
      setIsDeletingBulk(true);
      setSyncing(true);

      const itemsToTrash = candidates
        .filter((c) => selectedIds.includes(c.id))
        .map((c) => ({
          company_id: company!.id,
          type: "Candidate",
          key: c.id,
          label: c.candidate_name,
          details: `${c.position_applied_for || "Position"} • Mobile: ${c.mobile_no}`,
          payload: c,
          reason: reason || "Bulk delete from Candidates page",
          deleted_by: profile?.id || null,
        }));

      // Insert to trash
      await supabase.from("trash").insert(itemsToTrash);

      // Delete from candidates
      await supabase.from("candidates").delete().in("id", selectedIds);

      setCandidates((prev) => prev.filter((c) => !selectedIds.includes(c.id)));
      setSelectedIds([]);
      setIsSelectMode(false);
      showToast(`${itemsToTrash.length} candidates moved to Trash`);
    } catch (err: any) {
      alert("Failed to delete candidates: " + err.message);
    } finally {
      setIsDeletingBulk(false);
      setSyncing(false);
    }
  };

  return (
    <Shell>
      <div className="space-y-5">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2.5">
              <div className="w-9 h-9 rounded-xl bg-[#0A2E5A] text-white flex items-center justify-center shadow-sm">
                <Users className="w-5 h-5" />
              </div>
              <h1 className="text-2xl font-bold text-[#0A2E5A] tracking-tight">Candidates directory</h1>
            </div>
            <p className="text-xs text-gray-500 mt-1">
              Search, filter, track status, and view candidate interview sheets
            </p>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => {
                setIsSelectMode(!isSelectMode);
                setSelectedIds([]);
              }}
              className={cn(
                "px-3.5 py-2 text-xs font-bold rounded-xl border transition-all flex items-center gap-1.5 shadow-xs",
                isSelectMode
                  ? "bg-[#0A2E5A] text-white border-[#0A2E5A]"
                  : "bg-white text-gray-700 border-gray-200 hover:bg-gray-50"
              )}
            >
              <CheckSquare className="w-4 h-4" />
              <span>{isSelectMode ? "Cancel selection" : "Select mode"}</span>
            </button>

            <Link
              href="/tracker/new"
              className="flex items-center gap-1.5 px-3.5 py-2 bg-[#F5741A] hover:bg-[#D9610E] text-white text-xs font-bold rounded-xl shadow-sm transition-all"
            >
              <Plus className="w-4 h-4" />
              <span>New interview</span>
            </Link>
          </div>
        </div>

        {/* Toast */}
        {toastMessage && (
          <div className="p-3.5 bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs rounded-xl flex items-center gap-2 shadow-sm animate-in fade-in">
            <Check className="w-4 h-4 text-emerald-600 shrink-0" />
            <span>{toastMessage}</span>
          </div>
        )}

        {/* Status Filter Chips */}
        <div className="bg-white rounded-2xl p-2 shadow-sm border border-gray-100 flex items-center gap-1 overflow-x-auto no-scrollbar">
          {(["All", "Pending Call", "Pending", "Hold", "Selected", "Rejected", "Offer issued"] as const).map((status) => {
            const count = counts[status];
            const isActive = selectedStatus === status;
            return (
              <button
                key={status}
                onClick={() => setSelectedStatus(status)}
                className={cn(
                  "flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-semibold whitespace-nowrap transition-all",
                  isActive
                    ? "bg-[#0A2E5A] text-white shadow-sm"
                    : "text-gray-600 hover:text-gray-900 hover:bg-gray-100/70"
                )}
              >
                <span>{status}</span>
                <span
                  className={cn(
                    "px-1.5 py-0.2 rounded-full text-[10px] font-bold",
                    isActive ? "bg-white/20 text-white" : "bg-gray-100 text-gray-700"
                  )}
                >
                  {count}
                </span>
              </button>
            );
          })}
        </div>

        {/* Search, Dropdowns, and Sort Bar */}
        <div className="bg-white rounded-2xl p-4 shadow-sm border border-gray-100 flex flex-col md:flex-row md:items-center justify-between gap-3">
          <div className="relative flex-1">
            <Search className="w-4 h-4 text-gray-400 absolute left-3 top-2.5" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search by name, mobile, email, position, #ID..."
              className="w-full pl-9 pr-3.5 py-2 bg-gray-50 border border-gray-200 rounded-xl text-xs focus:ring-2 focus:ring-[#F5741A] focus:bg-white"
            />
          </div>

          <div className="flex items-center gap-2 flex-wrap">
            {/* Position filter */}
            <select
              value={selectedPosition}
              onChange={(e) => setSelectedPosition(e.target.value)}
              className="px-3 py-2 bg-gray-50 border border-gray-200 rounded-xl text-xs font-semibold text-gray-800"
            >
              <option value="All">All Positions</option>
              {positions.map((p) => (
                <option key={p} value={p}>
                  {p}
                </option>
              ))}
            </select>

            {/* Site filter */}
            <select
              value={selectedSite}
              onChange={(e) => setSelectedSite(e.target.value)}
              className="px-3 py-2 bg-gray-50 border border-gray-200 rounded-xl text-xs font-semibold text-gray-800"
            >
              <option value="All">All Sites</option>
              {sites.map((s) => (
                <option key={s} value={s}>
                  {s}
                </option>
              ))}
            </select>

            {/* Sort filter */}
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value as any)}
              className="px-3 py-2 bg-gray-50 border border-gray-200 rounded-xl text-xs font-semibold text-gray-800"
            >
              <option value="newest">Newest first</option>
              <option value="oldest">Oldest first</option>
              <option value="name">Name A-Z</option>
              <option value="exp">Experience: High to Low</option>
              <option value="ai">AI Match: High to Low</option>
            </select>
          </div>
        </div>

        {/* Results Counter / Select All Bar */}
        {isSelectMode && (
          <div className="bg-blue-50/70 border border-blue-200/80 rounded-2xl p-3 flex items-center justify-between text-xs text-blue-900 font-semibold">
            <button
              onClick={handleSelectAll}
              className="flex items-center gap-2 hover:underline"
            >
              {selectedIds.length === filteredCandidates.length ? (
                <CheckSquare className="w-4 h-4 text-[#F5741A]" />
              ) : (
                <Square className="w-4 h-4 text-blue-400" />
              )}
              <span>
                {selectedIds.length === filteredCandidates.length ? "Deselect all" : "Select all in view"}
              </span>
            </button>
            <span>{selectedIds.length} candidates selected</span>
          </div>
        )}

        {/* DESKTOP TABLE VIEW (>= 1024px) */}
        <div className="hidden lg:block bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-gray-100 bg-gray-50/70 text-[11px] font-bold text-gray-400 uppercase tracking-wider">
                {isSelectMode && <th className="p-3.5 w-10 text-center">✓</th>}
                <th className="p-3.5">#ID</th>
                <th className="p-3.5">Candidate</th>
                <th className="p-3.5">Position / Site</th>
                <th className="p-3.5">Contact</th>
                <th className="p-3.5">Experience</th>
                <th className="p-3.5">Status</th>
                <th className="p-3.5">Offer</th>
                <th className="p-3.5">AI Fit</th>
                <th className="p-3.5">Last Call</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 text-xs">
              {isLoading ? (
                <tr>
                  <td colSpan={10} className="py-16 text-center text-gray-400">
                    Loading candidates directory...
                  </td>
                </tr>
              ) : filteredCandidates.length === 0 ? (
                <tr>
                  <td colSpan={10} className="py-16 text-center text-gray-400">
                    No candidates found matching the active criteria.
                  </td>
                </tr>
              ) : (
                filteredCandidates.map((c) => {
                  const isSelected = selectedIds.includes(c.id);

                  return (
                    <tr
                      key={c.id}
                      onClick={() => {
                        if (isSelectMode) {
                          setSelectedIds((prev) =>
                            prev.includes(c.id) ? prev.filter((i) => i !== c.id) : [...prev, c.id]
                          );
                        } else {
                          setSelectedCandidateId(c.id);
                        }
                      }}
                      className={cn(
                        "hover:bg-blue-50/40 cursor-pointer transition-colors group",
                        isSelected ? "bg-blue-50/60" : ""
                      )}
                    >
                      {isSelectMode && (
                        <td className="p-3.5 text-center" onClick={(e) => handleToggleSelect(c.id, e)}>
                          <input
                            type="checkbox"
                            checked={isSelected}
                            onChange={() => {}}
                            className="w-4 h-4 text-[#F5741A] rounded focus:ring-[#F5741A]"
                          />
                        </td>
                      )}

                      <td className="p-3.5 font-mono text-[11px] font-bold text-gray-400">
                        #{c.interview_no}
                      </td>

                      <td className="p-3.5 font-bold text-gray-900 group-hover:text-[#F5741A] transition-colors">
                        {c.candidate_name}
                      </td>

                      <td className="p-3.5">
                        <div className="font-semibold text-gray-800">{c.position_applied_for || "—"}</div>
                        {c.site && <div className="text-[10px] text-gray-400">{c.site}</div>}
                      </td>

                      <td className="p-3.5">
                        <div className="font-mono text-gray-700">{c.mobile_no}</div>
                        {c.email && <div className="text-[10px] text-gray-400 truncate max-w-[120px]">{c.email}</div>}
                      </td>

                      <td className="p-3.5 text-gray-700">
                        {c.total_experience_years ? `${c.total_experience_years} yrs` : "Fresher"}
                      </td>

                      <td className="p-3.5">
                        <span
                          className={cn(
                            "px-2.5 py-0.5 rounded-full text-[10px] font-bold whitespace-nowrap",
                            c.final_status === "Selected"
                              ? "bg-emerald-100 text-emerald-800"
                              : c.final_status === "Rejected"
                              ? "bg-red-100 text-red-800"
                              : c.final_status === "Hold"
                              ? "bg-amber-100 text-amber-800"
                              : "bg-blue-100 text-blue-800"
                          )}
                        >
                          {c.final_status}
                        </span>
                      </td>

                      <td className="p-3.5">
                        {c.active_offer ? (
                          <span
                            className={cn(
                              "px-2 py-0.5 rounded-md text-[10px] font-bold border",
                              c.active_offer.status === "Accepted"
                                ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                                : "bg-purple-50 text-purple-700 border-purple-200"
                            )}
                          >
                            Offer {c.active_offer.status}
                          </span>
                        ) : (
                          <span className="text-[10px] text-gray-300">—</span>
                        )}
                      </td>

                      <td className="p-3.5">
                        {c.ai_score ? (
                          <span className="px-2 py-0.5 bg-blue-50 text-[#1B8BD8] rounded-md font-bold text-[10px]">
                            {c.ai_score}/10
                          </span>
                        ) : (
                          <span className="text-[10px] text-gray-300">—</span>
                        )}
                      </td>

                      <td className="p-3.5 text-gray-500 text-[11px]">
                        {c.last_call ? (
                          <div>
                            <span className="font-semibold text-gray-700">{c.last_call.outcome}</span>
                            <div className="text-[10px] text-gray-400">
                              {new Date(c.last_call.created_at).toLocaleDateString("en-IN", {
                                day: "numeric",
                                month: "short",
                              })}
                            </div>
                          </div>
                        ) : (
                          <span className="text-[10px] text-gray-300">No calls</span>
                        )}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* MOBILE CARDS VIEW (< 1024px) */}
        <div className="lg:hidden space-y-3">
          {isLoading ? (
            <div className="py-16 text-center text-xs text-gray-400">Loading candidates...</div>
          ) : filteredCandidates.length === 0 ? (
            <div className="bg-white rounded-2xl p-12 text-center border border-gray-100 shadow-sm text-xs text-gray-400">
              No candidates found matching the active filters.
            </div>
          ) : (
            filteredCandidates.map((c) => {
              const isSelected = selectedIds.includes(c.id);

              return (
                <div
                  key={c.id}
                  onClick={() => {
                    if (isSelectMode) {
                      setSelectedIds((prev) =>
                        prev.includes(c.id) ? prev.filter((i) => i !== c.id) : [...prev, c.id]
                      );
                    } else {
                      setSelectedCandidateId(c.id);
                    }
                  }}
                  className={cn(
                    "bg-white rounded-2xl p-4 shadow-sm border border-gray-100 flex flex-col gap-2.5 active:scale-[0.99] transition-transform",
                    isSelected ? "border-[#F5741A] bg-orange-50/20" : ""
                  )}
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex items-start gap-2.5">
                      {isSelectMode && (
                        <input
                          type="checkbox"
                          checked={isSelected}
                          onChange={() => {}}
                          className="w-4 h-4 text-[#F5741A] rounded mt-0.5"
                        />
                      )}
                      <div>
                        <div className="flex items-center gap-1.5">
                          <h4 className="text-xs font-bold text-gray-900">{c.candidate_name}</h4>
                          <span className="text-[10px] font-mono text-gray-400">#{c.interview_no}</span>
                        </div>
                        <p className="text-[11px] text-gray-500">
                          {c.position_applied_for || "Position"} {c.site ? `• ${c.site}` : ""}
                        </p>
                      </div>
                    </div>

                    <span
                      className={cn(
                        "px-2 py-0.5 rounded-full text-[10px] font-bold shrink-0",
                        c.final_status === "Selected"
                          ? "bg-emerald-100 text-emerald-800"
                          : c.final_status === "Rejected"
                          ? "bg-red-100 text-red-800"
                          : c.final_status === "Hold"
                          ? "bg-amber-100 text-amber-800"
                          : "bg-blue-100 text-blue-800"
                      )}
                    >
                      {c.final_status}
                    </span>
                  </div>

                  <div className="flex items-center justify-between text-xs text-gray-600 pt-1 border-t border-gray-50">
                    <span className="font-mono text-[11px]">{c.mobile_no}</span>
                    <span>{c.total_experience_years ? `${c.total_experience_years} yrs exp` : "Fresher"}</span>
                  </div>

                  <div className="flex items-center justify-between gap-2 pt-0.5">
                    <div className="flex items-center gap-2">
                      {c.active_offer && (
                        <span className="px-2 py-0.5 rounded-md text-[10px] font-bold bg-purple-50 text-purple-700 border border-purple-200">
                          Offer {c.active_offer.status}
                        </span>
                      )}
                      {c.ai_score && (
                        <span className="px-1.5 py-0.5 bg-blue-50 text-[#1B8BD8] rounded text-[10px] font-bold">
                          AI: {c.ai_score}/10
                        </span>
                      )}
                    </div>

                    {c.last_call && (
                      <span className="text-[10px] text-gray-400">
                        Call: {c.last_call.outcome}
                      </span>
                    )}
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* Sticky Bottom Bar for Selection Mode */}
        {isSelectMode && selectedIds.length > 0 && (
          <div className="fixed bottom-16 lg:bottom-6 left-4 right-4 lg:left-[270px] lg:right-8 z-40 bg-[#0A2E5A] text-white p-3.5 rounded-2xl shadow-2xl flex items-center justify-between gap-4 animate-in slide-in-from-bottom">
            <span className="text-xs font-bold">
              {selectedIds.length} candidate{selectedIds.length > 1 ? "s" : ""} selected
            </span>

            <div className="flex items-center gap-2">
              <button
                onClick={() => setSelectedIds([])}
                className="px-3 py-1.5 bg-white/10 hover:bg-white/20 text-xs font-semibold rounded-xl text-white"
              >
                Clear
              </button>

              <button
                disabled={isDeletingBulk}
                onClick={handleBulkDelete}
                className="flex items-center gap-1.5 px-3.5 py-1.5 bg-red-600 hover:bg-red-700 text-white text-xs font-bold rounded-xl shadow-xs transition-colors"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>{isDeletingBulk ? "Deleting..." : "Delete to Trash"}</span>
              </button>
            </div>
          </div>
        )}

        {/* Candidate Profile Sheet Modal */}
        <CandidateProfileSheet
          candidateId={selectedCandidateId}
          isOpen={Boolean(selectedCandidateId)}
          onClose={() => setSelectedCandidateId(null)}
          onCandidateDeleted={() => fetchData()}
          onCandidateUpdated={() => fetchData()}
        />
      </div>
    </Shell>
  );
}
