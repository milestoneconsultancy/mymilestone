"use client";

import React, { useState, useEffect, useMemo, useCallback, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Shell } from "@/components/layout/Shell";
import { useAuth } from "@/components/providers/AuthProvider";
import { createClient } from "@/lib/supabase/client";
import { CandidateProfileSheet } from "@/components/candidates/CandidateProfileSheet";
import {
  FileCheck,
  Plus,
  Send,
  Eye,
  Edit2,
  Trash2,
  Check,
  AlertCircle,
  Clock,
  User,
  Building,
  DollarSign,
  Calendar,
  Sparkles,
  ExternalLink,
  MessageSquare,
  ChevronDown,
  ChevronUp,
  Download,
  Layers,
  History,
  CheckCircle2,
  X
} from "lucide-react";
import { cn } from "@/lib/utils";

interface CandidateOption {
  id: string;
  interview_no: number;
  candidate_name: string;
  mobile_no: string;
  address: string | null;
  position_applied_for: string | null;
  final_status: string;
}

interface OfferRow {
  id: string;
  candidate_id: string;
  base_ref: string;
  version: number;
  ref_no: string;
  is_active: boolean;
  designation: string;
  salary: string;
  letter_date: string;
  joining_date: string;
  accept_by: string;
  status: "Issued" | "Accepted" | "Declined" | "Expired" | "Withdrawn";
  accepted_on: string | null;
  pdf_path: string;
  payload: any;
  created_at: string;
  candidate?: CandidateOption;
}

function OffersContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const queryCandidateId = searchParams.get("candidate_id");

  const { company, profile, setSyncing } = useAuth();
  const [activeTab, setActiveTab] = useState<"issued" | "issue">("issued");
  const [offers, setOffers] = useState<OfferRow[]>([]);
  const [candidates, setCandidates] = useState<CandidateOption[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Master Dropdown Lists
  const [designations, setDesignations] = useState<string[]>([]);
  const [reportingToList, setReportingToList] = useState<string[]>([]);
  const [projects, setProjects] = useState<string[]>([]);
  const [postings, setPostings] = useState<string[]>([]);
  const [noticePeriods, setNoticePeriods] = useState<string[]>([]);
  const [allResponsibilities, setAllResponsibilities] = useState<any[]>([]);
  const [letterTexts, setLetterTexts] = useState<Record<string, string>>({});

  // Master Facilities
  const [masterAccommodation, setMasterAccommodation] = useState<string[]>([]);
  const [masterTransport, setMasterTransport] = useState<string[]>([]);
  const [masterFood, setMasterFood] = useState<string[]>([]);

  // Issue Form State
  const [selectedCandidateId, setSelectedCandidateId] = useState("");
  const [letterDate, setLetterDate] = useState(new Date().toISOString().split("T")[0]);
  const [designation, setDesignation] = useState("");
  const [reportingTo, setReportingTo] = useState("");
  const [project, setProject] = useState("");
  const [posting, setPosting] = useState("");
  const [noticePeriod, setNoticePeriod] = useState("");
  const [salary, setSalary] = useState("₹35,000/-");
  const [joiningDate, setJoiningDate] = useState("");
  const [acceptBy, setAcceptBy] = useState("");

  // Responsibilities checklist state
  const [selectedResponsibilities, setSelectedResponsibilities] = useState<Array<{ title?: string; text: string; enabled: boolean }>>([]);
  const [newRespTitle, setNewRespTitle] = useState("");
  const [newRespText, setNewRespText] = useState("");

  // Facilities Checklist & Extra Rows state
  const [accommodationChecked, setAccommodationChecked] = useState<Record<string, boolean>>({});
  const [transportChecked, setTransportChecked] = useState<Record<string, boolean>>({});
  const [foodChecked, setFoodChecked] = useState<Record<string, boolean>>({});
  const [extraFacilities, setExtraFacilities] = useState<Array<{ label: string; text: string }>>([]);
  const [extraLabel, setExtraLabel] = useState("");
  const [extraText, setExtraText] = useState("");

  // Versioning state (when editing existing offer)
  const [editingBaseRef, setEditingBaseRef] = useState<string | null>(null);

  // Preview & Submission State
  const [isPreviewModalOpen, setIsPreviewModalOpen] = useState(false);
  const [previewBlobUrl, setPreviewBlobUrl] = useState<string | null>(null);
  const [isGeneratingPdf, setIsGeneratingPdf] = useState(false);
  const [createdOfferInfo, setCreatedOfferInfo] = useState<{ refNo: string; signedUrl: string } | null>(null);

  // Candidate Profile Sheet
  const [viewingCandidateId, setViewingCandidateId] = useState<string | null>(null);

  // Expanded versions accordion state
  const [expandedBaseRefs, setExpandedBaseRefs] = useState<Record<string, boolean>>({});

  // Toast / Error
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

  // Load Masters, Candidates, and Offers
  const fetchData = useCallback(async () => {
    if (!company?.id) return;
    try {
      setIsLoading(true);

      const [mRes, rRes, lRes, cRes, oRes] = await Promise.all([
        supabase.from("masters").select("*").eq("company_id", company.id).order("sort_order"),
        supabase.from("responsibilities").select("*").eq("company_id", company.id).order("sort_order"),
        supabase.from("letter_texts").select("*").eq("company_id", company.id),
        supabase.from("candidates").select("id, interview_no, candidate_name, mobile_no, address, position_applied_for, final_status").eq("company_id", company.id).order("interview_no", { ascending: false }),
        supabase.from("offers").select("*, candidate:candidates!offers_candidate_id_fkey(id, interview_no, candidate_name, mobile_no, position_applied_for)").eq("company_id", company.id).order("created_at", { ascending: false }),
      ]);

      if (mRes.data) {
        const m = mRes.data;
        const des = m.filter((x: any) => x.type === "Designation").map((x: any) => x.value);
        const rep = m.filter((x: any) => x.type === "Reporting To").map((x: any) => x.value);
        const prj = m.filter((x: any) => x.type === "Project").map((x: any) => x.value);
        const pst = m.filter((x: any) => x.type === "Place of Posting").map((x: any) => x.value);
        const not = m.filter((x: any) => x.type === "Notice Period").map((x: any) => x.value);
        const acc = m.filter((x: any) => x.type === "Accommodation").map((x: any) => x.value);
        const trn = m.filter((x: any) => x.type === "Official Transportation").map((x: any) => x.value);
        const fd = m.filter((x: any) => x.type === "Food").map((x: any) => x.value);

        setDesignations(des);
        setReportingToList(rep);
        setProjects(prj);
        setPostings(pst);
        setNoticePeriods(not);
        setMasterAccommodation(acc);
        setMasterTransport(trn);
        setMasterFood(fd);

        // Pre-tick master facilities
        const aObj: Record<string, boolean> = {};
        acc.forEach((p: string) => (aObj[p] = true));
        setAccommodationChecked(aObj);

        const tObj: Record<string, boolean> = {};
        trn.forEach((p: string) => (tObj[p] = true));
        setTransportChecked(tObj);

        const fObj: Record<string, boolean> = {};
        fd.forEach((p: string) => (fObj[p] = true));
        setFoodChecked(fObj);

        if (des.length > 0 && !designation) setDesignation(des[0]);
        if (rep.length > 0 && !reportingTo) setReportingTo(rep[0]);
        if (prj.length > 0 && !project) setProject(prj[0]);
        if (pst.length > 0 && !posting) setPosting(pst[0]);
        if (not.length > 0 && !noticePeriod) setNoticePeriod(not[0]);
      }

      if (rRes.data) setAllResponsibilities(rRes.data);

      if (lRes.data) {
        const ltObj: Record<string, string> = {};
        lRes.data.forEach((item: any) => {
          ltObj[item.key.toLowerCase()] = item.text;
        });
        setLetterTexts(ltObj);
      }

      if (cRes.data) setCandidates(cRes.data as CandidateOption[]);
      if (oRes.data) setOffers(oRes.data as OfferRow[]);

      // If query candidate_id passed in URL, switch to Issue tab
      if (queryCandidateId) {
        setSelectedCandidateId(queryCandidateId);
        setActiveTab("issue");
      }
    } catch (err: any) {
      showError(err.message || "Failed to load offers");
    } finally {
      setIsLoading(false);
    }
  }, [company?.id, queryCandidateId, supabase, designation, reportingTo, project, posting, noticePeriod]);

  useEffect(() => {
    fetchData();

    if (!company?.id) return;
    const channel = supabase
      .channel("offers-realtime")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "offers", filter: `company_id=eq.${company.id}` },
        () => fetchData()
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [company?.id, fetchData, supabase]);

  // When selected candidate changes, auto-fill position if matching
  useEffect(() => {
    if (!selectedCandidateId) return;
    const cand = candidates.find((c) => c.id === selectedCandidateId);
    if (cand?.position_applied_for && designations.includes(cand.position_applied_for)) {
      setDesignation(cand.position_applied_for);
    }
  }, [selectedCandidateId, candidates, designations]);

  // When designation changes, auto-load responsibilities from master
  useEffect(() => {
    if (!designation) return;
    const relevant = allResponsibilities.filter((r) => r.designation === designation);
    setSelectedResponsibilities(
      relevant.map((r) => ({
        title: r.title || undefined,
        text: r.text,
        enabled: true,
      }))
    );
  }, [designation, allResponsibilities]);

  // Auto-sync acceptBy with joiningDate
  const handleJoiningDateChange = (val: string) => {
    setJoiningDate(val);
    if (!acceptBy || acceptBy === joiningDate) {
      setAcceptBy(val);
    }
  };

  // Selected candidate object
  const currentCandidate = useMemo(() => {
    return candidates.find((c) => c.id === selectedCandidateId) || null;
  }, [candidates, selectedCandidateId]);

  // Duplicate active offer warning check
  const duplicateOfferWarning = useMemo(() => {
    if (!selectedCandidateId) return null;
    const existing = offers.find(
      (o) => o.candidate_id === selectedCandidateId && o.is_active && (o.status === "Issued" || o.status === "Accepted")
    );
    return existing || null;
  }, [selectedCandidateId, offers]);

  // Group offers by base_ref
  const groupedOffers = useMemo(() => {
    const map: Record<string, { active: OfferRow; versions: OfferRow[] }> = {};

    offers.forEach((o) => {
      if (!map[o.base_ref]) {
        map[o.base_ref] = { active: o, versions: [] };
      }
      map[o.base_ref].versions.push(o);
      if (o.is_active) {
        map[o.base_ref].active = o;
      }
    });

    return Object.values(map);
  }, [offers]);

  // Build Payload object for preview / creation
  const getOfferPayload = () => {
    const activeResp = selectedResponsibilities
      .filter((r) => r.enabled)
      .map((r) => ({ title: r.title || null, text: r.text }));

    const facilities: Array<{ label: string; text: string }> = [];

    // Accommodation
    const activeAcc = masterAccommodation.filter((a) => accommodationChecked[a]);
    if (activeAcc.length > 0) {
      facilities.push({ label: "Accommodation:", text: activeAcc.join("\n") });
    }

    // Transport
    const activeTrn = masterTransport.filter((t) => transportChecked[t]);
    if (activeTrn.length > 0) {
      facilities.push({ label: "Official Transportation:", text: activeTrn.join("\n") });
    }

    // Food
    const activeFd = masterFood.filter((f) => foodChecked[f]);
    if (activeFd.length > 0) {
      facilities.push({ label: "Food / Mess:", text: activeFd.join("\n") });
    }

    // Extras
    extraFacilities.forEach((ef) => {
      facilities.push({ label: ef.label.endsWith(":") ? ef.label : `${ef.label}:`, text: ef.text });
    });

    return {
      candidateId: selectedCandidateId,
      baseRef: editingBaseRef,
      letterDate,
      candidateName: currentCandidate?.candidate_name || "Candidate Name",
      candidateAddress: currentCandidate?.address || null,
      candidateMobile: currentCandidate?.mobile_no || null,
      designation,
      reportingTo,
      project,
      posting,
      noticePeriod,
      salary,
      joiningDate,
      acceptBy: acceptBy || joiningDate,
      responsibilities: activeResp,
      facilities,
      letterTexts,
    };
  };

  // Open Preview Modal
  const handleGeneratePreview = async () => {
    if (!selectedCandidateId || !salary || !joiningDate) {
      showError("Please fill candidate, salary, and joining date before preview");
      return;
    }

    try {
      setIsGeneratingPdf(true);
      const payload = getOfferPayload();

      const res = await fetch("/api/offers/preview", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || "Failed to generate preview");
      }

      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      setPreviewBlobUrl(url);
      setIsPreviewModalOpen(true);
    } catch (err: any) {
      showError(err.message || "Preview error");
    } finally {
      setIsGeneratingPdf(false);
    }
  };

  // Submit and Create Final PDF
  const handleSubmitOffer = async () => {
    if (!selectedCandidateId || !salary || !joiningDate) {
      showError("Please fill all required fields");
      return;
    }

    try {
      setIsGeneratingPdf(true);
      setSyncing(true);
      const payload = getOfferPayload();

      const res = await fetch("/api/offers/create", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to issue offer");

      setCreatedOfferInfo({
        refNo: data.refNo,
        signedUrl: data.signedUrl,
      });

      showToast(`Offer ${data.refNo} issued successfully!`);
      setIsPreviewModalOpen(false);
      setEditingBaseRef(null);
      fetchData();
    } catch (err: any) {
      showError(err.message || "Failed to create offer");
    } finally {
      setIsGeneratingPdf(false);
      setSyncing(false);
    }
  };

  // Load an offer into the Issue form to create a new version (-v2, -v3...)
  const handleEditNewVersion = (offer: OfferRow) => {
    const payload = offer.payload || {};
    setSelectedCandidateId(offer.candidate_id);
    setEditingBaseRef(offer.base_ref);
    setLetterDate(new Date().toISOString().split("T")[0]);
    if (payload.designation) setDesignation(payload.designation);
    if (payload.reportingTo) setReportingTo(payload.reportingTo);
    if (payload.project) setProject(payload.project);
    if (payload.posting) setPosting(payload.posting);
    if (payload.noticePeriod) setNoticePeriod(payload.noticePeriod);
    if (payload.salary) setSalary(payload.salary);
    if (payload.joiningDate) setJoiningDate(payload.joiningDate);
    if (payload.acceptBy) setAcceptBy(payload.acceptBy);

    if (payload.responsibilities) {
      setSelectedResponsibilities(
        payload.responsibilities.map((r: any) => ({
          title: r.title || undefined,
          text: r.text,
          enabled: true,
        }))
      );
    }

    setActiveTab("issue");
    showToast(`Loaded ${offer.base_ref} into form. Submitting will create the next version.`);
  };

  // Change Offer Status (e.g. Issued -> Accepted / Declined)
  const handleChangeStatus = async (offer: OfferRow, newStatus: OfferRow["status"]) => {
    try {
      setSyncing(true);
      const updateData: any = { status: newStatus };
      if (newStatus === "Accepted") {
        updateData.accepted_on = new Date().toISOString().split("T")[0];
      }

      const { error } = await supabase
        .from("offers")
        .update(updateData)
        .eq("id", offer.id)
        .eq("company_id", company!.id);

      if (error) throw error;

      setOffers((prev) =>
        prev.map((o) => (o.id === offer.id ? { ...o, ...updateData } : o))
      );
      showToast(`Offer marked as ${newStatus}`);
    } catch (err: any) {
      showError(err.message || "Failed to update status");
    } finally {
      setSyncing(false);
    }
  };

  // Make an older version active
  const handleMakeMain = async (baseRef: string, targetOfferId: string) => {
    try {
      setSyncing(true);
      // Deactivate all in base_ref
      await supabase
        .from("offers")
        .update({ is_active: false })
        .eq("base_ref", baseRef)
        .eq("company_id", company!.id);

      // Activate selected version
      await supabase
        .from("offers")
        .update({ is_active: true })
        .eq("id", targetOfferId)
        .eq("company_id", company!.id);

      fetchData();
      showToast("Main active version updated");
    } catch (err: any) {
      showError(err.message || "Failed to change active version");
    } finally {
      setSyncing(false);
    }
  };

  // Delete offer to trash
  const handleDeleteOffer = async (offer: OfferRow) => {
    if (!confirm(`Move offer ${offer.ref_no} to Trash?`)) return;

    try {
      setSyncing(true);
      await supabase.from("trash").insert({
        company_id: company!.id,
        type: "Offer",
        key: offer.id,
        label: `Offer: ${offer.ref_no}`,
        details: `${offer.designation} • Candidate: ${offer.candidate?.candidate_name || "Candidate"}`,
        payload: offer,
        reason: "Deleted from Offers page",
        deleted_by: profile?.id || null,
      });

      await supabase.from("offers").delete().eq("id", offer.id);
      setOffers((prev) => prev.filter((o) => o.id !== offer.id));
      showToast(`Offer ${offer.ref_no} moved to Trash`);
    } catch (err: any) {
      showError(err.message || "Failed to delete offer");
    } finally {
      setSyncing(false);
    }
  };

  return (
    <Shell>
      <div className="space-y-6 max-w-6xl mx-auto pb-12">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2.5">
              <div className="w-9 h-9 rounded-xl bg-[#0A2E5A] text-white flex items-center justify-center shadow-sm">
                <FileCheck className="w-5 h-5 text-[#F5741A]" />
              </div>
              <h1 className="text-2xl font-bold text-[#0A2E5A] tracking-tight">Offer letters</h1>
            </div>
            <p className="text-xs text-gray-500 mt-1">
              Issue professional multi-page appointment letters with automatic duties and letterhead
            </p>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => {
                setActiveTab(activeTab === "issued" ? "issue" : "issued");
                setEditingBaseRef(null);
              }}
              className={cn(
                "flex items-center gap-1.5 px-4 py-2 text-xs font-bold rounded-xl shadow-xs transition-all",
                activeTab === "issue"
                  ? "bg-[#0A2E5A] text-white"
                  : "bg-[#F5741A] hover:bg-[#D9610E] text-white"
              )}
            >
              {activeTab === "issue" ? (
                <>
                  <Layers className="w-4 h-4" />
                  <span>View issued offers</span>
                </>
              ) : (
                <>
                  <Plus className="w-4 h-4" />
                  <span>Issue offer letter</span>
                </>
              )}
            </button>
          </div>
        </div>

        {/* Toast / Error */}
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

        {/* Success Modal after Offer Creation */}
        {createdOfferInfo && (
          <div className="p-4 bg-emerald-50 border border-emerald-300 rounded-2xl flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs text-emerald-900 shadow-sm animate-in fade-in">
            <div className="flex items-center gap-2.5">
              <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
              <div>
                <span className="font-bold text-sm block">Offer {createdOfferInfo.refNo} Generated!</span>
                <span>The candidate has been marked Selected with call log and audit record created.</span>
              </div>
            </div>

            <div className="flex items-center gap-2 shrink-0">
              <a
                href={createdOfferInfo.signedUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="px-3.5 py-1.5 bg-[#0A2E5A] hover:bg-[#071E3D] text-white font-bold rounded-xl flex items-center gap-1.5 shadow-xs"
              >
                <Download className="w-3.5 h-3.5" />
                <span>Download PDF</span>
              </a>

              <button
                onClick={() => setCreatedOfferInfo(null)}
                className="p-1 text-emerald-700 hover:text-emerald-900"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}

        {/* TAB 1: ISSUED OFFERS LIST */}
        {activeTab === "issued" && (
          <div className="space-y-4">
            {isLoading ? (
              <div className="py-20 text-center text-xs text-gray-400">Loading issued offers...</div>
            ) : groupedOffers.length === 0 ? (
              <div className="bg-white rounded-3xl p-16 text-center border border-gray-100 shadow-sm space-y-3">
                <FileCheck className="w-12 h-12 text-gray-300 mx-auto" />
                <h3 className="text-sm font-bold text-gray-900">No offer letters issued yet</h3>
                <p className="text-xs text-gray-500 max-w-sm mx-auto">
                  Click &quot;Issue offer letter&quot; above to issue an appointment letter with automatic terms.
                </p>
                <button
                  onClick={() => setActiveTab("issue")}
                  className="inline-flex items-center gap-1.5 px-4 py-2 bg-[#F5741A] hover:bg-[#D9610E] text-white text-xs font-bold rounded-xl shadow-xs"
                >
                  <Plus className="w-4 h-4" />
                  <span>Issue first offer</span>
                </button>
              </div>
            ) : (
              groupedOffers.map((group) => {
                const active = group.active;
                const cand = active.candidate;
                const isExpanded = Boolean(expandedBaseRefs[active.base_ref]);
                const rawMobile = cand?.mobile_no?.replace(/\D/g, "") || "";
                const phone10 = rawMobile.length >= 10 ? rawMobile.slice(-10) : "";

                return (
                  <div
                    key={active.base_ref}
                    className="bg-white rounded-2xl p-5 shadow-sm border border-gray-100 space-y-4 hover:shadow-md transition-shadow"
                  >
                    <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-3 border-b border-gray-100">
                      <div>
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="font-mono text-sm font-bold text-[#0A2E5A] bg-blue-50 px-2.5 py-0.5 rounded-lg border border-blue-100">
                            {active.ref_no}
                          </span>
                          <h3 className="text-sm font-bold text-gray-900">
                            {cand?.candidate_name || "Candidate"}
                          </h3>
                          {group.versions.length > 1 && (
                            <span className="text-[10px] bg-purple-50 text-purple-700 font-bold px-2 py-0.5 rounded-full border border-purple-200">
                              {group.versions.length} versions
                            </span>
                          )}
                        </div>
                        <p className="text-xs text-gray-500 mt-1">
                          {active.designation} • Salary: <strong>{active.salary}</strong> • Joining: {active.joining_date}
                        </p>
                      </div>

                      {/* Status Segmented Control */}
                      <div className="flex items-center gap-1 bg-gray-50 p-1 rounded-xl border border-gray-200 shrink-0">
                        {(["Issued", "Accepted", "Declined", "Expired", "Withdrawn"] as const).map((st) => (
                          <button
                            key={st}
                            onClick={() => handleChangeStatus(active, st)}
                            className={cn(
                              "px-2.5 py-1 text-[11px] font-bold rounded-lg transition-all",
                              active.status === st
                                ? st === "Accepted"
                                  ? "bg-emerald-600 text-white shadow-xs"
                                  : st === "Declined"
                                  ? "bg-red-600 text-white shadow-xs"
                                  : "bg-[#0A2E5A] text-white shadow-xs"
                                : "text-gray-600 hover:text-gray-900"
                            )}
                          >
                            {st}
                          </button>
                        ))}
                      </div>
                    </div>

                    {/* Action Buttons */}
                    <div className="flex flex-wrap items-center justify-between gap-3 text-xs pt-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        {/* View PDF */}
                        <button
                          onClick={async () => {
                            try {
                              const res = await fetch(`/api/files/signed?bucket=offers&path=${encodeURIComponent(active.pdf_path)}`);
                              const data = await res.json();
                              if (data.signedUrl) window.open(data.signedUrl, "_blank");
                            } catch (e) {
                              alert("Could not load PDF link");
                            }
                          }}
                          className="px-3 py-1.5 bg-gray-50 hover:bg-gray-100 text-gray-800 border border-gray-200 font-bold rounded-xl flex items-center gap-1.5 transition-colors"
                        >
                          <Eye className="w-3.5 h-3.5 text-[#1B8BD8]" />
                          <span>View PDF</span>
                        </button>

                        {/* Edit -> New version */}
                        <button
                          onClick={() => handleEditNewVersion(active)}
                          className="px-3 py-1.5 bg-gray-50 hover:bg-gray-100 text-gray-800 border border-gray-200 font-bold rounded-xl flex items-center gap-1.5 transition-colors"
                        >
                          <Edit2 className="w-3.5 h-3.5 text-[#F5741A]" />
                          <span>Edit new version</span>
                        </button>

                        {/* WhatsApp to Employee */}
                        {phone10 && (
                          <button
                            onClick={async () => {
                              try {
                                const res = await fetch(`/api/files/signed?bucket=offers&path=${encodeURIComponent(active.pdf_path)}`);
                                const data = await res.json();
                                const msg = `Namaskar ${cand?.candidate_name?.split(" ")[0]}, ${company?.name} kadun tumche offer letter issue zalele aahe. Krupaya PDF link open kara: ${data.signedUrl || ""}`;
                                window.open(`https://wa.me/91${phone10}?text=${encodeURIComponent(msg)}`, "_blank");
                              } catch (e) {
                                alert("Failed to generate WhatsApp link");
                              }
                            }}
                            className="px-3 py-1.5 bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border border-emerald-200 font-bold rounded-xl flex items-center gap-1.5 transition-colors"
                          >
                            <MessageSquare className="w-3.5 h-3.5 text-emerald-600" />
                            <span>WhatsApp employee</span>
                          </button>
                        )}

                        {/* Candidate Profile */}
                        {cand?.id && (
                          <button
                            onClick={() => setViewingCandidateId(cand.id)}
                            className="px-3 py-1.5 bg-blue-50 hover:bg-blue-100 text-[#1B8BD8] border border-blue-200 font-bold rounded-xl flex items-center gap-1.5 transition-colors"
                          >
                            <User className="w-3.5 h-3.5" />
                            <span>Profile</span>
                          </button>
                        )}
                      </div>

                      {/* Versions Dropdown Toggle & Delete */}
                      <div className="flex items-center gap-2">
                        {group.versions.length > 1 && (
                          <button
                            onClick={() =>
                              setExpandedBaseRefs((prev) => ({
                                ...prev,
                                [active.base_ref]: !prev[active.base_ref],
                              }))
                            }
                            className="flex items-center gap-1 text-xs text-gray-500 hover:text-gray-900 font-semibold"
                          >
                            <span>Versions ({group.versions.length})</span>
                            {isExpanded ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
                          </button>
                        )}

                        <button
                          onClick={() => handleDeleteOffer(active)}
                          className="p-1.5 text-gray-400 hover:text-red-600 rounded-lg hover:bg-red-50"
                          title="Move to Trash"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>

                    {/* Versions Expanded Sub-List */}
                    {isExpanded && group.versions.length > 1 && (
                      <div className="mt-3 pt-3 border-t border-gray-100 space-y-2 bg-gray-50/50 p-3 rounded-xl">
                        <span className="text-[11px] font-bold uppercase tracking-wider text-gray-400 block mb-1">
                          Version History:
                        </span>
                        {group.versions.map((ver) => (
                          <div
                            key={ver.id}
                            className="flex items-center justify-between text-xs p-2 rounded-lg bg-white border border-gray-100"
                          >
                            <div className="flex items-center gap-2">
                              <span className="font-mono font-bold text-gray-700">{ver.ref_no}</span>
                              {ver.is_active && (
                                <span className="text-[10px] bg-emerald-100 text-emerald-800 font-bold px-1.5 py-0.2 rounded">
                                  Active
                                </span>
                              )}
                              <span className="text-gray-400 text-[10px]">
                                {new Date(ver.created_at).toLocaleDateString()}
                              </span>
                            </div>

                            <div className="flex items-center gap-2">
                              {!ver.is_active && (
                                <button
                                  onClick={() => handleMakeMain(active.base_ref, ver.id)}
                                  className="text-[11px] text-[#1B8BD8] hover:underline font-bold"
                                >
                                  Make main
                                </button>
                              )}
                              <button
                                onClick={async () => {
                                  try {
                                    const res = await fetch(`/api/files/signed?bucket=offers&path=${encodeURIComponent(ver.pdf_path)}`);
                                    const data = await res.json();
                                    if (data.signedUrl) window.open(data.signedUrl, "_blank");
                                  } catch (e) {
                                    alert("Could not load PDF");
                                  }
                                }}
                                className="text-[11px] text-gray-600 hover:text-gray-900 font-semibold"
                              >
                                View PDF
                              </button>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                );
              })
            )}
          </div>
        )}

        {/* TAB 2: ISSUE OFFER FORM (4 SECTIONS) */}
        {activeTab === "issue" && (
          <div className="space-y-6">
            {/* Editing banner if versioning */}
            {editingBaseRef && (
              <div className="p-3.5 bg-blue-50 border border-blue-200 text-blue-900 text-xs rounded-2xl flex items-center justify-between">
                <span>Creating new revision for offer <strong>{editingBaseRef}</strong></span>
                <button
                  onClick={() => setEditingBaseRef(null)}
                  className="text-xs font-bold text-blue-700 hover:underline"
                >
                  Clear revision mode
                </button>
              </div>
            )}

            {/* Warning if candidate already has active offer */}
            {duplicateOfferWarning && (
              <div className="p-3.5 bg-amber-50 border border-amber-300 text-amber-900 text-xs rounded-2xl flex items-center gap-2">
                <AlertCircle className="w-4 h-4 text-amber-600 shrink-0" />
                <span>
                  Notice: This candidate already has an active offer (<strong>{duplicateOfferWarning.ref_no}</strong>, status: {duplicateOfferWarning.status}).
                </span>
              </div>
            )}

            {/* SECTION 1: CANDIDATE & LETTER DATE */}
            <div className="bg-white rounded-3xl p-6 shadow-sm border border-gray-100 space-y-4">
              <h3 className="text-sm font-bold text-[#0A2E5A] border-b border-gray-100 pb-2.5 flex items-center gap-2">
                <span className="w-6 h-6 rounded-full bg-[#0A2E5A] text-white flex items-center justify-center text-xs font-bold">1</span>
                <span>Candidate & Letter Date</span>
              </h3>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-1">
                    Select Candidate <span className="text-red-500">*</span>
                  </label>
                  <select
                    required
                    value={selectedCandidateId}
                    onChange={(e) => setSelectedCandidateId(e.target.value)}
                    className="w-full px-3.5 py-2 bg-gray-50 border border-gray-200 rounded-xl text-xs font-semibold text-gray-800 focus:ring-2 focus:ring-[#F5741A] focus:bg-white"
                  >
                    <option value="">-- Choose Candidate --</option>
                    {candidates.map((c) => (
                      <option key={c.id} value={c.id}>
                        #{c.interview_no} {c.candidate_name} ({c.position_applied_for || "Candidate"})
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-1">
                    Letter Date <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="date"
                    required
                    value={letterDate}
                    onChange={(e) => setLetterDate(e.target.value)}
                    className="w-full px-3.5 py-2 bg-gray-50 border border-gray-200 rounded-xl text-xs focus:ring-2 focus:ring-[#F5741A] focus:bg-white"
                  />
                </div>
              </div>

              {currentCandidate && (
                <div className="p-3 bg-gray-50/70 rounded-xl border border-gray-100 text-xs text-gray-600 grid grid-cols-1 sm:grid-cols-3 gap-2">
                  <div>Mobile: <strong>{currentCandidate.mobile_no}</strong></div>
                  <div>Current Status: <strong>{currentCandidate.final_status}</strong></div>
                  <div>Address: <strong>{currentCandidate.address || "N/A"}</strong></div>
                </div>
              )}
            </div>

            {/* SECTION 2: POSITION & GOVERNANCE */}
            <div className="bg-white rounded-3xl p-6 shadow-sm border border-gray-100 space-y-4">
              <h3 className="text-sm font-bold text-[#0A2E5A] border-b border-gray-100 pb-2.5 flex items-center gap-2">
                <span className="w-6 h-6 rounded-full bg-[#0A2E5A] text-white flex items-center justify-center text-xs font-bold">2</span>
                <span>Position & Governance</span>
              </h3>

              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-1">
                    Designation <span className="text-red-500">*</span>
                  </label>
                  <select
                    value={designation}
                    onChange={(e) => setDesignation(e.target.value)}
                    className="w-full px-3.5 py-2 bg-gray-50 border border-gray-200 rounded-xl text-xs font-semibold text-gray-800 focus:ring-2 focus:ring-[#F5741A] focus:bg-white"
                  >
                    {designations.map((d) => (
                      <option key={d} value={d}>
                        {d}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-1">Reporting To</label>
                  <select
                    value={reportingTo}
                    onChange={(e) => setReportingTo(e.target.value)}
                    className="w-full px-3.5 py-2 bg-gray-50 border border-gray-200 rounded-xl text-xs font-semibold text-gray-800"
                  >
                    {reportingToList.map((r) => (
                      <option key={r} value={r}>
                        {r}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-1">Assigned Project</label>
                  <select
                    value={project}
                    onChange={(e) => setProject(e.target.value)}
                    className="w-full px-3.5 py-2 bg-gray-50 border border-gray-200 rounded-xl text-xs font-semibold text-gray-800"
                  >
                    {projects.map((p) => (
                      <option key={p} value={p}>
                        {p}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-1">Place of Posting</label>
                  <select
                    value={posting}
                    onChange={(e) => setPosting(e.target.value)}
                    className="w-full px-3.5 py-2 bg-gray-50 border border-gray-200 rounded-xl text-xs font-semibold text-gray-800"
                  >
                    {postings.map((p) => (
                      <option key={p} value={p}>
                        {p}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-1">Notice Period</label>
                  <select
                    value={noticePeriod}
                    onChange={(e) => setNoticePeriod(e.target.value)}
                    className="w-full px-3.5 py-2 bg-gray-50 border border-gray-200 rounded-xl text-xs font-semibold text-gray-800"
                  >
                    {noticePeriods.map((n) => (
                      <option key={n} value={n}>
                        {n}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Responsibilities Auto-Loaded Checklist */}
              <div className="pt-2">
                <label className="block text-xs font-bold text-gray-800 mb-2">
                  Job Responsibilities (Auto-loaded for {designation}):
                </label>

                {selectedResponsibilities.length === 0 ? (
                  <p className="text-xs text-gray-400 italic">No duties configured for {designation} in Masters.</p>
                ) : (
                  <div className="space-y-2">
                    {selectedResponsibilities.map((resp, i) => (
                      <label
                        key={i}
                        className={cn(
                          "flex items-start gap-3 p-3 rounded-xl border cursor-pointer transition-all",
                          resp.enabled ? "bg-blue-50/40 border-blue-200" : "bg-gray-50 border-gray-200 opacity-60"
                        )}
                      >
                        <input
                          type="checkbox"
                          checked={resp.enabled}
                          onChange={(e) => {
                            const updated = [...selectedResponsibilities];
                            updated[i].enabled = e.target.checked;
                            setSelectedResponsibilities(updated);
                          }}
                          className="w-4 h-4 text-[#F5741A] rounded mt-0.5"
                        />
                        <div className="text-xs leading-relaxed flex-1">
                          {resp.title && <strong className="text-gray-900 block">{resp.title}</strong>}
                          <span className="text-gray-700">{resp.text}</span>
                        </div>
                      </label>
                    ))}
                  </div>
                )}
              </div>
            </div>

            {/* SECTION 3: TERMS & COMPENSATION */}
            <div className="bg-white rounded-3xl p-6 shadow-sm border border-gray-100 space-y-4">
              <h3 className="text-sm font-bold text-[#0A2E5A] border-b border-gray-100 pb-2.5 flex items-center gap-2">
                <span className="w-6 h-6 rounded-full bg-[#0A2E5A] text-white flex items-center justify-center text-xs font-bold">3</span>
                <span>Compensation & Joining</span>
              </h3>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-1">
                    Monthly Gross Salary <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    value={salary}
                    onChange={(e) => setSalary(e.target.value)}
                    placeholder="₹45,000/-"
                    className="w-full px-3.5 py-2 bg-gray-50 border border-gray-200 rounded-xl text-xs font-bold text-gray-900 focus:ring-2 focus:ring-[#F5741A] focus:bg-white font-mono"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-1">
                    Date of Joining <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="date"
                    required
                    value={joiningDate}
                    onChange={(e) => handleJoiningDateChange(e.target.value)}
                    className="w-full px-3.5 py-2 bg-gray-50 border border-gray-200 rounded-xl text-xs focus:ring-2 focus:ring-[#F5741A] focus:bg-white"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-1">
                    Acceptance Deadline <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="date"
                    required
                    value={acceptBy}
                    onChange={(e) => setAcceptBy(e.target.value)}
                    className="w-full px-3.5 py-2 bg-gray-50 border border-gray-200 rounded-xl text-xs focus:ring-2 focus:ring-[#F5741A] focus:bg-white"
                  />
                </div>
              </div>
            </div>

            {/* SECTION 4: FACILITIES & EXTRAS */}
            <div className="bg-white rounded-3xl p-6 shadow-sm border border-gray-100 space-y-5">
              <h3 className="text-sm font-bold text-[#0A2E5A] border-b border-gray-100 pb-2.5 flex items-center gap-2">
                <span className="w-6 h-6 rounded-full bg-[#0A2E5A] text-white flex items-center justify-center text-xs font-bold">4</span>
                <span>Facilities & Extra Terms</span>
              </h3>

              {/* Accommodation */}
              <div className="space-y-2">
                <label className="block text-xs font-bold text-gray-800">Accommodation Terms:</label>
                {masterAccommodation.map((acc) => (
                  <label key={acc} className="flex items-start gap-2.5 text-xs text-gray-700 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={Boolean(accommodationChecked[acc])}
                      onChange={(e) =>
                        setAccommodationChecked((prev) => ({ ...prev, [acc]: e.target.checked }))
                      }
                      className="w-4 h-4 text-[#F5741A] rounded mt-0.5"
                    />
                    <span>{acc}</span>
                  </label>
                ))}
              </div>

              {/* Transportation */}
              <div className="space-y-2">
                <label className="block text-xs font-bold text-gray-800">Official Transportation Terms:</label>
                {masterTransport.map((trn) => (
                  <label key={trn} className="flex items-start gap-2.5 text-xs text-gray-700 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={Boolean(transportChecked[trn])}
                      onChange={(e) =>
                        setTransportChecked((prev) => ({ ...prev, [trn]: e.target.checked }))
                      }
                      className="w-4 h-4 text-[#F5741A] rounded mt-0.5"
                    />
                    <span>{trn}</span>
                  </label>
                ))}
              </div>

              {/* Food */}
              <div className="space-y-2">
                <label className="block text-xs font-bold text-gray-800">Food / Mess Terms:</label>
                {masterFood.map((fd) => (
                  <label key={fd} className="flex items-start gap-2.5 text-xs text-gray-700 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={Boolean(foodChecked[fd])}
                      onChange={(e) =>
                        setFoodChecked((prev) => ({ ...prev, [fd]: e.target.checked }))
                      }
                      className="w-4 h-4 text-[#F5741A] rounded mt-0.5"
                    />
                    <span>{fd}</span>
                  </label>
                ))}
              </div>

              {/* Custom Extra Rows */}
              <div className="space-y-3 pt-2 border-t border-gray-100">
                <label className="block text-xs font-bold text-gray-800">Additional Facility Rows (Optional):</label>
                {extraFacilities.map((ef, idx) => (
                  <div key={idx} className="p-2.5 bg-gray-50 rounded-xl flex items-center justify-between gap-3 text-xs">
                    <div>
                      <strong>{ef.label}: </strong>
                      <span>{ef.text}</span>
                    </div>
                    <button
                      onClick={() => setExtraFacilities((prev) => prev.filter((_, i) => i !== idx))}
                      className="text-red-500 hover:text-red-700 p-1"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                ))}

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                  <input
                    type="text"
                    value={extraLabel}
                    onChange={(e) => setExtraLabel(e.target.value)}
                    placeholder="Particular Label (e.g. Mobile SIM)"
                    className="px-3 py-1.5 bg-gray-50 border border-gray-200 rounded-xl text-xs"
                  />
                  <input
                    type="text"
                    value={extraText}
                    onChange={(e) => setExtraText(e.target.value)}
                    placeholder="Terms description..."
                    className="sm:col-span-2 px-3 py-1.5 bg-gray-50 border border-gray-200 rounded-xl text-xs"
                  />
                </div>
                {extraLabel.trim() && extraText.trim() && (
                  <button
                    type="button"
                    onClick={() => {
                      setExtraFacilities((prev) => [...prev, { label: extraLabel.trim(), text: extraText.trim() }]);
                      setExtraLabel("");
                      setExtraText("");
                    }}
                    className="px-3 py-1 bg-gray-200 hover:bg-gray-300 text-gray-800 text-xs font-bold rounded-lg"
                  >
                    + Add row
                  </button>
                )}
              </div>
            </div>

            {/* ACTION BUTTONS: PREVIEW & SUBMIT */}
            <div className="p-4 bg-white rounded-3xl border border-gray-100 shadow-md flex items-center justify-end gap-3 sticky bottom-4 z-30">
              <button
                type="button"
                disabled={isGeneratingPdf}
                onClick={handleGeneratePreview}
                className="px-5 py-2.5 bg-white border border-gray-300 hover:bg-gray-50 text-gray-800 text-xs font-bold rounded-xl shadow-xs transition-all flex items-center gap-1.5"
              >
                <Eye className="w-4 h-4 text-[#1B8BD8]" />
                <span>{isGeneratingPdf ? "Generating..." : "Generate & Preview letter"}</span>
              </button>

              <button
                type="button"
                disabled={isGeneratingPdf}
                onClick={handleSubmitOffer}
                className="px-6 py-2.5 bg-[#F5741A] hover:bg-[#D9610E] disabled:opacity-50 text-white text-xs font-bold rounded-xl shadow-sm transition-all flex items-center gap-1.5"
              >
                <Check className="w-4 h-4" />
                <span>{isGeneratingPdf ? "Building PDF..." : "Submit & Issue PDF"}</span>
              </button>
            </div>
          </div>
        )}

        {/* 2-PAGE PDF PREVIEW MODAL */}
        {isPreviewModalOpen && previewBlobUrl && (
          <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-2 sm:p-6 animate-in fade-in">
            <div className="bg-white rounded-3xl w-full max-w-4xl h-[90vh] flex flex-col shadow-2xl overflow-hidden">
              <div className="p-4 border-b border-gray-100 flex items-center justify-between bg-white shrink-0">
                <div className="flex items-center gap-2">
                  <FileCheck className="w-5 h-5 text-[#F5741A]" />
                  <h3 className="text-sm font-bold text-[#0A2E5A]">2-Page Offer Letter PDF Preview</h3>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    onClick={handleSubmitOffer}
                    disabled={isGeneratingPdf}
                    className="px-4 py-2 bg-[#F5741A] hover:bg-[#D9610E] text-white text-xs font-bold rounded-xl shadow-xs"
                  >
                    {isGeneratingPdf ? "Building PDF..." : "Confirm & Issue PDF"}
                  </button>
                  <button
                    onClick={() => setIsPreviewModalOpen(false)}
                    className="p-1.5 text-gray-400 hover:text-gray-900 rounded-lg hover:bg-gray-100"
                  >
                    <X className="w-5 h-5" />
                  </button>
                </div>
              </div>

              <div className="flex-1 bg-gray-100 p-2 overflow-hidden">
                <iframe
                  src={previewBlobUrl}
                  className="w-full h-full rounded-2xl border border-gray-200"
                  title="PDF Preview"
                />
              </div>
            </div>
          </div>
        )}

        {/* Candidate Profile Sheet */}
        <CandidateProfileSheet
          candidateId={viewingCandidateId}
          isOpen={Boolean(viewingCandidateId)}
          onClose={() => setViewingCandidateId(null)}
          onCandidateUpdated={() => fetchData()}
        />
      </div>
    </Shell>
  );
}

export default function OffersPage() {
  return (
    <Suspense
      fallback={
        <Shell>
          <div className="py-20 text-center text-xs text-gray-400">Loading offers...</div>
        </Shell>
      }
    >
      <OffersContent />
    </Suspense>
  );
}
