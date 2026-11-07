import { useState } from "react";
import {
  BarChart2,
} from "lucide-react";
import type { DashboardTrends, TrendGranularity, TrendPoint } from "../analyticsModel";

type LeadTrendsChartProps = {
  trends: DashboardTrends | null;
  loading: boolean;
  granularity: TrendGranularity;
  onGranularityChange: (g: TrendGranularity) => void;
};

export function LeadTrendsChart({
  trends,
  loading,
  granularity,
  onGranularityChange,
}: LeadTrendsChartProps) {
  const [hoveredPoint, setHoveredPoint] = useState<TrendPoint | null>(null);

  const items = trends?.items || [];

  // Calculate totals
  const totalLeads = items.reduce((acc, p) => acc + p.leads, 0);
  const totalBookings = items.reduce((acc, p) => acc + p.bookings, 0);
  const totalVisits = items.reduce((acc, p) => acc + p.completed_visits, 0);
  const totalConversions = items.reduce((acc, p) => acc + p.conversions, 0);

  // Maximum value for scaling the bars/chart
  const maxValue = Math.max(
    1,
    ...items.map((p) => Math.max(p.leads, p.bookings, p.completed_visits, p.conversions)),
  );

  const formatPeriodLabel = (period: string) => {
    if (!period) return "";
    // If YYYY-MM-DD
    if (/^\d{4}-\d{2}-\d{2}$/.test(period)) {
      const parts = period.split("-");
      const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
      return `${parseInt(parts[2], 10)} ${months[parseInt(parts[1], 10) - 1]}`;
    }
    // If Week e.g. 2026-W44
    if (/^\d{4}-W\d+$/.test(period)) {
      return period.replace("-", " ");
    }
    // If Month e.g. 2026-11
    if (/^\d{4}-\d{2}$/.test(period)) {
      const parts = period.split("-");
      const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
      return `${months[parseInt(parts[1], 10) - 1]} '${parts[0].slice(2)}`;
    }
    return period;
  };

  return (
    <div className="flex flex-col rounded-2xl border border-charcoal/10 bg-white/80 p-5 shadow-xs">
      {/* Header */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between border-b border-charcoal/5 pb-4">
        <div>
          <div className="flex items-center gap-2">
            <h3 className="font-serif text-lg font-bold text-charcoal">
              Acquisition & Conversion Trends
            </h3>
            <span className="rounded-full bg-charcoal/5 px-2 py-0.5 text-[10px] font-semibold text-charcoal/70">
              {items.length} {granularity.toLowerCase()} intervals
            </span>
          </div>
          <p className="mt-0.5 text-xs text-charcoal/60">
            Trajectory of inquiries, visits scheduled, site tours completed, and unit conversions
          </p>
        </div>

        {/* Granularity Selector */}
        <div className="flex items-center self-start rounded-xl border border-charcoal/15 bg-charcoal/5 p-1 text-xs font-semibold sm:self-auto">
          {(["DAY", "WEEK", "MONTH"] as TrendGranularity[]).map((g) => (
            <button
              key={g}
              type="button"
              onClick={() => onGranularityChange(g)}
              className={`rounded-lg px-2.5 py-1 text-xs transition-all ${
                granularity === g
                  ? "bg-white text-charcoal shadow-xs"
                  : "text-charcoal/60 hover:text-charcoal"
              }`}
            >
              {g === "DAY" ? "Daily" : g === "WEEK" ? "Weekly" : "Monthly"}
            </button>
          ))}
        </div>
      </div>

      {/* Legend & Summary Row */}
      <div className="mt-4 flex flex-wrap items-center justify-between gap-3 text-xs">
        <div className="flex flex-wrap items-center gap-4">
          <div className="flex items-center gap-1.5">
            <span className="size-2.5 rounded-full bg-charcoal" />
            <span className="font-medium text-charcoal/80">Leads:</span>
            <span className="font-semibold text-charcoal">{totalLeads}</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="size-2.5 rounded-full bg-blue-600" />
            <span className="font-medium text-charcoal/80">Bookings:</span>
            <span className="font-semibold text-charcoal">{totalBookings}</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="size-2.5 rounded-full bg-emerald-600" />
            <span className="font-medium text-charcoal/80">Completed Visits:</span>
            <span className="font-semibold text-charcoal">{totalVisits}</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="size-2.5 rounded-full bg-amber-600" />
            <span className="font-medium text-charcoal/80">Conversions:</span>
            <span className="font-semibold text-charcoal">{totalConversions}</span>
          </div>
        </div>

        {hoveredPoint && (
          <div className="rounded-lg bg-charcoal/5 px-2.5 py-1 text-[11px] font-medium text-charcoal">
            <span className="font-semibold">{hoveredPoint.period}</span>:{" "}
            {hoveredPoint.leads} leads • {hoveredPoint.bookings} bookings •{" "}
            {hoveredPoint.completed_visits} visits • {hoveredPoint.conversions} deals
          </div>
        )}
      </div>

      {/* Visual Chart Area */}
      <div className="mt-6">
        {loading ? (
          <div className="flex h-56 w-full items-center justify-center">
            <div className="flex flex-col items-center gap-2">
              <div className="size-6 animate-spin rounded-full border-2 border-charcoal/20 border-t-charcoal" />
              <span className="text-xs text-charcoal/50">Aggregating timeline trends...</span>
            </div>
          </div>
        ) : items.length === 0 ? (
          <div className="flex h-56 w-full flex-col items-center justify-center rounded-xl border border-dashed border-charcoal/15 bg-charcoal/5 text-center p-6">
            <BarChart2 className="size-8 text-charcoal/30 mb-2" />
            <p className="text-sm font-semibold text-charcoal">No trend activity in this period</p>
            <p className="mt-1 text-xs text-charcoal/50">
              Try choosing a broader date range or clearing the development filter.
            </p>
          </div>
        ) : (
          <div className="relative">
            {/* Bars container */}
            <div className="flex h-56 items-end gap-2 overflow-x-auto pb-6 pt-4 px-2">
              {items.map((pt) => {
                const leadsPct = Math.round((pt.leads / maxValue) * 100);
                const bookingsPct = Math.round((pt.bookings / maxValue) * 100);
                const visitsPct = Math.round((pt.completed_visits / maxValue) * 100);
                const convPct = Math.round((pt.conversions / maxValue) * 100);

                const isHovered = hoveredPoint?.period === pt.period;

                return (
                  <div
                    key={pt.period}
                    className={`group relative flex flex-1 min-w-[36px] max-w-[80px] flex-col items-center h-full justify-end cursor-pointer transition-all ${
                      isHovered ? "opacity-100" : "hover:opacity-100"
                    }`}
                    onMouseEnter={() => setHoveredPoint(pt)}
                    onMouseLeave={() => setHoveredPoint(null)}
                  >
                    {/* Hover tooltip */}
                    <div className="pointer-events-none absolute -top-12 z-20 hidden flex-col items-center rounded-lg bg-charcoal px-2 py-1 text-[10px] text-white shadow-md group-hover:flex">
                      <span className="font-bold">{formatPeriodLabel(pt.period)}</span>
                      <span className="whitespace-nowrap">
                        {pt.leads}L / {pt.bookings}B / {pt.completed_visits}V / {pt.conversions}C
                      </span>
                    </div>

                    {/* Grouped Bars */}
                    <div className="flex w-full items-end justify-center gap-1 h-[180px]">
                      {/* Leads bar */}
                      <div
                        style={{ height: `${Math.max(leadsPct > 0 ? 4 : 0, leadsPct)}%` }}
                        className="w-1.5 sm:w-2 rounded-t-sm bg-charcoal/85 transition-all group-hover:bg-charcoal"
                        title={`Leads: ${pt.leads}`}
                      />
                      {/* Bookings bar */}
                      <div
                        style={{ height: `${Math.max(bookingsPct > 0 ? 4 : 0, bookingsPct)}%` }}
                        className="w-1.5 sm:w-2 rounded-t-sm bg-blue-500/85 transition-all group-hover:bg-blue-600"
                        title={`Bookings: ${pt.bookings}`}
                      />
                      {/* Visits bar */}
                      <div
                        style={{ height: `${Math.max(visitsPct > 0 ? 4 : 0, visitsPct)}%` }}
                        className="w-1.5 sm:w-2 rounded-t-sm bg-emerald-500/85 transition-all group-hover:bg-emerald-600"
                        title={`Completed Visits: ${pt.completed_visits}`}
                      />
                      {/* Conversions bar */}
                      <div
                        style={{ height: `${Math.max(convPct > 0 ? 4 : 0, convPct)}%` }}
                        className="w-1.5 sm:w-2 rounded-t-sm bg-amber-500/85 transition-all group-hover:bg-amber-600"
                        title={`Conversions: ${pt.conversions}`}
                      />
                    </div>

                    {/* X-axis label */}
                    <span className="mt-2 text-[10px] font-medium text-charcoal/60 truncate max-w-full">
                      {formatPeriodLabel(pt.period)}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
