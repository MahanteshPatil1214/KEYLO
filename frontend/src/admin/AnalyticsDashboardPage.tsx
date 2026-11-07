import { useCallback, useEffect, useState } from "react";
import {
  AlertCircle,
  BarChart3,
  CheckCircle2,
} from "lucide-react";
import type {
  DashboardSummary,
  DashboardTrends,
  ExecutivePerformanceItem,
  SourcePerformanceItem,
  TrendGranularity,
} from "./analyticsModel";
import type { ProjectItem } from "./projectModel";
import {
  fetchDashboardSummary,
  fetchDashboardTrends,
  fetchExecutivePerformance,
  fetchProjects,
  fetchSourcePerformance,
} from "./api";
import {
  AnalyticsFilterBar,
  type DatePreset,
} from "./analytics/AnalyticsFilterBar";
import { AnalyticsKPICards } from "./analytics/AnalyticsKPICards";
import { LeadTrendsChart } from "./analytics/LeadTrendsChart";
import { SourceComparisonTable } from "./analytics/SourceComparisonTable";
import { ExecutivePerformanceTable } from "./analytics/ExecutivePerformanceTable";
import { AddMarketingSpendModal } from "./analytics/AddMarketingSpendModal";

function computeDatesForPreset(preset: DatePreset): { dateFrom: string; dateTo: string } {
  const now = new Date();
  const format = (d: Date) => d.toISOString().split("T")[0];

  if (preset === "ALL") {
    return { dateFrom: "", dateTo: "" };
  }
  if (preset === "7D") {
    const from = new Date(now);
    from.setDate(now.getDate() - 7);
    return { dateFrom: format(from), dateTo: format(now) };
  }
  if (preset === "30D") {
    const from = new Date(now);
    from.setDate(now.getDate() - 30);
    return { dateFrom: format(from), dateTo: format(now) };
  }
  if (preset === "90D") {
    const from = new Date(now);
    from.setDate(now.getDate() - 90);
    return { dateFrom: format(from), dateTo: format(now) };
  }
  return { dateFrom: "", dateTo: "" };
}

export function AnalyticsDashboardPage() {
  const [preset, setPreset] = useState<DatePreset>("ALL");
  const [dateFrom, setDateFrom] = useState<string>("");
  const [dateTo, setDateTo] = useState<string>("");
  const [projectId, setProjectId] = useState<string>("ALL");
  const [granularity, setGranularity] = useState<TrendGranularity>("DAY");

  const [projects, setProjects] = useState<ProjectItem[]>([]);
  const [summary, setSummary] = useState<DashboardSummary | null>(null);
  const [trends, setTrends] = useState<DashboardTrends | null>(null);
  const [sources, setSources] = useState<SourcePerformanceItem[]>([]);
  const [executives, setExecutives] = useState<ExecutivePerformanceItem[]>([]);

  const [loading, setLoading] = useState<boolean>(true);
  const [isRefreshing, setIsRefreshing] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [toast, setToast] = useState<string | null>(null);
  const [isSpendModalOpen, setIsSpendModalOpen] = useState<boolean>(false);

  // Auto-dismiss toast
  useEffect(() => {
    if (toast) {
      const timer = setTimeout(() => setToast(null), 4000);
      return () => clearTimeout(timer);
    }
  }, [toast]);

  // Load Projects once
  useEffect(() => {
    async function loadProjects() {
      try {
        const res = await fetchProjects({ pageSize: 100 });
        setProjects(res.items);
      } catch (err) {
        console.error("Failed to load projects list for filters:", err);
      }
    }
    loadProjects();
  }, []);

  // Handle Preset Change
  const handlePresetChange = (newPreset: DatePreset) => {
    setPreset(newPreset);
    if (newPreset !== "CUSTOM") {
      const { dateFrom: f, dateTo: t } = computeDatesForPreset(newPreset);
      setDateFrom(f);
      setDateTo(t);
    }
  };

  // Fetch Dashboard Analytics Data
  const loadDashboardData = useCallback(
    async (refreshing = false) => {
      if (refreshing) {
        setIsRefreshing(true);
      } else {
        setLoading(true);
      }
      setError(null);

      const params = {
        dateFrom: dateFrom || undefined,
        dateTo: dateTo || undefined,
        projectId: projectId !== "ALL" ? projectId : undefined,
      };

      try {
        const [sumRes, trendsRes, srcRes, execRes] = await Promise.all([
          fetchDashboardSummary(params),
          fetchDashboardTrends({ ...params, granularity }),
          fetchSourcePerformance(params),
          fetchExecutivePerformance(params),
        ]);

        setSummary(sumRes);
        setTrends(trendsRes);
        setSources(srcRes.items);
        setExecutives(execRes.items);
      } catch (err: any) {
        console.error("Failed to fetch dashboard data:", err);
        setError(err?.message || "Failed to load analytics dashboard data.");
      } finally {
        setLoading(false);
        setIsRefreshing(false);
      }
    },
    [dateFrom, dateTo, projectId, granularity],
  );

  useEffect(() => {
    loadDashboardData();
  }, [loadDashboardData]);

  const handleSpendAdded = () => {
    setToast("Marketing spend recorded successfully. ROI metrics updated.");
    loadDashboardData(true);
  };

  return (
    <div className="mx-auto flex w-full max-w-7xl flex-col gap-6 p-4 sm:p-6 lg:p-8">
      {/* Toast Alert */}
      {toast && (
        <div className="fixed bottom-6 right-6 z-50 flex items-center gap-2 rounded-xl bg-charcoal px-4 py-3 text-xs font-semibold text-white shadow-xl animate-in fade-in slide-in-from-bottom-3 duration-200">
          <CheckCircle2 className="size-4 text-emerald-400" />
          <span>{toast}</span>
        </div>
      )}

      {/* Page Header */}
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <div className="flex items-center gap-2">
            <div className="flex size-8 items-center justify-center rounded-xl bg-charcoal text-white">
              <BarChart3 className="size-4" />
            </div>
            <h1 className="font-serif text-2xl font-bold tracking-tight text-charcoal sm:text-3xl">
              Analytics & Executive Reporting
            </h1>
          </div>
          <p className="mt-1 text-xs text-charcoal/60 sm:text-sm">
            Real-time pipeline velocity, site visit conversion rates, marketing ROI, and team productivity
          </p>
        </div>
      </div>

      {/* Global Filter Bar */}
      <AnalyticsFilterBar
        preset={preset}
        onPresetChange={handlePresetChange}
        dateFrom={dateFrom}
        dateTo={dateTo}
        onDateFromChange={(val) => {
          setDateFrom(val);
          setPreset("CUSTOM");
        }}
        onDateToChange={(val) => {
          setDateTo(val);
          setPreset("CUSTOM");
        }}
        projectId={projectId}
        onProjectChange={setProjectId}
        projects={projects}
        onRefresh={() => loadDashboardData(true)}
        isRefreshing={isRefreshing}
      />

      {/* Global Error Banner */}
      {error && (
        <div className="flex items-center gap-3 rounded-2xl border border-red-200 bg-red-50 p-4 text-xs text-red-800">
          <AlertCircle className="size-4 text-red-600 shrink-0" />
          <span>{error}</span>
          <button
            type="button"
            onClick={() => loadDashboardData(true)}
            className="ml-auto underline font-semibold"
          >
            Retry
          </button>
        </div>
      )}

      {/* Operational KPI Cards */}
      <AnalyticsKPICards summary={summary} loading={loading} />

      {/* Timeline Trends Chart */}
      <LeadTrendsChart
        trends={trends}
        loading={loading}
        granularity={granularity}
        onGranularityChange={setGranularity}
      />

      {/* Acquisition ROI and Executive Productivity Tables */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <SourceComparisonTable
          items={sources}
          loading={loading}
          onAddSpend={() => setIsSpendModalOpen(true)}
        />
        <ExecutivePerformanceTable items={executives} loading={loading} />
      </div>

      {/* Record Marketing Spend Modal */}
      <AddMarketingSpendModal
        isOpen={isSpendModalOpen}
        onClose={() => setIsSpendModalOpen(false)}
        onSuccess={handleSpendAdded}
        projects={projects}
      />
    </div>
  );
}
