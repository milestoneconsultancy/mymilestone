"use client";

import React, { useState, useEffect, useRef, useCallback, Suspense } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Shell } from "@/components/layout/Shell";
import { useAuth } from "@/components/providers/AuthProvider";
import { createClient } from "@/lib/supabase/client";
import {
  UserPlus,
  Upload,
  Camera,
  MessageSquare,
  Phone,
  AlertCircle,
  CheckCircle2,
  Sparkles,
  RotateCcw,
  Save,
  Check,
  FileText,
  Calendar,
  ExternalLink,
  X
} from "lucide-react";
import { cn } from "@/lib/utils";

function NewInterviewForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const editCandidateId = searchParams.get("edit");
  const incomingPath = searchParams.get("incoming");

  const { company, profile, setSyncing } = useAuth();
  const [positions, setPositions] = useState<string[]>([]);
  const [sites, setSites] = useState<string[]>([]);

  // 21 Fields State
  const [interviewNo, setInterviewNo] = useState<number>(1);
  const [interviewDate, setInterviewDate] = useState<string>(new Date().toISOString().split("T")[0]);
  const [candidateName, setCandidateName] = useState("");
  const [gender, setGender] = useState("Male");
  const [dateOfBirth, setDateOfBirth] = useState("");
  const [age, setAge] = useState<number | "">("");
  const [mobileNo, setMobileNo] = useState("");
  const [email, setEmail] = useState("");
  const [address, setAddress] = useState("");
  const [pincode, setPincode] = useState("");
  const [positionAppliedFor, setPositionAppliedFor] = useState("");
  const [site, setSite] = useState("");
  const [education, setEducation] = useState("");
  const [totalExperienceYears, setTotalExperienceYears] = useState<number | "">("");
  const [currentLocation, setCurrentLocation] = useState("");
  const [currentSalary, setCurrentSalary] = useState("");
  const [expectedSalary, setExpectedSalary] = useState("");
  const [joiningAvailability, setJoiningAvailability] = useState("");
  const [finalStatus, setFinalStatus] = useState<"Pending Call" | "Pending" | "Hold" | "Selected" | "Rejected">("Pending Call");
  const [joiningDate, setJoiningDate] = useState("");
  const [resumePath, setResumePath] = useState<string | null>(null);
  const [remarks, setRemarks] = useState("");

  // Upload & File State
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [isExtracting, setIsExtracting] = useState(false);
  const [extractionText, setExtractionText] = useState("");
  const [aiStatus, setAiStatus] = useState<"idle" | "parsing" | "success" | "busy">("idle");
  const [hasUserEditedAiFields, setHasUserEditedAiFields] = useState(false);

  // Duplicate Check State
  const [duplicateMatch, setDuplicateMatch] = useState<{ id: string; name: string; interview_no: number } | null>(null);

  // Submission State
  const [isSaving, setIsSaving] = useState(false);
  const [isDirty, setIsDirty] = useState(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const cameraInputRef = useRef<HTMLInputElement>(null);
  const whatsappInputRef = useRef<HTMLInputElement>(null);
  const retryTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  const supabase = createClient();

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3500);
  };

  const showError = (msg: string) => {
    setErrorMessage(msg);
    setTimeout(() => setErrorMessage(null), 4000);
  };

  // Fetch Masters (Designation, Site) and Next Interview Number
  useEffect(() => {
    if (!company?.id) return;

    async function loadMastersAndCounter() {
      try {
        const [mRes, countRes] = await Promise.all([
          supabase.from("masters").select("type, value").eq("company_id", company!.id),
          supabase.from("candidates").select("interview_no", { count: "exact" }).eq("company_id", company!.id).order("interview_no", { ascending: false }).limit(1),
        ]);

        if (mRes.data) {
          const desigs = mRes.data.filter((m: any) => m.type === "Designation").map((m: any) => m.value);
          const stList = mRes.data.filter((m: any) => m.type === "Site").map((m: any) => m.value);
          setPositions(desigs);
          setSites(stList);
          if (desigs.length > 0 && !positionAppliedFor) setPositionAppliedFor(desigs[0]);
          if (stList.length > 0 && !site) setSite(stList[0]);
        }

        if (!editCandidateId) {
          const highestNo = countRes.data?.[0]?.interview_no || 0;
          setInterviewNo(highestNo + 1);
        }
      } catch (e) {
        console.error("Failed to load initial masters", e);
      }
    }

    loadMastersAndCounter();
  }, [company?.id, editCandidateId, supabase]);

  // Load Existing Candidate if Editing
  useEffect(() => {
    if (!editCandidateId || !company?.id) return;

    async function loadCandidate() {
      try {
        const { data, error } = await supabase
          .from("candidates")
          .select("*")
          .eq("id", editCandidateId)
          .eq("company_id", company!.id)
          .single();

        if (!error && data) {
          setInterviewNo(data.interview_no);
          setInterviewDate(data.interview_date || "");
          setCandidateName(data.candidate_name || "");
          setGender(data.gender || "Male");
          setDateOfBirth(data.date_of_birth || "");
          setAge(data.age ?? "");
          setMobileNo(data.mobile_no || "");
          setEmail(data.email || "");
          setAddress(data.address || "");
          setPincode(data.pincode || "");
          setPositionAppliedFor(data.position_applied_for || "");
          setSite(data.site || "");
          setEducation(data.education || "");
          setTotalExperienceYears(data.total_experience_years !== null ? Number(data.total_experience_years) : "");
          setCurrentLocation(data.current_location || "");
          setCurrentSalary(data.current_salary || "");
          setExpectedSalary(data.expected_salary || "");
          setJoiningAvailability(data.joining_availability || "");
          setFinalStatus(data.final_status as any);
          setJoiningDate(data.joining_date || "");
          setResumePath(data.resume_path || null);
          setRemarks(data.remarks || "");
        }
      } catch (e) {
        console.error("Failed to load candidate for edit", e);
      }
    }

    loadCandidate();
  }, [editCandidateId, company?.id, supabase]);

  // Handle incoming file from PWA share target
  useEffect(() => {
    if (!incomingPath || !company?.id) return;
    setResumePath(incomingPath);
    showToast("File received from WhatsApp Share Target");
  }, [incomingPath, company?.id]);

  // Auto-calculate Age on DOB change
  const handleDobChange = (val: string) => {
    setDateOfBirth(val);
    setIsDirty(true);
    if (!val) {
      setAge("");
      return;
    }
    const birthDate = new Date(val);
    if (!isNaN(birthDate.getTime())) {
      const diff = Date.now() - birthDate.getTime();
      const calculatedAge = Math.floor(diff / (1000 * 60 * 60 * 24 * 365.25));
      setAge(calculatedAge >= 0 ? calculatedAge : "");
    }
  };

  // Duplicate Check debounced
  useEffect(() => {
    if (!company?.id) return;
    const cleanMobile = mobileNo.replace(/\D/g, "");
    if (cleanMobile.length < 10 && !email.includes("@")) {
      setDuplicateMatch(null);
      return;
    }

    const timer = setTimeout(async () => {
      try {
        let query = supabase.from("candidates").select("id, candidate_name, interview_no, mobile_no, email").eq("company_id", company.id);
        if (cleanMobile.length >= 10) {
          query = query.ilike("mobile_no", `%${cleanMobile.slice(-10)}%`);
        } else if (email) {
          query = query.eq("email", email.trim().toLowerCase());
        }

        const { data } = await query.limit(1);
        if (data && data.length > 0 && data[0].id !== editCandidateId) {
          setDuplicateMatch({
            id: data[0].id,
            name: data[0].candidate_name,
            interview_no: data[0].interview_no,
          });
        } else {
          setDuplicateMatch(null);
        }
      } catch (e) {
        // ignore
      }
    }, 400);

    return () => clearTimeout(timer);
  }, [mobileNo, email, company?.id, editCandidateId, supabase]);

  // Unsaved changes guard
  useEffect(() => {
    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      if (isDirty) {
        e.preventDefault();
        e.returnValue = "";
      }
    };
    window.addEventListener("beforeunload", handleBeforeUnload);
    return () => window.removeEventListener("beforeunload", handleBeforeUnload);
  }, [isDirty]);

  // Fast Regex Pre-Extraction from Raw Text
  const extractRegexFields = (text: string) => {
    // 10-digit Indian Mobile regex
    const mobileMatch = text.match(/(?:(?:\+|0{0,2})91[\s-]*)?([6-9]\d{9})/);
    const mobile = mobileMatch ? mobileMatch[1] : "";

    // Email regex
    const emailMatch = text.match(/[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/);
    const em = emailMatch ? emailMatch[0].toLowerCase() : "";

    // 6-digit Pincode regex
    const pincodeMatch = text.match(/\b([1-9]\d{5})\b/);
    const pin = pincodeMatch ? pincodeMatch[1] : "";

    // DOB regex (DD/MM/YYYY or DD-MM-YYYY)
    const dobMatch = text.match(/\b(\d{1,2})[/-](\d{1,2})[/-](\d{4})\b/);
    let dob = "";
    if (dobMatch) {
      const d = dobMatch[1].padStart(2, "0");
      const m = dobMatch[2].padStart(2, "0");
      const y = dobMatch[3];
      dob = `${y}-${m}-${d}`;
    }

    return { mobile_no: mobile, email: em, pincode: pin, date_of_birth: dob };
  };

  // Browser PDF.js Text Extraction (Fast Path with 8s timeout)
  const extractTextFromPdf = async (file: File): Promise<string> => {
    return new Promise(async (resolve, reject) => {
      const timeout = setTimeout(() => {
        reject(new Error("PDF text extraction timed out after 8s"));
      }, 8000);

      try {
        const pdfjs = await import("pdfjs-dist");
        // Use CDN worker
        pdfjs.GlobalWorkerOptions.workerSrc = `https://cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjs.version}/pdf.worker.min.mjs`;

        const arrayBuffer = await file.arrayBuffer();
        const loadingTask = pdfjs.getDocument({ data: arrayBuffer });
        const pdf = await loadingTask.promise;

        let fullText = "";
        const maxPages = Math.min(pdf.numPages, 3); // extract first 3 pages
        for (let i = 1; i <= maxPages; i++) {
          const page = await pdf.getPage(i);
          const textContent = await page.getTextContent();
          const pageText = textContent.items
            .map((item: any) => item.str)
            .join(" ");
          fullText += pageText + "\n";
        }

        clearTimeout(timeout);
        resolve(fullText.trim());
      } catch (err) {
        clearTimeout(timeout);
        reject(err);
      }
    });
  };

  // Process File: Extract text -> Instant Regex Prefill -> Gemini AI Fill
  const handleProcessFile = async (file: File) => {
    setSelectedFile(file);
    setIsDirty(true);
    setIsExtracting(true);
    setAiStatus("parsing");

    let rawText = "";
    const isPdf = file.type === "application/pdf" || file.name.endsWith(".pdf");

    if (isPdf) {
      try {
        rawText = await extractTextFromPdf(file);
        setExtractionText(rawText);
      } catch (err) {
        console.warn("Browser PDF text extraction failed or was scanned, falling back to multimodal file parser", err);
      }
    }

    if (rawText && rawText.length > 50) {
      // Instant regex prefill
      const regexFields = extractRegexFields(rawText);
      if (regexFields.mobile_no && !mobileNo) setMobileNo(regexFields.mobile_no);
      if (regexFields.email && !email) setEmail(regexFields.email);
      if (regexFields.pincode && !pincode) setPincode(regexFields.pincode);
      if (regexFields.date_of_birth && !dateOfBirth) handleDobChange(regexFields.date_of_birth);

      // Call Server Text Mode Gemini API
      try {
        const res = await fetch("/api/ai/resume", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ text: rawText, regexFields }),
        });

        const result = await res.json();
        if (result.aiOk && result.data) {
          applyAiData(result.data);
          setAiStatus("success");
          showToast("AI successfully extracted resume details");
        } else {
          setAiStatus("busy");
          scheduleAutoRetry(rawText, regexFields);
        }
      } catch (err) {
        setAiStatus("busy");
        scheduleAutoRetry(rawText, regexFields);
      }
    } else {
      // Scanned PDF or Image: Send to Multimodal /api/ai/resume-file
      try {
        const formData = new FormData();
        formData.append("file", file);

        const res = await fetch("/api/ai/resume-file", {
          method: "POST",
          body: formData,
        });

        const result = await res.json();
        if (result.aiOk && result.data) {
          applyAiData(result.data);
          setAiStatus("success");
          showToast("AI vision parsed document successfully");
        } else {
          setAiStatus("busy");
        }
      } catch (err) {
        setAiStatus("busy");
      }
    }

    setIsExtracting(false);
  };

  // Apply parsed AI values to form state
  const applyAiData = (data: any) => {
    if (data.candidate_name && !candidateName) setCandidateName(data.candidate_name);
    if (data.gender) setGender(data.gender);
    if (data.date_of_birth && !dateOfBirth) handleDobChange(data.date_of_birth);
    if (data.age && !age) setAge(data.age);
    if (data.mobile_no && !mobileNo) setMobileNo(data.mobile_no);
    if (data.email && !email) setEmail(data.email);
    if (data.address && !address) setAddress(data.address);
    if (data.pincode && !pincode) setPincode(data.pincode);
    if (data.position_applied_for && !positionAppliedFor) setPositionAppliedFor(data.position_applied_for);
    if (data.education && !education) setEducation(data.education);
    if (data.total_experience_years !== null && !totalExperienceYears) {
      setTotalExperienceYears(Number(data.total_experience_years));
    }
    if (data.current_location && !currentLocation) setCurrentLocation(data.current_location);
    if (data.current_salary && !currentSalary) setCurrentSalary(data.current_salary);
    if (data.expected_salary && !expectedSalary) setExpectedSalary(data.expected_salary);
    if (data.joining_availability && !joiningAvailability) setJoiningAvailability(data.joining_availability);
    if (data.remarks && !remarks) setRemarks(data.remarks);
  };

  // Auto-retry AI after 8s if user hasn't edited AI fields
  const scheduleAutoRetry = (text: string, regexFields: any) => {
    if (retryTimeoutRef.current) clearTimeout(retryTimeoutRef.current);
    retryTimeoutRef.current = setTimeout(async () => {
      if (!hasUserEditedAiFields && text) {
        try {
          const res = await fetch("/api/ai/resume", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ text, regexFields }),
          });
          const result = await res.json();
          if (result.aiOk && result.data) {
            applyAiData(result.data);
            setAiStatus("success");
            showToast("AI retry succeeded!");
          }
        } catch (e) {
          // keep busy status
        }
      }
    }, 8000);
  };

  // Upload Resume to Supabase Storage bucket 'resumes/<company_id>/<uuid>.pdf'
  const uploadResumeFile = async (): Promise<string | null> => {
    if (!selectedFile || !company?.id) return resumePath;

    const ext = selectedFile.name.split(".").pop() || "pdf";
    const fileName = `${crypto.randomUUID()}.${ext}`;
    const targetPath = `${company.id}/${fileName}`;

    const { error } = await supabase.storage
      .from("resumes")
      .upload(targetPath, selectedFile, { upsert: true });

    if (error) {
      console.error("Resume storage upload error:", error);
      throw error;
    }

    return targetPath;
  };

  // Save / Submit Candidate Handler
  const handleSave = async (submitStatus?: "Pending Call" | "Selected" | "Pending" | "Hold" | "Rejected") => {
    if (!candidateName.trim()) {
      showError("Please enter the candidate's name");
      return;
    }
    if (!company?.id) return;

    try {
      setIsSaving(true);
      setSyncing(true);

      // Upload resume file if attached
      let finalResumePath = resumePath;
      if (selectedFile) {
        finalResumePath = await uploadResumeFile();
        setResumePath(finalResumePath);
      }

      const candidatePayload = {
        company_id: company.id,
        interview_no: interviewNo,
        interview_date: interviewDate || new Date().toISOString().split("T")[0],
        candidate_name: candidateName.trim(),
        gender: gender || null,
        date_of_birth: dateOfBirth || null,
        age: age !== "" ? Number(age) : null,
        mobile_no: mobileNo.trim() || null,
        email: email.trim() || null,
        address: address.trim() || null,
        pincode: pincode.trim() || null,
        position_applied_for: positionAppliedFor || null,
        site: site || null,
        education: education.trim() || null,
        total_experience_years: totalExperienceYears !== "" ? Number(totalExperienceYears) : null,
        current_location: currentLocation.trim() || null,
        current_salary: currentSalary.trim() || null,
        expected_salary: expectedSalary.trim() || null,
        joining_availability: joiningAvailability.trim() || null,
        final_status: submitStatus || finalStatus,
        joining_date: joiningDate || null,
        resume_path: finalResumePath,
        remarks: remarks.trim() || null,
        created_by: profile?.id || null,
      };

      if (editCandidateId) {
        // Update existing candidate
        const { error } = await supabase
          .from("candidates")
          .update(candidatePayload)
          .eq("id", editCandidateId)
          .eq("company_id", company.id);

        if (error) throw error;
        showToast("Candidate profile updated successfully");
      } else {
        // Insert new candidate
        const { error } = await supabase
          .from("candidates")
          .insert(candidatePayload);

        if (error) throw error;
        showToast("Candidate created successfully");
      }

      setIsDirty(false);
      router.push("/tracker/candidates");
    } catch (err: any) {
      showError(err.message || "Failed to save candidate");
    } finally {
      setIsSaving(false);
      setSyncing(false);
    }
  };

  const rawMobile = mobileNo.replace(/\D/g, "");
  const phone10 = rawMobile.length >= 10 ? rawMobile.slice(-10) : "";
  const firstName = candidateName.trim().split(" ")[0] || "Candidate";

  return (
    <Shell>
      <div className="space-y-6 max-w-5xl mx-auto pb-12">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2.5">
              <div className="w-9 h-9 rounded-xl bg-[#0A2E5A] text-white flex items-center justify-center shadow-sm">
                <UserPlus className="w-5 h-5 text-[#F5741A]" />
              </div>
              <h1 className="text-2xl font-bold text-[#0A2E5A] tracking-tight">
                {editCandidateId ? "Edit candidate interview" : "New candidate interview"}
              </h1>
            </div>
            <p className="text-xs text-gray-500 mt-1">
              Upload resume for auto-fill or enter the standard 21 recruitment record fields
            </p>
          </div>

          <div className="flex items-center gap-2 font-mono text-xs bg-white px-3 py-1.5 rounded-xl border border-gray-200 text-gray-700 shadow-xs">
            <span>Interview ID:</span>
            <strong className="text-[#0A2E5A] font-bold">#{interviewNo}</strong>
          </div>
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

        {/* Duplicate Warning Banner */}
        {duplicateMatch && (
          <div className="p-3.5 bg-amber-50 border border-amber-300 rounded-2xl flex items-center justify-between gap-3 text-xs text-amber-900 shadow-sm animate-in fade-in">
            <div className="flex items-center gap-2">
              <AlertCircle className="w-4 h-4 text-amber-600 shrink-0" />
              <span>
                Possible duplicate detected: <strong>#{duplicateMatch.interview_no} {duplicateMatch.name}</strong>
              </span>
            </div>
            <Link
              href={`/tracker/candidates`}
              className="px-2.5 py-1 bg-white border border-amber-300 rounded-lg font-bold text-amber-900 hover:bg-amber-100 transition-colors"
            >
              Open profile
            </Link>
          </div>
        )}

        {/* UPLOAD ZONE */}
        <div className="bg-white rounded-3xl p-6 shadow-sm border border-gray-100 space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-xs font-bold uppercase tracking-wider text-gray-400">
              Resume auto-fill
            </h3>
            {aiStatus === "parsing" && (
              <span className="text-xs text-[#F5741A] font-semibold flex items-center gap-1.5 animate-pulse">
                <Sparkles className="w-4 h-4" />
                <span>Gemini extracting details...</span>
              </span>
            )}
            {aiStatus === "success" && (
              <span className="text-xs text-emerald-600 font-semibold flex items-center gap-1">
                <CheckCircle2 className="w-4 h-4" />
                <span>AI extraction completed</span>
              </span>
            )}
            {aiStatus === "busy" && (
              <div className="flex items-center gap-2">
                <span className="text-xs text-amber-700 font-semibold">AI busy — basic details filled</span>
                <button
                  onClick={() => selectedFile && handleProcessFile(selectedFile)}
                  className="px-2 py-0.5 bg-amber-100 hover:bg-amber-200 text-amber-800 text-[11px] font-bold rounded-md flex items-center gap-1"
                >
                  <RotateCcw className="w-3 h-3" />
                  <span>Retry AI</span>
                </button>
              </div>
            )}
          </div>

          <div
            onDragOver={(e) => e.preventDefault()}
            onDrop={(e) => {
              e.preventDefault();
              const file = e.dataTransfer.files?.[0];
              if (file) handleProcessFile(file);
            }}
            className="border-2 border-dashed border-gray-200 hover:border-[#F5741A] rounded-2xl p-6 text-center transition-colors bg-gray-50/50 hover:bg-orange-50/20 cursor-pointer"
            onClick={() => fileInputRef.current?.click()}
          >
            <input
              type="file"
              ref={fileInputRef}
              accept=".pdf,.jpg,.jpeg,.png,.webp"
              className="hidden"
              onChange={(e) => {
                const file = e.target.files?.[0];
                if (file) handleProcessFile(file);
              }}
            />

            <Upload className="w-8 h-8 text-gray-400 mx-auto mb-2" />
            <p className="text-xs font-bold text-gray-700">
              Drag & drop resume (PDF, JPG, PNG) or click to browse
            </p>
            <p className="text-[11px] text-gray-400 mt-1">
              Supports fast text extraction + Gemini OCR vision fallback
            </p>
          </div>

          <div className="flex flex-wrap items-center justify-center gap-3 pt-1">
            {/* From WhatsApp button */}
            <input
              type="file"
              ref={whatsappInputRef}
              accept=".pdf,.jpg,.jpeg,.png,.webp"
              className="hidden"
              onChange={(e) => {
                const file = e.target.files?.[0];
                if (file) handleProcessFile(file);
              }}
            />
            <button
              type="button"
              onClick={() => whatsappInputRef.current?.click()}
              className="px-3.5 py-2 bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border border-emerald-200 text-xs font-bold rounded-xl flex items-center gap-2 transition-colors shadow-xs"
            >
              <MessageSquare className="w-4 h-4 text-emerald-600" />
              <span>From WhatsApp</span>
            </button>

            {/* Scan with camera (mobile) */}
            <input
              type="file"
              ref={cameraInputRef}
              accept="image/*"
              capture="environment"
              className="hidden"
              onChange={(e) => {
                const file = e.target.files?.[0];
                if (file) handleProcessFile(file);
              }}
            />
            <button
              type="button"
              onClick={() => cameraInputRef.current?.click()}
              className="px-3.5 py-2 bg-blue-50 hover:bg-blue-100 text-[#1B8BD8] border border-blue-200 text-xs font-bold rounded-xl flex items-center gap-2 transition-colors shadow-xs"
            >
              <Camera className="w-4 h-4 text-[#1B8BD8]" />
              <span>Scan with camera</span>
            </button>
          </div>

          {selectedFile && (
            <div className="p-2.5 bg-gray-50 rounded-xl border border-gray-200 flex items-center justify-between text-xs text-gray-700">
              <span className="font-semibold truncate max-w-xs">{selectedFile.name}</span>
              <span className="text-[10px] text-gray-400">
                {(selectedFile.size / 1024).toFixed(0)} KB
              </span>
            </div>
          )}
        </div>

        {/* 21-FIELD FORM */}
        <div className="bg-white rounded-3xl p-6 shadow-sm border border-gray-100 space-y-6">
          <h3 className="text-sm font-bold text-[#0A2E5A] border-b border-gray-100 pb-3">
            Candidate details
          </h3>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {/* 1. Interview Date */}
            <div>
              <label className="block text-xs font-semibold text-gray-700 mb-1">
                Interview Date <span className="text-red-500">*</span>
              </label>
              <input
                type="date"
                required
                value={interviewDate}
                onChange={(e) => {
                  setInterviewDate(e.target.value);
                  setIsDirty(true);
                }}
                className="w-full px-3.5 py-2 bg-gray-50 border border-gray-200 rounded-xl text-xs focus:ring-2 focus:ring-[#F5741A] focus:bg-white"
              />
            </div>

            {/* 2. Candidate Name */}
            <div>
              <label className="block text-xs font-semibold text-gray-700 mb-1">
                Candidate Name <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                required
                value={candidateName}
                onChange={(e) => {
                  setCandidateName(e.target.value);
                  setIsDirty(true);
                  setHasUserEditedAiFields(true);
                }}
                placeholder="Full candidate name"
                className="w-full px-3.5 py-2 bg-gray-50 border border-gray-200 rounded-xl text-xs focus:ring-2 focus:ring-[#F5741A] focus:bg-white font-medium"
              />
            </div>

            {/* 3. Gender */}
            <div>
              <label className="block text-xs font-semibold text-gray-700 mb-1">Gender</label>
              <select
                value={gender}
                onChange={(e) => {
                  setGender(e.target.value);
                  setIsDirty(true);
                }}
                className="w-full px-3.5 py-2 bg-gray-50 border border-gray-200 rounded-xl text-xs font-medium text-gray-800"
              >
                <option value="Male">Male</option>
                <option value="Female">Female</option>
                <option value="Other">Other</option>
              </select>
            </div>

            {/* 4. Date of Birth */}
            <div>
              <label className="block text-xs font-semibold text-gray-700 mb-1">Date of Birth</label>
              <input
                type="date"
                value={dateOfBirth}
                onChange={(e) => handleDobChange(e.target.value)}
                className="w-full px-3.5 py-2 bg-gray-50 border border-gray-200 rounded-xl text-xs focus:ring-2 focus:ring-[#F5741A] focus:bg-white"
              />
            </div>

            {/* 5. Age (auto) */}
            <div>
              <label className="block text-xs font-semibold text-gray-700 mb-1">Age (Years)</label>
              <input
                type="number"
                value={age}
                onChange={(e) => {
                  setAge(e.target.value ? Number(e.target.value) : "");
                  setIsDirty(true);
                }}
                placeholder="Auto-calculated from DOB"
                className="w-full px-3.5 py-2 bg-gray-50 border border-gray-200 rounded-xl text-xs focus:ring-2 focus:ring-[#F5741A] focus:bg-white"
              />
            </div>

            {/* 6. Mobile No. + Call/WhatsApp Buttons */}
            <div>
              <label className="block text-xs font-semibold text-gray-700 mb-1">
                Mobile No. <span className="text-red-500">*</span>
              </label>
              <input
                type="tel"
                required
                value={mobileNo}
                onChange={(e) => {
                  setMobileNo(e.target.value);
                  setIsDirty(true);
                  setHasUserEditedAiFields(true);
                }}
                placeholder="10-digit mobile number"
                className="w-full px-3.5 py-2 bg-gray-50 border border-gray-200 rounded-xl text-xs focus:ring-2 focus:ring-[#F5741A] focus:bg-white font-mono"
              />

              {phone10 && (
                <div className="flex items-center gap-2 mt-1.5 animate-in fade-in">
                  <a
                    href={`tel:${phone10}`}
                    className="flex-1 py-1 px-2 bg-[#0A2E5A] hover:bg-[#071E3D] text-white text-[11px] font-bold rounded-lg flex items-center justify-center gap-1 shadow-xs"
                  >
                    <Phone className="w-3 h-3" />
                    <span>Call</span>
                  </a>

                  <a
                    href={`https://wa.me/91${phone10}?text=${encodeURIComponent(
                      `Namaskar ${firstName}, ${company?.name || "Milestone Consultancy"} HR kadun bolat aahe. Tumcha resume milala. Bolayla sandhi milel ka?`
                    )}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex-1 py-1 px-2 bg-emerald-600 hover:bg-emerald-700 text-white text-[11px] font-bold rounded-lg flex items-center justify-center gap-1 shadow-xs"
                  >
                    <MessageSquare className="w-3 h-3" />
                    <span>WhatsApp</span>
                  </a>
                </div>
              )}
            </div>

            {/* 7. Email */}
            <div>
              <label className="block text-xs font-semibold text-gray-700 mb-1">Email Address</label>
              <input
                type="email"
                value={email}
                onChange={(e) => {
                  setEmail(e.target.value);
                  setIsDirty(true);
                  setHasUserEditedAiFields(true);
                }}
                placeholder="candidate@email.com"
                className="w-full px-3.5 py-2 bg-gray-50 border border-gray-200 rounded-xl text-xs focus:ring-2 focus:ring-[#F5741A] focus:bg-white"
              />
            </div>

            {/* 8. Position Applied For */}
            <div>
              <label className="block text-xs font-semibold text-gray-700 mb-1">
                Position Applied For <span className="text-red-500">*</span>
              </label>
              <select
                required
                value={positionAppliedFor}
                onChange={(e) => {
                  setPositionAppliedFor(e.target.value);
                  setIsDirty(true);
                }}
                className="w-full px-3.5 py-2 bg-gray-50 border border-gray-200 rounded-xl text-xs font-semibold text-gray-800"
              >
                {positions.map((p) => (
                  <option key={p} value={p}>
                    {p}
                  </option>
                ))}
              </select>
            </div>

            {/* 9. Site */}
            <div>
              <label className="block text-xs font-semibold text-gray-700 mb-1">Site / Project</label>
              <select
                value={site}
                onChange={(e) => {
                  setSite(e.target.value);
                  setIsDirty(true);
                }}
                className="w-full px-3.5 py-2 bg-gray-50 border border-gray-200 rounded-xl text-xs font-semibold text-gray-800"
              >
                {sites.map((s) => (
                  <option key={s} value={s}>
                    {s}
                  </option>
                ))}
              </select>
            </div>

            {/* 10. Education / Qualification */}
            <div>
              <label className="block text-xs font-semibold text-gray-700 mb-1">Qualification</label>
              <input
                type="text"
                value={education}
                onChange={(e) => {
                  setEducation(e.target.value);
                  setIsDirty(true);
                }}
                placeholder="BE Civil, Diploma, B.Com, etc."
                className="w-full px-3.5 py-2 bg-gray-50 border border-gray-200 rounded-xl text-xs focus:ring-2 focus:ring-[#F5741A] focus:bg-white"
              />
            </div>

            {/* 11. Total Experience */}
            <div>
              <label className="block text-xs font-semibold text-gray-700 mb-1">Total Experience (Years)</label>
              <input
                type="number"
                step="0.1"
                value={totalExperienceYears}
                onChange={(e) => {
                  setTotalExperienceYears(e.target.value ? Number(e.target.value) : "");
                  setIsDirty(true);
                }}
                placeholder="e.g. 4.5"
                className="w-full px-3.5 py-2 bg-gray-50 border border-gray-200 rounded-xl text-xs focus:ring-2 focus:ring-[#F5741A] focus:bg-white"
              />
            </div>

            {/* 12. Current Location */}
            <div>
              <label className="block text-xs font-semibold text-gray-700 mb-1">Current Location</label>
              <input
                type="text"
                value={currentLocation}
                onChange={(e) => {
                  setCurrentLocation(e.target.value);
                  setIsDirty(true);
                }}
                placeholder="City / District"
                className="w-full px-3.5 py-2 bg-gray-50 border border-gray-200 rounded-xl text-xs focus:ring-2 focus:ring-[#F5741A] focus:bg-white"
              />
            </div>

            {/* 13. Pincode */}
            <div>
              <label className="block text-xs font-semibold text-gray-700 mb-1">Pincode</label>
              <input
                type="text"
                maxLength={6}
                value={pincode}
                onChange={(e) => {
                  setPincode(e.target.value);
                  setIsDirty(true);
                }}
                placeholder="422001"
                className="w-full px-3.5 py-2 bg-gray-50 border border-gray-200 rounded-xl text-xs focus:ring-2 focus:ring-[#F5741A] focus:bg-white font-mono"
              />
            </div>

            {/* 14. Current Salary */}
            <div>
              <label className="block text-xs font-semibold text-gray-700 mb-1">Current Salary</label>
              <input
                type="text"
                value={currentSalary}
                onChange={(e) => {
                  setCurrentSalary(e.target.value);
                  setIsDirty(true);
                }}
                placeholder="e.g. ₹35,000 / month"
                className="w-full px-3.5 py-2 bg-gray-50 border border-gray-200 rounded-xl text-xs focus:ring-2 focus:ring-[#F5741A] focus:bg-white"
              />
            </div>

            {/* 15. Expected Salary */}
            <div>
              <label className="block text-xs font-semibold text-gray-700 mb-1">Expected Salary</label>
              <input
                type="text"
                value={expectedSalary}
                onChange={(e) => {
                  setExpectedSalary(e.target.value);
                  setIsDirty(true);
                }}
                placeholder="e.g. ₹45,000 / month"
                className="w-full px-3.5 py-2 bg-gray-50 border border-gray-200 rounded-xl text-xs focus:ring-2 focus:ring-[#F5741A] focus:bg-white"
              />
            </div>

            {/* 16. Joining Availability */}
            <div>
              <label className="block text-xs font-semibold text-gray-700 mb-1">Joining Availability</label>
              <input
                type="text"
                value={joiningAvailability}
                onChange={(e) => {
                  setJoiningAvailability(e.target.value);
                  setIsDirty(true);
                }}
                placeholder="Immediate / 15 days / 1 month"
                className="w-full px-3.5 py-2 bg-gray-50 border border-gray-200 rounded-xl text-xs focus:ring-2 focus:ring-[#F5741A] focus:bg-white"
              />
            </div>

            {/* 17. Joining Date */}
            <div>
              <label className="block text-xs font-semibold text-gray-700 mb-1">Agreed Joining Date</label>
              <input
                type="date"
                value={joiningDate}
                onChange={(e) => {
                  setJoiningDate(e.target.value);
                  setIsDirty(true);
                }}
                className="w-full px-3.5 py-2 bg-gray-50 border border-gray-200 rounded-xl text-xs focus:ring-2 focus:ring-[#F5741A] focus:bg-white"
              />
            </div>

            {/* 18. Final Status (Segmented) */}
            <div className="sm:col-span-2 lg:col-span-3">
              <label className="block text-xs font-semibold text-gray-700 mb-1.5">Final Status</label>
              <div className="flex flex-wrap gap-2">
                {(["Pending Call", "Pending", "Hold", "Selected", "Rejected"] as const).map((s) => (
                  <button
                    key={s}
                    type="button"
                    onClick={() => {
                      setFinalStatus(s);
                      setIsDirty(true);
                    }}
                    className={cn(
                      "px-3.5 py-2 rounded-xl text-xs font-bold transition-all border",
                      finalStatus === s
                        ? s === "Selected"
                          ? "bg-emerald-600 text-white border-emerald-600 shadow-sm"
                          : s === "Rejected"
                          ? "bg-red-600 text-white border-red-600 shadow-sm"
                          : s === "Hold"
                          ? "bg-amber-600 text-white border-amber-600 shadow-sm"
                          : "bg-[#0A2E5A] text-white border-[#0A2E5A] shadow-sm"
                        : "bg-gray-50 text-gray-700 border-gray-200 hover:bg-gray-100"
                    )}
                  >
                    {s}
                  </button>
                ))}
              </div>
            </div>

            {/* 19. Address */}
            <div className="sm:col-span-2 lg:col-span-3">
              <label className="block text-xs font-semibold text-gray-700 mb-1">Address</label>
              <textarea
                rows={2}
                value={address}
                onChange={(e) => {
                  setAddress(e.target.value);
                  setIsDirty(true);
                }}
                placeholder="Full residential address"
                className="w-full px-3.5 py-2 bg-gray-50 border border-gray-200 rounded-xl text-xs focus:ring-2 focus:ring-[#F5741A] focus:bg-white"
              />
            </div>

            {/* 20. Remarks */}
            <div className="sm:col-span-2 lg:col-span-3">
              <label className="block text-xs font-semibold text-gray-700 mb-1">Remarks / Interviewer Notes</label>
              <textarea
                rows={2}
                value={remarks}
                onChange={(e) => {
                  setRemarks(e.target.value);
                  setIsDirty(true);
                }}
                placeholder="Strengths, technical assessment, background notes..."
                className="w-full px-3.5 py-2 bg-gray-50 border border-gray-200 rounded-xl text-xs focus:ring-2 focus:ring-[#F5741A] focus:bg-white"
              />
            </div>
          </div>
        </div>

        {/* BOTTOM ACTION BUTTONS */}
        <div className="p-4 bg-white rounded-3xl border border-gray-100 shadow-md flex flex-wrap items-center justify-between gap-3 sticky bottom-4 z-30">
          <button
            type="button"
            onClick={() => router.push("/tracker/candidates")}
            className="px-4 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 text-xs font-bold rounded-xl transition-colors"
          >
            Cancel
          </button>

          <div className="flex items-center gap-2">
            <button
              type="button"
              disabled={isSaving}
              onClick={() => handleSave("Pending Call")}
              className="px-4 py-2.5 bg-white border border-gray-300 hover:bg-gray-50 text-gray-800 text-xs font-bold rounded-xl shadow-xs transition-all flex items-center gap-1.5"
            >
              <Save className="w-3.5 h-3.5 text-gray-500" />
              <span>{editCandidateId ? "Update Draft" : "Save Draft"}</span>
            </button>

            <button
              type="button"
              disabled={isSaving}
              onClick={() => handleSave()}
              className="px-5 py-2.5 bg-[#F5741A] hover:bg-[#D9610E] disabled:opacity-50 text-white text-xs font-bold rounded-xl shadow-sm transition-all flex items-center gap-1.5"
            >
              <Check className="w-4 h-4" />
              <span>{isSaving ? "Saving..." : "Submit Final"}</span>
            </button>
          </div>
        </div>
      </div>
    </Shell>
  );
}

export default function NewInterviewPage() {
  return (
    <Suspense
      fallback={
        <Shell>
          <div className="py-20 text-center text-xs text-gray-400">Loading interview form...</div>
        </Shell>
      }
    >
      <NewInterviewForm />
    </Suspense>
  );
}
