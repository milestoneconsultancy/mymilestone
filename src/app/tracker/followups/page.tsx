"use client";

import React, { useState, useEffect, useMemo, useCallback } from "react";
import { Shell } from "@/components/layout/Shell";
import { useAuth } from "@/components/providers/AuthProvider";
import { createClient } from "@/lib/supabase/client";
import { CandidateProfileSheet } from "@/components/candidates/CandidateProfileSheet";
import {
  PhoneCall,
  Calendar,
  Clock,
  Phone,
  MessageSquare,
  AlertCircle,
  CheckCircle2,
  CalendarDays,
  Plus,
  Check,
  User,
  X
} from "lucide-react";
import { cn } from "@/lib/utils";

interface FollowUpItem {
  id: string;
  candidate_id: string;
  outcome: string;
  note: string | null;
  next_follow_up: string;
  created_at: string;
  candidate: {
    id: string;
    interview_no: number;
    candidate_name: string;
    mobile_no: string;
    position_applied_for: string | null;
    site: string | null;
    final_status: string;
  };
}

const CALL_OUTCOMES = [
  "Interested",
  "Not interested",
  "Call back",
  "No answer",
  "Interview scheduled",
  "Offer discussed",
  "Note",
];

export default function FollowUpsPage() {
  const { company, profile, setSyncing } = useAuth();
  const [followUps, setFollowUps] = useState<FollowUpItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [activeCandidateId, setActiveCandidateId] = useState<string | null>(null);

  // Quick Log Call Modal
  const [quickLogCandidate, setQuickLogCandidate] = useState<FollowUpItem["candidate"] | null>(null);
  const [outcome, setOutcome] = useState("Call back");
  const [note, setNote] = useState("");
  const [newFollowUpDate, setNewFollowUpDate] = useState("");
  const [isSubmittingCall, setIsSubmittingCall] = useState(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const supabase = createClient();

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3500);
  };

  const fetchFollowUps = useCallback(async () => {
    if (!company?.id) return;
    try {
      setIsLoading(true);
      const { data, error } = await supabase
        .from("call_logs")
        .select("*, candidate:candidates!call_logs_candidate_id_fkey(*)")
        .eq("company_id", company.id)
        .not("next_follow_up", "is", null)
        .order("next_follow_up", { ascending: true });

      if (error) throw error;

      // Group to take only the latest scheduled follow-up per candidate
      const latestMap: Record<string, FollowUpItem> = {};
      data?.forEach((item: any) => {
        if (item.candidate) {
          const candId = item.candidate_id;
          if (!latestMap[candId] || new Date(item.created_at) > new Date(latestMap[candId].created_at)) {
            latestMap[candId] = item as FollowUpItem;
          }
        }
      });

      setFollowUps(Object.values(latestMap));
    } catch (err: any) {
      console.error("Failed to load follow-ups", err);
    } finally {
      setIsLoading(false);
    }
  }, [company?.id, supabase]);

  useEffect(() => {
    fetchFollowUps();

    if (!company?.id) return;
    const channel = supabase
      .channel("followups-realtime")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "call_logs", filter: `company_id=eq.${company.id}` },
        () => fetchFollowUps()
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [company?.id, fetchFollowUps, supabase]);

  // Categorize into Overdue, Today, Upcoming
  const groups = useMemo(() => {
    const today = new Date().toISOString().split("T")[0];

    const overdue: FollowUpItem[] = [];
    const dueToday: FollowUpItem[] = [];
    const upcoming: FollowUpItem[] = [];

    followUps.forEach((item) => {
      if (item.next_follow_up < today) {
        overdue.push(item);
      } else if (item.next_follow_up === today) {
        dueToday.push(item);
      } else {
        upcoming.push(item);
      }
    });

    return { overdue, dueToday, upcoming };
  }, [followUps]);

  // Quick Log Call Save
  const handleSaveQuickCall = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!quickLogCandidate || !company?.id) return;

    try {
      setIsSubmittingCall(true);
      setSyncing(true);

      const { error } = await supabase.from("call_logs").insert({
        company_id: company.id,
        candidate_id: quickLogCandidate.id,
        outcome,
        note: note.trim() || null,
        next_follow_up: newFollowUpDate || null,
        logged_by: profile?.id || null,
      });

      if (error) throw error;

      showToast(`Call logged for ${quickLogCandidate.candidate_name}`);
      setQuickLogCandidate(null);
      setNote("");
      setNewFollowUpDate("");
      fetchFollowUps();
    } catch (err: any) {
      alert("Failed to save call log: " + err.message);
    } finally {
      setIsSubmittingCall(false);
      setSyncing(false);
    }
  };

  const renderFollowUpCard = (item: FollowUpItem, statusType: "overdue" | "today" | "upcoming") => {
    const cand = item.candidate;
    const rawMobile = cand.mobile_no.replace(/\D/g, "");
    const phone10 = rawMobile.length >= 10 ? rawMobile.slice(-10) : "";
    const firstName = cand.candidate_name.split(" ")[0];

    return (
      <div
        key={item.id}
        className="bg-white rounded-2xl p-4 sm:p-5 shadow-sm border border-gray-100 flex flex-col md:flex-row md:items-center justify-between gap-4 hover:shadow-md transition-shadow"
      >
        <div
          onClick={() => setActiveCandidateId(cand.id)}
          className="flex items-start gap-3.5 flex-1 min-w-0 cursor-pointer"
        >
          <div
            className={cn(
              "w-10 h-10 rounded-xl flex items-center justify-center font-bold text-sm shrink-0",
              statusType === "overdue"
                ? "bg-red-50 text-red-600 border border-red-200"
                : statusType === "today"
                ? "bg-amber-50 text-amber-700 border border-amber-200"
                : "bg-blue-50 text-[#1B8BD8] border border-blue-200"
            )}
          >
            <Clock className="w-5 h-5" />
          </div>

          <div className="space-y-1 flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <h4 className="text-xs sm:text-sm font-bold text-gray-900 hover:text-[#F5741A] transition-colors truncate">
                {cand.candidate_name}
              </h4>
              <span className="text-[10px] font-mono text-gray-400">#{cand.interview_no}</span>
              <span className="text-[10px] bg-gray-100 text-gray-700 font-semibold px-2 py-0.2 rounded-full">
                {cand.final_status}
              </span>
            </div>

            <p className="text-xs text-gray-500">
              {cand.position_applied_for || "Position"} {cand.site ? `• ${cand.site}` : ""}
            </p>

            {item.note && (
              <p className="text-xs text-gray-700 italic bg-gray-50 p-2 rounded-lg leading-relaxed mt-1">
                Last note: &quot;{item.note}&quot; ({item.outcome})
              </p>
            )}

            <div className="flex items-center gap-1.5 text-[11px] text-gray-500 pt-0.5">
              <Calendar className="w-3.5 h-3.5 text-gray-400" />
              <span>
                Scheduled follow-up:{" "}
                <strong
                  className={cn(
                    statusType === "overdue"
                      ? "text-red-600 font-bold"
                      : statusType === "today"
                      ? "text-amber-700 font-bold"
                      : "text-[#0A2E5A] font-semibold"
                  )}
                >
                  {item.next_follow_up}
                </strong>
              </span>
            </div>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex items-center gap-2 shrink-0 border-t md:border-t-0 pt-3 md:pt-0">
          {phone10 && (
            <>
              <a
                href={`tel:${phone10}`}
                className="flex items-center gap-1.5 px-3 py-1.5 bg-[#0A2E5A] hover:bg-[#071E3D] text-white text-xs font-bold rounded-xl shadow-xs transition-colors"
              >
                <Phone className="w-3.5 h-3.5" />
                <span>Call</span>
              </a>

              <a
                href={`https://wa.me/91${phone10}?text=${encodeURIComponent(
                  `Namaskar ${firstName}, ${company?.name || "Milestone Consultancy"} HR kadun bolat aahe. Scheduled follow-up sathi call karu shakto ka?`
                )}`}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-1.5 px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-xl shadow-xs transition-colors"
              >
                <MessageSquare className="w-3.5 h-3.5" />
                <span>WhatsApp</span>
              </a>
            </>
          )}

          <button
            onClick={() => {
              setQuickLogCandidate(cand);
              setOutcome("Call back");
              setNote("");
              setNewFollowUpDate("");
            }}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-[#F5741A] hover:bg-[#D9610E] text-white text-xs font-bold rounded-xl shadow-xs transition-colors"
          >
            <PhoneCall className="w-3.5 h-3.5" />
            <span>Log call</span>
          </button>
        </div>
      </div>
    );
  };

  return (
    <Shell>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2.5">
              <div className="w-9 h-9 rounded-xl bg-[#0A2E5A] text-white flex items-center justify-center shadow-sm">
                <PhoneCall className="w-5 h-5 text-[#F5741A]" />
              </div>
              <h1 className="text-2xl font-bold text-[#0A2E5A] tracking-tight">Scheduled follow-ups</h1>
            </div>
            <p className="text-xs text-gray-500 mt-1">
              Candidates queued for calls today, overdue actions, and upcoming follow-ups
            </p>
          </div>
        </div>

        {/* Toast */}
        {toastMessage && (
          <div className="p-3.5 bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs rounded-xl flex items-center gap-2 shadow-sm animate-in fade-in">
            <Check className="w-4 h-4 text-emerald-600 shrink-0" />
            <span>{toastMessage}</span>
          </div>
        )}

        {/* 3 Summary Metric Badges */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div className="bg-red-50/70 border border-red-200/80 rounded-2xl p-4 flex items-center justify-between">
            <div>
              <span className="text-xs font-bold text-red-900 block">Overdue calls</span>
              <span className="text-2xl font-bold text-red-600">{groups.overdue.length}</span>
            </div>
            <AlertCircle className="w-8 h-8 text-red-400" />
          </div>

          <div className="bg-amber-50/70 border border-amber-200/80 rounded-2xl p-4 flex items-center justify-between">
            <div>
              <span className="text-xs font-bold text-amber-900 block">Due today</span>
              <span className="text-2xl font-bold text-amber-600">{groups.dueToday.length}</span>
            </div>
            <Clock className="w-8 h-8 text-amber-400" />
          </div>

          <div className="bg-blue-50/70 border border-blue-200/80 rounded-2xl p-4 flex items-center justify-between">
            <div>
              <span className="text-xs font-bold text-blue-900 block">Upcoming</span>
              <span className="text-2xl font-bold text-[#1B8BD8]">{groups.upcoming.length}</span>
            </div>
            <CalendarDays className="w-8 h-8 text-[#1B8BD8]" />
          </div>
        </div>

        {isLoading ? (
          <div className="py-20 text-center text-xs text-gray-400">Loading follow-ups queue...</div>
        ) : followUps.length === 0 ? (
          <div className="bg-white rounded-2xl p-16 text-center border border-gray-100 shadow-sm space-y-2">
            <CheckCircle2 className="w-12 h-12 text-emerald-500 mx-auto" />
            <h3 className="text-sm font-bold text-gray-900">All calls caught up!</h3>
            <p className="text-xs text-gray-500">No scheduled follow-up dates pending in call logs.</p>
          </div>
        ) : (
          <div className="space-y-8">
            {/* 1. OVERDUE GROUP */}
            {groups.overdue.length > 0 && (
              <div className="space-y-3">
                <div className="flex items-center gap-2">
                  <span className="w-3 h-3 rounded-full bg-red-500" />
                  <h3 className="text-sm font-bold text-red-900">
                    Overdue Follow-ups ({groups.overdue.length})
                  </h3>
                </div>
                <div className="space-y-3">
                  {groups.overdue.map((item) => renderFollowUpCard(item, "overdue"))}
                </div>
              </div>
            )}

            {/* 2. TODAY GROUP */}
            {groups.dueToday.length > 0 && (
              <div className="space-y-3">
                <div className="flex items-center gap-2">
                  <span className="w-3 h-3 rounded-full bg-amber-500" />
                  <h3 className="text-sm font-bold text-amber-900">
                    Due Today ({groups.dueToday.length})
                  </h3>
                </div>
                <div className="space-y-3">
                  {groups.dueToday.map((item) => renderFollowUpCard(item, "today"))}
                </div>
              </div>
            )}

            {/* 3. UPCOMING GROUP */}
            {groups.upcoming.length > 0 && (
              <div className="space-y-3">
                <div className="flex items-center gap-2">
                  <span className="w-3 h-3 rounded-full bg-[#1B8BD8]" />
                  <h3 className="text-sm font-bold text-[#0A2E5A]">
                    Upcoming Follow-ups ({groups.upcoming.length})
                  </h3>
                </div>
                <div className="space-y-3">
                  {groups.upcoming.map((item) => renderFollowUpCard(item, "upcoming"))}
                </div>
              </div>
            )}
          </div>
        )}

        {/* Quick Log Call Modal */}
        {quickLogCandidate && (
          <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
            <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl space-y-4 animate-in zoom-in-95">
              <div className="flex items-center justify-between border-b border-gray-100 pb-3">
                <div>
                  <h3 className="text-sm font-bold text-[#0A2E5A]">Log call outcome</h3>
                  <p className="text-xs text-gray-500">{quickLogCandidate.candidate_name} ({quickLogCandidate.mobile_no})</p>
                </div>
                <button
                  onClick={() => setQuickLogCandidate(null)}
                  className="p-1 rounded-lg text-gray-400 hover:text-gray-900"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <form onSubmit={handleSaveQuickCall} className="space-y-4">
                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-1">Call outcome</label>
                  <select
                    value={outcome}
                    onChange={(e) => setOutcome(e.target.value)}
                    className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-xl text-xs font-semibold text-gray-800"
                  >
                    {CALL_OUTCOMES.map((o) => (
                      <option key={o} value={o}>
                        {o}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-1">Discussion note</label>
                  <textarea
                    rows={3}
                    value={note}
                    onChange={(e) => setNote(e.target.value)}
                    placeholder="Candidate response, salary expectations, next steps..."
                    className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-xl text-xs focus:ring-2 focus:ring-[#F5741A] focus:bg-white"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-1">Next follow-up date (optional)</label>
                  <input
                    type="date"
                    value={newFollowUpDate}
                    onChange={(e) => setNewFollowUpDate(e.target.value)}
                    className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-xl text-xs focus:ring-2 focus:ring-[#F5741A] focus:bg-white"
                  />
                </div>

                <div className="flex justify-end gap-2 pt-2">
                  <button
                    type="button"
                    onClick={() => setQuickLogCandidate(null)}
                    className="px-4 py-2 bg-gray-100 text-gray-700 text-xs font-semibold rounded-xl"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={isSubmittingCall}
                    className="px-4 py-2 bg-[#F5741A] hover:bg-[#D9610E] text-white text-xs font-bold rounded-xl"
                  >
                    {isSubmittingCall ? "Saving..." : "Save call log"}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* Candidate Profile Sheet */}
        <CandidateProfileSheet
          candidateId={activeCandidateId}
          isOpen={Boolean(activeCandidateId)}
          onClose={() => setActiveCandidateId(null)}
          onCandidateDeleted={() => fetchFollowUps()}
          onCandidateUpdated={() => fetchFollowUps()}
        />
      </div>
    </Shell>
  );
}
