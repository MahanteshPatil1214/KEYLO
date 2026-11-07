import {
  MapPin,
  RefreshCw,
} from "lucide-react";
import type { ProjectItem } from "../projectModel";

export type DatePreset = "ALL" | "7D" | "30D" | "90D" | "CUSTOM";

type AnalyticsFilterBarProps = {
  preset: DatePreset;
  onPresetChange: (preset: DatePreset) => void;
  dateFrom: string;
  dateTo: string;
  onDateFromChange: (val: string) => void;
  onDateToChange: (val: string) => void;
  projectId: string;
  onProjectChange: (val: string) => void;
  projects: ProjectItem[];
  onRefresh: () => void;
  isRefreshing?: boolean;
};

export function AnalyticsFilterBar({
  preset,
  onPresetChange,
  dateFrom,
  dateTo,
  onDateFromChange,
  onDateToChange,
  projectId,
  onProjectChange,
  projects,
  onRefresh,
  isRefreshing,
}: AnalyticsFilterBarProps) {
  const presets: { id: DatePreset; label: string }[] = [
    { id: "ALL", label: "All Time" },
    { id: "7D", label: "Last 7 Days" },
    { id: "30D", label: "Last 30 Days" },
    { id: "90D", label: "Last 90 Days" },
    { id: "CUSTOM", label: "Custom Range" },
  ];

  return (
    <div className="flex flex-col gap-4 rounded-2xl border border-charcoal/10 bg-white/80 p-4 shadow-xs">
      <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
        {/* Preset Range Buttons */}
        <div className="flex flex-wrap items-center gap-1.5 rounded-xl border border-charcoal/15 bg-charcoal/5 p-1 text-xs font-semibold">
          {presets.map((p) => (
            <button
              key={p.id}
              type="button"
              onClick={() => onPresetChange(p.id)}
              className={`rounded-lg px-3 py-1.5 transition-all ${
                preset === p.id
                  ? "bg-white text-charcoal shadow-xs"
                  : "text-charcoal/60 hover:text-charcoal"
              }`}
            >
              {p.label}
            </button>
          ))}
        </div>

        {/* Project Selector & Refresh Action */}
        <div className="flex flex-wrap items-center gap-2.5">
          <div className="flex items-center gap-1.5 rounded-xl border border-charcoal/15 bg-white px-3 py-1.5 text-xs">
            <MapPin className="size-3.5 text-charcoal/50 shrink-0" />
            <select
              value={projectId}
              onChange={(e) => onProjectChange(e.target.value)}
              className="bg-transparent font-medium text-charcoal focus:outline-hidden"
            >
              <option value="ALL">All Developments</option>
              {projects.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name}
                </option>
              ))}
            </select>
          </div>

          <button
            type="button"
            onClick={onRefresh}
            disabled={isRefreshing}
            className="inline-flex items-center gap-1.5 rounded-xl border border-charcoal/15 bg-white px-3 py-2 text-xs font-semibold text-charcoal shadow-2xs hover:bg-charcoal/5 disabled:opacity-50"
            title="Refresh analytics data"
          >
            <RefreshCw
              className={`size-3.5 ${isRefreshing ? "animate-spin" : ""}`}
            />
            <span className="hidden sm:inline">Refresh</span>
          </button>
        </div>
      </div>

      {/* Custom Date Pickers (visible if custom or user wants to fine-tune) */}
      {preset === "CUSTOM" && (
        <div className="flex flex-wrap items-center gap-3 border-t border-charcoal/5 pt-3 text-xs">
          <div className="flex items-center gap-2">
            <span className="font-semibold text-charcoal/70">From:</span>
            <input
              type="date"
              value={dateFrom}
              onChange={(e) => onDateFromChange(e.target.value)}
              className="h-8 rounded-lg border border-charcoal/15 bg-white px-2.5 text-xs text-charcoal focus:border-charcoal focus:outline-hidden"
            />
          </div>

          <div className="flex items-center gap-2">
            <span className="font-semibold text-charcoal/70">To:</span>
            <input
              type="date"
              value={dateTo}
              onChange={(e) => onDateToChange(e.target.value)}
              className="h-8 rounded-lg border border-charcoal/15 bg-white px-2.5 text-xs text-charcoal focus:border-charcoal focus:outline-hidden"
            />
          </div>
        </div>
      )}
    </div>
  );
}
