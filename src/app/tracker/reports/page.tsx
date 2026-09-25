"use client";

import React, { useState, useEffect } from "react";
import { Shell } from "@/components/layout/Shell";
import { useAuth } from "@/components/providers/AuthProvider";
import { createClient } from "@/lib/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Download,
  Users,
  CheckCircle2,
  XCircle,
  FileCheck,
  Percent,
  TrendingUp,
  Briefcase,
  Calendar,
  Layers,
} from "lucide-react";

interface MonthlyKPIs {
  totalInterviews: number;
  selected: number;
  rejected: number;
  pending: number;
  offersIssued: number;
  offersAccepted: number;
  conversionRate: number;
}

interface TrendMonth {
  monthKey: string;
  label: string;
  interviews: number;
  selected: number;
  offers: number;
}

interface PositionStat {
  position: string;
  total: number;
  selected: number;
  rejected: number;
  pending: number;
  offers: number;
  rate: number;
}

export default function ReportsPage() {
  const { company } = useAuth();
  const supabase = createClient();

  const [loading, setLoading] = useState(true);
  const [exporting, setExporting] = useState(false);
  const [selectedMonth, setSelectedMonth] = useState<string>(() => {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
  });

  const [kpis, setKpis] = useState<MonthlyKPIs>({
    totalInterviews: 0,
    selected: 0,
    rejected: 0,
    pending: 0,
    offersIssued: 0,
    offersAccepted: 0,
    conversionRate: 0,
  });

  const [trendData, setTrendData] = useState<TrendMonth[]>([]);
  const [positionStats, setPositionStats] = useState<PositionStat[]>([]);
  const [availableMonths, setAvailableMonths] = useState<{ key: string; label: string }[]>([]);

  useEffect(() => {
    // Generate the last 12 months for selector
    const months: { key: string; label: string }[] = [];
    const now = new Date();
    for (let i = 0; i < 12; i++) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
      const label = d.toLocaleDateString("en-IN", { month: "long", year: "numeric" });
      months.push({ key, label });
    }
    setAvailableMonths(months);
  }, []);

  useEffect(() => {
    if (!company?.id) return;

    async function loadReports() {
      setLoading(true);
      try {
        const cid = company!.id;

        // Fetch all candidates for company (for KPIs, trends, and positions)
        const { data: candidates, error: cErr } = await supabase
          .from("candidates")
          .select("*")
          .eq("company_id", cid)
          .order("interview_date", { ascending: false });

        if (cErr) throw cErr;

        // Fetch all offers for company
        const { data: offers, error: oErr } = await supabase
          .from("offers")
          .select("id, status, candidate_id, created_at, accepted_on, is_active")
          .eq("company_id", cid);

        if (oErr) throw oErr;

        const allCandidates = (candidates || []) as any[];
        const allOffers = (offers || []) as any[];

        // 1. Calculate Monthly KPIs for selected month
        const [selYear, selMonth] = selectedMonth.split("-").map(Number);
        const monthStart = new Date(selYear, selMonth - 1, 1).toISOString();
        const monthEnd = new Date(selYear, selMonth, 0, 23, 59, 59, 999).toISOString();

        const monthCandidates = allCandidates.filter((c) => {
          const d = c.interview_date || c.created_at;
          return d >= monthStart.split("T")[0] && d <= monthEnd.split("T")[0];
        });

        const totalInterviews = monthCandidates.length;
        const selected = monthCandidates.filter((c) => c.final_status === "Selected").length;
        const rejected = monthCandidates.filter((c) => c.final_status === "Rejected").length;
        const pending = monthCandidates.filter(
          (c) => c.final_status === "Pending" || c.final_status === "Pending Call" || c.final_status === "Hold"
        ).length;

        const monthOffers = allOffers.filter((o) => {
          return o.created_at >= monthStart && o.created_at <= monthEnd;
        });
        const offersIssued = monthOffers.length;
        const offersAccepted = allOffers.filter((o) => {
          const accDate = o.accepted_on || (o.status === "Accepted" ? o.created_at : null);
          return accDate && accDate >= monthStart && accDate <= monthEnd;
        }).length;

        const conversionRate = totalInterviews > 0 ? Math.round((selected / totalInterviews) * 100) : 0;

        setKpis({
          totalInterviews,
          selected,
          rejected,
          pending,
          offersIssued,
          offersAccepted,
          conversionRate,
        });

        // 2. Calculate 6-month visual trend
        const trends: TrendMonth[] = [];
        const today = new Date();
        for (let i = 5; i >= 0; i--) {
          const d = new Date(today.getFullYear(), today.getMonth() - i, 1);
          const y = d.getFullYear();
          const m = d.getMonth() + 1;
          const k = `${y}-${String(m).padStart(2, "0")}`;
          const start = new Date(y, m - 1, 1).toISOString().split("T")[0];
          const end = new Date(y, m, 0, 23, 59, 59).toISOString().split("T")[0];
          const label = d.toLocaleDateString("en-IN", { month: "short" });

          const monthCands = allCandidates.filter((c) => {
            const dateStr = c.interview_date || c.created_at?.split("T")[0];
            return dateStr >= start && dateStr <= end;
          });
          const monthOffs = allOffers.filter((o) => {
            const dateStr = o.created_at?.split("T")[0];
            return dateStr >= start && dateStr <= end;
          });

          trends.push({
            monthKey: k,
            label,
            interviews: monthCands.length,
            selected: monthCands.filter((c) => c.final_status === "Selected").length,
            offers: monthOffs.length,
          });
        }
        setTrendData(trends);

        // 3. Calculate position breakdown
        const posMap: Record<string, { total: number; selected: number; rejected: number; pending: number; offers: number }> = {};
        allCandidates.forEach((c) => {
          const pos = c.position_applied_for?.trim() || "Unspecified Role";
          if (!posMap[pos]) {
            posMap[pos] = { total: 0, selected: 0, rejected: 0, pending: 0, offers: 0 };
          }
          posMap[pos].total += 1;
          if (c.final_status === "Selected") posMap[pos].selected += 1;
          else if (c.final_status === "Rejected") posMap[pos].rejected += 1;
          else posMap[pos].pending += 1;
        });

        allOffers.forEach((o) => {
          const cand = allCandidates.find((c) => c.id === o.candidate_id);
          const pos = cand?.position_applied_for?.trim() || "Unspecified Role";
          if (posMap[pos]) {
            posMap[pos].offers += 1;
          }
        });

        const posList: PositionStat[] = Object.entries(posMap)
          .map(([position, stats]) => ({
            position,
            total: stats.total,
            selected: stats.selected,
            rejected: stats.rejected,
            pending: stats.pending,
            offers: stats.offers,
            rate: stats.total > 0 ? Math.round((stats.selected / stats.total) * 100) : 0,
          }))
          .sort((a, b) => b.total - a.total);

        setPositionStats(posList);
      } catch (err) {
        console.error("Error loading reports data:", err);
      } finally {
        setLoading(false);
      }
    }

    loadReports();
  }, [company?.id, selectedMonth, supabase]);

  // Export 21-Column CSV
  const handleExportCSV = async () => {
    if (!company?.id) return;
    setExporting(true);
    try {
      const { data: candidates, error } = await supabase
        .from("candidates")
        .select("*")
        .eq("company_id", company.id)
        .order("interview_no", { ascending: true });

      if (error) throw error;
      if (!candidates || candidates.length === 0) {
        alert("No candidate data available to export.");
        return;
      }

      // EXACT 21 columns
      const headers = [
        "Interview ID",
        "Interview Date",
        "Candidate Name",
        "Gender",
        "Date of Birth",
        "Age",
        "Mobile No.",
        "Email",
        "Address",
        "Pincode",
        "Position Applied For",
        "Education / Qualification",
        "Total Experience (Years)",
        "Current Location",
        "Current Salary",
        "Expected Salary",
        "Joining Availability",
        "Final Status",
        "Joining Date",
        "Resume Link",
        "Remarks",
      ];

      const escapeCSV = (val: any) => {
        if (val === null || val === undefined) return '""';
        const str = String(val).replace(/"/g, '""');
        return `"${str}"`;
      };

      const rows = candidates.map((c) => [
        escapeCSV(c.interview_no),
        escapeCSV(c.interview_date),
        escapeCSV(c.candidate_name),
        escapeCSV(c.gender),
        escapeCSV(c.date_of_birth || c.dob),
        escapeCSV(c.age),
        escapeCSV(c.mobile_no),
        escapeCSV(c.email),
        escapeCSV(c.address),
        escapeCSV(c.pincode),
        escapeCSV(c.position_applied_for),
        escapeCSV(c.education),
        escapeCSV(c.total_experience_years || c.experience_years),
        escapeCSV(c.current_location),
        escapeCSV(c.current_salary),
        escapeCSV(c.expected_salary),
        escapeCSV(c.joining_availability),
        escapeCSV(c.final_status),
        escapeCSV(c.joining_date),
        escapeCSV(c.resume_path || c.resume_url),
        escapeCSV(c.remarks),
      ]);

      const csvContent = [headers.join(","), ...rows.map((r) => r.join(","))].join("\r\n");
      const blob = new Blob(["\uFEFF" + csvContent], { type: "text/csv;charset=utf-8;" });
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      const dateStr = new Date().toISOString().split("T")[0];
      link.href = url;
      link.setAttribute("download", `Milestone_Candidates_${dateStr}.csv`);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
    } catch (err: any) {
      console.error("Export error:", err);
      alert(`Export failed: ${err.message || "Unknown error"}`);
    } finally {
      setExporting(false);
    }
  };

  // Find max value for trend chart scaling
  const maxTrendVal = Math.max(
    ...trendData.map((t) => Math.max(t.interviews, t.selected, t.offers)),
    1
  );

  return (
    <Shell>
      <div className="space-y-6 max-w-7xl mx-auto pb-12">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-5 rounded-2xl shadow-sm border border-gray-100">
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-2xl font-bold text-[#0A2E5A]">Reports & Analytics</h1>
              <Badge variant="outline" className="text-xs bg-blue-50 text-[#1B8BD8] border-blue-200">
                Live Data
              </Badge>
            </div>
            <p className="text-sm text-gray-500 mt-1">
              Monthly recruitment pipeline, conversions, and position breakdown
            </p>
          </div>

          <div className="flex items-center gap-3">
            {/* Month Filter */}
            <div className="flex items-center gap-1.5 bg-gray-50 px-3 py-1.5 rounded-xl border border-gray-200">
              <Calendar className="w-4 h-4 text-gray-500" />
              <select
                value={selectedMonth}
                onChange={(e) => setSelectedMonth(e.target.value)}
                className="bg-transparent text-xs font-semibold text-gray-800 outline-none cursor-pointer"
              >
                {availableMonths.map((m) => (
                  <option key={m.key} value={m.key}>
                    {m.label}
                  </option>
                ))}
              </select>
            </div>

            {/* Export CSV Button */}
            <Button
              onClick={handleExportCSV}
              disabled={exporting || loading}
              className="bg-[#F5741A] hover:bg-[#d96210] text-white font-semibold rounded-xl text-xs flex items-center gap-2 shadow-sm active:scale-95 transition-all"
            >
              <Download className="w-4 h-4" />
              <span>{exporting ? "Exporting..." : "Export CSV (21 Fields)"}</span>
            </Button>
          </div>
        </div>

        {/* 1. Monthly KPIs Grid */}
        <div>
          <h2 className="text-sm font-bold text-gray-700 uppercase tracking-wider mb-3 flex items-center gap-2">
            <Layers className="w-4 h-4 text-[#1B8BD8]" />
            <span>Monthly Performance Metrics</span>
          </h2>

          {loading ? (
            <div className="grid grid-cols-2 lg:grid-cols-6 gap-3">
              {[1, 2, 3, 4, 5, 6].map((i) => (
                <Skeleton key={i} className="h-28 rounded-2xl" />
              ))}
            </div>
          ) : (
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
              <Card className="rounded-2xl border-gray-100 shadow-sm bg-white hover:border-blue-200 transition-colors">
                <CardContent className="p-4">
                  <div className="flex items-center justify-between text-gray-500 mb-2">
                    <span className="text-xs font-medium">Interviews</span>
                    <Users className="w-4 h-4 text-[#1B8BD8]" />
                  </div>
                  <div className="text-2xl font-bold text-[#0A2E5A]">{kpis.totalInterviews}</div>
                  <p className="text-[11px] text-gray-400 mt-1">Total conducted</p>
                </CardContent>
              </Card>

              <Card className="rounded-2xl border-gray-100 shadow-sm bg-white hover:border-emerald-200 transition-colors">
                <CardContent className="p-4">
                  <div className="flex items-center justify-between text-gray-500 mb-2">
                    <span className="text-xs font-medium">Selected</span>
                    <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                  </div>
                  <div className="text-2xl font-bold text-emerald-600">{kpis.selected}</div>
                  <p className="text-[11px] text-gray-400 mt-1">Qualified candidates</p>
                </CardContent>
              </Card>

              <Card className="rounded-2xl border-gray-100 shadow-sm bg-white hover:border-rose-200 transition-colors">
                <CardContent className="p-4">
                  <div className="flex items-center justify-between text-gray-500 mb-2">
                    <span className="text-xs font-medium">Rejected</span>
                    <XCircle className="w-4 h-4 text-rose-500" />
                  </div>
                  <div className="text-2xl font-bold text-rose-600">{kpis.rejected}</div>
                  <p className="text-[11px] text-gray-400 mt-1">Not shortlisted</p>
                </CardContent>
              </Card>

              <Card className="rounded-2xl border-gray-100 shadow-sm bg-white hover:border-orange-200 transition-colors">
                <CardContent className="p-4">
                  <div className="flex items-center justify-between text-gray-500 mb-2">
                    <span className="text-xs font-medium">Offers Issued</span>
                    <FileCheck className="w-4 h-4 text-[#F5741A]" />
                  </div>
                  <div className="text-2xl font-bold text-[#F5741A]">{kpis.offersIssued}</div>
                  <p className="text-[11px] text-gray-400 mt-1">Letters generated</p>
                </CardContent>
              </Card>

              <Card className="rounded-2xl border-gray-100 shadow-sm bg-white hover:border-blue-200 transition-colors">
                <CardContent className="p-4">
                  <div className="flex items-center justify-between text-gray-500 mb-2">
                    <span className="text-xs font-medium">Offers Accepted</span>
                    <Briefcase className="w-4 h-4 text-[#0A2E5A]" />
                  </div>
                  <div className="text-2xl font-bold text-[#0A2E5A]">{kpis.offersAccepted}</div>
                  <p className="text-[11px] text-gray-400 mt-1">Joined / Accepted</p>
                </CardContent>
              </Card>

              <Card className="rounded-2xl border-gray-100 shadow-sm bg-gradient-to-br from-blue-50 to-indigo-50/40">
                <CardContent className="p-4">
                  <div className="flex items-center justify-between text-gray-500 mb-2">
                    <span className="text-xs font-bold text-[#0A2E5A]">Conversion</span>
                    <Percent className="w-4 h-4 text-[#F5741A]" />
                  </div>
                  <div className="text-2xl font-extrabold text-[#0A2E5A]">{kpis.conversionRate}%</div>
                  <p className="text-[11px] text-gray-500 mt-1">Selected / Interview</p>
                </CardContent>
              </Card>
            </div>
          )}
        </div>

        {/* 2. Visual 6-Month Trend Chart */}
        <Card className="rounded-2xl border-gray-100 shadow-sm overflow-hidden bg-white">
          <CardHeader className="p-5 border-b border-gray-100 flex flex-row items-center justify-between">
            <div>
              <CardTitle className="text-base font-bold text-[#0A2E5A] flex items-center gap-2">
                <TrendingUp className="w-4 h-4 text-[#F5741A]" />
                <span>6-Month Hiring Trends</span>
              </CardTitle>
              <p className="text-xs text-gray-500 mt-0.5">
                Comparison of total interviews, selections, and offer letters
              </p>
            </div>
            {/* Chart Legend */}
            <div className="flex items-center gap-4 text-xs">
              <div className="flex items-center gap-1.5">
                <span className="w-3 h-3 rounded bg-[#0A2E5A]"></span>
                <span className="text-gray-600 font-medium">Interviews</span>
              </div>
              <div className="flex items-center gap-1.5">
                <span className="w-3 h-3 rounded bg-emerald-500"></span>
                <span className="text-gray-600 font-medium">Selected</span>
              </div>
              <div className="flex items-center gap-1.5">
                <span className="w-3 h-3 rounded bg-[#F5741A]"></span>
                <span className="text-gray-600 font-medium">Offers</span>
              </div>
            </div>
          </CardHeader>
          <CardContent className="p-6">
            {loading ? (
              <Skeleton className="h-56 w-full rounded-xl" />
            ) : (
              <div className="space-y-6">
                <div className="grid grid-cols-6 gap-2 sm:gap-6 items-end h-56 pt-6 border-b border-gray-100">
                  {trendData.map((m) => {
                    const intH = Math.round((m.interviews / maxTrendVal) * 160);
                    const selH = Math.round((m.selected / maxTrendVal) * 160);
                    const offH = Math.round((m.offers / maxTrendVal) * 160);

                    return (
                      <div key={m.monthKey} className="flex flex-col items-center h-full justify-end group">
                        <div className="flex items-end gap-1 sm:gap-2 justify-center w-full">
                          {/* Interviews bar */}
                          <div
                            style={{ height: `${Math.max(intH, 4)}px` }}
                            className="w-3 sm:w-6 bg-[#0A2E5A] rounded-t-md transition-all duration-300 relative group-hover:opacity-90"
                            title={`Interviews: ${m.interviews}`}
                          >
                            {m.interviews > 0 && (
                              <span className="opacity-0 group-hover:opacity-100 absolute -top-6 left-1/2 -translate-x-1/2 text-[10px] font-bold bg-gray-900 text-white px-1 rounded shadow pointer-events-none transition-opacity">
                                {m.interviews}
                              </span>
                            )}
                          </div>
                          {/* Selected bar */}
                          <div
                            style={{ height: `${Math.max(selH, 4)}px` }}
                            className="w-3 sm:w-6 bg-emerald-500 rounded-t-md transition-all duration-300 relative group-hover:opacity-90"
                            title={`Selected: ${m.selected}`}
                          >
                            {m.selected > 0 && (
                              <span className="opacity-0 group-hover:opacity-100 absolute -top-6 left-1/2 -translate-x-1/2 text-[10px] font-bold bg-emerald-800 text-white px-1 rounded shadow pointer-events-none transition-opacity">
                                {m.selected}
                              </span>
                            )}
                          </div>
                          {/* Offers bar */}
                          <div
                            style={{ height: `${Math.max(offH, 4)}px` }}
                            className="w-3 sm:w-6 bg-[#F5741A] rounded-t-md transition-all duration-300 relative group-hover:opacity-90"
                            title={`Offers: ${m.offers}`}
                          >
                            {m.offers > 0 && (
                              <span className="opacity-0 group-hover:opacity-100 absolute -top-6 left-1/2 -translate-x-1/2 text-[10px] font-bold bg-orange-800 text-white px-1 rounded shadow pointer-events-none transition-opacity">
                                {m.offers}
                              </span>
                            )}
                          </div>
                        </div>
                        <span className="text-xs font-semibold text-gray-600 mt-2.5">
                          {m.label}
                        </span>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* 3. Position Breakdown Table */}
        <Card className="rounded-2xl border-gray-100 shadow-sm overflow-hidden bg-white">
          <CardHeader className="p-5 border-b border-gray-100">
            <CardTitle className="text-base font-bold text-[#0A2E5A] flex items-center gap-2">
              <Briefcase className="w-4 h-4 text-[#1B8BD8]" />
              <span>Position Breakdown</span>
            </CardTitle>
            <p className="text-xs text-gray-500 mt-0.5">
              Cumulative recruitment performance by designated job profile
            </p>
          </CardHeader>
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-gray-50/75 border-b border-gray-100 text-gray-500 font-semibold uppercase tracking-wider">
                <tr>
                  <th className="py-3 px-4">Position / Role</th>
                  <th className="py-3 px-4 text-center">Applicants</th>
                  <th className="py-3 px-4 text-center">Selected</th>
                  <th className="py-3 px-4 text-center">Rejected</th>
                  <th className="py-3 px-4 text-center">In Process</th>
                  <th className="py-3 px-4 text-center">Offers Issued</th>
                  <th className="py-3 px-4 text-right">Selection Rate</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {loading ? (
                  <tr>
                    <td colSpan={7} className="py-8 text-center text-gray-400">
                      Loading position breakdown...
                    </td>
                  </tr>
                ) : positionStats.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="py-8 text-center text-gray-400">
                      No candidate records found.
                    </td>
                  </tr>
                ) : (
                  positionStats.map((pos) => (
                    <tr key={pos.position} className="hover:bg-blue-50/40 transition-colors">
                      <td className="py-3.5 px-4 font-semibold text-gray-800">
                        {pos.position}
                      </td>
                      <td className="py-3.5 px-4 text-center font-bold text-gray-700">
                        {pos.total}
                      </td>
                      <td className="py-3.5 px-4 text-center text-emerald-600 font-bold">
                        {pos.selected}
                      </td>
                      <td className="py-3.5 px-4 text-center text-rose-500 font-medium">
                        {pos.rejected}
                      </td>
                      <td className="py-3.5 px-4 text-center text-amber-600 font-medium">
                        {pos.pending}
                      </td>
                      <td className="py-3.5 px-4 text-center text-[#F5741A] font-bold">
                        {pos.offers}
                      </td>
                      <td className="py-3.5 px-4 text-right">
                        <span
                          className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-bold ${
                            pos.rate >= 50
                              ? "bg-emerald-100 text-emerald-800"
                              : pos.rate >= 25
                              ? "bg-blue-100 text-blue-800"
                              : "bg-gray-100 text-gray-700"
                          }`}
                        >
                          {pos.rate}%
                        </span>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </Card>
      </div>
    </Shell>
  );
}
