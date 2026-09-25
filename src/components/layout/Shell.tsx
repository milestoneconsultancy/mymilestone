"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useAuth } from "@/components/providers/AuthProvider";
import { createClient } from "@/lib/supabase/client";
import { GlobalSearchModal } from "@/components/search/GlobalSearchModal";
import {
  Home,
  Users,
  UserPlus,
  PhoneCall,
  FileCheck,
  Settings,
  BarChart3,
  Trash2,
  Search,
  Menu,
  X,
  ChevronLeft,
  LogOut,
  Building,
  MoreHorizontal
} from "lucide-react";
import { cn } from "@/lib/utils";

export function Shell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const { user, profile, company, role, isOwnerOrAdmin, isOnline, signOut } = useAuth();
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const [isMobileDrawerOpen, setIsMobileDrawerOpen] = useState(false);
  const [isMoreMenuOpen, setIsMoreMenuOpen] = useState(false);
  const [trashCount, setTrashCount] = useState<number>(0);
  const [isLiveActive, setIsLiveActive] = useState(true);

  const supabase = createClient();
  const isInsideTracker = pathname.startsWith("/tracker");

  useEffect(() => {
    if (!company?.id) return;

    async function fetchTrashCount() {
      const { count } = await supabase
        .from("trash")
        .select("*", { count: "exact", head: true })
        .eq("company_id", company!.id);
      setTrashCount(count || 0);
    }

    fetchTrashCount();

    const channel = supabase
      .channel("shell-trash-realtime")
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "trash",
          filter: `company_id=eq.${company.id}`,
        },
        () => {
          fetchTrashCount();
        }
      )
      .subscribe((status) => {
        setIsLiveActive(status === "SUBSCRIBED");
      });

    return () => {
      supabase.removeChannel(channel);
    };
  }, [company?.id, supabase]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === "k") {
        e.preventDefault();
        setIsSearchOpen(true);
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, []);

  useEffect(() => {
    setIsMobileDrawerOpen(false);
    setIsMoreMenuOpen(false);
  }, [pathname]);

  return (
    <div className="min-h-screen bg-[#F3F5F9] flex flex-col lg:flex-row text-gray-900 antialiased">
      <aside className="hidden lg:flex w-[250px] bg-[#0A2E5A] text-white flex-col shrink-0 fixed inset-y-0 left-0 z-30 shadow-xl">
        <div className="h-16 px-5 flex items-center gap-3 border-b border-white/10">
          <div className="w-9 h-9 rounded-xl bg-white/10 flex items-center justify-center border border-white/20 text-[#F5741A] font-bold">
            <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
              <path d="M4 19.5v-15A2.5 2.5 0 0 1 6.5 2H20v20H6.5a2.5 2.5 0 0 1-2.5-2.5Z"/>
              <path d="M6 6h10"/>
              <path d="M6 10h10"/>
              <path d="M12 18v-4"/>
              <path d="m9 15 3-3 3 3"/>
            </svg>
          </div>
          <div className="min-w-0">
            <h2 className="text-sm font-bold tracking-tight text-white truncate">
              {company?.name || "Milestone ERP"}
            </h2>
            <p className="text-[10px] text-blue-200 capitalize font-medium">
              {role || "Recruiter"} • {isOnline ? "Online" : "Offline"}
            </p>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto px-3 py-4 space-y-6">
          {isInsideTracker ? (
            <div className="space-y-1">
              <Link
                href="/"
                className="flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs font-semibold text-blue-200 hover:text-white hover:bg-white/10 mb-3 transition-colors"
              >
                <ChevronLeft className="w-4 h-4" />
                <span>ERP home</span>
              </Link>

              <div className="px-3 pb-1 text-[11px] font-bold uppercase tracking-wider text-blue-300/70">
                Interview tracker
              </div>

              <Link
                href="/tracker"
                className={cn(
                  "flex items-center gap-3 px-3 py-2.5 rounded-xl text-xs font-semibold transition-colors",
                  pathname === "/tracker"
                    ? "bg-[#F5741A] text-white shadow-sm"
                    : "text-blue-100 hover:bg-white/10 hover:text-white"
                )}
              >
                <Home className="w-4 h-4" />
                <span>Home</span>
              </Link>

              <Link
                href="/tracker/candidates"
                className={cn(
                  "flex items-center gap-3 px-3 py-2.5 rounded-xl text-xs font-semibold transition-colors",
                  pathname.startsWith("/tracker/candidates")
                    ? "bg-[#F5741A] text-white shadow-sm"
                    : "text-blue-100 hover:bg-white/10 hover:text-white"
                )}
              >
                <Users className="w-4 h-4" />
                <span>Candidates</span>
              </Link>

              <Link
                href="/tracker/new"
                className={cn(
                  "flex items-center gap-3 px-3 py-2.5 rounded-xl text-xs font-semibold transition-colors",
                  pathname === "/tracker/new"
                    ? "bg-[#F5741A] text-white shadow-sm"
                    : "text-blue-100 hover:bg-white/10 hover:text-white"
                )}
              >
                <UserPlus className="w-4 h-4 text-[#F5741A]" />
                <span>New interview</span>
              </Link>

              <Link
                href="/tracker/followups"
                className={cn(
                  "flex items-center gap-3 px-3 py-2.5 rounded-xl text-xs font-semibold transition-colors",
                  pathname === "/tracker/followups"
                    ? "bg-[#F5741A] text-white shadow-sm"
                    : "text-blue-100 hover:bg-white/10 hover:text-white"
                )}
              >
                <PhoneCall className="w-4 h-4" />
                <span>Follow-ups</span>
              </Link>

              <Link
                href="/tracker/offers"
                className={cn(
                  "flex items-center gap-3 px-3 py-2.5 rounded-xl text-xs font-semibold transition-colors",
                  pathname.startsWith("/tracker/offers")
                    ? "bg-[#F5741A] text-white shadow-sm"
                    : "text-blue-100 hover:bg-white/10 hover:text-white"
                )}
              >
                <FileCheck className="w-4 h-4" />
                <span>Offers</span>
              </Link>

              <Link
                href="/master"
                className={cn(
                  "flex items-center gap-3 px-3 py-2.5 rounded-xl text-xs font-semibold transition-colors",
                  pathname.startsWith("/master")
                    ? "bg-[#F5741A] text-white shadow-sm"
                    : "text-blue-100 hover:bg-white/10 hover:text-white"
                )}
              >
                <Settings className="w-4 h-4" />
                <span>Master</span>
              </Link>

              <Link
                href="/tracker/reports"
                className={cn(
                  "flex items-center gap-3 px-3 py-2.5 rounded-xl text-xs font-semibold transition-colors",
                  pathname === "/tracker/reports"
                    ? "bg-[#F5741A] text-white shadow-sm"
                    : "text-blue-100 hover:bg-white/10 hover:text-white"
                )}
              >
                <BarChart3 className="w-4 h-4" />
                <span>Reports</span>
              </Link>
            </div>
          ) : (
            <div className="space-y-4">
              <div className="space-y-1">
                <Link
                  href="/"
                  className={cn(
                    "flex items-center gap-3 px-3 py-2.5 rounded-xl text-xs font-semibold transition-colors",
                    pathname === "/"
                      ? "bg-white/15 text-white shadow-sm"
                      : "text-blue-100 hover:bg-white/10 hover:text-white"
                  )}
                >
                  <Home className="w-4 h-4 text-[#F5741A]" />
                  <span>ERP home</span>
                </Link>
              </div>

              <div>
                <div className="px-3 pb-1 text-[11px] font-bold uppercase tracking-wider text-blue-300/70">
                  Modules
                </div>
                <div className="space-y-1">
                  <Link
                    href="/tracker"
                    className="flex items-center justify-between px-3 py-2.5 rounded-xl text-xs font-semibold text-blue-100 hover:bg-white/10 hover:text-white transition-colors"
                  >
                    <div className="flex items-center gap-3">
                      <Users className="w-4 h-4" />
                      <span>Interview tracker</span>
                    </div>
                    <span className="text-[10px] bg-emerald-500/20 text-emerald-300 px-1.5 py-0.5 rounded-md font-medium">
                      Live
                    </span>
                  </Link>
                </div>
              </div>

              <div>
                <div className="px-3 pb-1 text-[11px] font-bold uppercase tracking-wider text-blue-300/70">
                  ERP
                </div>
                <div className="space-y-1">
                  <Link
                    href="/master"
                    className={cn(
                      "flex items-center gap-3 px-3 py-2.5 rounded-xl text-xs font-semibold transition-colors",
                      pathname.startsWith("/master")
                        ? "bg-white/15 text-white"
                        : "text-blue-100 hover:bg-white/10 hover:text-white"
                    )}
                  >
                    <Settings className="w-4 h-4" />
                    <span>Master</span>
                  </Link>

                  <Link
                    href="/tracker/reports"
                    className={cn(
                      "flex items-center gap-3 px-3 py-2.5 rounded-xl text-xs font-semibold transition-colors",
                      pathname === "/tracker/reports"
                        ? "bg-white/15 text-white"
                        : "text-blue-100 hover:bg-white/10 hover:text-white"
                    )}
                  >
                    <BarChart3 className="w-4 h-4" />
                    <span>Reports</span>
                  </Link>

                  <Link
                    href="/trash"
                    className={cn(
                      "flex items-center justify-between px-3 py-2.5 rounded-xl text-xs font-semibold transition-colors",
                      pathname === "/trash"
                        ? "bg-white/15 text-white"
                        : "text-blue-100 hover:bg-white/10 hover:text-white"
                    )}
                  >
                    <div className="flex items-center gap-3">
                      <Trash2 className="w-4 h-4" />
                      <span>Trash</span>
                    </div>
                    {trashCount > 0 && (
                      <span className="text-[10px] bg-red-500/30 text-red-200 px-1.5 py-0.5 rounded-full font-bold">
                        {trashCount}
                      </span>
                    )}
                  </Link>

                  <Link
                    href="/settings"
                    className={cn(
                      "flex items-center gap-3 px-3 py-2.5 rounded-xl text-xs font-semibold transition-colors",
                      pathname.startsWith("/settings")
                        ? "bg-white/15 text-white"
                        : "text-blue-100 hover:bg-white/10 hover:text-white"
                    )}
                  >
                    <Building className="w-4 h-4" />
                    <span>Settings</span>
                  </Link>
                </div>
              </div>
            </div>
          )}
        </div>

        <div className="p-3 border-t border-white/10 flex items-center justify-between">
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="w-8 h-8 rounded-full bg-white/20 flex items-center justify-center font-bold text-xs text-white">
              {profile?.full_name?.charAt(0) || "U"}
            </div>
            <div className="min-w-0">
              <p className="text-xs font-semibold text-white truncate">
                {profile?.full_name || user?.email || "User"}
              </p>
              <p className="text-[10px] text-blue-200 truncate capitalize">{role || "Staff"}</p>
            </div>
          </div>
          <button
            onClick={() => signOut()}
            title="Sign out"
            className="p-1.5 rounded-lg text-blue-200 hover:text-white hover:bg-white/10 transition-colors"
          >
            <LogOut className="w-4 h-4" />
          </button>
        </div>
      </aside>

      <div className="flex-1 flex flex-col min-w-0 lg:ml-[250px] pb-16 lg:pb-0">
        <header className="h-16 bg-[#0A2E5A] text-white flex items-center justify-between px-4 lg:px-8 sticky top-0 z-20 shadow-md">
          <div className="flex items-center gap-3 lg:hidden">
            <button
              onClick={() => setIsMobileDrawerOpen(true)}
              className="p-2 -ml-2 rounded-xl text-white hover:bg-white/10 focus:outline-none"
              aria-label="Open menu"
            >
              <Menu className="w-6 h-6" />
            </button>
            <div className="flex items-center gap-2">
              <div className="w-7 h-7 rounded-lg bg-white/10 flex items-center justify-center text-[#F5741A] font-bold">
                <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                  <path d="M4 19.5v-15A2.5 2.5 0 0 1 6.5 2H20v20H6.5a2.5 2.5 0 0 1-2.5-2.5Z"/>
                </svg>
              </div>
              <span className="font-bold text-sm text-white tracking-tight">Milestone ERP</span>
            </div>
          </div>

          <div className="hidden lg:flex items-center gap-4">
            <Link
              href="/"
              className="p-2 rounded-xl text-blue-100 hover:text-white hover:bg-white/10 transition-colors"
              title="ERP home"
            >
              <Home className="w-4 h-4" />
            </Link>
            <span className="text-xs text-blue-200">/</span>
            <span className="text-xs font-semibold text-white capitalize">
              {pathname === "/" ? "ERP Home" : pathname.replace(/\//g, " ").trim()}
            </span>
          </div>

          <div className="flex items-center gap-3">
            <div
              onClick={() => setIsSearchOpen(true)}
              className="hidden lg:flex items-center gap-2.5 bg-white/10 hover:bg-white/15 border border-white/15 px-3 py-1.5 rounded-xl cursor-pointer transition-all w-72 text-blue-100 hover:text-white"
            >
              <Search className="w-4 h-4 text-blue-200" />
              <span className="text-xs font-medium flex-1">Search candidates, offers...</span>
              <kbd className="text-[10px] bg-white/20 text-white px-1.5 py-0.5 rounded font-mono">⌘K</kbd>
            </div>

            <button
              onClick={() => setIsSearchOpen(true)}
              className="p-2 lg:hidden rounded-xl text-blue-100 hover:text-white hover:bg-white/10 focus:outline-none"
              aria-label="Search"
            >
              <Search className="w-5 h-5" />
            </button>

            <div
              className="flex items-center gap-1.5 px-2 py-1 rounded-full bg-white/10 text-[11px] text-white"
              title={isOnline ? (isLiveActive ? "Live sync active" : "Connected") : "Offline"}
            >
              <div
                className={cn(
                  "w-2 h-2 rounded-full",
                  isOnline
                    ? isLiveActive
                      ? "bg-emerald-400 animate-pulse"
                      : "bg-emerald-400"
                    : "bg-red-400"
                )}
              />
              <span className="hidden sm:inline text-[10px] font-medium text-blue-200">
                {isOnline ? "Live" : "Offline"}
              </span>
            </div>
          </div>
        </header>

        <main className="flex-1 p-4 lg:p-8 max-w-7xl w-full mx-auto animate-in fade-in duration-200">
          {children}
        </main>
      </div>

      {isMobileDrawerOpen && (
        <div className="fixed inset-0 z-50 lg:hidden flex">
          <div
            className="fixed inset-0 bg-black/60 backdrop-blur-sm"
            onClick={() => setIsMobileDrawerOpen(false)}
          />
          <div className="relative w-72 max-w-[80%] bg-[#0A2E5A] text-white flex flex-col h-full shadow-2xl z-10 animate-in slide-in-from-left duration-200">
            <div className="h-16 px-5 flex items-center justify-between border-b border-white/10">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-xl bg-white/10 flex items-center justify-center text-[#F5741A]">
                  <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                    <path d="M4 19.5v-15A2.5 2.5 0 0 1 6.5 2H20v20H6.5a2.5 2.5 0 0 1-2.5-2.5Z"/>
                  </svg>
                </div>
                <div className="min-w-0">
                  <h3 className="text-sm font-bold text-white truncate">{company?.name || "Milestone ERP"}</h3>
                  <p className="text-[10px] text-blue-200 truncate capitalize">{role || "Recruiter"}</p>
                </div>
              </div>
              <button
                onClick={() => setIsMobileDrawerOpen(false)}
                className="p-1 rounded-lg text-white hover:bg-white/10"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto px-4 py-6 space-y-2">
              <Link
                href="/"
                className={cn(
                  "flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-semibold transition-colors",
                  pathname === "/" ? "bg-[#F5741A] text-white" : "text-blue-100 hover:bg-white/10"
                )}
              >
                <Home className="w-4 h-4" />
                <span>ERP home</span>
              </Link>

              <Link
                href="/tracker"
                className={cn(
                  "flex items-center justify-between px-3 py-2.5 rounded-xl text-sm font-semibold transition-colors",
                  pathname.startsWith("/tracker") ? "bg-[#F5741A] text-white" : "text-blue-100 hover:bg-white/10"
                )}
              >
                <div className="flex items-center gap-3">
                  <Users className="w-4 h-4" />
                  <span>Interview tracker</span>
                </div>
                <span className="text-[10px] bg-emerald-500/20 text-emerald-300 px-1.5 py-0.5 rounded-md font-medium">
                  Live
                </span>
              </Link>

              <Link
                href="/master"
                className={cn(
                  "flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-semibold transition-colors",
                  pathname.startsWith("/master") ? "bg-[#F5741A] text-white" : "text-blue-100 hover:bg-white/10"
                )}
              >
                <Settings className="w-4 h-4" />
                <span>Master</span>
              </Link>

              <Link
                href="/tracker/reports"
                className={cn(
                  "flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-semibold transition-colors",
                  pathname === "/tracker/reports" ? "bg-[#F5741A] text-white" : "text-blue-100 hover:bg-white/10"
                )}
              >
                <BarChart3 className="w-4 h-4" />
                <span>Reports</span>
              </Link>

              <Link
                href="/trash"
                className={cn(
                  "flex items-center justify-between px-3 py-2.5 rounded-xl text-sm font-semibold transition-colors",
                  pathname === "/trash" ? "bg-[#F5741A] text-white" : "text-blue-100 hover:bg-white/10"
                )}
              >
                <div className="flex items-center gap-3">
                  <Trash2 className="w-4 h-4" />
                  <span>Trash</span>
                </div>
                {trashCount > 0 && (
                  <span className="text-xs bg-red-500 text-white px-2 py-0.5 rounded-full font-bold">
                    {trashCount}
                  </span>
                )}
              </Link>

              <Link
                href="/settings"
                className={cn(
                  "flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-semibold transition-colors",
                  pathname.startsWith("/settings") ? "bg-[#F5741A] text-white" : "text-blue-100 hover:bg-white/10"
                )}
              >
                <Building className="w-4 h-4" />
                <span>Settings</span>
              </Link>
            </div>

            <div className="p-4 border-t border-white/10 flex items-center justify-between">
              <span className="text-xs text-blue-200">Milestone ERP v1.0</span>
              <button
                onClick={() => signOut()}
                className="flex items-center gap-1.5 text-xs text-red-300 hover:text-white"
              >
                <LogOut className="w-3.5 h-3.5" />
                <span>Sign out</span>
              </button>
            </div>
          </div>
        </div>
      )}

      <nav className="lg:hidden fixed bottom-0 left-0 right-0 z-40 bg-white border-t border-gray-200 shadow-lg px-2 py-1.5 flex items-center justify-around">
        <Link
          href="/tracker"
          className={cn(
            "flex flex-col items-center gap-0.5 py-1 px-2 rounded-lg text-[10px] font-semibold transition-colors",
            pathname === "/tracker" ? "text-[#F5741A]" : "text-gray-500 hover:text-gray-900"
          )}
        >
          <Home className="w-5 h-5" />
          <span>Home</span>
        </Link>

        <Link
          href="/tracker/candidates"
          className={cn(
            "flex flex-col items-center gap-0.5 py-1 px-2 rounded-lg text-[10px] font-semibold transition-colors",
            pathname.startsWith("/tracker/candidates") ? "text-[#F5741A]" : "text-gray-500 hover:text-gray-900"
          )}
        >
          <Users className="w-5 h-5" />
          <span>Candidates</span>
        </Link>

        <Link
          href="/tracker/new"
          className="flex flex-col items-center -mt-5"
        >
          <div className="w-12 h-12 rounded-full bg-[#F5741A] text-white flex items-center justify-center shadow-lg active:scale-95 transition-transform border-2 border-white">
            <UserPlus className="w-6 h-6" />
          </div>
          <span className="text-[10px] font-bold text-[#F5741A] mt-0.5">New</span>
        </Link>

        <Link
          href="/tracker/followups"
          className={cn(
            "flex flex-col items-center gap-0.5 py-1 px-2 rounded-lg text-[10px] font-semibold transition-colors",
            pathname === "/tracker/followups" ? "text-[#F5741A]" : "text-gray-500 hover:text-gray-900"
          )}
        >
          <PhoneCall className="w-5 h-5" />
          <span>Follow-ups</span>
        </Link>

        <div className="relative">
          <button
            onClick={() => setIsMoreMenuOpen(!isMoreMenuOpen)}
            className={cn(
              "flex flex-col items-center gap-0.5 py-1 px-2 rounded-lg text-[10px] font-semibold transition-colors",
              isMoreMenuOpen || pathname.startsWith("/tracker/offers") || pathname.startsWith("/master") || pathname.startsWith("/tracker/reports") || pathname.startsWith("/trash")
                ? "text-[#F5741A]"
                : "text-gray-500 hover:text-gray-900"
            )}
          >
            <MoreHorizontal className="w-5 h-5" />
            <span>More</span>
          </button>

          {isMoreMenuOpen && (
            <div className="absolute bottom-12 right-0 w-44 bg-white rounded-2xl shadow-2xl border border-gray-100 p-2 space-y-1 animate-in slide-in-from-bottom-2 duration-150 z-50">
              <Link
                href="/tracker/offers"
                className="flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs font-semibold text-gray-700 hover:bg-gray-50"
              >
                <FileCheck className="w-4 h-4 text-[#1B8BD8]" />
                <span>Offers</span>
              </Link>
              <Link
                href="/master"
                className="flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs font-semibold text-gray-700 hover:bg-gray-50"
              >
                <Settings className="w-4 h-4 text-gray-500" />
                <span>Master</span>
              </Link>
              <Link
                href="/tracker/reports"
                className="flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs font-semibold text-gray-700 hover:bg-gray-50"
              >
                <BarChart3 className="w-4 h-4 text-emerald-600" />
                <span>Reports</span>
              </Link>
              <Link
                href="/trash"
                className="flex items-center justify-between px-3 py-2 rounded-xl text-xs font-semibold text-gray-700 hover:bg-gray-50"
              >
                <div className="flex items-center gap-2.5">
                  <Trash2 className="w-4 h-4 text-red-500" />
                  <span>Trash</span>
                </div>
                {trashCount > 0 && (
                  <span className="text-[10px] bg-red-100 text-red-700 px-1.5 py-0.2 rounded-full font-bold">
                    {trashCount}
                  </span>
                )}
              </Link>
            </div>
          )}
        </div>
      </nav>

      <GlobalSearchModal
        isOpen={isSearchOpen}
        onClose={() => setIsSearchOpen(false)}
      />
    </div>
  );
}
