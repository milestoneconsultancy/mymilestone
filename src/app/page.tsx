"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { Shell } from "@/components/layout/Shell";
import { useAuth } from "@/components/providers/AuthProvider";
import { createClient } from "@/lib/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Users,
  PhoneCall,
  FileCheck,
  UserCheck,
  UserPlus,
  Settings,
  ArrowRight,
  Clock,
  ChevronRight,
  FileText
} from "lucide-react";

export default function ErpHomePage() {
  const { profile, company } = useAuth();
  const supabase = createClient();

  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({
    totalCandidates: 0,
    candidatesThisWeek: 0,
    callsDueToday: 0,
    offersOpen: 0,
    selectedThisMonth: 0,
  });
  const [todayCalls, setTodayCalls] = useState<any[]>([]);
  const [recentActivity, setRecentActivity] = useState<any[]>([]);

  useEffect(() => {
    if (!company?.id) return;

    async function loadDashboardData() {
      try {
        const todayStr = new Date().toISOString().split("T")[0];
        const cid = company!.id;

        const { count: totalCandidates } = await supabase
          .from("candidates")
          .select("*", { count: "exact", head: true })
          .eq("company_id", cid);

        const oneWeekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();
        const { count: candidatesThisWeek } = await supabase
          .from("candidates")
          .select("*", { count: "exact", head: true })
          .eq("company_id", cid)
          .gte("created_at", oneWeekAgo);

        const { count: callsDueToday, data: callsList } = await supabase
          .from("call_logs")
          .select("*, candidate:candidates(id, candidate_name, mobile_no, position_applied_for)", { count: "exact" })
          .eq("company_id", cid)
          .eq("next_follow_up", todayStr)
          .order("created_at", { ascending: false })
          .limit(5);

        setTodayCalls(callsList || []);

        const { count: offersOpen } = await supabase
          .from("offers")
          .select("*", { count: "exact", head: true })
          .eq("company_id", cid)
          .eq("is_active", true)
          .eq("status", "Issued");

        const firstDayOfMonth = new Date();
        firstDayOfMonth.setDate(1);
        firstDayOfMonth.setHours(0, 0, 0, 0);

        const { count: selectedThisMonth } = await supabase
          .from("candidates")
          .select("*", { count: "exact", head: true })
          .eq("company_id", cid)
          .eq("final_status", "Selected")
          .gte("updated_at", firstDayOfMonth.toISOString());

        setStats({
          totalCandidates: totalCandidates || 0,
          candidatesThisWeek: candidatesThisWeek || 0,
          callsDueToday: callsDueToday || 0,
          offersOpen: offersOpen || 0,
          selectedThisMonth: selectedThisMonth || 0,
        });

        const { data: recentCalls } = await supabase
          .from("call_logs")
          .select("id, outcome, note, created_at, candidate:candidates(candidate_name)")
          .eq("company_id", cid)
          .order("created_at", { ascending: false })
          .limit(4);

        const { data: recentOffers } = await supabase
          .from("offers")
          .select("id, ref_no, status, created_at, designation, candidate:candidates(candidate_name)")
          .eq("company_id", cid)
          .order("created_at", { ascending: false })
          .limit(4);

        const combined = [
          ...(recentCalls || []).map((c: any) => ({
            id: `call-${c.id}`,
            type: "call",
            title: `Call: ${c.outcome}`,
            subtitle: `${c.candidate?.candidate_name || "Candidate"}${c.note ? ` — ${c.note}` : ""}`,
            date: c.created_at,
          })),
          ...(recentOffers || []).map((o: any) => ({
            id: `offer-${o.id}`,
            type: "offer",
            title: `Offer ${o.ref_no} (${o.status})`,
            subtitle: `${o.candidate?.candidate_name || "Candidate"} • ${o.designation || ""}`,
            date: o.created_at,
          })),
        ].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()).slice(0, 5);

        setRecentActivity(combined);
      } catch (err) {
        console.error("Dashboard error:", err);
      } finally {
        setLoading(false);
      }
    }

    loadDashboardData();
  }, [company?.id, supabase]);

  const todayFormatted = new Intl.DateTimeFormat("en-IN", {
    weekday: "long",
    day: "numeric",
    month: "short",
    year: "numeric",
  }).format(new Date());

  const getGreeting = () => {
    const hour = new Date().getHours();
    if (hour < 12) return "Good morning";
    if (hour < 17) return "Good afternoon";
    return "Good evening";
  };

  return (
    <Shell>
      <div className="space-y-6">
        <div className="bg-[#0A2E5A] rounded-2xl md:rounded-3xl p-6 md:p-8 text-white shadow-soft relative overflow-hidden">
          <div className="absolute right-0 top-0 bottom-0 w-1/3 bg-gradient-to-l from-white/5 to-transparent pointer-events-none" />
          <div className="relative z-10 max-w-2xl">
            <p className="text-xs uppercase font-bold tracking-wider text-blue-200">
              {todayFormatted}
            </p>
            <h1 className="text-2xl md:text-3xl font-bold tracking-tight mt-1 text-white">
              {getGreeting()}, {profile?.full_name?.split(" ")[0] || "Team"}
            </h1>
            <p className="text-sm md:text-base text-blue-100 mt-2 font-medium">
              {stats.callsDueToday} calls waiting today • {stats.offersOpen} offers awaiting acceptance
            </p>
          </div>
        </div>

        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3.5 md:gap-4">
          <Card className="hover:shadow-card transition-shadow">
            <CardContent className="p-4 md:p-5">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-gray-500">Candidates</span>
                <div className="w-8 h-8 rounded-xl bg-blue-50 text-[#0A2E5A] flex items-center justify-center">
                  <Users className="w-4 h-4" />
                </div>
              </div>
              <div className="mt-3">
                {loading ? (
                  <Skeleton className="h-8 w-16" />
                ) : (
                  <div className="text-2xl font-bold text-gray-900">{stats.totalCandidates}</div>
                )}
                <p className="text-[11px] text-emerald-600 font-semibold mt-1">
                  +{stats.candidatesThisWeek} this week
                </p>
              </div>
            </CardContent>
          </Card>

          <Card className="hover:shadow-card transition-shadow">
            <CardContent className="p-4 md:p-5">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-gray-500">Calls due today</span>
                <div className="w-8 h-8 rounded-xl bg-amber-50 text-[#F5741A] flex items-center justify-center">
                  <PhoneCall className="w-4 h-4" />
                </div>
              </div>
              <div className="mt-3">
                {loading ? (
                  <Skeleton className="h-8 w-16" />
                ) : (
                  <div className="text-2xl font-bold text-gray-900">{stats.callsDueToday}</div>
                )}
                <p className="text-[11px] text-gray-500 font-medium mt-1">
                  Follow-ups scheduled
                </p>
              </div>
            </CardContent>
          </Card>

          <Card className="hover:shadow-card transition-shadow">
            <CardContent className="p-4 md:p-5">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-gray-500">Offers open</span>
                <div className="w-8 h-8 rounded-xl bg-blue-50 text-[#1B8BD8] flex items-center justify-center">
                  <FileCheck className="w-4 h-4" />
                </div>
              </div>
              <div className="mt-3">
                {loading ? (
                  <Skeleton className="h-8 w-16" />
                ) : (
                  <div className="text-2xl font-bold text-gray-900">{stats.offersOpen}</div>
                )}
                <p className="text-[11px] text-[#1B8BD8] font-semibold mt-1">
                  Awaiting acceptance
                </p>
              </div>
            </CardContent>
          </Card>

          <Card className="hover:shadow-card transition-shadow">
            <CardContent className="p-4 md:p-5">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-gray-500">Selected</span>
                <div className="w-8 h-8 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center">
                  <UserCheck className="w-4 h-4" />
                </div>
              </div>
              <div className="mt-3">
                {loading ? (
                  <Skeleton className="h-8 w-16" />
                ) : (
                  <div className="text-2xl font-bold text-gray-900">{stats.selectedThisMonth}</div>
                )}
                <p className="text-[11px] text-emerald-600 font-semibold mt-1">
                  This month
                </p>
              </div>
            </CardContent>
          </Card>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <Link href="/tracker/new">
            <Button variant="accent" className="w-full h-11 justify-start gap-2.5">
              <UserPlus className="w-4 h-4" />
              <span>New interview</span>
            </Button>
          </Link>
          <Link href="/tracker/offers">
            <Button variant="default" className="w-full h-11 justify-start gap-2.5">
              <FileCheck className="w-4 h-4 text-[#F5741A]" />
              <span>Issue offer letter</span>
            </Button>
          </Link>
          <Link href="/tracker/followups">
            <Button variant="outline" className="w-full h-11 justify-start gap-2.5 bg-white">
              <PhoneCall className="w-4 h-4 text-[#1B8BD8]" />
              <span>Follow-ups</span>
            </Button>
          </Link>
          <Link href="/master">
            <Button variant="outline" className="w-full h-11 justify-start gap-2.5 bg-white">
              <Settings className="w-4 h-4 text-gray-500" />
              <span>Master</span>
            </Button>
          </Link>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-base flex items-center gap-2">
                <PhoneCall className="w-4 h-4 text-[#F5741A]" />
                <span>Today&apos;s calls</span>
              </CardTitle>
              <Link
                href="/tracker/followups"
                className="text-xs text-[#1B8BD8] font-semibold hover:underline flex items-center gap-1"
              >
                <span>View all</span>
                <ChevronRight className="w-3.5 h-3.5" />
              </Link>
            </CardHeader>
            <CardContent>
              {loading ? (
                <div className="space-y-3">
                  <Skeleton className="h-12 w-full" />
                  <Skeleton className="h-12 w-full" />
                </div>
              ) : todayCalls.length === 0 ? (
                <div className="py-8 text-center text-gray-400">
                  <PhoneCall className="w-8 h-8 mx-auto mb-2 text-gray-300" />
                  <p className="text-sm font-medium">No calls due today</p>
                  <p className="text-xs text-gray-400">All follow-ups are up to date</p>
                </div>
              ) : (
                <div className="divide-y divide-gray-100">
                  {todayCalls.map((call) => (
                    <div key={call.id} className="py-3 flex items-center justify-between first:pt-0 last:pb-0">
                      <div>
                        <p className="text-sm font-semibold text-gray-900">
                          {call.candidate?.candidate_name || "Candidate"}
                        </p>
                        <p className="text-xs text-gray-500">
                          {call.candidate?.mobile_no} • {call.candidate?.position_applied_for || "No role"}
                        </p>
                      </div>
                      <div className="flex items-center gap-2">
                        {call.candidate?.mobile_no && (
                          <a
                            href={`tel:${call.candidate.mobile_no}`}
                            className="p-2 rounded-lg bg-emerald-50 text-emerald-700 hover:bg-emerald-100 transition-colors"
                            title="Call candidate"
                          >
                            <PhoneCall className="w-4 h-4" />
                          </a>
                        )}
                        <Link href={`/tracker/candidates?open=${call.candidate_id}`}>
                          <Button variant="ghost" size="sm" className="text-xs font-semibold">
                            Open
                          </Button>
                        </Link>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-base flex items-center gap-2">
                <Clock className="w-4 h-4 text-[#1B8BD8]" />
                <span>Recent activity</span>
              </CardTitle>
            </CardHeader>
            <CardContent>
              {loading ? (
                <div className="space-y-3">
                  <Skeleton className="h-12 w-full" />
                  <Skeleton className="h-12 w-full" />
                </div>
              ) : recentActivity.length === 0 ? (
                <div className="py-8 text-center text-gray-400">
                  <Clock className="w-8 h-8 mx-auto mb-2 text-gray-300" />
                  <p className="text-sm font-medium">No recent activity</p>
                  <p className="text-xs text-gray-400">Activity will appear as you interview and issue offers</p>
                </div>
              ) : (
                <div className="divide-y divide-gray-100">
                  {recentActivity.map((act) => (
                    <div key={act.id} className="py-3 flex items-start gap-3 first:pt-0 last:pb-0">
                      <div className="w-8 h-8 rounded-xl bg-gray-100 flex items-center justify-center text-gray-600 shrink-0 mt-0.5">
                        {act.type === "call" ? (
                          <PhoneCall className="w-3.5 h-3.5 text-[#F5741A]" />
                        ) : (
                          <FileText className="w-3.5 h-3.5 text-[#1B8BD8]" />
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-xs font-semibold text-gray-900 truncate">{act.title}</p>
                        <p className="text-xs text-gray-500 truncate mt-0.5">{act.subtitle}</p>
                      </div>
                      <span className="text-[10px] text-gray-400 shrink-0">
                        {new Date(act.date).toLocaleDateString("en-IN", { month: "short", day: "numeric" })}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        <div className="hidden lg:grid grid-cols-2 gap-4 pt-2">
          <Link href="/tracker" className="group">
            <Card className="hover:border-[#0A2E5A] hover:shadow-card transition-all">
              <CardContent className="p-6 flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 rounded-2xl bg-blue-50 text-[#0A2E5A] flex items-center justify-center group-hover:bg-[#0A2E5A] group-hover:text-white transition-colors">
                    <Users className="w-6 h-6" />
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <h4 className="text-base font-bold text-gray-900">Interview tracker</h4>
                      <Badge variant="success">Live</Badge>
                    </div>
                    <p className="text-xs text-gray-500 mt-1">
                      Manage candidate pipeline, conduct AI resume parsing, and track interviews
                    </p>
                  </div>
                </div>
                <ArrowRight className="w-5 h-5 text-gray-400 group-hover:text-[#F5741A] transition-colors" />
              </CardContent>
            </Card>
          </Link>

          <Link href="/master" className="group">
            <Card className="hover:border-[#0A2E5A] hover:shadow-card transition-all">
              <CardContent className="p-6 flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 rounded-2xl bg-orange-50 text-[#F5741A] flex items-center justify-center group-hover:bg-[#F5741A] group-hover:text-white transition-colors">
                    <Settings className="w-6 h-6" />
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <h4 className="text-base font-bold text-gray-900">Master configuration</h4>
                      <Badge variant="outline">ERP</Badge>
                    </div>
                    <p className="text-xs text-gray-500 mt-1">
                      Configure designations, departments, project sites, and offer letter texts
                    </p>
                  </div>
                </div>
                <ArrowRight className="w-5 h-5 text-gray-400 group-hover:text-[#F5741A] transition-colors" />
              </CardContent>
            </Card>
          </Link>
        </div>
      </div>
    </Shell>
  );
}
