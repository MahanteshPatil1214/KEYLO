import { useId, useMemo, useState } from "react";
import {
  BarChart2,
  Calendar,
  Check,
  EyeOff,
  LineChart as LineChartIcon,
  Sparkles,
  TrendingUp,
} from "lucide-react";
import type { DashboardTrends, TrendGranularity } from "../analyticsModel";

type LeadTrendsChartProps = {
  trends: DashboardTrends | null;
  loading: boolean;
  granularity: TrendGranularity;
  onGranularityChange: (g: TrendGranularity) => void;
};

type SeriesKey = "leads" | "bookings" | "completed_visits" | "conversions";

interface SeriesConfig {
  key: SeriesKey;
  label: string;
  color: string;
  strokeColor: string;
  fillId: string;
}

const SERIES_CONFIGS: SeriesConfig[] = [
  {
    key: "leads",
    label: "Inquiries",
    color: "#1F2421",
    strokeColor: "#1F2421",
    fillId: "gradient-inquiries",
  },
  {
    key: "bookings",
    label: "Bookings",
    color: "#2563EB",
    strokeColor: "#2563EB",
    fillId: "gradient-bookings",
  },
  {
    key: "completed_visits",
    label: "Site Visits",
    color: "#059669",
    strokeColor: "#059669",
    fillId: "gradient-visits",
  },
  {
    key: "conversions",
    label: "Closed Deals",
    color: "#D97706",
    strokeColor: "#D97706",
    fillId: "gradient-conversions",
  },
];

function getCurvedPath(points: { x: number; y: number }[]): string {
  if (points.length === 0) return "";
  if (points.length === 1) return `M ${points[0].x.toFixed(1)},${points[0].y.toFixed(1)}`;

  let d = `M ${points[0].x.toFixed(1)},${points[0].y.toFixed(1)}`;
  for (let i = 0; i < points.length - 1; i++) {
    const p0 = points[i === 0 ? 0 : i - 1];
    const p1 = points[i];
    const p2 = points[i + 1];
    const p3 = points[i + 2] || p2;

    const tension = 0.22;
    const cp1x = p1.x + (p2.x - p0.x) * tension;
    const cp1y = p1.y + (p2.y - p0.y) * tension;
    const cp2x = p2.x - (p3.x - p1.x) * tension;
    const cp2y = p2.y - (p3.y - p1.y) * tension;

    d += ` C ${cp1x.toFixed(1)},${cp1y.toFixed(1)} ${cp2x.toFixed(1)},${cp2y.toFixed(1)} ${p2.x.toFixed(1)},${p2.y.toFixed(1)}`;
  }
  return d;
}

function getCurvedAreaPath(points: { x: number; y: number }[], baseY: number): string {
  if (points.length === 0) return "";
  const linePath = getCurvedPath(points);
  const firstX = points[0].x.toFixed(1);
  const lastX = points[points.length - 1].x.toFixed(1);
  return `${linePath} L ${lastX},${baseY} L ${firstX},${baseY} Z`;
}

// Calculate uniform, regular Y-axis ticks (e.g. 0, 2, 4, 6, 8, 10)
function calculateUniformYAxis(rawMax: number): { max: number; ticks: number[] } {
  let step = 2;
  if (rawMax <= 5) step = 1;
  else if (rawMax <= 10) step = 2; // yields [0, 2, 4, 6, 8, 10]
  else if (rawMax <= 20) step = 4; // yields [0, 4, 8, 12, 16, 20]
  else if (rawMax <= 30) step = 5; // yields [0, 5, 10, 15, 20, 25, 30]
  else if (rawMax <= 50) step = 10; // yields [0, 10, 20, 30, 40, 50]
  else if (rawMax <= 100) step = 20; // yields [0, 20, 40, 60, 80, 100]
  else if (rawMax <= 200) step = 40;
  else if (rawMax <= 500) step = 100;
  else step = Math.ceil(rawMax / 5 / 50) * 50;

  const max = Math.max(step * 4, Math.ceil(rawMax / step) * step);
  const ticks: number[] = [];
  for (let v = 0; v <= max; v += step) {
    ticks.push(v);
  }
  return { max, ticks };
}

export function LeadTrendsChart({
  trends,
  loading,
  granularity,
  onGranularityChange,
}: LeadTrendsChartProps) {
  const chartId = useId();

  const [chartType, setChartType] = useState<"area" | "bars">("area");
  const [activeSeries, setActiveSeries] = useState<Record<SeriesKey, boolean>>({
    leads: true,
    bookings: true,
    completed_visits: true,
    conversions: true,
  });

  const [hoveredIndex, setHoveredIndex] = useState<number | null>(null);

  const items = useMemo(() => trends?.items || [], [trends]);

  // Aggregate metric totals
  const totals = useMemo(() => {
    return {
      leads: items.reduce((acc, p) => acc + p.leads, 0),
      bookings: items.reduce((acc, p) => acc + p.bookings, 0),
      completed_visits: items.reduce((acc, p) => acc + p.completed_visits, 0),
      conversions: items.reduce((acc, p) => acc + p.conversions, 0),
    };
  }, [items]);

  // Identify peak period
  const peakPoint = useMemo(() => {
    if (items.length <= 1) return null;
    let peak = items[0];
    for (const pt of items) {
      if (pt.leads > peak.leads) peak = pt;
    }
    return peak;
  }, [items]);

  // Calculate raw maximum across active series
  const rawMaxValue = useMemo(() => {
    let max = 0;
    for (const p of items) {
      if (activeSeries.leads && p.leads > max) max = p.leads;
      if (activeSeries.bookings && p.bookings > max) max = p.bookings;
      if (activeSeries.completed_visits && p.completed_visits > max) max = p.completed_visits;
      if (activeSeries.conversions && p.conversions > max) max = p.conversions;
    }
    return max <= 0 ? 10 : max;
  }, [items, activeSeries]);

  // Uniform Y-axis scale and tick marks
  const { max: yAxisMax, ticks: yTicks } = useMemo(
    () => calculateUniformYAxis(rawMaxValue),
    [rawMaxValue],
  );

  const toggleSeries = (key: SeriesKey) => {
    const activeCount = Object.values(activeSeries).filter(Boolean).length;
    if (activeCount === 1 && activeSeries[key]) return;
    setActiveSeries((prev) => ({ ...prev, [key]: !prev[key] }));
  };

  const formatPeriodLabel = (period: string) => {
    if (!period) return "";
    if (/^\d{4}-\d{2}-\d{2}$/.test(period)) {
      const parts = period.split("-");
      const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
      return `${parseInt(parts[2], 10)} ${months[parseInt(parts[1], 10) - 1]}`;
    }
    if (/^\d{4}-W\d+$/.test(period)) {
      return period.replace("-", " ");
    }
    if (/^\d{4}-\d{2}$/.test(period)) {
      const parts = period.split("-");
      const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
      return `${months[parseInt(parts[1], 10) - 1]} '${parts[0].slice(2)}`;
    }
    return period;
  };

  // Dimensions for SVG coordinate space
  const svgWidth = 900;
  const svgHeight = 260;
  const paddingLeft = 45;
  const paddingRight = 25;
  const paddingTop = 25;
  const paddingBottom = 40;

  const chartInnerWidth = svgWidth - paddingLeft - paddingRight;
  const chartInnerHeight = svgHeight - paddingTop - paddingBottom;
  const baseY = paddingTop + chartInnerHeight;

  // Calculate coordinates for SVG paths
  const seriesPoints = useMemo(() => {
    if (items.length <= 1) return { leads: [], bookings: [], completed_visits: [], conversions: [] };

    const getX = (index: number) => {
      return paddingLeft + (index / (items.length - 1)) * chartInnerWidth;
    };

    const getY = (val: number) => {
      const ratio = Math.max(0, Math.min(1, val / yAxisMax));
      return baseY - ratio * chartInnerHeight;
    };

    return {
      leads: items.map((p, i) => ({ x: getX(i), y: getY(p.leads), val: p.leads })),
      bookings: items.map((p, i) => ({ x: getX(i), y: getY(p.bookings), val: p.bookings })),
      completed_visits: items.map((p, i) => ({ x: getX(i), y: getY(p.completed_visits), val: p.completed_visits })),
      conversions: items.map((p, i) => ({ x: getX(i), y: getY(p.conversions), val: p.conversions })),
    };
  }, [items, yAxisMax, chartInnerWidth, chartInnerHeight, baseY, paddingLeft]);

  // SVG Y-gridlines mapping
  const svgYTicks = useMemo(() => {
    return yTicks.map((val) => ({
      value: val,
      y: baseY - (val / yAxisMax) * chartInnerHeight,
    }));
  }, [yTicks, yAxisMax, baseY, chartInnerHeight]);

  const hoveredPoint = hoveredIndex !== null && items[hoveredIndex] ? items[hoveredIndex] : null;

  // Velocity indicators
  const overallConvRate = totals.leads > 0 ? ((totals.conversions / totals.leads) * 100).toFixed(1) : "0.0";
  const visitShowUpRate = totals.bookings > 0 ? ((totals.completed_visits / totals.bookings) * 100).toFixed(1) : "0.0";

  return (
    <div className="flex flex-col rounded-2xl border border-charcoal/10 bg-white p-6 shadow-xs">
      {/* Top Header: Title & Grouped Right Controls */}
      <div className="flex flex-col gap-4 border-b border-charcoal/10 pb-5 lg:flex-row lg:items-center lg:justify-between">
        <div className="space-y-1">
          <div className="flex flex-wrap items-center gap-2.5">
            <h3 className="font-display text-xl font-bold tracking-tight text-charcoal">
              Acquisition & Conversion Trends
            </h3>
            {peakPoint && peakPoint.leads > 0 && (
              <span className="inline-flex items-center gap-1 rounded-full border border-amber-500/20 bg-amber-50 px-2.5 py-0.5 text-[11px] font-medium text-amber-800">
                <Sparkles className="size-3 text-amber-600" />
                Peak: {formatPeriodLabel(peakPoint.period)} ({peakPoint.leads} inquiries)
              </span>
            )}
          </div>
          <p className="text-xs text-charcoal/60 leading-relaxed">
            Funnel progression trajectory across inquiries, bookings, site visits, and closed deals.
          </p>
        </div>

        {/* Grouped Controls in Top Right: Display Mode Switch + Granularity Toggle */}
        <div className="flex flex-wrap items-center gap-2 self-start lg:self-auto">
          {/* Chart Display Mode Switch */}
          <div className="flex items-center rounded-xl border border-charcoal/15 bg-charcoal/5 p-1 text-xs">
            <button
              type="button"
              onClick={() => setChartType("area")}
              disabled={items.length <= 1}
              className={`inline-flex items-center gap-1.5 rounded-lg px-2.5 py-1 text-xs font-semibold transition-all ${
                chartType === "area" && items.length > 1
                  ? "bg-white text-charcoal shadow-xs"
                  : "text-charcoal/60 hover:text-charcoal disabled:opacity-40 disabled:cursor-not-allowed"
              }`}
              title={items.length <= 1 ? "Requires > 1 interval" : "Smooth Spline Curves"}
            >
              <LineChartIcon className="size-3.5" />
              <span className="hidden sm:inline">Smooth Area</span>
            </button>
            <button
              type="button"
              onClick={() => setChartType("bars")}
              className={`inline-flex items-center gap-1.5 rounded-lg px-2.5 py-1 text-xs font-semibold transition-all ${
                chartType === "bars" || items.length <= 1
                  ? "bg-white text-charcoal shadow-xs"
                  : "text-charcoal/60 hover:text-charcoal"
              }`}
              title="Grouped Comparative Columns"
            >
              <BarChart2 className="size-3.5" />
              <span className="hidden sm:inline">Columns</span>
            </button>
          </div>

          {/* Granularity Selector */}
          <div className="flex items-center rounded-xl border border-charcoal/15 bg-charcoal/5 p-1 text-xs font-semibold">
            {(["DAY", "WEEK", "MONTH"] as TrendGranularity[]).map((g) => (
              <button
                key={g}
                type="button"
                onClick={() => onGranularityChange(g)}
                className={`rounded-lg px-3 py-1 text-xs transition-all ${
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
      </div>

      {/* Consolidated Metric Filters & Funnel Velocity Strip */}
      <div className="mt-4 flex flex-wrap items-center justify-between gap-3 border-b border-charcoal/5 pb-4">
        {/* Consolidated Interactive Metric Filter Pills (Shows current count & toggles visibility) */}
        <div className="flex flex-wrap items-center gap-2">
          {SERIES_CONFIGS.map((cfg) => {
            const isActive = activeSeries[cfg.key];
            const total = totals[cfg.key];
            return (
              <button
                key={cfg.key}
                type="button"
                onClick={() => toggleSeries(cfg.key)}
                className={`inline-flex items-center gap-2 rounded-xl border px-3.5 py-2 text-xs font-medium transition-all ${
                  isActive
                    ? "border-charcoal/20 bg-white text-charcoal shadow-xs hover:border-charcoal/40"
                    : "border-charcoal/10 bg-charcoal/5 text-charcoal/40 hover:text-charcoal/70"
                }`}
                title={`Click to toggle ${cfg.label} visibility on the chart`}
              >
                <span
                  className="size-2.5 rounded-full shrink-0"
                  style={{ backgroundColor: isActive ? cfg.color : "#9CA3AF" }}
                />
                <span className="font-semibold text-charcoal">{cfg.label}:</span>
                <span className="font-mono font-bold text-charcoal">{total.toLocaleString()}</span>
                {isActive ? (
                  <Check className="size-3 text-charcoal/50 ml-0.5" />
                ) : (
                  <EyeOff className="size-3 text-charcoal/30 ml-0.5" />
                )}
              </button>
            );
          })}
        </div>

        {/* Funnel Velocity Metrics */}
        <div className="flex items-center gap-4 text-xs">
          <div className="hidden sm:flex items-center gap-1.5">
            <span className="text-charcoal/60">Show-up Rate:</span>
            <span className="font-mono font-bold text-emerald-700">{visitShowUpRate}%</span>
          </div>
          <div className="flex items-center gap-1.5 rounded-lg border border-emerald-500/20 bg-emerald-50/60 px-2.5 py-1">
            <TrendingUp className="size-3 text-emerald-600" />
            <span className="text-emerald-900 font-medium">Conversion Rate:</span>
            <span className="font-mono font-bold text-emerald-800">{overallConvRate}%</span>
          </div>
        </div>
      </div>

      {/* Contextual Hover Inspector Slice (Displays active slice details without redundant cards) */}
      {hoveredPoint && (
        <div className="mt-3 flex flex-wrap items-center justify-between gap-2 rounded-xl border border-charcoal/10 bg-[#FAFAF7] px-4 py-2.5 text-xs transition-all">
          <div className="flex items-center gap-2">
            <Calendar className="size-3.5 text-charcoal/60" />
            <span className="font-semibold text-charcoal">{formatPeriodLabel(hoveredPoint.period)}</span>
            <span className="font-mono text-[11px] text-charcoal/50">({hoveredPoint.period})</span>
          </div>
          <div className="flex flex-wrap items-center gap-4 text-xs">
            <span className="text-charcoal">
              Inquiries: <strong className="font-mono font-bold text-charcoal">{hoveredPoint.leads}</strong>
            </span>
            <span className="text-blue-900">
              Bookings: <strong className="font-mono font-bold text-blue-800">{hoveredPoint.bookings}</strong>
            </span>
            <span className="text-emerald-900">
              Site Visits: <strong className="font-mono font-bold text-emerald-800">{hoveredPoint.completed_visits}</strong>
            </span>
            <span className="text-amber-900">
              Closed Deals: <strong className="font-mono font-bold text-amber-800">{hoveredPoint.conversions}</strong>
            </span>
            <span className="border-l border-charcoal/15 pl-3 font-semibold text-emerald-700">
              Conversion: {hoveredPoint.leads > 0 ? `${((hoveredPoint.conversions / hoveredPoint.leads) * 100).toFixed(1)}%` : "0.0%"}
            </span>
          </div>
        </div>
      )}

      {/* Main Visual Chart Area */}
      <div className="relative mt-4">
        {loading ? (
          <div className="flex h-72 w-full items-center justify-center">
            <div className="flex flex-col items-center gap-2.5">
              <div className="size-7 animate-spin rounded-full border-2 border-charcoal/20 border-t-charcoal" />
              <span className="text-xs font-medium text-charcoal/60">
                Aggregating acquisition trends...
              </span>
            </div>
          </div>
        ) : items.length === 0 ? (
          <div className="flex h-72 w-full flex-col items-center justify-center rounded-2xl border border-dashed border-charcoal/20 bg-[#FAFAF7] p-8 text-center">
            <BarChart2 className="mb-2 size-9 text-charcoal/30" />
            <p className="font-display text-base font-bold text-charcoal">
              No trend activity recorded in this period
            </p>
            <p className="mt-1 max-w-sm text-xs text-charcoal/60">
              Try expanding the date filter preset or switching development projects to review trend progression.
            </p>
          </div>
        ) : items.length === 1 ? (
          /* Sparse Data Fallback: Clean Centered Grouped Column Snapshot when data length === 1 */
          <div className="relative flex flex-col items-center justify-center py-6">
            <div className="relative w-full max-w-xl rounded-2xl border border-charcoal/10 bg-[#FAFAF7]/80 p-6 shadow-xs">
              <div className="flex items-center justify-between border-b border-charcoal/10 pb-3 text-xs">
                <div className="flex items-center gap-2">
                  <Calendar className="size-3.5 text-charcoal/60" />
                  <span className="font-semibold text-charcoal">
                    Interval Snapshot: {formatPeriodLabel(items[0].period)}
                  </span>
                </div>
                <span className="font-mono text-[11px] text-charcoal/50">
                  {items[0].period}
                </span>
              </div>

              {/* Grouped Columns with Uniform Grid Lines */}
              <div className="relative mt-6 flex h-48 items-end justify-center gap-8 pb-6 pt-4">
                {/* Horizontal reference grid lines at uniform intervals (0, 2, 4, 6, 8, 10) */}
                {yTicks.map((tick, i) => (
                  <div
                    key={i}
                    style={{ bottom: `${(tick / yAxisMax) * 100}%` }}
                    className="pointer-events-none absolute inset-x-0 flex items-center"
                  >
                    <span className="w-8 pr-2 text-right font-mono text-[10px] text-charcoal/40">
                      {tick}
                    </span>
                    <div className="flex-1 border-b border-dashed border-charcoal/10" />
                  </div>
                ))}

                {/* Centered Columns */}
                {activeSeries.leads && (
                  <div className="z-10 flex flex-col items-center gap-1.5">
                    <span className="font-mono text-xs font-bold text-charcoal">
                      {items[0].leads}
                    </span>
                    <div
                      style={{
                        height: `${Math.max(items[0].leads > 0 ? 10 : 0, (items[0].leads / yAxisMax) * 140)}px`,
                      }}
                      className="w-12 rounded-t-lg bg-charcoal shadow-xs transition-all hover:brightness-110"
                    />
                    <span className="text-[11px] font-semibold text-charcoal/80">Inquiries</span>
                  </div>
                )}

                {activeSeries.bookings && (
                  <div className="z-10 flex flex-col items-center gap-1.5">
                    <span className="font-mono text-xs font-bold text-blue-800">
                      {items[0].bookings}
                    </span>
                    <div
                      style={{
                        height: `${Math.max(items[0].bookings > 0 ? 10 : 0, (items[0].bookings / yAxisMax) * 140)}px`,
                      }}
                      className="w-12 rounded-t-lg bg-blue-600 shadow-xs transition-all hover:brightness-110"
                    />
                    <span className="text-[11px] font-semibold text-blue-900/80">Bookings</span>
                  </div>
                )}

                {activeSeries.completed_visits && (
                  <div className="z-10 flex flex-col items-center gap-1.5">
                    <span className="font-mono text-xs font-bold text-emerald-800">
                      {items[0].completed_visits}
                    </span>
                    <div
                      style={{
                        height: `${Math.max(items[0].completed_visits > 0 ? 10 : 0, (items[0].completed_visits / yAxisMax) * 140)}px`,
                      }}
                      className="w-12 rounded-t-lg bg-emerald-600 shadow-xs transition-all hover:brightness-110"
                    />
                    <span className="text-[11px] font-semibold text-emerald-900/80">Site Visits</span>
                  </div>
                )}

                {activeSeries.conversions && (
                  <div className="z-10 flex flex-col items-center gap-1.5">
                    <span className="font-mono text-xs font-bold text-amber-800">
                      {items[0].conversions}
                    </span>
                    <div
                      style={{
                        height: `${Math.max(items[0].conversions > 0 ? 10 : 0, (items[0].conversions / yAxisMax) * 140)}px`,
                      }}
                      className="w-12 rounded-t-lg bg-amber-500 shadow-xs transition-all hover:brightness-110"
                    />
                    <span className="text-[11px] font-semibold text-amber-900/80">Closed Deals</span>
                  </div>
                )}
              </div>
            </div>
          </div>
        ) : chartType === "area" ? (
          /* Smooth SVG Spline Area Chart (Multi-period) */
          <div className="relative w-full overflow-hidden">
            <svg
              viewBox={`0 0 ${svgWidth} ${svgHeight}`}
              className="w-full h-72 select-none overflow-visible"
              preserveAspectRatio="none"
              onMouseLeave={() => setHoveredIndex(null)}
            >
              <defs>
                <linearGradient id={`${chartId}-inquiries`} x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#1F2421" stopOpacity="0.22" />
                  <stop offset="100%" stopColor="#1F2421" stopOpacity="0.0" />
                </linearGradient>

                <linearGradient id={`${chartId}-bookings`} x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#2563EB" stopOpacity="0.20" />
                  <stop offset="100%" stopColor="#2563EB" stopOpacity="0.0" />
                </linearGradient>

                <linearGradient id={`${chartId}-visits`} x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#059669" stopOpacity="0.22" />
                  <stop offset="100%" stopColor="#059669" stopOpacity="0.0" />
                </linearGradient>

                <linearGradient id={`${chartId}-conversions`} x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#D97706" stopOpacity="0.25" />
                  <stop offset="100%" stopColor="#D97706" stopOpacity="0.0" />
                </linearGradient>
              </defs>

              {/* Horizontal Reference Grid Lines at Uniform Intervals (0, 2, 4, 6, 8, 10) */}
              {svgYTicks.map((tick, i) => (
                <g key={i}>
                  <line
                    x1={paddingLeft}
                    y1={tick.y}
                    x2={svgWidth - paddingRight}
                    y2={tick.y}
                    stroke="#E5E7EB"
                    strokeWidth="1"
                    strokeDasharray={tick.value === 0 ? "0" : "3 3"}
                  />
                  <text
                    x={paddingLeft - 8}
                    y={tick.y + 3.5}
                    textAnchor="end"
                    fontSize="10"
                    fill="#9CA3AF"
                    fontFamily="monospace"
                  >
                    {tick.value}
                  </text>
                </g>
              ))}

              {/* Area Fills */}
              {activeSeries.leads && (
                <path
                  d={getCurvedAreaPath(seriesPoints.leads, baseY)}
                  fill={`url(#${chartId}-inquiries)`}
                  className="transition-opacity duration-300"
                />
              )}
              {activeSeries.bookings && (
                <path
                  d={getCurvedAreaPath(seriesPoints.bookings, baseY)}
                  fill={`url(#${chartId}-bookings)`}
                  className="transition-opacity duration-300"
                />
              )}
              {activeSeries.completed_visits && (
                <path
                  d={getCurvedAreaPath(seriesPoints.completed_visits, baseY)}
                  fill={`url(#${chartId}-visits)`}
                  className="transition-opacity duration-300"
                />
              )}
              {activeSeries.conversions && (
                <path
                  d={getCurvedAreaPath(seriesPoints.conversions, baseY)}
                  fill={`url(#${chartId}-conversions)`}
                  className="transition-opacity duration-300"
                />
              )}

              {/* Line Strokes */}
              {activeSeries.leads && (
                <path
                  d={getCurvedPath(seriesPoints.leads)}
                  fill="none"
                  stroke="#1F2421"
                  strokeWidth="2.5"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              )}
              {activeSeries.bookings && (
                <path
                  d={getCurvedPath(seriesPoints.bookings)}
                  fill="none"
                  stroke="#2563EB"
                  strokeWidth="2.5"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              )}
              {activeSeries.completed_visits && (
                <path
                  d={getCurvedPath(seriesPoints.completed_visits)}
                  fill="none"
                  stroke="#059669"
                  strokeWidth="2.5"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              )}
              {activeSeries.conversions && (
                <path
                  d={getCurvedPath(seriesPoints.conversions)}
                  fill="none"
                  stroke="#D97706"
                  strokeWidth="2.5"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              )}

              {/* Interactive Vertical Guideline & Points */}
              {hoveredIndex !== null && seriesPoints.leads[hoveredIndex] && (
                <g>
                  <line
                    x1={seriesPoints.leads[hoveredIndex].x}
                    y1={paddingTop}
                    x2={seriesPoints.leads[hoveredIndex].x}
                    y2={baseY}
                    stroke="#1F2421"
                    strokeWidth="1.5"
                    strokeDasharray="4 3"
                    className="opacity-70"
                  />

                  {activeSeries.leads && (
                    <circle
                      cx={seriesPoints.leads[hoveredIndex].x}
                      cy={seriesPoints.leads[hoveredIndex].y}
                      r="5"
                      fill="#1F2421"
                      stroke="#FFFFFF"
                      strokeWidth="2"
                    />
                  )}
                  {activeSeries.bookings && (
                    <circle
                      cx={seriesPoints.bookings[hoveredIndex].x}
                      cy={seriesPoints.bookings[hoveredIndex].y}
                      r="5"
                      fill="#2563EB"
                      stroke="#FFFFFF"
                      strokeWidth="2"
                    />
                  )}
                  {activeSeries.completed_visits && (
                    <circle
                      cx={seriesPoints.completed_visits[hoveredIndex].x}
                      cy={seriesPoints.completed_visits[hoveredIndex].y}
                      r="5"
                      fill="#059669"
                      stroke="#FFFFFF"
                      strokeWidth="2"
                    />
                  )}
                  {activeSeries.conversions && (
                    <circle
                      cx={seriesPoints.conversions[hoveredIndex].x}
                      cy={seriesPoints.conversions[hoveredIndex].y}
                      r="5"
                      fill="#D97706"
                      stroke="#FFFFFF"
                      strokeWidth="2"
                    />
                  )}
                </g>
              )}

              {/* X-axis labels along bottom */}
              {items.map((pt, i) => {
                const skipFactor = items.length > 20 ? 3 : items.length > 12 ? 2 : 1;
                const shouldShowLabel = i % skipFactor === 0 || i === items.length - 1;
                const x = seriesPoints.leads[i]?.x ?? 0;

                return (
                  <g key={pt.period}>
                    {shouldShowLabel && (
                      <text
                        x={x}
                        y={baseY + 18}
                        textAnchor="middle"
                        fontSize="10"
                        fontWeight="500"
                        fill="#6B7280"
                      >
                        {formatPeriodLabel(pt.period)}
                      </text>
                    )}

                    {/* Interactive Overlay Slice */}
                    <rect
                      x={
                        i === 0
                          ? paddingLeft
                          : (seriesPoints.leads[i - 1].x + seriesPoints.leads[i].x) / 2
                      }
                      y={paddingTop}
                      width={
                        items.length <= 1
                          ? chartInnerWidth
                          : i === 0 || i === items.length - 1
                          ? chartInnerWidth / (items.length - 1) / 2
                          : (seriesPoints.leads[i + 1]?.x - seriesPoints.leads[i - 1]?.x) / 2
                      }
                      height={chartInnerHeight}
                      fill="transparent"
                      className="cursor-crosshair"
                      onMouseEnter={() => setHoveredIndex(i)}
                      onTouchStart={() => setHoveredIndex(i)}
                    />
                  </g>
                );
              })}
            </svg>
          </div>
        ) : (
          /* Segmented Columns Mode (Multi-period) */
          <div className="relative">
            <div className="flex h-72 items-end gap-2 overflow-x-auto pb-8 pt-6 px-2">
              {items.map((pt, index) => {
                const isHovered = hoveredIndex === index;

                return (
                  <div
                    key={pt.period}
                    className={`group relative flex flex-1 min-w-[44px] max-w-[80px] flex-col items-center h-full justify-end cursor-pointer transition-all ${
                      isHovered ? "opacity-100" : "hover:opacity-100"
                    }`}
                    onMouseEnter={() => setHoveredIndex(index)}
                    onMouseLeave={() => setHoveredIndex(null)}
                  >
                    {/* Columns Cluster Container */}
                    <div className="flex w-full items-end justify-center gap-1 h-[210px] pb-2 border-b border-charcoal/10">
                      {activeSeries.leads && (
                        <div
                          style={{
                            height: `${Math.max(pt.leads > 0 ? 6 : 0, (pt.leads / yAxisMax) * 100)}%`,
                          }}
                          className="w-2 sm:w-2.5 rounded-t-md bg-charcoal transition-all group-hover:brightness-125"
                          title={`Inquiries: ${pt.leads}`}
                        />
                      )}
                      {activeSeries.bookings && (
                        <div
                          style={{
                            height: `${Math.max(pt.bookings > 0 ? 6 : 0, (pt.bookings / yAxisMax) * 100)}%`,
                          }}
                          className="w-2 sm:w-2.5 rounded-t-md bg-blue-600 transition-all group-hover:brightness-125"
                          title={`Bookings: ${pt.bookings}`}
                        />
                      )}
                      {activeSeries.completed_visits && (
                        <div
                          style={{
                            height: `${Math.max(pt.completed_visits > 0 ? 6 : 0, (pt.completed_visits / yAxisMax) * 100)}%`,
                          }}
                          className="w-2 sm:w-2.5 rounded-t-md bg-emerald-600 transition-all group-hover:brightness-125"
                          title={`Site Visits: ${pt.completed_visits}`}
                        />
                      )}
                      {activeSeries.conversions && (
                        <div
                          style={{
                            height: `${Math.max(pt.conversions > 0 ? 6 : 0, (pt.conversions / yAxisMax) * 100)}%`,
                          }}
                          className="w-2 sm:w-2.5 rounded-t-md bg-amber-500 transition-all group-hover:brightness-125"
                          title={`Closed Deals: ${pt.conversions}`}
                        />
                      )}
                    </div>

                    {/* X-axis Label */}
                    <span className="mt-2 text-[10px] font-semibold text-charcoal/60 truncate max-w-full">
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
