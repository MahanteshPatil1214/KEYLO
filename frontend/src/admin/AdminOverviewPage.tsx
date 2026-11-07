import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import {
  ArrowRight,
  BarChart3,
  Building2,
  CalendarDays,
  Plus,
  RefreshCw,
  Settings,
  ShieldAlert,
  ShieldCheck,
  TrendingUp,
  Users,
} from "lucide-react";
import { useAdminUser } from "./AdminAuthGuard";
import type { DashboardSummary } from "./analyticsModel";
import type { ProjectMetrics } from "./projectModel";
import type { BookingMetrics } from "./visitModel";
import type { UserMetrics } from "./adminModel";
import type { AuditLogItem } from "./settingsModel";
import {
  fetchAuditLogs,
  fetchBookingMetrics,
  fetchDashboardSummary,
  fetchProjectMetrics,
  fetchUserMetrics,
} from "./api";

export function AdminOverviewPage() {
  const { user } = useAdminUser();

  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [analyticsSummary, setAnalyticsSummary] = useState<DashboardSummary | null>(null);
  const [projectMetrics, setProjectMetrics] = useState<ProjectMetrics | null>(null);
  const [bookingMetrics, setBookingMetrics] = useState<BookingMetrics | null>(null);
  const [userMetrics, setUserMetrics] = useState<UserMetrics | null>(null);
  const [recentLogs, setRecentLogs] = useState<AuditLogItem[]>([]);

  const loadData = async (isManualRefresh = false) => {
    if (isManualRefresh) setRefreshing(true);
    else setLoading(true);
    setError(null);

    try {
      const [analyticsRes, projectsRes, bookingsRes, usersRes, logsRes] =
        await Promise.allSettled([
          fetchDashboardSummary(),
          fetchProjectMetrics(),
          fetchBookingMetrics(),
          fetchUserMetrics(),
          fetchAuditLogs({ page: 1, pageSize: 6 }),
        ]);

      if (analyticsRes.status === "fulfilled") setAnalyticsSummary(analyticsRes.value);
      if (projectsRes.status === "fulfilled") setProjectMetrics(projectsRes.value);
      if (bookingsRes.status === "fulfilled") setBookingMetrics(bookingsRes.value);
      if (usersRes.status === "fulfilled") setUserMetrics(usersRes.value);
      if (logsRes.status === "fulfilled") setRecentLogs(logsRes.value.items);
    } catch (err: any) {
      console.error("Failed to load overview data:", err);
      setError(err?.message || "Failed to load command center overview.");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const todayDateStr = new Intl.DateTimeFormat("en-US", {
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric",
  }).format(new Date());

  const formatRelative = (iso: string) => {
    try {
      const diffMs = Date.now() - new Date(iso).getTime();
      const diffMin = Math.round(diffMs / 60000);
      if (diffMin < 1) return "just now";
      if (diffMin < 60) return `${diffMin}m ago`;
      const diffH = Math.round(diffMin / 60);
      if (diffH < 24) return `${diffH}h ago`;
      const diffD = Math.round(diffH / 24);
      return `${diffD}d ago`;
    } catch {
      return iso;
    }
  };

  const formatDetails = (details: Record<string, any>): string => {
    if (!details || Object.keys(details).length === 0) return "Action completed.";
    if (typeof details.message === "string") return details.message;
    if (typeof details.note === "string") return details.note;
    if (typeof details.name === "string") return `Target: ${details.name}`;
    const keys = Object.keys(details);
    return keys.map((k) => `${k}: ${String(details[k])}`).join(" • ");
  };

  return (
    <div className="space-y-8">
      {/* Top Banner / Welcome */}
      <div className="relative overflow-hidden rounded-2xl border border-charcoal/10 bg-gradient-to-br from-charcoal via-charcoal to-[#181D1A] p-6 text-ivory shadow-lg sm:p-8">
        <div className="relative z-10 flex flex-col justify-between gap-6 md:flex-row md:items-center">
          <div className="space-y-2">
            <div className="flex flex-wrap items-center gap-2.5">
              <span className="inline-flex items-center gap-1.5 rounded-full border border-ivory/20 bg-ivory/10 px-3 py-1 text-xs font-semibold tracking-wider uppercase text-ivory/90">
                <ShieldCheck className="size-3.5 text-emerald-400" />
                Admin Console
              </span>
              <span className="inline-flex items-center gap-1.5 rounded-full border border-emerald-500/30 bg-emerald-500/10 px-3 py-1 text-xs font-medium text-emerald-300">
                <span className="size-1.5 rounded-full bg-emerald-400 animate-pulse" />
                Live Command Center
              </span>
            </div>
            <h1 className="font-display text-2xl font-bold tracking-tight text-white sm:text-3xl">
              Welcome back, {user.full_name}
            </h1>
            <p className="max-w-2xl text-sm text-ivory/70 leading-relaxed">
              Unified administration overview for Keylo's luxury real estate platform.
              Monitor sales performance, manage projects & fact sheets, configure site visit slots,
              and maintain compliance audit records.
            </p>
          </div>

          <div className="flex flex-col items-start gap-3 sm:flex-row sm:items-center md:flex-col md:items-end">
            <div className="text-right">
              <p className="text-xs font-medium text-ivory/60">{todayDateStr}</p>
              <p className="text-xs font-semibold text-ivory/90">
                Role: <span className="text-emerald-300">Administrator</span>
              </p>
            </div>
            <button
              type="button"
              onClick={() => loadData(true)}
              disabled={refreshing || loading}
              className="inline-flex items-center gap-2 rounded-xl border border-ivory/20 bg-ivory/10 px-3.5 py-2 text-xs font-semibold text-ivory backdrop-blur-xs transition hover:bg-ivory/20 disabled:opacity-50"
            >
              <RefreshCw className={`size-3.5 ${refreshing ? "animate-spin" : ""}`} />
              <span>{refreshing ? "Refreshing..." : "Refresh Data"}</span>
            </button>
          </div>
        </div>

        {/* Decorative background glow */}
        <div className="pointer-events-none absolute -right-16 -top-16 size-80 rounded-full bg-emerald-500/10 blur-3xl" />
        <div className="pointer-events-none absolute -left-16 -bottom-16 size-80 rounded-full bg-amber-500/10 blur-3xl" />
      </div>

      {error && (
        <div className="flex items-center gap-3 rounded-xl border border-rose-200 bg-rose-50 p-4 text-sm text-rose-800">
          <ShieldAlert className="size-5 shrink-0 text-rose-600" />
          <p className="flex-1">{error}</p>
          <button
            type="button"
            onClick={() => loadData(true)}
            className="text-xs font-semibold underline hover:no-underline"
          >
            Retry
          </button>
        </div>
      )}

      {/* Primary KPI Grid (High-Level Signals) */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {/* Total Leads / Analytics */}
        <Link
          to="/admin/analytics"
          className="group relative rounded-2xl border border-charcoal/10 bg-white p-5 shadow-xs transition-all duration-200 hover:-translate-y-0.5 hover:border-charcoal/25 hover:shadow-md"
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wider text-charcoal/60">
              Total Leads & Pipeline
            </span>
            <div className="flex size-9 items-center justify-center rounded-xl bg-charcoal/5 text-charcoal transition-colors group-hover:bg-charcoal group-hover:text-ivory">
              <BarChart3 className="size-4" />
            </div>
          </div>
          <div className="mt-3">
            <span className="font-display text-3xl font-bold text-charcoal">
              {loading ? "..." : (analyticsSummary?.total_leads ?? 0).toLocaleString()}
            </span>
            <div className="mt-2 flex items-center gap-2 text-xs text-charcoal/70">
              <span className="inline-flex items-center gap-1 font-semibold text-emerald-600">
                <TrendingUp className="size-3" />
                {loading
                  ? "..."
                  : `${Math.round(analyticsSummary?.lead_conversion_rate ?? 0)}%`}
              </span>
              <span>conversion rate</span>
            </div>
          </div>
          <div className="mt-4 flex items-center justify-between border-t border-charcoal/5 pt-3 text-[11px] font-medium text-charcoal/60 group-hover:text-charcoal">
            <span>View Analytics & Reports</span>
            <ArrowRight className="size-3 transition-transform group-hover:translate-x-0.5" />
          </div>
        </Link>

        {/* Active Projects */}
        <Link
          to="/admin/projects"
          className="group relative rounded-2xl border border-charcoal/10 bg-white p-5 shadow-xs transition-all duration-200 hover:-translate-y-0.5 hover:border-charcoal/25 hover:shadow-md"
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wider text-charcoal/60">
              Managed Projects
            </span>
            <div className="flex size-9 items-center justify-center rounded-xl bg-charcoal/5 text-charcoal transition-colors group-hover:bg-charcoal group-hover:text-ivory">
              <Building2 className="size-4" />
            </div>
          </div>
          <div className="mt-3">
            <span className="font-display text-3xl font-bold text-charcoal">
              {loading ? "..." : (projectMetrics?.total_projects ?? 0).toLocaleString()}
            </span>
            <div className="mt-2 flex items-center gap-2 text-xs text-charcoal/70">
              <span className="font-semibold text-charcoal">
                {loading ? "..." : (projectMetrics?.active_projects ?? 0)}
              </span>
              <span>active in catalog</span>
            </div>
          </div>
          <div className="mt-4 flex items-center justify-between border-t border-charcoal/5 pt-3 text-[11px] font-medium text-charcoal/60 group-hover:text-charcoal">
            <span>Manage Fact Sheets</span>
            <ArrowRight className="size-3 transition-transform group-hover:translate-x-0.5" />
          </div>
        </Link>

        {/* Site Visits & Slots */}
        <Link
          to="/admin/visits"
          className="group relative rounded-2xl border border-charcoal/10 bg-white p-5 shadow-xs transition-all duration-200 hover:-translate-y-0.5 hover:border-charcoal/25 hover:shadow-md"
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wider text-charcoal/60">
              Site Visits & Slots
            </span>
            <div className="flex size-9 items-center justify-center rounded-xl bg-charcoal/5 text-charcoal transition-colors group-hover:bg-charcoal group-hover:text-ivory">
              <CalendarDays className="size-4" />
            </div>
          </div>
          <div className="mt-3">
            <span className="font-display text-3xl font-bold text-charcoal">
              {loading ? "..." : (bookingMetrics?.total_visits ?? 0).toLocaleString()}
            </span>
            <div className="mt-2 flex items-center gap-2 text-xs text-charcoal/70">
              <span className="font-semibold text-emerald-600">
                {loading ? "..." : (bookingMetrics?.active_slots ?? 0)}
              </span>
              <span>active slots configured</span>
            </div>
          </div>
          <div className="mt-4 flex items-center justify-between border-t border-charcoal/5 pt-3 text-[11px] font-medium text-charcoal/60 group-hover:text-charcoal">
            <span>Configure Availability</span>
            <ArrowRight className="size-3 transition-transform group-hover:translate-x-0.5" />
          </div>
        </Link>

        {/* User Management */}
        <Link
          to="/admin/users"
          className="group relative rounded-2xl border border-charcoal/10 bg-white p-5 shadow-xs transition-all duration-200 hover:-translate-y-0.5 hover:border-charcoal/25 hover:shadow-md"
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wider text-charcoal/60">
              Active Users
            </span>
            <div className="flex size-9 items-center justify-center rounded-xl bg-charcoal/5 text-charcoal transition-colors group-hover:bg-charcoal group-hover:text-ivory">
              <Users className="size-4" />
            </div>
          </div>
          <div className="mt-3">
            <span className="font-display text-3xl font-bold text-charcoal">
              {loading ? "..." : (userMetrics?.active ?? 0).toLocaleString()}
            </span>
            <div className="mt-2 flex items-center gap-2 text-xs text-charcoal/70">
              <span className="font-semibold text-charcoal">
                {loading ? "..." : (userMetrics?.sales_executives ?? 0)}
              </span>
              <span>sales executives</span>
            </div>
          </div>
          <div className="mt-4 flex items-center justify-between border-t border-charcoal/5 pt-3 text-[11px] font-medium text-charcoal/60 group-hover:text-charcoal">
            <span>Manage Platform Users</span>
            <ArrowRight className="size-3 transition-transform group-hover:translate-x-0.5" />
          </div>
        </Link>
      </div>

      {/* Quick Action Shortcuts */}
      <div className="rounded-2xl border border-charcoal/10 bg-white p-6 shadow-xs">
        <h2 className="font-display text-lg font-bold text-charcoal">
          Quick Administrative Actions
        </h2>
        <p className="mt-1 text-xs text-charcoal/60">
          Direct shortcuts to common operational and management workflows.
        </p>

        <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
          <Link
            to="/admin/users"
            className="flex flex-col items-center justify-center gap-2 rounded-xl border border-charcoal/10 bg-[#FAFAF7] p-3.5 text-center transition hover:border-charcoal/30 hover:bg-white"
          >
            <div className="flex size-8 items-center justify-center rounded-lg bg-charcoal/5 text-charcoal">
              <Plus className="size-4" />
            </div>
            <span className="text-xs font-semibold text-charcoal">Add User</span>
          </Link>

          <Link
            to="/admin/projects"
            className="flex flex-col items-center justify-center gap-2 rounded-xl border border-charcoal/10 bg-[#FAFAF7] p-3.5 text-center transition hover:border-charcoal/30 hover:bg-white"
          >
            <div className="flex size-8 items-center justify-center rounded-lg bg-charcoal/5 text-charcoal">
              <Building2 className="size-4" />
            </div>
            <span className="text-xs font-semibold text-charcoal">New Project</span>
          </Link>

          <Link
            to="/admin/visits"
            className="flex flex-col items-center justify-center gap-2 rounded-xl border border-charcoal/10 bg-[#FAFAF7] p-3.5 text-center transition hover:border-charcoal/30 hover:bg-white"
          >
            <div className="flex size-8 items-center justify-center rounded-lg bg-charcoal/5 text-charcoal">
              <CalendarDays className="size-4" />
            </div>
            <span className="text-xs font-semibold text-charcoal">Manage Slots</span>
          </Link>

          <Link
            to="/admin/analytics"
            className="flex flex-col items-center justify-center gap-2 rounded-xl border border-charcoal/10 bg-[#FAFAF7] p-3.5 text-center transition hover:border-charcoal/30 hover:bg-white"
          >
            <div className="flex size-8 items-center justify-center rounded-lg bg-charcoal/5 text-charcoal">
              <BarChart3 className="size-4" />
            </div>
            <span className="text-xs font-semibold text-charcoal">View Reports</span>
          </Link>

          <Link
            to="/admin/settings"
            className="flex flex-col items-center justify-center gap-2 rounded-xl border border-charcoal/10 bg-[#FAFAF7] p-3.5 text-center transition hover:border-charcoal/30 hover:bg-white"
          >
            <div className="flex size-8 items-center justify-center rounded-lg bg-charcoal/5 text-charcoal">
              <Settings className="size-4" />
            </div>
            <span className="text-xs font-semibold text-charcoal">System Settings</span>
          </Link>

          <Link
            to="/admin/audit-logs"
            className="flex flex-col items-center justify-center gap-2 rounded-xl border border-charcoal/10 bg-[#FAFAF7] p-3.5 text-center transition hover:border-charcoal/30 hover:bg-white"
          >
            <div className="flex size-8 items-center justify-center rounded-lg bg-charcoal/5 text-charcoal">
              <ShieldCheck className="size-4" />
            </div>
            <span className="text-xs font-semibold text-charcoal">Audit Trail</span>
          </Link>
        </div>
      </div>

      {/* Two-Column Module Breakdown */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        {/* Module A: User & Team Directory */}
        <div className="rounded-2xl border border-charcoal/10 bg-white p-6 shadow-xs">
          <div className="flex items-center justify-between border-b border-charcoal/10 pb-4">
            <div className="flex items-center gap-2.5">
              <div className="flex size-8 items-center justify-center rounded-lg bg-charcoal/5 text-charcoal">
                <Users className="size-4" />
              </div>
              <div>
                <h3 className="font-display text-base font-bold text-charcoal">
                  User Management Summary
                </h3>
                <p className="text-xs text-charcoal/60">
                  Role distributions and account status
                </p>
              </div>
            </div>
            <Link
              to="/admin/users"
              className="inline-flex items-center gap-1 text-xs font-semibold text-charcoal hover:underline"
            >
              <span>Manage</span>
              <ArrowRight className="size-3" />
            </Link>
          </div>

          <div className="mt-5 grid grid-cols-2 gap-3 sm:grid-cols-3">
            <div className="rounded-xl border border-charcoal/10 bg-[#FAFAF7] p-3">
              <p className="text-[11px] font-semibold text-charcoal/60 uppercase">Total Users</p>
              <p className="mt-1 text-xl font-bold text-charcoal">
                {loading ? "..." : (userMetrics?.total ?? 0)}
              </p>
            </div>
            <div className="rounded-xl border border-charcoal/10 bg-[#FAFAF7] p-3">
              <p className="text-[11px] font-semibold text-charcoal/60 uppercase">Active Users</p>
              <p className="mt-1 text-xl font-bold text-emerald-600">
                {loading ? "..." : (userMetrics?.active ?? 0)}
              </p>
            </div>
            <div className="rounded-xl border border-charcoal/10 bg-[#FAFAF7] p-3">
              <p className="text-[11px] font-semibold text-charcoal/60 uppercase">Deactivated</p>
              <p className="mt-1 text-xl font-bold text-charcoal/50">
                {loading ? "..." : (userMetrics?.deactivated ?? 0)}
              </p>
            </div>
            <div className="rounded-xl border border-charcoal/10 bg-[#FAFAF7] p-3">
              <p className="text-[11px] font-semibold text-charcoal/60 uppercase">Admins</p>
              <p className="mt-1 text-xl font-bold text-charcoal">
                {loading ? "..." : (userMetrics?.admins ?? 0)}
              </p>
            </div>
            <div className="rounded-xl border border-charcoal/10 bg-[#FAFAF7] p-3">
              <p className="text-[11px] font-semibold text-charcoal/60 uppercase">Sales Execs</p>
              <p className="mt-1 text-xl font-bold text-charcoal">
                {loading ? "..." : (userMetrics?.sales_executives ?? 0)}
              </p>
            </div>
            <div className="rounded-xl border border-charcoal/10 bg-[#FAFAF7] p-3">
              <p className="text-[11px] font-semibold text-charcoal/60 uppercase">Buyers</p>
              <p className="mt-1 text-xl font-bold text-charcoal">
                {loading ? "..." : (userMetrics?.buyers ?? 0)}
              </p>
            </div>
          </div>
        </div>

        {/* Module B: Projects & Fact Sheets */}
        <div className="rounded-2xl border border-charcoal/10 bg-white p-6 shadow-xs">
          <div className="flex items-center justify-between border-b border-charcoal/10 pb-4">
            <div className="flex items-center gap-2.5">
              <div className="flex size-8 items-center justify-center rounded-lg bg-charcoal/5 text-charcoal">
                <Building2 className="size-4" />
              </div>
              <div>
                <h3 className="font-display text-base font-bold text-charcoal">
                  Projects & Fact Sheets
                </h3>
                <p className="text-xs text-charcoal/60">
                  Catalog status and governance approvals
                </p>
              </div>
            </div>
            <Link
              to="/admin/projects"
              className="inline-flex items-center gap-1 text-xs font-semibold text-charcoal hover:underline"
            >
              <span>Manage</span>
              <ArrowRight className="size-3" />
            </Link>
          </div>

          <div className="mt-5 grid grid-cols-2 gap-3 sm:grid-cols-3">
            <div className="rounded-xl border border-charcoal/10 bg-[#FAFAF7] p-3">
              <p className="text-[11px] font-semibold text-charcoal/60 uppercase">Total Projects</p>
              <p className="mt-1 text-xl font-bold text-charcoal">
                {loading ? "..." : (projectMetrics?.total_projects ?? 0)}
              </p>
            </div>
            <div className="rounded-xl border border-charcoal/10 bg-[#FAFAF7] p-3">
              <p className="text-[11px] font-semibold text-charcoal/60 uppercase">Active Catalog</p>
              <p className="mt-1 text-xl font-bold text-emerald-600">
                {loading ? "..." : (projectMetrics?.active_projects ?? 0)}
              </p>
            </div>
            <div className="rounded-xl border border-charcoal/10 bg-[#FAFAF7] p-3">
              <p className="text-[11px] font-semibold text-charcoal/60 uppercase">Draft Projects</p>
              <p className="mt-1 text-xl font-bold text-amber-600">
                {loading ? "..." : (projectMetrics?.draft_projects ?? 0)}
              </p>
            </div>
            <div className="rounded-xl border border-charcoal/10 bg-[#FAFAF7] p-3">
              <p className="text-[11px] font-semibold text-charcoal/60 uppercase">Total Facts</p>
              <p className="mt-1 text-xl font-bold text-charcoal">
                {loading ? "..." : (projectMetrics?.total_facts ?? 0)}
              </p>
            </div>
            <div className="rounded-xl border border-charcoal/10 bg-[#FAFAF7] p-3">
              <p className="text-[11px] font-semibold text-charcoal/60 uppercase">Approved Facts</p>
              <p className="mt-1 text-xl font-bold text-emerald-600">
                {loading ? "..." : (projectMetrics?.approved_facts ?? 0)}
              </p>
            </div>
            <div className="rounded-xl border border-charcoal/10 bg-[#FAFAF7] p-3">
              <p className="text-[11px] font-semibold text-charcoal/60 uppercase">Draft Facts</p>
              <p className="mt-1 text-xl font-bold text-charcoal/60">
                {loading ? "..." : (projectMetrics?.draft_facts ?? 0)}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Module C: Site Visits & Slots + Recent Audit Trail */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        {/* Site Visits Capacity Card */}
        <div className="rounded-2xl border border-charcoal/10 bg-white p-6 shadow-xs lg:col-span-1">
          <div className="flex items-center justify-between border-b border-charcoal/10 pb-4">
            <div className="flex items-center gap-2.5">
              <div className="flex size-8 items-center justify-center rounded-lg bg-charcoal/5 text-charcoal">
                <CalendarDays className="size-4" />
              </div>
              <h3 className="font-display text-base font-bold text-charcoal">
                Visits & Slots Load
              </h3>
            </div>
            <Link
              to="/admin/visits"
              className="text-xs font-semibold text-charcoal hover:underline"
            >
              Details
            </Link>
          </div>

          <div className="mt-5 space-y-3">
            <div className="flex items-center justify-between rounded-xl border border-charcoal/10 bg-[#FAFAF7] p-3 text-xs">
              <span className="text-charcoal/70">Total Slots Configured</span>
              <span className="font-bold text-charcoal">
                {loading ? "..." : (bookingMetrics?.total_slots ?? 0)}
              </span>
            </div>
            <div className="flex items-center justify-between rounded-xl border border-emerald-200/60 bg-emerald-50/50 p-3 text-xs">
              <span className="font-medium text-emerald-800">Active Slots</span>
              <span className="font-bold text-emerald-700">
                {loading ? "..." : (bookingMetrics?.active_slots ?? 0)}
              </span>
            </div>
            <div className="flex items-center justify-between rounded-xl border border-amber-200/60 bg-amber-50/50 p-3 text-xs">
              <span className="font-medium text-amber-800">Blocked Slots</span>
              <span className="font-bold text-amber-700">
                {loading ? "..." : (bookingMetrics?.blocked_slots ?? 0)}
              </span>
            </div>
            <div className="flex items-center justify-between rounded-xl border border-indigo-200/60 bg-indigo-50/50 p-3 text-xs">
              <span className="font-medium text-indigo-800">Upcoming Visits</span>
              <span className="font-bold text-indigo-700">
                {loading ? "..." : (bookingMetrics?.upcoming_visits ?? 0)}
              </span>
            </div>
            <div className="flex items-center justify-between rounded-xl border border-charcoal/10 bg-[#FAFAF7] p-3 text-xs">
              <span className="text-charcoal/70">Completed Visits</span>
              <span className="font-bold text-charcoal">
                {loading ? "..." : (bookingMetrics?.completed_visits ?? 0)}
              </span>
            </div>
          </div>
        </div>

        {/* Recent Audit Trail Feed */}
        <div className="rounded-2xl border border-charcoal/10 bg-white p-6 shadow-xs lg:col-span-2">
          <div className="flex items-center justify-between border-b border-charcoal/10 pb-4">
            <div className="flex items-center gap-2.5">
              <div className="flex size-8 items-center justify-center rounded-lg bg-charcoal/5 text-charcoal">
                <ShieldCheck className="size-4" />
              </div>
              <div>
                <h3 className="font-display text-base font-bold text-charcoal">
                  Recent Audit Trail
                </h3>
                <p className="text-xs text-charcoal/60">
                  Immutable administrative action log
                </p>
              </div>
            </div>
            <Link
              to="/admin/audit-logs"
              className="inline-flex items-center gap-1 text-xs font-semibold text-charcoal hover:underline"
            >
              <span>Full Audit Logs</span>
              <ArrowRight className="size-3" />
            </Link>
          </div>

          <div className="mt-4">
            {loading ? (
              <p className="py-8 text-center text-xs text-charcoal/60">Loading audit activity...</p>
            ) : recentLogs.length === 0 ? (
              <p className="py-8 text-center text-xs text-charcoal/60">No recent audit logs found.</p>
            ) : (
              <div className="divide-y divide-charcoal/10">
                {recentLogs.map((log) => (
                  <div key={log.id} className="flex items-start justify-between gap-3 py-3 text-xs">
                    <div className="min-w-0 flex-1 space-y-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="rounded-md border border-charcoal/10 bg-charcoal/5 px-2 py-0.5 font-mono text-[10px] font-semibold text-charcoal">
                          {log.action}
                        </span>
                        <span className="font-semibold text-charcoal">{log.resource_type}</span>
                        {log.resource_id && (
                          <span className="font-mono text-[10px] text-charcoal/50">
                            #{log.resource_id}
                          </span>
                        )}
                      </div>
                      <p className="truncate text-charcoal/70">
                        {formatDetails(log.details)}
                      </p>
                      <p className="text-[10px] text-charcoal/50">
                        Actor: {log.actor_email || log.actor_name || "System"}
                      </p>
                    </div>
                    <span className="shrink-0 text-[11px] font-medium text-charcoal/50">
                      {formatRelative(log.created_at)}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
