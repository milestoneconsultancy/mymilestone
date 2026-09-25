"use client";

import React, { useState, useEffect, useMemo, useCallback } from "react";
import { Shell } from "@/components/layout/Shell";
import { useAuth } from "@/components/providers/AuthProvider";
import { createClient } from "@/lib/supabase/client";
import {
  Settings,
  Plus,
  Trash2,
  Edit2,
  Check,
  X,
  FileText,
  Briefcase,
  AlertCircle,
  ArrowUp,
  ArrowDown,
  RotateCcw,
  Sparkles,
  Layers
} from "lucide-react";
import { cn } from "@/lib/utils";

const MASTER_TABS = [
  "Designation",
  "Department",
  "Project",
  "Site",
  "Reporting To",
  "Place of Posting",
  "Notice Period",
  "Accommodation",
  "Official Transportation",
  "Food",
  "Responsibilities",
  "Letter text"
] as const;

type MasterTab = typeof MASTER_TABS[number];

interface MasterItem {
  id: string;
  type: string;
  value: string;
  detail: string | null;
  sort_order: number;
}

interface ResponsibilityItem {
  id: string;
  designation: string;
  title: string | null;
  text: string;
  sort_order: number;
}

interface LetterTextItem {
  id: string;
  key: string;
  title: string;
  text: string;
}

const DEFAULT_LETTER_TEXTS: Record<string, { title: string; text: string }> = {
  SUBJECT: {
    title: "Subject line",
    text: "Subject: Offer of Appointment – {{DESIGNATION}}"
  },
  INTRO: {
    title: "Opening paragraph",
    text: "We are pleased to offer you the position of {{DESIGNATION}} with {{COMPANY}}, as discussed during your interview. Based on your qualifications, experience and suitability for the assigned project requirements, we are confident that you will contribute effectively to the project team."
  },
  JOINING: {
    title: "4. Joining Date & Acceptance",
    text: "Your date of joining shall be {{JOINING_DATE}}. You are required to report for duty and join the Company on or before {{JOINING_DATE}}. Failure to join within the stipulated date may result in withdrawal of this offer. To confirm your acceptance, please sign and return one copy of this letter to the Company on or before {{ACCEPT_BY}}."
  },
  CONDITIONS: {
    title: "5. Employment Conditions",
    text: "Your appointment shall be subject to verification of the information and documents provided by you, compliance with Company policies, and satisfactory performance. Upon acceptance of this offer, you are expected to join on the agreed Date of Joining. After joining, a {{NOTICE_PERIOD}} notice period shall apply for resignation. Any early release or waiver of notice shall be subject to the Company's written approval and applicable Company policy."
  },
  GENERAL: {
    title: "6. General",
    text: "You are expected to maintain professional conduct, confidentiality of project information and records, and comply with all applicable project safety, quality and administrative requirements."
  },
  CLOSING: {
    title: "Closing line",
    text: "We look forward to welcoming you to {{COMPANY}} and wish you a successful association with the Company."
  },
  ACCEPTANCE: {
    title: "Acceptance by employee",
    text: "I, {{NAME}}, hereby accept the above offer and agree to join {{COMPANY}} on {{JOINING_DATE}} on the terms stated above."
  }
};

export default function MasterPage() {
  const { user, profile, company, isOwnerOrAdmin, setSyncing } = useAuth();
  const [activeTab, setActiveTab] = useState<MasterTab>("Designation");
  const [masters, setMasters] = useState<MasterItem[]>([]);
  const [responsibilities, setResponsibilities] = useState<ResponsibilityItem[]>([]);
  const [letterTexts, setLetterTexts] = useState<LetterTextItem[]>([]);
  const [usageCounts, setUsageCounts] = useState<Record<string, number>>({});
  const [isLoading, setIsLoading] = useState(true);

  // Form states for standard masters
  const [newValue, setNewValue] = useState("");
  const [newDetail, setNewDetail] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editValue, setEditValue] = useState("");
  const [editDetail, setEditDetail] = useState("");

  // Responsibilities states
  const [selectedDesignation, setSelectedDesignation] = useState<string>("");
  const [respTitle, setRespTitle] = useState("");
  const [respText, setRespText] = useState("");
  const [editingRespId, setEditingRespId] = useState<string | null>(null);
  const [editRespTitle, setEditRespTitle] = useState("");
  const [editRespText, setEditRespText] = useState("");

  // Feedback states
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const supabase = createClient();

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3500);
  };

  const showError = (msg: string) => {
    setErrorMessage(msg);
    setTimeout(() => setErrorMessage(null), 4000);
  };

  // Fetch all masters and compute usage
  const fetchData = useCallback(async () => {
    if (!company?.id) return;
    try {
      setIsLoading(true);
      const [mRes, rRes, lRes, cRes, oRes] = await Promise.all([
        supabase.from("masters").select("*").eq("company_id", company.id).order("sort_order"),
        supabase.from("responsibilities").select("*").eq("company_id", company.id).order("sort_order"),
        supabase.from("letter_texts").select("*").eq("company_id", company.id),
        supabase.from("candidates").select("position_applied_for, site").eq("company_id", company.id),
        supabase.from("offers").select("designation").eq("company_id", company.id),
      ]);

      if (mRes.data) setMasters(mRes.data as MasterItem[]);
      if (rRes.data) setResponsibilities(rRes.data as ResponsibilityItem[]);
      if (lRes.data) setLetterTexts(lRes.data as LetterTextItem[]);

      // Compute usage counts
      const counts: Record<string, number> = {};
      cRes.data?.forEach((c: any) => {
        if (c.position_applied_for) {
          counts[c.position_applied_for] = (counts[c.position_applied_for] || 0) + 1;
        }
        if (c.site) {
          counts[c.site] = (counts[c.site] || 0) + 1;
        }
      });
      oRes.data?.forEach((o: any) => {
        if (o.designation) {
          counts[o.designation] = (counts[o.designation] || 0) + 1;
        }
      });
      setUsageCounts(counts);

      // Set default selected designation for responsibilities tab
      const designations = mRes.data?.filter((m: any) => m.type === "Designation") || [];
      if (designations.length > 0 && !selectedDesignation) {
        setSelectedDesignation(designations[0].value);
      }
    } catch (err: any) {
      showError(err.message || "Failed to load masters");
    } finally {
      setIsLoading(false);
    }
  }, [company?.id, supabase, selectedDesignation]);

  useEffect(() => {
    fetchData();

    if (!company?.id) return;

    // Realtime subscription
    const channel = supabase
      .channel("masters-realtime")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "masters", filter: `company_id=eq.${company.id}` },
        () => fetchData()
      )
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "responsibilities", filter: `company_id=eq.${company.id}` },
        () => fetchData()
      )
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "letter_texts", filter: `company_id=eq.${company.id}` },
        () => fetchData()
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [company?.id, fetchData, supabase]);

  // Current tab items for standard lists
  const currentItems = useMemo(() => {
    if (activeTab === "Responsibilities" || activeTab === "Letter text") return [];
    return masters.filter((m) => m.type === activeTab);
  }, [masters, activeTab]);

  // Designations list for Responsibilities dropdown
  const designationList = useMemo(() => {
    return masters.filter((m) => m.type === "Designation").map((m) => m.value);
  }, [masters]);

  // Responsibilities for active designation
  const currentResponsibilities = useMemo(() => {
    if (!selectedDesignation) return [];
    return responsibilities
      .filter((r) => r.designation === selectedDesignation)
      .sort((a, b) => a.sort_order - b.sort_order);
  }, [responsibilities, selectedDesignation]);

  // Add standard master item
  const handleAddMaster = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newValue.trim() || !company?.id) return;

    try {
      setIsSubmitting(true);
      setSyncing(true);
      const nextSort = currentItems.length + 1;
      const { data, error } = await supabase
        .from("masters")
        .insert({
          company_id: company.id,
          type: activeTab,
          value: newValue.trim(),
          detail: newDetail.trim() || null,
          sort_order: nextSort,
        })
        .select()
        .single();

      if (error) throw error;
      setMasters((prev) => [...prev, data as MasterItem]);
      setNewValue("");
      setNewDetail("");
      showToast(`${activeTab} added successfully`);
    } catch (err: any) {
      showError(err.message || "Failed to add master item");
    } finally {
      setIsSubmitting(false);
      setSyncing(false);
    }
  };

  // Edit standard master item
  const handleSaveEdit = async (id: string) => {
    if (!editValue.trim() || !company?.id) return;

    try {
      setSyncing(true);
      const { error } = await supabase
        .from("masters")
        .update({
          value: editValue.trim(),
          detail: editDetail.trim() || null,
        })
        .eq("id", id)
        .eq("company_id", company.id);

      if (error) throw error;
      setMasters((prev) =>
        prev.map((item) =>
          item.id === id ? { ...item, value: editValue.trim(), detail: editDetail.trim() || null } : item
        )
      );
      setEditingId(null);
      showToast("Updated successfully");
    } catch (err: any) {
      showError(err.message || "Failed to update item");
    } finally {
      setSyncing(false);
    }
  };

  // Delete standard master item (moves to Trash)
  const handleDeleteMaster = async (item: MasterItem) => {
    if (!confirm(`Are you sure you want to delete "${item.value}"? It will be moved to Trash.`)) {
      return;
    }

    try {
      setSyncing(true);
      // 1. Insert into trash table
      const { error: trashError } = await supabase.from("trash").insert({
        company_id: company!.id,
        type: "Master",
        key: item.id,
        label: item.value,
        details: `${item.type} master: ${item.detail || "No details"}`,
        payload: item,
        reason: "Deleted from Master page",
        deleted_by: profile?.id || null,
      });

      if (trashError) throw trashError;

      // 2. Delete from masters table
      const { error: delError } = await supabase
        .from("masters")
        .delete()
        .eq("id", item.id)
        .eq("company_id", company!.id);

      if (delError) throw delError;

      setMasters((prev) => prev.filter((m) => m.id !== item.id));
      showToast(`"${item.value}" moved to Trash`);
    } catch (err: any) {
      showError(err.message || "Failed to delete item");
    } finally {
      setSyncing(false);
    }
  };

  // Add responsibility point
  const handleAddResponsibility = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedDesignation || !respText.trim() || !company?.id) return;

    try {
      setIsSubmitting(true);
      setSyncing(true);
      const nextSort = currentResponsibilities.length + 1;
      const { data, error } = await supabase
        .from("responsibilities")
        .insert({
          company_id: company.id,
          designation: selectedDesignation,
          title: respTitle.trim() || null,
          text: respText.trim(),
          sort_order: nextSort,
        })
        .select()
        .single();

      if (error) throw error;
      setResponsibilities((prev) => [...prev, data as ResponsibilityItem]);
      setRespTitle("");
      setRespText("");
      showToast("Responsibility point added");
    } catch (err: any) {
      showError(err.message || "Failed to add responsibility");
    } finally {
      setIsSubmitting(false);
      setSyncing(false);
    }
  };

  // Edit responsibility point
  const handleSaveEditResp = async (id: string) => {
    if (!editRespText.trim() || !company?.id) return;

    try {
      setSyncing(true);
      const { error } = await supabase
        .from("responsibilities")
        .update({
          title: editRespTitle.trim() || null,
          text: editRespText.trim(),
        })
        .eq("id", id)
        .eq("company_id", company.id);

      if (error) throw error;
      setResponsibilities((prev) =>
        prev.map((r) =>
          r.id === id ? { ...r, title: editRespTitle.trim() || null, text: editRespText.trim() } : r
        )
      );
      setEditingRespId(null);
      showToast("Responsibility updated");
    } catch (err: any) {
      showError(err.message || "Failed to update responsibility");
    } finally {
      setSyncing(false);
    }
  };

  // Move responsibility up/down
  const handleMoveResponsibility = async (index: number, direction: "up" | "down") => {
    const targetIndex = direction === "up" ? index - 1 : index + 1;
    if (targetIndex < 0 || targetIndex >= currentResponsibilities.length) return;

    const itemA = currentResponsibilities[index];
    const itemB = currentResponsibilities[targetIndex];

    try {
      setSyncing(true);
      await Promise.all([
        supabase
          .from("responsibilities")
          .update({ sort_order: itemB.sort_order })
          .eq("id", itemA.id),
        supabase
          .from("responsibilities")
          .update({ sort_order: itemA.sort_order })
          .eq("id", itemB.id),
      ]);

      setResponsibilities((prev) =>
        prev.map((r) => {
          if (r.id === itemA.id) return { ...r, sort_order: itemB.sort_order };
          if (r.id === itemB.id) return { ...r, sort_order: itemA.sort_order };
          return r;
        })
      );
    } catch (err: any) {
      showError("Failed to reorder");
    } finally {
      setSyncing(false);
    }
  };

  // Delete responsibility
  const handleDeleteResponsibility = async (item: ResponsibilityItem) => {
    if (!confirm(`Delete responsibility point "${item.title || item.text.substring(0, 30)}"?`)) return;

    try {
      setSyncing(true);
      await supabase.from("trash").insert({
        company_id: company!.id,
        type: "Master",
        key: item.id,
        label: `Responsibility: ${item.title || item.designation}`,
        details: item.text,
        payload: item,
        reason: "Deleted from Responsibilities master",
        deleted_by: profile?.id || null,
      });

      await supabase.from("responsibilities").delete().eq("id", item.id);
      setResponsibilities((prev) => prev.filter((r) => r.id !== item.id));
      showToast("Responsibility moved to Trash");
    } catch (err: any) {
      showError(err.message || "Failed to delete");
    } finally {
      setSyncing(false);
    }
  };

  // Save Letter Text
  const handleSaveLetterText = async (key: string, text: string) => {
    if (!company?.id) return;
    try {
      setSyncing(true);
      const existing = letterTexts.find((l) => l.key === key);
      const title = existing?.title || DEFAULT_LETTER_TEXTS[key]?.title || key;

      const { data, error } = await supabase
        .from("letter_texts")
        .upsert(
          {
            company_id: company.id,
            key,
            title,
            text,
            updated_at: new Date().toISOString(),
          },
          { onConflict: "company_id,key" }
        )
        .select()
        .single();

      if (error) throw error;
      setLetterTexts((prev) => {
        const filtered = prev.filter((l) => l.key !== key);
        return [...filtered, data as LetterTextItem];
      });
      showToast(`${title} saved successfully`);
    } catch (err: any) {
      showError(err.message || "Failed to save letter text");
    } finally {
      setSyncing(false);
    }
  };

  // Reset Letter Text to factory default
  const handleResetLetterText = async (key: string) => {
    const defaultData = DEFAULT_LETTER_TEXTS[key];
    if (!defaultData) return;
    if (!confirm(`Reset "${defaultData.title}" to standard template?`)) return;
    await handleSaveLetterText(key, defaultData.text);
  };

  return (
    <Shell>
      <div className="space-y-6">
        {/* Header with Title and Role Guard Banner */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2.5">
              <div className="w-9 h-9 rounded-xl bg-[#0A2E5A] text-white flex items-center justify-center shadow-sm">
                <Settings className="w-5 h-5" />
              </div>
              <h1 className="text-2xl font-bold text-[#0A2E5A] tracking-tight">Master configuration</h1>
            </div>
            <p className="text-xs text-gray-500 mt-1">
              Configure system masters, job responsibilities, and official offer letter wording
            </p>
          </div>

          {!isOwnerOrAdmin && (
            <div className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-amber-50 border border-amber-200 text-amber-800 text-xs font-medium">
              <AlertCircle className="w-4 h-4 text-amber-600 shrink-0" />
              <span>Read-only mode (Owner & Admin only)</span>
            </div>
          )}
        </div>

        {/* Toast / Error alerts */}
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

        {/* 12 Tabs Nav Bar */}
        <div className="bg-white rounded-2xl p-1.5 shadow-sm border border-gray-100 flex items-center gap-1 overflow-x-auto no-scrollbar">
          {MASTER_TABS.map((tab) => {
            const isActive = activeTab === tab;
            return (
              <button
                key={tab}
                onClick={() => setActiveTab(tab)}
                className={cn(
                  "px-3.5 py-2 rounded-xl text-xs font-semibold whitespace-nowrap transition-all",
                  isActive
                    ? "bg-[#0A2E5A] text-white shadow-sm"
                    : "text-gray-600 hover:text-gray-900 hover:bg-gray-100/70"
                )}
              >
                {tab}
              </button>
            );
          })}
        </div>

        {/* CONTENT FOR TABS 1 TO 10 (STANDARD MASTERS) */}
        {activeTab !== "Responsibilities" && activeTab !== "Letter text" && (
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
            {/* Left Column: Add {type} Form */}
            {isOwnerOrAdmin && (
              <div className="lg:col-span-4">
                <div className="bg-white rounded-2xl p-5 shadow-sm border border-gray-100 sticky top-24">
                  <h3 className="text-sm font-bold text-[#0A2E5A] mb-3 flex items-center gap-2">
                    <Plus className="w-4 h-4 text-[#F5741A]" />
                    <span>Add {activeTab}</span>
                  </h3>

                  <form onSubmit={handleAddMaster} className="space-y-3.5">
                    <div>
                      <label className="block text-xs font-semibold text-gray-700 mb-1">
                        {activeTab} name / value <span className="text-red-500">*</span>
                      </label>
                      <input
                        type="text"
                        required
                        value={newValue}
                        onChange={(e) => setNewValue(e.target.value)}
                        placeholder={`Enter ${activeTab.toLowerCase()}...`}
                        className="w-full px-3.5 py-2 bg-gray-50 border border-gray-200 rounded-xl text-xs focus:outline-none focus:ring-2 focus:ring-[#F5741A] focus:bg-white transition-all"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-semibold text-gray-700 mb-1">
                        Description / detail (optional)
                      </label>
                      <textarea
                        rows={3}
                        value={newDetail}
                        onChange={(e) => setNewDetail(e.target.value)}
                        placeholder="Additional details or specific terms..."
                        className="w-full px-3.5 py-2 bg-gray-50 border border-gray-200 rounded-xl text-xs focus:outline-none focus:ring-2 focus:ring-[#F5741A] focus:bg-white transition-all"
                      />
                    </div>

                    <button
                      type="submit"
                      disabled={isSubmitting || !newValue.trim()}
                      className="w-full py-2.5 px-4 bg-[#F5741A] hover:bg-[#D9610E] disabled:opacity-50 text-white text-xs font-bold rounded-xl shadow-sm transition-all flex items-center justify-center gap-2"
                    >
                      <Plus className="w-4 h-4" />
                      <span>{isSubmitting ? "Adding..." : `Save ${activeTab}`}</span>
                    </button>
                  </form>
                </div>
              </div>
            )}

            {/* Right Column: Numbered List */}
            <div className={cn("space-y-3", isOwnerOrAdmin ? "lg:col-span-8" : "lg:col-span-12")}>
              <div className="bg-white rounded-2xl p-5 shadow-sm border border-gray-100">
                <div className="flex items-center justify-between pb-3 border-b border-gray-100 mb-4">
                  <h3 className="text-sm font-bold text-[#0A2E5A] flex items-center gap-2">
                    <Layers className="w-4 h-4 text-[#1B8BD8]" />
                    <span>Configured {activeTab}s</span>
                  </h3>
                  <span className="text-xs bg-blue-50 text-[#1B8BD8] px-2.5 py-1 rounded-full font-bold">
                    {currentItems.length} {currentItems.length === 1 ? "entry" : "entries"}
                  </span>
                </div>

                {isLoading ? (
                  <div className="py-12 text-center text-xs text-gray-400">Loading {activeTab}s...</div>
                ) : currentItems.length === 0 ? (
                  <div className="py-12 text-center">
                    <p className="text-xs text-gray-400">No {activeTab.toLowerCase()} entries configured yet.</p>
                  </div>
                ) : (
                  <div className="divide-y divide-gray-100">
                    {currentItems.map((item, idx) => {
                      const isEditing = editingId === item.id;
                      const usage = usageCounts[item.value] || 0;

                      return (
                        <div key={item.id} className="py-3 flex items-start justify-between gap-3 group">
                          {isEditing ? (
                            <div className="flex-1 space-y-2">
                              <input
                                type="text"
                                value={editValue}
                                onChange={(e) => setEditValue(e.target.value)}
                                className="w-full px-3 py-1.5 bg-gray-50 border border-gray-300 rounded-lg text-xs"
                              />
                              <textarea
                                rows={2}
                                value={editDetail}
                                onChange={(e) => setEditDetail(e.target.value)}
                                className="w-full px-3 py-1.5 bg-gray-50 border border-gray-300 rounded-lg text-xs"
                              />
                              <div className="flex items-center gap-2">
                                <button
                                  onClick={() => handleSaveEdit(item.id)}
                                  className="px-3 py-1 bg-[#0A2E5A] text-white text-[11px] font-bold rounded-lg"
                                >
                                  Save
                                </button>
                                <button
                                  onClick={() => setEditingId(null)}
                                  className="px-3 py-1 bg-gray-200 text-gray-700 text-[11px] rounded-lg"
                                >
                                  Cancel
                                </button>
                              </div>
                            </div>
                          ) : (
                            <div className="flex items-start gap-3 flex-1 min-w-0">
                              <span className="w-6 h-6 rounded-full bg-gray-100 text-gray-600 font-bold text-xs flex items-center justify-center shrink-0 mt-0.5">
                                {idx + 1}
                              </span>
                              <div className="min-w-0 flex-1">
                                <div className="flex items-center gap-2 flex-wrap">
                                  <h4 className="text-xs font-bold text-gray-900">{item.value}</h4>
                                  {usage > 0 ? (
                                    <span className="text-[10px] bg-emerald-50 text-emerald-700 font-semibold px-2 py-0.5 rounded-full border border-emerald-200">
                                      {usage} in use
                                    </span>
                                  ) : (
                                    <span className="text-[10px] text-gray-400">0 in use</span>
                                  )}
                                </div>
                                {item.detail && (
                                  <p className="text-[11px] text-gray-500 mt-0.5 leading-relaxed">{item.detail}</p>
                                )}
                              </div>
                            </div>
                          )}

                          {isOwnerOrAdmin && !isEditing && (
                            <div className="flex items-center gap-1.5 shrink-0">
                              <button
                                onClick={() => {
                                  setEditingId(item.id);
                                  setEditValue(item.value);
                                  setEditDetail(item.detail || "");
                                }}
                                title="Edit entry"
                                className="p-1.5 text-gray-400 hover:text-[#0A2E5A] hover:bg-gray-100 rounded-lg transition-colors"
                              >
                                <Edit2 className="w-3.5 h-3.5" />
                              </button>
                              <button
                                onClick={() => handleDeleteMaster(item)}
                                title="Delete entry (moves to Trash)"
                                className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* TAB 11: RESPONSIBILITIES */}
        {activeTab === "Responsibilities" && (
          <div className="space-y-6">
            {/* Designation selector bar */}
            <div className="bg-white rounded-2xl p-4 shadow-sm border border-gray-100 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div className="flex items-center gap-2.5">
                <Briefcase className="w-4 h-4 text-[#F5741A]" />
                <span className="text-xs font-bold text-gray-800">Select designation to view/edit duties:</span>
              </div>
              <select
                value={selectedDesignation}
                onChange={(e) => setSelectedDesignation(e.target.value)}
                className="px-3.5 py-2 bg-gray-50 border border-gray-200 rounded-xl text-xs font-semibold text-gray-900 focus:outline-none focus:ring-2 focus:ring-[#F5741A]"
              >
                {designationList.map((d) => (
                  <option key={d} value={d}>
                    {d}
                  </option>
                ))}
              </select>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
              {/* Left Column: Add responsibility point form */}
              {isOwnerOrAdmin && (
                <div className="lg:col-span-4">
                  <div className="bg-white rounded-2xl p-5 shadow-sm border border-gray-100 sticky top-24">
                    <h3 className="text-sm font-bold text-[#0A2E5A] mb-3 flex items-center gap-2">
                      <Plus className="w-4 h-4 text-[#F5741A]" />
                      <span>Add responsibility</span>
                    </h3>
                    <p className="text-[11px] text-gray-500 mb-3">
                      Points automatically appear in offer letters for <strong>{selectedDesignation}</strong>.
                    </p>

                    <form onSubmit={handleAddResponsibility} className="space-y-3.5">
                      <div>
                        <label className="block text-xs font-semibold text-gray-700 mb-1">
                          Point title / category
                        </label>
                        <input
                          type="text"
                          value={respTitle}
                          onChange={(e) => setRespTitle(e.target.value)}
                          placeholder="e.g. Site Execution & Supervision"
                          className="w-full px-3.5 py-2 bg-gray-50 border border-gray-200 rounded-xl text-xs focus:outline-none focus:ring-2 focus:ring-[#F5741A] focus:bg-white"
                        />
                      </div>

                      <div>
                        <label className="block text-xs font-semibold text-gray-700 mb-1">
                          Responsibility text <span className="text-red-500">*</span>
                        </label>
                        <textarea
                          rows={4}
                          required
                          value={respText}
                          onChange={(e) => setRespText(e.target.value)}
                          placeholder="Detailed scope of duty..."
                          className="w-full px-3.5 py-2 bg-gray-50 border border-gray-200 rounded-xl text-xs focus:outline-none focus:ring-2 focus:ring-[#F5741A] focus:bg-white"
                        />
                      </div>

                      <button
                        type="submit"
                        disabled={isSubmitting || !respText.trim()}
                        className="w-full py-2.5 px-4 bg-[#F5741A] hover:bg-[#D9610E] disabled:opacity-50 text-white text-xs font-bold rounded-xl shadow-sm transition-all flex items-center justify-center gap-2"
                      >
                        <Plus className="w-4 h-4" />
                        <span>Add duty point</span>
                      </button>
                    </form>
                  </div>
                </div>
              )}

              {/* Right Column: Ordered Responsibilities list */}
              <div className={cn("space-y-3", isOwnerOrAdmin ? "lg:col-span-8" : "lg:col-span-12")}>
                <div className="bg-white rounded-2xl p-5 shadow-sm border border-gray-100">
                  <div className="flex items-center justify-between pb-3 border-b border-gray-100 mb-4">
                    <h3 className="text-sm font-bold text-[#0A2E5A]">
                      Duties for {selectedDesignation}
                    </h3>
                    <span className="text-xs bg-orange-50 text-[#F5741A] px-2.5 py-1 rounded-full font-bold">
                      {currentResponsibilities.length} points
                    </span>
                  </div>

                  {currentResponsibilities.length === 0 ? (
                    <div className="py-12 text-center text-xs text-gray-400">
                      No responsibility points configured for {selectedDesignation}. Add one on the left!
                    </div>
                  ) : (
                    <div className="space-y-3">
                      {currentResponsibilities.map((item, idx) => {
                        const isEditing = editingRespId === item.id;

                        return (
                          <div
                            key={item.id}
                            className="p-3.5 rounded-xl border border-gray-100 bg-gray-50/50 hover:bg-gray-50 transition-colors flex items-start gap-3"
                          >
                            <span className="w-6 h-6 rounded-full bg-[#0A2E5A] text-white font-bold text-xs flex items-center justify-center shrink-0 mt-0.5">
                              {idx + 1}
                            </span>

                            {isEditing ? (
                              <div className="flex-1 space-y-2">
                                <input
                                  type="text"
                                  value={editRespTitle}
                                  onChange={(e) => setEditRespTitle(e.target.value)}
                                  className="w-full px-3 py-1.5 bg-white border border-gray-300 rounded-lg text-xs"
                                  placeholder="Title"
                                />
                                <textarea
                                  rows={3}
                                  value={editRespText}
                                  onChange={(e) => setEditRespText(e.target.value)}
                                  className="w-full px-3 py-1.5 bg-white border border-gray-300 rounded-lg text-xs"
                                  placeholder="Text"
                                />
                                <div className="flex items-center gap-2">
                                  <button
                                    onClick={() => handleSaveEditResp(item.id)}
                                    className="px-3 py-1 bg-[#0A2E5A] text-white text-[11px] font-bold rounded-lg"
                                  >
                                    Save
                                  </button>
                                  <button
                                    onClick={() => setEditingRespId(null)}
                                    className="px-3 py-1 bg-gray-200 text-gray-700 text-[11px] rounded-lg"
                                  >
                                    Cancel
                                  </button>
                                </div>
                              </div>
                            ) : (
                              <div className="flex-1 min-w-0">
                                {item.title && (
                                  <h4 className="text-xs font-bold text-gray-900 mb-1">{item.title}</h4>
                                )}
                                <p className="text-xs text-gray-600 leading-relaxed">{item.text}</p>
                              </div>
                            )}

                            {isOwnerOrAdmin && !isEditing && (
                              <div className="flex items-center gap-1 shrink-0">
                                <button
                                  disabled={idx === 0}
                                  onClick={() => handleMoveResponsibility(idx, "up")}
                                  className="p-1 text-gray-400 hover:text-gray-900 disabled:opacity-20 rounded"
                                  title="Move up"
                                >
                                  <ArrowUp className="w-3.5 h-3.5" />
                                </button>
                                <button
                                  disabled={idx === currentResponsibilities.length - 1}
                                  onClick={() => handleMoveResponsibility(idx, "down")}
                                  className="p-1 text-gray-400 hover:text-gray-900 disabled:opacity-20 rounded"
                                  title="Move down"
                                >
                                  <ArrowDown className="w-3.5 h-3.5" />
                                </button>
                                <button
                                  onClick={() => {
                                    setEditingRespId(item.id);
                                    setEditRespTitle(item.title || "");
                                    setEditRespText(item.text);
                                  }}
                                  className="p-1 text-gray-400 hover:text-[#0A2E5A] rounded"
                                  title="Edit"
                                >
                                  <Edit2 className="w-3.5 h-3.5" />
                                </button>
                                <button
                                  onClick={() => handleDeleteResponsibility(item)}
                                  className="p-1 text-gray-400 hover:text-red-600 rounded"
                                  title="Delete"
                                >
                                  <Trash2 className="w-3.5 h-3.5" />
                                </button>
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* TAB 12: LETTER TEXT */}
        {activeTab === "Letter text" && (
          <div className="space-y-6">
            {/* Placeholders Help Banner */}
            <div className="bg-gradient-to-r from-blue-50 to-indigo-50 border border-blue-200/60 rounded-2xl p-4.5 shadow-sm">
              <div className="flex items-center gap-2 mb-2">
                <Sparkles className="w-4 h-4 text-[#1B8BD8]" />
                <h4 className="text-xs font-bold text-[#0A2E5A]">Supported Template Placeholders</h4>
              </div>
              <p className="text-[11px] text-gray-600 mb-2 leading-relaxed">
                Use these dynamic tags anywhere in your letter text templates. They are substituted with candidate and offer values when generating the PDF:
              </p>
              <div className="flex flex-wrap gap-1.5">
                {[
                  "{{NAME}}",
                  "{{FIRST_NAME}}",
                  "{{DESIGNATION}}",
                  "{{COMPANY}}",
                  "{{JOINING_DATE}}",
                  "{{ACCEPT_BY}}",
                  "{{NOTICE_PERIOD}}",
                  "{{SALARY}}",
                  "{{REPORTING_TO}}",
                  "{{POSTING}}",
                  "{{PROJECT}}"
                ].map((tag) => (
                  <span
                    key={tag}
                    className="px-2 py-0.5 bg-white border border-blue-200 rounded-md font-mono text-[10px] text-[#0A2E5A] font-bold shadow-xs select-all cursor-pointer"
                  >
                    {tag}
                  </span>
                ))}
              </div>
            </div>

            {/* Letter Texts Editor Cards */}
            <div className="space-y-4">
              {Object.entries(DEFAULT_LETTER_TEXTS).map(([key, def]) => {
                const currentItem = letterTexts.find((l) => l.key === key);
                const currentText = currentItem?.text ?? def.text;

                return (
                  <LetterTextCard
                    key={key}
                    letterKey={key}
                    title={currentItem?.title || def.title}
                    initialText={currentText}
                    defaultText={def.text}
                    isOwnerOrAdmin={isOwnerOrAdmin}
                    onSave={(newText) => handleSaveLetterText(key, newText)}
                    onReset={() => handleResetLetterText(key)}
                  />
                );
              })}
            </div>
          </div>
        )}
      </div>
    </Shell>
  );
}

function LetterTextCard({
  letterKey,
  title,
  initialText,
  defaultText,
  isOwnerOrAdmin,
  onSave,
  onReset
}: {
  letterKey: string;
  title: string;
  initialText: string;
  defaultText: string;
  isOwnerOrAdmin: boolean;
  onSave: (text: string) => Promise<void>;
  onReset: () => Promise<void>;
}) {
  const [text, setText] = useState(initialText);
  const [isDirty, setIsDirty] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    setText(initialText);
    setIsDirty(false);
  }, [initialText]);

  const handleChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setText(e.target.value);
    setIsDirty(e.target.value !== initialText);
  };

  const handleSave = async () => {
    setIsSaving(true);
    await onSave(text);
    setIsSaving(false);
    setIsDirty(false);
  };

  return (
    <div className="bg-white rounded-2xl p-5 shadow-sm border border-gray-100 space-y-3">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-gray-100 pb-2.5">
        <div>
          <h4 className="text-xs font-bold text-[#0A2E5A]">{title}</h4>
          <span className="text-[10px] text-gray-400 font-mono">Key: {letterKey}</span>
        </div>

        {isOwnerOrAdmin && (
          <div className="flex items-center gap-2">
            <button
              onClick={onReset}
              title="Reset to original template"
              className="px-2.5 py-1 text-gray-500 hover:text-gray-900 bg-gray-100 hover:bg-gray-200 text-[11px] font-semibold rounded-lg flex items-center gap-1 transition-colors"
            >
              <RotateCcw className="w-3 h-3" />
              <span>Reset</span>
            </button>
            <button
              disabled={!isDirty || isSaving}
              onClick={handleSave}
              className="px-3.5 py-1 bg-[#F5741A] hover:bg-[#D9610E] disabled:opacity-50 text-white text-[11px] font-bold rounded-lg shadow-sm flex items-center gap-1 transition-colors"
            >
              <Check className="w-3.5 h-3.5" />
              <span>{isSaving ? "Saving..." : "Save"}</span>
            </button>
          </div>
        )}
      </div>

      <textarea
        rows={Math.max(3, Math.min(8, text.split("\n").length + 1))}
        disabled={!isOwnerOrAdmin}
        value={text}
        onChange={handleChange}
        className="w-full px-3.5 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-xs font-normal text-gray-800 leading-relaxed focus:outline-none focus:ring-2 focus:ring-[#F5741A] focus:bg-white transition-all font-sans"
      />
    </div>
  );
}
