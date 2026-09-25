"use client";

import React, { useState, useEffect, useCallback } from "react";
import { createClient } from "@/lib/supabase/client";
import { useAuth } from "@/components/providers/AuthProvider";
import {
  X,
  Phone,
  MessageSquare,
  FileText,
  Calendar,
  Sparkles,
  CheckSquare,
  FileCheck,
  Edit2,
  Trash2,
  Share2,
  ExternalLink,
  Clock,
  User,
  MapPin,
  Mail,
  Briefcase,
  DollarSign,
  AlertCircle,
  Check,
  Plus
} from "lucide-react";
import { cn } from "@/lib/utils";

interface CandidateProfileSheetProps {
  candidateId: string | null;
  isOpen: boolean;
  onClose: () => void;
  onCandidateDeleted?: (id: string) => void;
  onCandidateUpdated?: () => void;
}

const REQUIRED_DOCUMENTS = [
  "Resume / CV",
  "Aadhaar Card",
  "PAN Card",
  "Qualification Certificates",
  "Experience Letters",
  "Relieving Letter",
  "Salary Slips (Last 3 Months)",
  "Passport Size Photograph",
];

const CALL_OUTCOMES = [
  "Interested",
  "Not interested",
  "Call back",
  "No answer",
  "Interview scheduled",
  "Offer discussed",
  "Note",
];

export function CandidateProfileSheet({
  candidateId,
  isOpen,
  onClose,
  onCandidateDeleted,
  onCandidateUpdated,
}: CandidateProfileSheetProps) {
  const { company, profile, setSyncing } = useAuth();
  const [activeTab, setActiveTab] = useState<"details" | "calls" | "docs" | "ai" | "offer">("details");
  const [candidate, setCandidate] = useState<any>(null);
  const [callLogs, setCallLogs] = useState<any[]>([]);
  const [offers, setOffers] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [resumeUrl, setResumeUrl] = useState<string | null>(null);

  // Call Log form state
  const [callOutcome, setCallOutcome] = useState("Interested");
  const [callNote, setCallNote] = useState("");
  const [nextFollowUp, setNextFollowUp] = useState("");
  const [isLoggingCall, setIsLoggingCall] = useState(false);

  // Documents state
  const [collectedDocs, setCollectedDocs] = useState<string[]>([]);

  // AI Fit Score state
  const [jobRequirement, setJobRequirement] = useState("");
  const [isCalculatingAi, setIsCalculatingAi] = useState(false);
  const [aiScoreResult, setAiScoreResult] = useState<{ score: number; reasons: string[] } | null>(null);

  // Feedback
  const [toastMsg, setToastMsg] = useState<string | null>(null);

  const supabase = createClient();

  const showToast = (msg: string) => {
    setToastMsg(msg);
    setTimeout(() => setToastMsg(null), 3500);
  };

  const fetchCandidateDetails = useCallback(async () => {
    if (!candidateId || !company?.id) return;

    try {
      setIsLoading(true);
      const [candRes, callsRes, offersRes] = await Promise.all([
        supabase.from("candidates").select("*").eq("id", candidateId).single(),
        supabase.from("call_logs").select("*, logger:profiles!call_logs_logged_by_fkey(full_name)").eq("candidate_id", candidateId).order("created_at", { ascending: false }),
        supabase.from("offers").select("*").eq("candidate_id", candidateId).order("version", { ascending: false }),
      ]);

      if (candRes.data) {
        setCandidate(candRes.data);
        const docs = Array.isArray(candRes.data.documents) ? (candRes.data.documents as string[]) : [];
        setCollectedDocs(docs);

        if (candRes.data.ai_score) {
          setAiScoreResult({
            score: candRes.data.ai_score,
            reasons: candRes.data.ai_score_note ? candRes.data.ai_score_note.split(" • ") : [],
          });
        }

        // Fetch resume signed URL if path exists
        if (candRes.data.resume_path) {
          try {
            const res = await fetch(`/api/files/signed?bucket=resumes&path=${encodeURIComponent(candRes.data.resume_path)}`);
            const data = await res.json();
            if (data.signedUrl) setResumeUrl(data.signedUrl);
          } catch (e) {
            console.error("Failed to load resume signed URL", e);
          }
        }
      }

      if (callsRes.data) setCallLogs(callsRes.data);
      if (offersRes.data) setOffers(offersRes.data);
    } catch (err) {
      console.error("Failed to load candidate details", err);
    } finally {
      setIsLoading(false);
    }
  }, [candidateId, company?.id, supabase]);

  useEffect(() => {
    if (isOpen && candidateId) {
      fetchCandidateDetails();
    }
  }, [isOpen, candidateId, fetchCandidateDetails]);

  if (!isOpen) return null;

  const firstName = candidate?.candidate_name?.split(" ")[0] || "Candidate";
  const companyName = company?.name || "Milestone Consultancy";
  const rawMobile = candidate?.mobile_no?.replace(/\D/g, "") || "";
  const phone10 = rawMobile.length >= 10 ? rawMobile.slice(-10) : "";

  // 5 Marathi WhatsApp Templates
  const marathiTemplates = [
    {
      title: "Interview Call",
      text: `Namaskar ${firstName}, ${companyName} kadun bolat aahe. Aamhi tumcha resume baghitla ani tumhala ${candidate?.position_applied_for || "job"} post sathi interview sathi bolavtat aahe. Krupaya sampark kara.`,
    },
    {
      title: "Shortlisted",
      text: `Namaskar ${firstName}, ${companyName} madhe tumchi ${candidate?.position_applied_for || "job"} post sathi shortlisting zali aahe. Pudhil step sathi lavkarach sampark karu.`,
    },
    {
      title: "Review / Hold",
      text: `Namaskar ${firstName}, ${companyName} kadun kalavnyat yete ki tumche profile sadhya review/hold var thevle aahe. Pudhil updates lavkarach deu.`,
    },
    {
      title: "Rejected / Future",
      text: `Namaskar ${firstName}, ${companyName} madhe apply kelyabaddal dhanyavad. Sadhyasathi aamhi dusrya profile sobat pudhe jat aahot. Bhavishyat nakki vichar karu.`,
    },
    {
      title: "Joining Reminder",
      text: `Namaskar ${firstName}, ${companyName} madhe tumche joining ${candidate?.joining_date || "agreed date"} roji tharlele aahe. Krupaya aadhi sarva documents tayar theva. Shubhichha!`,
    },
  ];

  // WhatsApp Share to HR
  const hrShareText = `*Candidate Summary — ${candidate?.candidate_name}*
Position: ${candidate?.position_applied_for || "N/A"}
Experience: ${candidate?.total_experience_years || 0} Years
Mobile: ${candidate?.mobile_no}
Current Salary: ${candidate?.current_salary || "N/A"}
Expected Salary: ${candidate?.expected_salary || "N/A"}
Notice / Joining: ${candidate?.joining_availability || "N/A"}
Status: ${candidate?.final_status}
Remarks: ${candidate?.remarks || "None"}`;

  // Log Call Handler
  const handleLogCall = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!candidateId || !company?.id) return;

    try {
      setIsLoggingCall(true);
      setSyncing(true);

      const { data, error } = await supabase
        .from("call_logs")
        .insert({
          company_id: company.id,
          candidate_id: candidateId,
          outcome: callOutcome,
          note: callNote.trim() || null,
          next_follow_up: nextFollowUp || null,
          logged_by: profile?.id || null,
        })
        .select("*, logger:profiles!call_logs_logged_by_fkey(full_name)")
        .single();

      if (error) throw error;

      setCallLogs((prev) => [data, ...prev]);
      setCallNote("");
      setNextFollowUp("");
      showToast("Call log saved successfully");
    } catch (err: any) {
      alert("Failed to save call log: " + err.message);
    } finally {
      setIsLoggingCall(false);
      setSyncing(false);
    }
  };

  // Google Calendar Link generator
  const getGoogleCalendarUrl = () => {
    const title = encodeURIComponent(`Interview: ${candidate?.candidate_name} (${candidate?.position_applied_for || "Candidate"})`);
    const details = encodeURIComponent(
      `Candidate: ${candidate?.candidate_name}\nMobile: ${candidate?.mobile_no}\nPosition: ${candidate?.position_applied_for}\nCompany: ${companyName}`
    );
    const dateStr = nextFollowUp ? nextFollowUp.replace(/-/g, "") : "";
    const dates = dateStr ? `${dateStr}T100000Z/${dateStr}T103000Z` : "";
    return `https://calendar.google.com/calendar/render?action=TEMPLATE&text=${title}&details=${details}${dates ? `&dates=${dates}` : ""}`;
  };

  // Toggle Document Checklist
  const handleToggleDocument = async (docName: string) => {
    const updated = collectedDocs.includes(docName)
      ? collectedDocs.filter((d) => d !== docName)
      : [...collectedDocs, docName];

    setCollectedDocs(updated);
    await supabase.from("candidates").update({ documents: updated }).eq("id", candidateId!);
    showToast("Checklist updated");
  };

  // Run AI Fit Score
  const handleCalculateAiFit = async () => {
    if (!jobRequirement.trim()) {
      alert("Please enter the job requirement or role description first.");
      return;
    }

    try {
      setIsCalculatingAi(true);
      const res = await fetch("/api/ai/score", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          candidateId,
          requirement: jobRequirement.trim(),
        }),
      });

      const data = await res.json();
      if (res.ok) {
        setAiScoreResult({ score: data.score, reasons: data.reasons });
        setCandidate((prev: any) => ({ ...prev, ai_score: data.score, ai_score_note: data.scoreNote }));
        showToast(`AI Match Score: ${data.score}/10`);
      } else {
        alert(data.error || "Failed to calculate score");
      }
    } catch (err: any) {
      alert("AI Scoring error: " + err.message);
    } finally {
      setIsCalculatingAi(false);
    }
  };

  // Delete candidate (moves to trash)
  const handleDeleteCandidate = async () => {
    if (!confirm(`Are you sure you want to move candidate "${candidate?.candidate_name}" to Trash?`)) return;

    try {
      setSyncing(true);
      // 1. Insert into trash table
      await supabase.from("trash").insert({
        company_id: company!.id,
        type: "Candidate",
        key: candidate.id,
        label: candidate.candidate_name,
        details: `${candidate.position_applied_for || "Position"} • Mobile: ${candidate.mobile_no} • Status: ${candidate.final_status}`,
        payload: {
          ...candidate,
          call_logs: callLogs,
          offers: offers,
        },
        reason: "Deleted from Candidate profile sheet",
        deleted_by: profile?.id || null,
      });

      // 2. Delete candidate row
      await supabase.from("candidates").delete().eq("id", candidate.id);

      showToast("Candidate moved to Trash");
      if (onCandidateDeleted) onCandidateDeleted(candidate.id);
      onClose();
    } catch (err: any) {
      alert("Failed to delete candidate: " + err.message);
    } finally {
      setSyncing(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 bg-black/60 backdrop-blur-sm animate-in fade-in">
      <div
        className="fixed inset-0"
        onClick={onClose}
      />

      <div className="relative bg-white w-full sm:max-w-3xl max-h-[92vh] sm:max-h-[85vh] rounded-t-3xl sm:rounded-2xl shadow-2xl flex flex-col z-10 overflow-hidden animate-in slide-in-from-bottom sm:zoom-in-95">
        {/* Header Bar */}
        <div className="p-4 sm:p-5 border-b border-gray-100 flex items-center justify-between bg-white shrink-0">
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-10 h-10 rounded-full bg-[#0A2E5A] text-white flex items-center justify-center font-bold text-base shrink-0">
              {candidate?.candidate_name?.charAt(0) || "C"}
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <h3 className="text-sm sm:text-base font-bold text-gray-900 truncate">
                  {candidate?.candidate_name || "Candidate Profile"}
                </h3>
                <span className="text-[10px] font-mono text-gray-400 bg-gray-100 px-1.5 py-0.5 rounded">
                  #{candidate?.interview_no}
                </span>
              </div>
              <p className="text-xs text-gray-500 truncate">
                {candidate?.position_applied_for || "Position"} {candidate?.site ? `• ${candidate.site}` : ""}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={onClose}
              className="p-1.5 rounded-lg text-gray-400 hover:text-gray-900 hover:bg-gray-100"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Toast Alert */}
        {toastMsg && (
          <div className="mx-4 mt-2 p-2.5 bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs rounded-xl flex items-center gap-2">
            <Check className="w-4 h-4 text-emerald-600 shrink-0" />
            <span>{toastMsg}</span>
          </div>
        )}

        {/* Tab Navigation */}
        <div className="px-4 border-b border-gray-100 flex items-center gap-2 overflow-x-auto no-scrollbar bg-gray-50/50 shrink-0">
          {[
            { id: "details", label: "Details", icon: User },
            { id: "calls", label: `Calls (${callLogs.length})`, icon: Phone },
            { id: "docs", label: `Documents (${collectedDocs.length}/${REQUIRED_DOCUMENTS.length})`, icon: CheckSquare },
            { id: "ai", label: "AI Fit Score", icon: Sparkles },
            { id: "offer", label: `Offer (${offers.length})`, icon: FileCheck },
          ].map((tab) => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as any)}
                className={cn(
                  "flex items-center gap-1.5 py-3 px-3 text-xs font-semibold border-b-2 whitespace-nowrap transition-colors",
                  isActive
                    ? "border-[#F5741A] text-[#F5741A]"
                    : "border-transparent text-gray-500 hover:text-gray-900"
                )}
              >
                <Icon className="w-3.5 h-3.5" />
                <span>{tab.label}</span>
              </button>
            );
          })}
        </div>

        {/* Tab Body */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-4">
          {isLoading ? (
            <div className="py-20 text-center text-xs text-gray-400">Loading candidate profile...</div>
          ) : (
            <>
              {/* TAB 1: DETAILS */}
              {activeTab === "details" && (
                <div className="space-y-6">
                  {/* Quick Action Buttons: Call & WhatsApp */}
                  <div className="p-3 bg-gray-50 rounded-2xl border border-gray-100 flex flex-wrap items-center justify-between gap-3">
                    <div className="flex items-center gap-2">
                      {phone10 ? (
                        <>
                          <a
                            href={`tel:${phone10}`}
                            className="flex items-center gap-1.5 px-3 py-1.5 bg-[#0A2E5A] hover:bg-[#071E3D] text-white text-xs font-bold rounded-xl shadow-xs transition-colors"
                          >
                            <Phone className="w-3.5 h-3.5" />
                            <span>Call {phone10}</span>
                          </a>

                          <a
                            href={`https://wa.me/91${phone10}?text=${encodeURIComponent(
                              `Namaskar ${firstName}, ${companyName} HR kadun bolat aahe. Tumcha resume milala. Bolayla sandhi milel ka?`
                            )}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="flex items-center gap-1.5 px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-xl shadow-xs transition-colors"
                          >
                            <MessageSquare className="w-3.5 h-3.5" />
                            <span>WhatsApp</span>
                          </a>
                        </>
                      ) : (
                        <span className="text-xs text-gray-400">No mobile number specified</span>
                      )}
                    </div>

                    <div className="flex items-center gap-2">
                      {resumeUrl && (
                        <a
                          href={resumeUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="flex items-center gap-1.5 px-3 py-1.5 bg-white border border-gray-200 hover:bg-gray-100 text-gray-800 text-xs font-semibold rounded-xl transition-colors"
                        >
                          <FileText className="w-3.5 h-3.5 text-[#F5741A]" />
                          <span>View Resume</span>
                        </a>
                      )}

                      <button
                        onClick={() => {
                          const url = `https://wa.me/?text=${encodeURIComponent(hrShareText)}`;
                          window.open(url, "_blank");
                        }}
                        className="flex items-center gap-1.5 px-3 py-1.5 bg-blue-50 hover:bg-blue-100 text-[#1B8BD8] text-xs font-semibold rounded-xl border border-blue-200 transition-colors"
                      >
                        <Share2 className="w-3.5 h-3.5" />
                        <span>Share to HR</span>
                      </button>
                    </div>
                  </div>

                  {/* 21-Fields Grid */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3.5">
                    {[
                      { label: "Final Status", value: candidate.final_status, badge: true },
                      { label: "Position Applied For", value: candidate.position_applied_for },
                      { label: "Site / Project", value: candidate.site },
                      { label: "Interview Date", value: candidate.interview_date },
                      { label: "Gender", value: candidate.gender },
                      { label: "Date of Birth / Age", value: candidate.date_of_birth ? `${candidate.date_of_birth} (${candidate.age || "N/A"} yrs)` : "N/A" },
                      { label: "Email", value: candidate.email },
                      { label: "Total Experience", value: candidate.total_experience_years ? `${candidate.total_experience_years} Years` : "Fresher" },
                      { label: "Qualification", value: candidate.education },
                      { label: "Current Location", value: candidate.current_location },
                      { label: "Pincode", value: candidate.pincode },
                      { label: "Current Salary", value: candidate.current_salary },
                      { label: "Expected Salary", value: candidate.expected_salary },
                      { label: "Joining Availability", value: candidate.joining_availability },
                      { label: "Joining Date", value: candidate.joining_date || "Not set" },
                      { label: "Address", value: candidate.address, full: true },
                      { label: "Remarks", value: candidate.remarks, full: true },
                    ].map((field, idx) => (
                      <div
                        key={idx}
                        className={cn(
                          "p-3 rounded-xl bg-gray-50/70 border border-gray-100",
                          field.full ? "sm:col-span-2 lg:col-span-3" : ""
                        )}
                      >
                        <span className="text-[10px] font-bold uppercase tracking-wider text-gray-400 block mb-0.5">
                          {field.label}
                        </span>
                        {field.badge ? (
                          <span
                            className={cn(
                              "inline-block px-2.5 py-0.5 rounded-full text-xs font-bold",
                              field.value === "Selected"
                                ? "bg-emerald-100 text-emerald-800"
                                : field.value === "Rejected"
                                ? "bg-red-100 text-red-800"
                                : field.value === "Hold"
                                ? "bg-amber-100 text-amber-800"
                                : "bg-blue-100 text-blue-800"
                            )}
                          >
                            {field.value || "Pending Call"}
                          </span>
                        ) : (
                          <p className="text-xs font-semibold text-gray-800 leading-snug break-words">
                            {field.value || "—"}
                          </p>
                        )}
                      </div>
                    ))}
                  </div>

                  {/* 5 Marathi Templates */}
                  <div className="space-y-2 pt-2 border-t border-gray-100">
                    <h4 className="text-xs font-bold text-gray-900 flex items-center gap-1.5">
                      <MessageSquare className="w-3.5 h-3.5 text-emerald-600" />
                      <span>Send WhatsApp Message (Marathi Templates)</span>
                    </h4>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                      {marathiTemplates.map((tmpl, idx) => (
                        <div
                          key={idx}
                          className="p-3 bg-emerald-50/50 hover:bg-emerald-50 border border-emerald-200/60 rounded-xl transition-all space-y-1.5"
                        >
                          <div className="flex items-center justify-between">
                            <span className="text-xs font-bold text-emerald-900">{tmpl.title}</span>
                            <a
                              href={`https://wa.me/91${phone10}?text=${encodeURIComponent(tmpl.text)}`}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="px-2 py-0.5 bg-emerald-600 hover:bg-emerald-700 text-white text-[10px] font-bold rounded-lg shadow-xs"
                            >
                              Send WA
                            </a>
                          </div>
                          <p className="text-[11px] text-gray-600 leading-relaxed italic line-clamp-2">
                            &quot;{tmpl.text}&quot;
                          </p>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              )}

              {/* TAB 2: CALL LOGS */}
              {activeTab === "calls" && (
                <div className="space-y-6">
                  {/* Log Call Form */}
                  <form onSubmit={handleLogCall} className="p-4 bg-gray-50 rounded-2xl border border-gray-100 space-y-3.5">
                    <h4 className="text-xs font-bold text-[#0A2E5A] flex items-center gap-1.5">
                      <Phone className="w-3.5 h-3.5 text-[#F5741A]" />
                      <span>Log a phone call or follow-up note</span>
                    </h4>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <div>
                        <label className="block text-[11px] font-semibold text-gray-700 mb-1">Outcome</label>
                        <select
                          value={callOutcome}
                          onChange={(e) => setCallOutcome(e.target.value)}
                          className="w-full px-3 py-1.5 bg-white border border-gray-200 rounded-xl text-xs font-semibold text-gray-800"
                        >
                          {CALL_OUTCOMES.map((o) => (
                            <option key={o} value={o}>
                              {o}
                            </option>
                          ))}
                        </select>
                      </div>

                      <div>
                        <label className="block text-[11px] font-semibold text-gray-700 mb-1">Next follow-up date</label>
                        <input
                          type="date"
                          value={nextFollowUp}
                          onChange={(e) => setNextFollowUp(e.target.value)}
                          className="w-full px-3 py-1.5 bg-white border border-gray-200 rounded-xl text-xs text-gray-800"
                        />
                      </div>
                    </div>

                    <div>
                      <label className="block text-[11px] font-semibold text-gray-700 mb-1">Call note / discussion</label>
                      <textarea
                        rows={2}
                        value={callNote}
                        onChange={(e) => setCallNote(e.target.value)}
                        placeholder="Discussion notes, salary expectation, availability..."
                        className="w-full px-3 py-1.5 bg-white border border-gray-200 rounded-xl text-xs text-gray-800"
                      />
                    </div>

                    <div className="flex items-center justify-between gap-3 pt-1">
                      {nextFollowUp && (
                        <a
                          href={getGoogleCalendarUrl()}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="flex items-center gap-1.5 text-xs text-[#1B8BD8] hover:underline font-semibold"
                        >
                          <Calendar className="w-3.5 h-3.5" />
                          <span>Add to Google Calendar</span>
                        </a>
                      )}

                      <button
                        type="submit"
                        disabled={isLoggingCall}
                        className="ml-auto px-4 py-2 bg-[#F5741A] hover:bg-[#D9610E] text-white text-xs font-bold rounded-xl shadow-xs transition-colors"
                      >
                        {isLoggingCall ? "Saving..." : "Save call log"}
                      </button>
                    </div>
                  </form>

                  {/* List of past calls */}
                  <div className="space-y-3">
                    <h4 className="text-xs font-bold text-gray-900">Call History</h4>
                    {callLogs.length === 0 ? (
                      <p className="text-xs text-gray-400 py-6 text-center">No call logs recorded yet.</p>
                    ) : (
                      callLogs.map((log) => (
                        <div key={log.id} className="p-3.5 bg-white rounded-xl border border-gray-100 shadow-xs space-y-1">
                          <div className="flex items-center justify-between gap-2 flex-wrap">
                            <span className="px-2 py-0.5 bg-blue-50 text-[#1B8BD8] text-[10px] font-bold rounded-md border border-blue-100">
                              {log.outcome}
                            </span>
                            <span className="text-[10px] text-gray-400">
                              {new Date(log.created_at).toLocaleString("en-IN", {
                                day: "numeric",
                                month: "short",
                                hour: "2-digit",
                                minute: "2-digit",
                              })}
                            </span>
                          </div>

                          {log.note && <p className="text-xs text-gray-700 leading-relaxed">{log.note}</p>}

                          <div className="flex items-center justify-between pt-1 text-[10px] text-gray-400">
                            {log.logger?.full_name ? <span>Logged by {log.logger.full_name}</span> : <span />}
                            {log.next_follow_up && (
                              <span className="font-semibold text-[#F5741A]">
                                Next follow-up: {log.next_follow_up}
                              </span>
                            )}
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                </div>
              )}

              {/* TAB 3: DOCUMENTS CHECKLIST */}
              {activeTab === "docs" && (
                <div className="space-y-4">
                  <div className="p-3 bg-blue-50 border border-blue-200/60 rounded-xl text-xs text-blue-900">
                    Verify and mark mandatory joining documentation. Changes are automatically saved.
                  </div>

                  <div className="space-y-2">
                    {REQUIRED_DOCUMENTS.map((doc) => {
                      const isCollected = collectedDocs.includes(doc);
                      return (
                        <label
                          key={doc}
                          className={cn(
                            "flex items-center justify-between p-3 rounded-xl border cursor-pointer transition-all",
                            isCollected
                              ? "bg-emerald-50/50 border-emerald-200 text-emerald-900"
                              : "bg-white border-gray-200 text-gray-700 hover:bg-gray-50"
                          )}
                        >
                          <span className="text-xs font-semibold">{doc}</span>
                          <input
                            type="checkbox"
                            checked={isCollected}
                            onChange={() => handleToggleDocument(doc)}
                            className="w-4 h-4 text-[#F5741A] rounded focus:ring-[#F5741A]"
                          />
                        </label>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* TAB 4: AI FIT SCORE */}
              {activeTab === "ai" && (
                <div className="space-y-5">
                  {/* Current Score Display */}
                  {aiScoreResult ? (
                    <div className="p-4 bg-gradient-to-r from-blue-50 to-indigo-50 rounded-2xl border border-blue-200 space-y-3">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <Sparkles className="w-5 h-5 text-[#1B8BD8]" />
                          <h4 className="text-xs font-bold text-[#0A2E5A]">AI Candidate Evaluation</h4>
                        </div>
                        <div className="flex items-center gap-1 px-3 py-1 rounded-full bg-[#0A2E5A] text-white text-xs font-bold shadow-xs">
                          <span>Match Score:</span>
                          <span className="text-[#F5741A] text-sm">{aiScoreResult.score}/10</span>
                        </div>
                      </div>

                      <div className="space-y-1.5 pt-1">
                        {aiScoreResult.reasons.map((r, i) => (
                          <div key={i} className="flex items-start gap-2 text-xs text-gray-700">
                            <span className="text-[#F5741A] font-bold mt-0.5">•</span>
                            <span className="leading-relaxed">{r}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  ) : (
                    <div className="p-4 bg-gray-50 rounded-2xl border border-gray-200 text-center text-xs text-gray-500">
                      No AI fit score calculated yet for this candidate.
                    </div>
                  )}

                  {/* Score Against Requirements */}
                  <div className="p-4 bg-white rounded-2xl border border-gray-100 shadow-xs space-y-3">
                    <h4 className="text-xs font-bold text-gray-900">Evaluate against custom job requirement</h4>
                    <textarea
                      rows={3}
                      value={jobRequirement}
                      onChange={(e) => setJobRequirement(e.target.value)}
                      placeholder="e.g. 5+ years in highway construction, billing expertise with client RA bills, Nashik site presence..."
                      className="w-full px-3.5 py-2 bg-gray-50 border border-gray-200 rounded-xl text-xs focus:ring-2 focus:ring-[#F5741A] focus:bg-white"
                    />

                    <button
                      onClick={handleCalculateAiFit}
                      disabled={isCalculatingAi || !jobRequirement.trim()}
                      className="px-4 py-2 bg-[#0A2E5A] hover:bg-[#071E3D] disabled:opacity-50 text-white text-xs font-bold rounded-xl shadow-xs transition-colors flex items-center gap-2"
                    >
                      <Sparkles className="w-4 h-4 text-[#F5741A]" />
                      <span>{isCalculatingAi ? "Evaluating with Gemini..." : "Calculate AI Match"}</span>
                    </button>
                  </div>
                </div>
              )}

              {/* TAB 5: OFFER LETTERS */}
              {activeTab === "offer" && (
                <div className="space-y-4">
                  {offers.length === 0 ? (
                    <div className="p-8 text-center space-y-3 bg-gray-50 rounded-2xl border border-gray-100">
                      <FileCheck className="w-8 h-8 text-gray-400 mx-auto" />
                      <p className="text-xs text-gray-500">No offer letter has been issued to this candidate yet.</p>
                      <a
                        href={`/tracker/offers?candidate_id=${candidate.id}`}
                        className="inline-flex items-center gap-1.5 px-4 py-2 bg-[#F5741A] hover:bg-[#D9610E] text-white text-xs font-bold rounded-xl shadow-xs"
                      >
                        <Plus className="w-4 h-4" />
                        <span>Issue offer letter</span>
                      </a>
                    </div>
                  ) : (
                    <div className="space-y-3">
                      <div className="flex items-center justify-between pb-2 border-b border-gray-100">
                        <h4 className="text-xs font-bold text-gray-900">Issued Offers & Versions</h4>
                        <a
                          href={`/tracker/offers?candidate_id=${candidate.id}`}
                          className="text-xs font-semibold text-[#1B8BD8] hover:underline"
                        >
                          + Issue new version
                        </a>
                      </div>

                      {offers.map((offer) => (
                        <div key={offer.id} className="p-4 bg-gray-50 rounded-xl border border-gray-100 space-y-2">
                          <div className="flex items-center justify-between flex-wrap gap-2">
                            <span className="font-mono text-xs font-bold text-[#0A2E5A]">{offer.ref_no}</span>
                            <span
                              className={cn(
                                "px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider",
                                offer.status === "Accepted"
                                  ? "bg-emerald-100 text-emerald-800"
                                  : offer.status === "Declined"
                                  ? "bg-red-100 text-red-800"
                                  : "bg-blue-100 text-blue-800"
                              )}
                            >
                              {offer.status}
                            </span>
                          </div>

                          <div className="grid grid-cols-2 gap-2 text-xs text-gray-600">
                            <div>Designation: <strong>{offer.designation}</strong></div>
                            <div>Salary: <strong>{offer.salary}</strong></div>
                            <div>Letter Date: {offer.letter_date}</div>
                            <div>Joining: {offer.joining_date}</div>
                          </div>

                          {offer.pdf_path && (
                            <div className="pt-1">
                              <button
                                onClick={async () => {
                                  try {
                                    const res = await fetch(`/api/files/signed?bucket=offers&path=${encodeURIComponent(offer.pdf_path)}`);
                                    const data = await res.json();
                                    if (data.signedUrl) window.open(data.signedUrl, "_blank");
                                  } catch (e) {
                                    alert("Could not load PDF link");
                                  }
                                }}
                                className="text-xs text-[#1B8BD8] hover:underline font-semibold flex items-center gap-1"
                              >
                                <ExternalLink className="w-3.5 h-3.5" />
                                <span>View PDF Offer Letter</span>
                              </button>
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </>
          )}
        </div>

        {/* Footer Bar */}
        <div className="p-4 border-t border-gray-100 bg-gray-50 flex items-center justify-between shrink-0">
          <button
            onClick={onClose}
            className="px-4 py-2 bg-white border border-gray-200 text-gray-700 hover:bg-gray-100 text-xs font-semibold rounded-xl"
          >
            Close
          </button>

          <div className="flex items-center gap-2">
            <a
              href={`/tracker/new?edit=${candidate?.id}`}
              className="flex items-center gap-1.5 px-3.5 py-2 bg-white border border-gray-200 hover:bg-gray-100 text-gray-800 text-xs font-bold rounded-xl transition-colors"
            >
              <Edit2 className="w-3.5 h-3.5" />
              <span>Edit</span>
            </a>

            <button
              onClick={handleDeleteCandidate}
              className="flex items-center gap-1.5 px-3.5 py-2 bg-red-50 hover:bg-red-100 text-red-700 border border-red-200 text-xs font-bold rounded-xl transition-colors"
            >
              <Trash2 className="w-3.5 h-3.5" />
              <span>Delete</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
