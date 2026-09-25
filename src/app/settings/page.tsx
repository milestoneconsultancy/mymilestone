"use client";

import React, { useState, useEffect, useCallback } from "react";
import { Shell } from "@/components/layout/Shell";
import { useAuth } from "@/components/providers/AuthProvider";
import { createClient } from "@/lib/supabase/client";
import {
  Building,
  Users,
  User,
  Sparkles,
  Upload,
  Check,
  AlertCircle,
  Copy,
  Trash2,
  Lock,
  Plus,
  X,
  ExternalLink,
  ShieldCheck,
  Smartphone
} from "lucide-react";
import { cn } from "@/lib/utils";

type SettingsTab = "Company" | "Team" | "Profile" | "App releases";

interface TeamMember {
  id: string;
  full_name: string | null;
  role: string;
  phone: string | null;
  avatar_url: string | null;
  created_at: string;
}

interface InviteItem {
  id: string;
  email: string;
  role: string;
  token: string;
  accepted_at: string | null;
  created_at: string;
}

interface AppReleaseItem {
  id: string;
  version: string;
  title: string;
  notes: string | null;
  released_at: string;
}

export default function SettingsPage() {
  const { user, profile, company, role, isOwnerOrAdmin, refreshProfile, setSyncing } = useAuth();
  const [activeTab, setActiveTab] = useState<SettingsTab>("Company");
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Company Form State
  const [companyName, setCompanyName] = useState("");
  const [legalName, setLegalName] = useState("");
  const [tagline, setTagline] = useState("");
  const [address, setAddress] = useState("");
  const [whatsappHr, setWhatsappHr] = useState("");
  const [offerRefPrefix, setOfferRefPrefix] = useState("MC/OL");
  const [letterheadPaths, setLetterheadPaths] = useState<{
    header?: string;
    footer?: string;
    sign?: string;
    stamp?: string;
  }>({});
  const [previewUrls, setPreviewUrls] = useState<{
    header?: string;
    footer?: string;
    sign?: string;
    stamp?: string;
  }>({});
  const [isSavingCompany, setIsSavingCompany] = useState(false);
  const [uploadingField, setUploadingField] = useState<string | null>(null);

  // Team Form & List State
  const [teamMembers, setTeamMembers] = useState<TeamMember[]>([]);
  const [invites, setInvites] = useState<InviteItem[]>([]);
  const [isInviteModalOpen, setIsInviteModalOpen] = useState(false);
  const [inviteEmail, setInviteEmail] = useState("");
  const [inviteRole, setInviteRole] = useState("recruiter");
  const [createdInviteLink, setCreatedInviteLink] = useState<string | null>(null);
  const [isSendingInvite, setIsSendingInvite] = useState(false);

  // Profile Form State
  const [fullName, setFullName] = useState("");
  const [phone, setPhone] = useState("");
  const [isSavingProfile, setIsSavingProfile] = useState(false);

  // Password Change State
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [isChangingPassword, setIsChangingPassword] = useState(false);

  // App Releases State
  const [releases, setReleases] = useState<AppReleaseItem[]>([]);
  const [isReleaseModalOpen, setIsReleaseModalOpen] = useState(false);
  const [releaseVersion, setReleaseVersion] = useState("");
  const [releaseTitle, setReleaseTitle] = useState("");
  const [releaseNotes, setReleaseNotes] = useState("");
  const [isSavingRelease, setIsSavingRelease] = useState(false);

  const supabase = createClient();

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3500);
  };

  const showError = (msg: string) => {
    setErrorMessage(msg);
    setTimeout(() => setErrorMessage(null), 4000);
  };

  // Sync initial company data
  useEffect(() => {
    if (company) {
      setCompanyName(company.name || "");
      setLegalName(company.legal_name || "");
      setTagline(company.tagline || "");
      setAddress(company.address || "");
      setWhatsappHr(company.whatsapp_hr || "");
      setOfferRefPrefix(company.offer_ref_prefix || "MC/OL");
      const lh = (company.letterhead as any) || {};
      setLetterheadPaths(lh);

      // Fetch signed preview URLs for existing letterhead files
      ["header", "footer", "sign", "stamp"].forEach(async (key) => {
        const path = lh[key];
        if (path) {
          try {
            const res = await fetch(`/api/files/signed?bucket=letterhead&path=${encodeURIComponent(path)}`);
            const data = await res.json();
            if (data.signedUrl) {
              setPreviewUrls((prev) => ({ ...prev, [key]: data.signedUrl }));
            }
          } catch (e) {
            console.error("Failed to load signed URL for letterhead", key, e);
          }
        }
      });
    }
  }, [company]);

  // Sync initial profile data
  useEffect(() => {
    if (profile) {
      setFullName(profile.full_name || "");
      setPhone(profile.phone || "");
    }
  }, [profile]);

  // Load team members and invites
  const fetchTeamData = useCallback(async () => {
    if (!company?.id) return;
    try {
      const [membersRes, invitesRes] = await Promise.all([
        supabase.from("profiles").select("*").eq("company_id", company.id).order("created_at"),
        supabase.from("invites").select("*").eq("company_id", company.id).is("accepted_at", null).order("created_at", { ascending: false }),
      ]);

      if (membersRes.data) setTeamMembers(membersRes.data as TeamMember[]);
      if (invitesRes.data) setInvites(invitesRes.data as InviteItem[]);
    } catch (err: any) {
      showError(err.message || "Failed to load team data");
    }
  }, [company?.id, supabase]);

  // Load releases
  const fetchReleases = useCallback(async () => {
    try {
      const { data, error } = await supabase
        .from("app_releases")
        .select("*")
        .order("released_at", { ascending: false });
      if (!error && data) {
        setReleases(data as AppReleaseItem[]);
      }
    } catch (err) {
      console.error("Failed to load app releases", err);
    }
  }, [supabase]);

  useEffect(() => {
    if (activeTab === "Team") fetchTeamData();
    if (activeTab === "App releases") fetchReleases();
  }, [activeTab, fetchTeamData, fetchReleases]);

  // Upload Letterhead image
  const handleUploadLetterhead = async (field: "header" | "footer" | "sign" | "stamp", file: File) => {
    if (!company?.id) return;

    try {
      setUploadingField(field);
      setSyncing(true);

      const ext = file.name.split(".").pop() || "png";
      const filePath = `${company.id}/${field}.${ext}`;

      // Upload file directly to Supabase storage bucket 'letterhead'
      const { error: uploadError } = await supabase.storage
        .from("letterhead")
        .upload(filePath, file, { upsert: true });

      if (uploadError) throw uploadError;

      // Update company letterhead jsonb
      const updatedLetterhead = {
        ...letterheadPaths,
        [field]: filePath,
      };

      const { error: updateError } = await supabase
        .from("companies")
        .update({ letterhead: updatedLetterhead })
        .eq("id", company.id);

      if (updateError) throw updateError;

      setLetterheadPaths(updatedLetterhead);

      // Fetch signed preview URL
      const signedRes = await fetch(`/api/files/signed?bucket=letterhead&path=${encodeURIComponent(filePath)}`);
      const signedData = await signedRes.json();
      if (signedData.signedUrl) {
        setPreviewUrls((prev) => ({ ...prev, [field]: signedData.signedUrl }));
      }

      showToast(`${field.charAt(0).toUpperCase() + field.slice(1)} image updated successfully`);
    } catch (err: any) {
      showError(err.message || "Upload failed");
    } finally {
      setUploadingField(null);
      setSyncing(false);
    }
  };

  // Save Company Information
  const handleSaveCompany = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!company?.id) return;

    try {
      setIsSavingCompany(true);
      setSyncing(true);

      const { error } = await supabase
        .from("companies")
        .update({
          name: companyName.trim(),
          legal_name: legalName.trim() || null,
          tagline: tagline.trim() || null,
          address: address.trim() || null,
          whatsapp_hr: whatsappHr.trim() || null,
          offer_ref_prefix: offerRefPrefix.trim() || "MC/OL",
        })
        .eq("id", company.id);

      if (error) throw error;
      await refreshProfile();
      showToast("Company settings saved");
    } catch (err: any) {
      showError(err.message || "Failed to update company");
    } finally {
      setIsSavingCompany(false);
      setSyncing(false);
    }
  };

  // Invite Team Member
  const handleSendInvite = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!inviteEmail.trim() || !company?.id) return;

    try {
      setIsSendingInvite(true);
      setSyncing(true);

      const { data, error } = await supabase
        .from("invites")
        .insert({
          company_id: company.id,
          email: inviteEmail.trim().toLowerCase(),
          role: inviteRole,
        })
        .select()
        .single();

      if (error) throw error;

      const link = `${window.location.origin}/invite/${data.token}`;
      setCreatedInviteLink(link);
      setInvites((prev) => [data as InviteItem, ...prev]);
      showToast("Invitation created! Link generated.");
    } catch (err: any) {
      showError(err.message || "Failed to create invitation");
    } finally {
      setIsSendingInvite(false);
      setSyncing(false);
    }
  };

  // Revoke Invite
  const handleRevokeInvite = async (inviteId: string) => {
    if (!confirm("Revoke this pending invitation?")) return;
    try {
      const { error } = await supabase.from("invites").delete().eq("id", inviteId);
      if (error) throw error;
      setInvites((prev) => prev.filter((i) => i.id !== inviteId));
      showToast("Invitation revoked");
    } catch (err: any) {
      showError(err.message || "Failed to revoke invitation");
    }
  };

  // Update Member Role
  const handleChangeRole = async (memberId: string, newRole: string) => {
    if (!confirm(`Change role to ${newRole}?`)) return;
    try {
      setSyncing(true);
      const { error } = await supabase
        .from("profiles")
        .update({ role: newRole as any })
        .eq("id", memberId)
        .eq("company_id", company!.id);

      if (error) throw error;
      setTeamMembers((prev) =>
        prev.map((m) => (m.id === memberId ? { ...m, role: newRole } : m))
      );
      showToast("Role updated");
    } catch (err: any) {
      showError(err.message || "Failed to update role");
    } finally {
      setSyncing(false);
    }
  };

  // Remove Member
  const handleRemoveMember = async (member: TeamMember) => {
    if (member.id === profile?.id) {
      showError("You cannot remove your own account");
      return;
    }
    if (!confirm(`Are you sure you want to remove ${member.full_name || "this user"} from the company?`)) {
      return;
    }

    try {
      setSyncing(true);
      // Null out company_id to disconnect member
      const { error } = await supabase
        .from("profiles")
        .update({ company_id: null })
        .eq("id", member.id);

      if (error) throw error;
      setTeamMembers((prev) => prev.filter((m) => m.id !== member.id));
      showToast("Team member removed");
    } catch (err: any) {
      showError(err.message || "Failed to remove member");
    } finally {
      setSyncing(false);
    }
  };

  // Save Profile
  const handleSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!profile?.id) return;

    try {
      setIsSavingProfile(true);
      setSyncing(true);

      const { error } = await supabase
        .from("profiles")
        .update({
          full_name: fullName.trim(),
          phone: phone.trim() || null,
        })
        .eq("id", profile.id);

      if (error) throw error;
      await refreshProfile();
      showToast("Profile details updated");
    } catch (err: any) {
      showError(err.message || "Failed to update profile");
    } finally {
      setIsSavingProfile(false);
      setSyncing(false);
    }
  };

  // Change Password
  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (newPassword.length < 6) {
      showError("Password must be at least 6 characters");
      return;
    }
    if (newPassword !== confirmPassword) {
      showError("Passwords do not match");
      return;
    }

    try {
      setIsChangingPassword(true);
      const { error } = await supabase.auth.updateUser({ password: newPassword });
      if (error) throw error;
      setNewPassword("");
      setConfirmPassword("");
      showToast("Password updated successfully");
    } catch (err: any) {
      showError(err.message || "Failed to update password");
    } finally {
      setIsChangingPassword(false);
    }
  };

  // Publish New Release
  const handlePublishRelease = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!releaseVersion.trim() || !releaseTitle.trim()) return;

    try {
      setIsSavingRelease(true);
      const { data, error } = await supabase
        .from("app_releases")
        .insert({
          version: releaseVersion.trim(),
          title: releaseTitle.trim(),
          notes: releaseNotes.trim() || null,
        })
        .select()
        .single();

      if (error) throw error;

      setReleases((prev) => [data as AppReleaseItem, ...prev]);
      setIsReleaseModalOpen(false);
      setReleaseVersion("");
      setReleaseTitle("");
      setReleaseNotes("");
      showToast(`Release v${data.version} published!`);
    } catch (err: any) {
      showError(err.message || "Failed to publish release");
    } finally {
      setIsSavingRelease(false);
    }
  };

  return (
    <Shell>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2.5">
              <div className="w-9 h-9 rounded-xl bg-[#0A2E5A] text-white flex items-center justify-center shadow-sm">
                <Building className="w-5 h-5" />
              </div>
              <h1 className="text-2xl font-bold text-[#0A2E5A] tracking-tight">Settings</h1>
            </div>
            <p className="text-xs text-gray-500 mt-1">
              Manage organization profile, letterhead assets, team permissions, and security
            </p>
          </div>
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

        {/* Tab Navigation */}
        <div className="bg-white rounded-2xl p-1.5 shadow-sm border border-gray-100 flex items-center gap-1.5 overflow-x-auto">
          {[
            { id: "Company", label: "Company", icon: Building },
            { id: "Team", label: "Team & roles", icon: Users },
            { id: "Profile", label: "Personal profile", icon: User },
            { id: "App releases", label: "App releases", icon: Sparkles },
          ].map((tab) => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as SettingsTab)}
                className={cn(
                  "flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-semibold whitespace-nowrap transition-all",
                  isActive
                    ? "bg-[#0A2E5A] text-white shadow-sm"
                    : "text-gray-600 hover:text-gray-900 hover:bg-gray-100/70"
                )}
              >
                <Icon className="w-4 h-4" />
                <span>{tab.label}</span>
              </button>
            );
          })}
        </div>

        {/* TAB 1: COMPANY SETTINGS & LETTERHEAD */}
        {activeTab === "Company" && (
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
            {/* Left 7 cols: Company details */}
            <div className="lg:col-span-7">
              <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100 space-y-5">
                <h3 className="text-sm font-bold text-[#0A2E5A] border-b border-gray-100 pb-3 flex items-center gap-2">
                  <Building className="w-4 h-4 text-[#F5741A]" />
                  <span>Company Profile</span>
                </h3>

                <form onSubmit={handleSaveCompany} className="space-y-4">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-semibold text-gray-700 mb-1">
                        Company Name <span className="text-red-500">*</span>
                      </label>
                      <input
                        type="text"
                        required
                        disabled={!isOwnerOrAdmin}
                        value={companyName}
                        onChange={(e) => setCompanyName(e.target.value)}
                        className="w-full px-3.5 py-2 bg-gray-50 border border-gray-200 rounded-xl text-xs focus:ring-2 focus:ring-[#F5741A] focus:bg-white"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-gray-700 mb-1">
                        Legal Business Name
                      </label>
                      <input
                        type="text"
                        disabled={!isOwnerOrAdmin}
                        value={legalName}
                        onChange={(e) => setLegalName(e.target.value)}
                        placeholder="e.g. Milestone Consultancy LLP"
                        className="w-full px-3.5 py-2 bg-gray-50 border border-gray-200 rounded-xl text-xs focus:ring-2 focus:ring-[#F5741A] focus:bg-white"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-gray-700 mb-1">Tagline</label>
                    <input
                      type="text"
                      disabled={!isOwnerOrAdmin}
                      value={tagline}
                      onChange={(e) => setTagline(e.target.value)}
                      placeholder="e.g. Engineering & Project Management Services"
                      className="w-full px-3.5 py-2 bg-gray-50 border border-gray-200 rounded-xl text-xs focus:ring-2 focus:ring-[#F5741A] focus:bg-white"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-gray-700 mb-1">Registered Address</label>
                    <textarea
                      rows={2}
                      disabled={!isOwnerOrAdmin}
                      value={address}
                      onChange={(e) => setAddress(e.target.value)}
                      placeholder="Office address displayed on letterheads and documents"
                      className="w-full px-3.5 py-2 bg-gray-50 border border-gray-200 rounded-xl text-xs focus:ring-2 focus:ring-[#F5741A] focus:bg-white"
                    />
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-semibold text-gray-700 mb-1">
                        HR WhatsApp Number
                      </label>
                      <input
                        type="text"
                        disabled={!isOwnerOrAdmin}
                        value={whatsappHr}
                        onChange={(e) => setWhatsappHr(e.target.value)}
                        placeholder="918452845537"
                        className="w-full px-3.5 py-2 bg-gray-50 border border-gray-200 rounded-xl text-xs focus:ring-2 focus:ring-[#F5741A] focus:bg-white"
                      />
                      <p className="text-[10px] text-gray-400 mt-1">Country code + 10 digits (e.g. 91...)</p>
                    </div>

                    <div>
                      <label className="block text-xs font-semibold text-gray-700 mb-1">
                        Offer Ref Prefix
                      </label>
                      <input
                        type="text"
                        disabled={!isOwnerOrAdmin}
                        value={offerRefPrefix}
                        onChange={(e) => setOfferRefPrefix(e.target.value)}
                        placeholder="MC/OL"
                        className="w-full px-3.5 py-2 bg-gray-50 border border-gray-200 rounded-xl text-xs focus:ring-2 focus:ring-[#F5741A] focus:bg-white font-mono"
                      />
                      <p className="text-[10px] text-gray-400 mt-1">Generates refs like {offerRefPrefix}/2026/001</p>
                    </div>
                  </div>

                  {isOwnerOrAdmin && (
                    <button
                      type="submit"
                      disabled={isSavingCompany}
                      className="py-2.5 px-5 bg-[#F5741A] hover:bg-[#D9610E] disabled:opacity-50 text-white text-xs font-bold rounded-xl shadow-sm transition-all"
                    >
                      {isSavingCompany ? "Saving..." : "Save company changes"}
                    </button>
                  )}
                </form>
              </div>
            </div>

            {/* Right 5 cols: Letterhead & Signatures Upload */}
            <div className="lg:col-span-5 space-y-5">
              <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100 space-y-4">
                <div>
                  <h3 className="text-sm font-bold text-[#0A2E5A] flex items-center gap-2">
                    <Upload className="w-4 h-4 text-[#1B8BD8]" />
                    <span>Letterhead Assets</span>
                  </h3>
                  <p className="text-[11px] text-gray-500 mt-0.5">
                    Images applied automatically to PDF offer letters
                  </p>
                </div>

                <div className="space-y-4">
                  {[
                    { key: "header", label: "Page Header Image", hint: "Top header banner (PNG/JPG, ~1200x240)" },
                    { key: "footer", label: "Page Footer Image", hint: "Bottom footer banner (PNG/JPG, ~1200x160)" },
                    { key: "sign", label: "Authorised Signature", hint: "Transparent PNG of signature" },
                    { key: "stamp", label: "Company Official Stamp", hint: "Transparent PNG of circular stamp" },
                  ].map((item) => {
                    const fieldKey = item.key as "header" | "footer" | "sign" | "stamp";
                    const isUploading = uploadingField === fieldKey;
                    const previewUrl = previewUrls[fieldKey];
                    const existingPath = letterheadPaths[fieldKey];

                    return (
                      <div key={item.key} className="p-3.5 bg-gray-50 rounded-xl border border-gray-100 space-y-2">
                        <div className="flex items-center justify-between">
                          <div>
                            <span className="text-xs font-bold text-gray-800">{item.label}</span>
                            <p className="text-[10px] text-gray-500">{item.hint}</p>
                          </div>
                          {existingPath && (
                            <span className="text-[10px] bg-emerald-50 text-emerald-700 px-2 py-0.5 rounded-full font-bold border border-emerald-200">
                              Configured
                            </span>
                          )}
                        </div>

                        {previewUrl && (
                          <div className="mt-2 p-2 bg-white rounded-lg border border-gray-200 flex items-center justify-center max-h-24 overflow-hidden">
                            {/* eslint-disable-next-line @next/next/no-img-element */}
                            <img src={previewUrl} alt={item.label} className="max-h-20 object-contain" />
                          </div>
                        )}

                        {isOwnerOrAdmin && (
                          <label className="mt-1 block">
                            <input
                              type="file"
                              accept="image/png,image/jpeg,image/webp"
                              className="hidden"
                              disabled={isUploading}
                              onChange={(e) => {
                                const file = e.target.files?.[0];
                                if (file) handleUploadLetterhead(fieldKey, file);
                              }}
                            />
                            <div className="cursor-pointer py-1.5 px-3 bg-white hover:bg-gray-100 border border-gray-300 rounded-lg text-center text-xs font-semibold text-gray-700 transition-colors">
                              {isUploading ? "Uploading..." : existingPath ? "Replace image" : "Upload image"}
                            </div>
                          </label>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* TAB 2: TEAM & ROLES */}
        {activeTab === "Team" && (
          <div className="space-y-6">
            <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-gray-100">
                <div>
                  <h3 className="text-sm font-bold text-[#0A2E5A] flex items-center gap-2">
                    <Users className="w-4 h-4 text-[#F5741A]" />
                    <span>Company Team Members</span>
                  </h3>
                  <p className="text-xs text-gray-500 mt-0.5">
                    Roles determine access to candidate tracker, offers, and masters
                  </p>
                </div>

                {isOwnerOrAdmin && (
                  <button
                    onClick={() => {
                      setIsInviteModalOpen(true);
                      setCreatedInviteLink(null);
                    }}
                    className="flex items-center gap-1.5 px-3.5 py-2 bg-[#F5741A] hover:bg-[#D9610E] text-white text-xs font-bold rounded-xl shadow-sm transition-all shrink-0"
                  >
                    <Plus className="w-4 h-4" />
                    <span>Invite member</span>
                  </button>
                )}
              </div>

              {/* Members List */}
              <div className="divide-y divide-gray-100 mt-2">
                {teamMembers.map((member) => {
                  const isCurrent = member.id === profile?.id;
                  const isOwner = member.role === "owner";

                  return (
                    <div key={member.id} className="py-4 flex items-center justify-between gap-4">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-full bg-[#0A2E5A] text-white flex items-center justify-center font-bold text-sm">
                          {member.full_name?.charAt(0) || "U"}
                        </div>
                        <div>
                          <div className="flex items-center gap-2">
                            <h4 className="text-xs font-bold text-gray-900">{member.full_name || "Unnamed user"}</h4>
                            {isCurrent && (
                              <span className="text-[10px] bg-blue-50 text-[#1B8BD8] px-1.5 py-0.2 rounded font-bold">
                                You
                              </span>
                            )}
                          </div>
                          <p className="text-[11px] text-gray-400 capitalize">Role: {member.role}</p>
                        </div>
                      </div>

                      <div className="flex items-center gap-3">
                        {isOwnerOrAdmin && !isOwner && !isCurrent ? (
                          <div className="flex items-center gap-2">
                            <select
                              value={member.role}
                              onChange={(e) => handleChangeRole(member.id, e.target.value)}
                              className="px-2.5 py-1 bg-gray-50 border border-gray-200 rounded-lg text-xs font-semibold text-gray-700"
                            >
                              <option value="admin">Admin</option>
                              <option value="recruiter">Recruiter</option>
                              <option value="hr">HR</option>
                              <option value="viewer">Viewer</option>
                            </select>

                            <button
                              onClick={() => handleRemoveMember(member)}
                              title="Remove from team"
                              className="p-1.5 text-gray-400 hover:text-red-600 rounded-lg hover:bg-red-50"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>
                        ) : (
                          <span
                            className={cn(
                              "text-xs px-2.5 py-0.5 rounded-full font-bold uppercase tracking-wider",
                              member.role === "owner"
                                ? "bg-purple-100 text-purple-800"
                                : member.role === "admin"
                                ? "bg-blue-100 text-blue-800"
                                : "bg-gray-100 text-gray-800"
                            )}
                          >
                            {member.role}
                          </span>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Pending Invites Card */}
            {invites.length > 0 && (
              <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100">
                <h3 className="text-sm font-bold text-[#0A2E5A] mb-3">Pending Invitations</h3>
                <div className="divide-y divide-gray-100">
                  {invites.map((inv) => (
                    <div key={inv.id} className="py-3 flex items-center justify-between gap-3">
                      <div>
                        <p className="text-xs font-semibold text-gray-900">{inv.email}</p>
                        <p className="text-[10px] text-gray-400 capitalize">Invited as {inv.role}</p>
                      </div>
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => {
                            const link = `${window.location.origin}/invite/${inv.token}`;
                            navigator.clipboard.writeText(link);
                            showToast("Invite link copied to clipboard");
                          }}
                          className="px-2.5 py-1 bg-gray-100 hover:bg-gray-200 text-gray-700 text-[11px] font-semibold rounded-lg flex items-center gap-1"
                        >
                          <Copy className="w-3 h-3" />
                          <span>Copy link</span>
                        </button>
                        <button
                          onClick={() => handleRevokeInvite(inv.id)}
                          className="p-1 text-gray-400 hover:text-red-600 rounded"
                          title="Revoke invitation"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {/* TAB 3: PERSONAL PROFILE & PASSWORD */}
        {activeTab === "Profile" && (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Details Form */}
            <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100 space-y-4">
              <h3 className="text-sm font-bold text-[#0A2E5A] border-b border-gray-100 pb-3 flex items-center gap-2">
                <User className="w-4 h-4 text-[#F5741A]" />
                <span>Personal Information</span>
              </h3>

              <form onSubmit={handleSaveProfile} className="space-y-4">
                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-1">Full Name</label>
                  <input
                    type="text"
                    required
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                    className="w-full px-3.5 py-2 bg-gray-50 border border-gray-200 rounded-xl text-xs focus:ring-2 focus:ring-[#F5741A] focus:bg-white"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-1">Email address</label>
                  <input
                    type="email"
                    disabled
                    value={user?.email || ""}
                    className="w-full px-3.5 py-2 bg-gray-100 border border-gray-200 rounded-xl text-xs text-gray-500 cursor-not-allowed"
                  />
                  <p className="text-[10px] text-gray-400 mt-1">Managed via Supabase Auth</p>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-1">Phone Number</label>
                  <input
                    type="tel"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    placeholder="9876543210"
                    className="w-full px-3.5 py-2 bg-gray-50 border border-gray-200 rounded-xl text-xs focus:ring-2 focus:ring-[#F5741A] focus:bg-white"
                  />
                </div>

                <button
                  type="submit"
                  disabled={isSavingProfile}
                  className="py-2.5 px-5 bg-[#0A2E5A] hover:bg-[#071E3D] disabled:opacity-50 text-white text-xs font-bold rounded-xl shadow-sm transition-all"
                >
                  {isSavingProfile ? "Saving..." : "Save details"}
                </button>
              </form>
            </div>

            {/* Password Update Form */}
            <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100 space-y-4">
              <h3 className="text-sm font-bold text-[#0A2E5A] border-b border-gray-100 pb-3 flex items-center gap-2">
                <Lock className="w-4 h-4 text-[#1B8BD8]" />
                <span>Security & Password</span>
              </h3>

              <form onSubmit={handleChangePassword} className="space-y-4">
                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-1">New Password</label>
                  <input
                    type="password"
                    required
                    minLength={6}
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    placeholder="Minimum 6 characters"
                    className="w-full px-3.5 py-2 bg-gray-50 border border-gray-200 rounded-xl text-xs focus:ring-2 focus:ring-[#F5741A] focus:bg-white"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-1">Confirm New Password</label>
                  <input
                    type="password"
                    required
                    minLength={6}
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    placeholder="Repeat new password"
                    className="w-full px-3.5 py-2 bg-gray-50 border border-gray-200 rounded-xl text-xs focus:ring-2 focus:ring-[#F5741A] focus:bg-white"
                  />
                </div>

                <button
                  type="submit"
                  disabled={isChangingPassword || !newPassword}
                  className="py-2.5 px-5 bg-[#F5741A] hover:bg-[#D9610E] disabled:opacity-50 text-white text-xs font-bold rounded-xl shadow-sm transition-all"
                >
                  {isChangingPassword ? "Updating..." : "Update password"}
                </button>
              </form>
            </div>
          </div>
        )}

        {/* TAB 4: APP RELEASES (SECTION 11) */}
        {activeTab === "App releases" && (
          <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100 space-y-5">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-gray-100">
              <div>
                <h3 className="text-sm font-bold text-[#0A2E5A] flex items-center gap-2">
                  <Sparkles className="w-4 h-4 text-[#F5741A]" />
                  <span>Release History & Changelog</span>
                </h3>
                <p className="text-xs text-gray-500 mt-0.5">
                  Published updates detected by PWA client for reload prompts
                </p>
              </div>

              {isOwnerOrAdmin && (
                <button
                  onClick={() => setIsReleaseModalOpen(true)}
                  className="flex items-center gap-1.5 px-3.5 py-2 bg-[#F5741A] hover:bg-[#D9610E] text-white text-xs font-bold rounded-xl shadow-sm transition-all"
                >
                  <Plus className="w-4 h-4" />
                  <span>Publish release</span>
                </button>
              )}
            </div>

            <div className="space-y-4">
              {releases.map((rel) => (
                <div key={rel.id} className="p-4 bg-gray-50/70 rounded-xl border border-gray-100 space-y-1.5">
                  <div className="flex items-center justify-between gap-2 flex-wrap">
                    <div className="flex items-center gap-2">
                      <span className="px-2 py-0.5 bg-[#0A2E5A] text-white font-mono text-xs font-bold rounded-lg">
                        v{rel.version}
                      </span>
                      <h4 className="text-xs font-bold text-gray-900">{rel.title}</h4>
                    </div>
                    <span className="text-[10px] text-gray-400">
                      {new Date(rel.released_at).toLocaleDateString("en-IN", {
                        day: "numeric",
                        month: "short",
                        year: "numeric",
                      })}
                    </span>
                  </div>
                  {rel.notes && (
                    <p className="text-xs text-gray-600 leading-relaxed whitespace-pre-wrap">{rel.notes}</p>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Invite Modal */}
        {isInviteModalOpen && (
          <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
            <div className="bg-white rounded-2xl max-w-md w-full p-6 space-y-4 shadow-2xl animate-in zoom-in-95">
              <div className="flex items-center justify-between border-b border-gray-100 pb-3">
                <h3 className="text-sm font-bold text-[#0A2E5A]">Invite new team member</h3>
                <button
                  onClick={() => setIsInviteModalOpen(false)}
                  className="p-1 rounded-lg text-gray-400 hover:text-gray-900"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {!createdInviteLink ? (
                <form onSubmit={handleSendInvite} className="space-y-4">
                  <div>
                    <label className="block text-xs font-semibold text-gray-700 mb-1">
                      Email address <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="email"
                      required
                      value={inviteEmail}
                      onChange={(e) => setInviteEmail(e.target.value)}
                      placeholder="colleague@milestoneconsultancy.in"
                      className="w-full px-3.5 py-2 bg-gray-50 border border-gray-200 rounded-xl text-xs focus:ring-2 focus:ring-[#F5741A] focus:bg-white"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-gray-700 mb-1">Role & Permissions</label>
                    <select
                      value={inviteRole}
                      onChange={(e) => setInviteRole(e.target.value)}
                      className="w-full px-3.5 py-2 bg-gray-50 border border-gray-200 rounded-xl text-xs font-semibold text-gray-800"
                    >
                      <option value="recruiter">Recruiter (Candidate Tracker, New Interviews, Offers)</option>
                      <option value="hr">HR (All Recruiter access + HR documents)</option>
                      <option value="admin">Admin (All features + Masters & Team)</option>
                      <option value="viewer">Viewer (Read-only)</option>
                    </select>
                  </div>

                  <div className="flex justify-end gap-2 pt-2">
                    <button
                      type="button"
                      onClick={() => setIsInviteModalOpen(false)}
                      className="px-4 py-2 bg-gray-100 text-gray-700 text-xs font-semibold rounded-xl"
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      disabled={isSendingInvite}
                      className="px-4 py-2 bg-[#F5741A] hover:bg-[#D9610E] text-white text-xs font-bold rounded-xl"
                    >
                      {isSendingInvite ? "Generating..." : "Generate invite link"}
                    </button>
                  </div>
                </form>
              ) : (
                <div className="space-y-4">
                  <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-xl text-xs text-emerald-800 flex items-center gap-2">
                    <Check className="w-4 h-4 text-emerald-600 shrink-0" />
                    <span>Invite link ready for <strong>{inviteEmail}</strong></span>
                  </div>

                  <div className="p-3 bg-gray-50 rounded-xl border border-gray-200 break-all font-mono text-[11px] text-gray-800 select-all">
                    {createdInviteLink}
                  </div>

                  <div className="flex items-center justify-between gap-3 pt-2">
                    <button
                      onClick={() => {
                        navigator.clipboard.writeText(createdInviteLink);
                        showToast("Link copied to clipboard!");
                      }}
                      className="flex-1 py-2 px-4 bg-[#0A2E5A] hover:bg-[#071E3D] text-white text-xs font-bold rounded-xl flex items-center justify-center gap-1.5"
                    >
                      <Copy className="w-4 h-4" />
                      <span>Copy link</span>
                    </button>
                    <button
                      onClick={() => setIsInviteModalOpen(false)}
                      className="py-2 px-4 bg-gray-100 text-gray-700 text-xs font-semibold rounded-xl"
                    >
                      Close
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Publish Release Modal */}
        {isReleaseModalOpen && (
          <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
            <div className="bg-white rounded-2xl max-w-md w-full p-6 space-y-4 shadow-2xl animate-in zoom-in-95">
              <div className="flex items-center justify-between border-b border-gray-100 pb-3">
                <h3 className="text-sm font-bold text-[#0A2E5A]">Publish New App Release</h3>
                <button
                  onClick={() => setIsReleaseModalOpen(false)}
                  className="p-1 rounded-lg text-gray-400 hover:text-gray-900"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <form onSubmit={handlePublishRelease} className="space-y-4">
                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-1">
                    Version Number <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    value={releaseVersion}
                    onChange={(e) => setReleaseVersion(e.target.value)}
                    placeholder="1.0.1"
                    className="w-full px-3.5 py-2 bg-gray-50 border border-gray-200 rounded-xl text-xs font-mono focus:ring-2 focus:ring-[#F5741A] focus:bg-white"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-1">
                    Release Title <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    value={releaseTitle}
                    onChange={(e) => setReleaseTitle(e.target.value)}
                    placeholder="e.g. Enhanced AI Resume Matching & Offer Templates"
                    className="w-full px-3.5 py-2 bg-gray-50 border border-gray-200 rounded-xl text-xs focus:ring-2 focus:ring-[#F5741A] focus:bg-white"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-1">
                    Changelog / Notes
                  </label>
                  <textarea
                    rows={4}
                    value={releaseNotes}
                    onChange={(e) => setReleaseNotes(e.target.value)}
                    placeholder="List key updates or bug fixes in this release..."
                    className="w-full px-3.5 py-2 bg-gray-50 border border-gray-200 rounded-xl text-xs focus:ring-2 focus:ring-[#F5741A] focus:bg-white"
                  />
                </div>

                <div className="flex justify-end gap-2 pt-2">
                  <button
                    type="button"
                    onClick={() => setIsReleaseModalOpen(false)}
                    className="px-4 py-2 bg-gray-100 text-gray-700 text-xs font-semibold rounded-xl"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={isSavingRelease}
                    className="px-4 py-2 bg-[#F5741A] hover:bg-[#D9610E] text-white text-xs font-bold rounded-xl"
                  >
                    {isSavingRelease ? "Publishing..." : "Publish release"}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}
      </div>
    </Shell>
  );
}
