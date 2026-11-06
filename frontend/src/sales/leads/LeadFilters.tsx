import { CalendarRange, Search, SlidersHorizontal, X } from "lucide-react";
import type { LeadSource, LeadStatus } from "../api";
import { Panel } from "../ui";
import { LEAD_SOURCES, LEAD_STATUSES, titleCaseStatus } from "./leadModel";
import type { DatePreset, LeadDateFilter } from "./leadModel";
import { sourceLabel } from "../ui";

type LeadFiltersProps = {
  search: string;
  onSearchChange: (value: string) => void;
  status: LeadStatus | "ALL";
  onStatusChange: (value: LeadStatus | "ALL") => void;
  source: LeadSource | "ALL";
  onSourceChange: (value: LeadSource | "ALL") => void;
  dateFilter: LeadDateFilter;
  onDateFilterChange: (value: LeadDateFilter) => void;
  onReset: () => void;
  activeFilterCount: number;
  resultCount: number;
  totalCount: number;
  loading: boolean;
};

const DATE_PRESETS: Array<{ value: DatePreset; label: string }> = [
  { value: "ALL", label: "All time" },
  { value: "TODAY", label: "Today" },
  { value: "7D", label: "Last 7 days" },
  { value: "30D", label: "Last 30 days" },
  { value: "CUSTOM", label: "Custom range" },
];

const fieldClass =
  "min-h-11 w-full rounded-xl border border-charcoal/15 bg-white px-3 text-xs font-medium text-charcoal outline-none transition-colors hover:border-charcoal/25 focus:border-forest focus:ring-2 focus:ring-forest/15";

const labelClass =
  "mb-1.5 block text-[0.62rem] font-semibold tracking-[0.16em] text-charcoal/65 uppercase";

export function LeadFilters({
  search,
  onSearchChange,
  status,
  onStatusChange,
  source,
  onSourceChange,
  dateFilter,
  onDateFilterChange,
  onReset,
  activeFilterCount,
  resultCount,
  totalCount,
  loading,
}: LeadFiltersProps) {
  const hasFilters = activeFilterCount > 0;

  return (
    <Panel label="Filter assigned leads" className="overflow-visible">
      <div className="p-4 sm:p-5">
        <div className="flex flex-wrap items-start justify-between gap-2">
          <div className="flex items-center gap-2.5">
            <span className="grid size-8 place-items-center rounded-lg border border-forest/20 bg-forest/10 text-forest">
              <SlidersHorizontal aria-hidden="true" className="size-4" />
            </span>
            <div>
              <p className="text-[0.62rem] font-semibold tracking-[0.18em] text-forest uppercase">
                Refine
              </p>
              <h2 className="font-display text-lg leading-tight text-charcoal">
                Find the right lead
              </h2>
            </div>
          </div>
          <button
            type="button"
            onClick={onReset}
            disabled={!hasFilters}
            className="inline-flex min-h-9 items-center gap-1.5 rounded-lg border border-charcoal/15 bg-white px-3 text-[0.7rem] font-semibold text-charcoal/75 transition-colors hover:border-forest/40 hover:text-forest disabled:cursor-not-allowed disabled:opacity-45"
          >
            <X aria-hidden="true" className="size-3.5" />
            Clear all{hasFilters ? ` (${activeFilterCount})` : ""}
          </button>
        </div>

        <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-[minmax(0,1.7fr)_minmax(0,1fr)_minmax(0,1fr)_minmax(0,1.15fr)]">
          <div className="sm:col-span-2 xl:col-span-1">
            <label htmlFor="lead-search" className={labelClass}>
              Search
            </label>
            <div className="relative">
              <Search
                aria-hidden="true"
                className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-charcoal/45"
              />
              <input
                id="lead-search"
                type="search"
                value={search}
                onChange={(event) => onSearchChange(event.target.value)}
                placeholder="Buyer name, email or phone"
                autoComplete="off"
                className={`${fieldClass} pr-10 pl-9 [&::-webkit-search-cancel-button]:hidden`}
              />
              {search && (
                <button
                  type="button"
                  onClick={() => onSearchChange("")}
                  aria-label="Clear search"
                  className="absolute top-1/2 right-1.5 grid size-8 -translate-y-1/2 place-items-center rounded-lg text-charcoal/55 transition-colors hover:bg-charcoal/5 hover:text-charcoal"
                >
                  <X aria-hidden="true" className="size-3.5" />
                </button>
              )}
            </div>
          </div>

          <div>
            <label htmlFor="lead-status-filter" className={labelClass}>
              Status
            </label>
            <select
              id="lead-status-filter"
              value={status}
              onChange={(event) =>
                onStatusChange(event.target.value as LeadStatus | "ALL")
              }
              className={fieldClass}
            >
              <option value="ALL">All statuses</option>
              {LEAD_STATUSES.map((value) => (
                <option key={value} value={value}>
                  {titleCaseStatus(value)}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label htmlFor="lead-source-filter" className={labelClass}>
              Source
            </label>
            <select
              id="lead-source-filter"
              value={source}
              onChange={(event) =>
                onSourceChange(event.target.value as LeadSource | "ALL")
              }
              className={fieldClass}
            >
              <option value="ALL">All sources</option>
              {LEAD_SOURCES.map((value) => (
                <option key={value} value={value}>
                  {sourceLabel(value)}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label htmlFor="lead-date-filter" className={labelClass}>
              Date received
            </label>
            <div className="relative">
              <CalendarRange
                aria-hidden="true"
                className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-charcoal/45"
              />
              <select
                id="lead-date-filter"
                value={dateFilter.preset}
                onChange={(event) =>
                  onDateFilterChange({
                    ...dateFilter,
                    preset: event.target.value as DatePreset,
                  })
                }
                className={`${fieldClass} pl-9`}
              >
                {DATE_PRESETS.map((preset) => (
                  <option key={preset.value} value={preset.value}>
                    {preset.label}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {dateFilter.preset === "CUSTOM" && (
            <div className="grid grid-cols-2 gap-3 sm:col-span-2 xl:col-span-4 xl:grid-cols-[minmax(0,1fr)_minmax(0,1fr)_minmax(0,2.7fr)]">
              <div>
                <label htmlFor="lead-date-from" className={labelClass}>
                  From
                </label>
                <input
                  id="lead-date-from"
                  type="date"
                  value={dateFilter.from}
                  max={dateFilter.to || undefined}
                  onChange={(event) =>
                    onDateFilterChange({
                      ...dateFilter,
                      from: event.target.value,
                    })
                  }
                  className={fieldClass}
                />
              </div>
              <div>
                <label htmlFor="lead-date-to" className={labelClass}>
                  To
                </label>
                <input
                  id="lead-date-to"
                  type="date"
                  value={dateFilter.to}
                  min={dateFilter.from || undefined}
                  onChange={(event) =>
                    onDateFilterChange({
                      ...dateFilter,
                      to: event.target.value,
                    })
                  }
                  className={fieldClass}
                />
              </div>
              <p className="self-end pb-1 text-[0.68rem] leading-4 text-charcoal/60 xl:pb-2.5">
                Custom range uses the enquiry received date.
              </p>
            </div>
          )}
        </div>

        <div className="mt-4 flex flex-wrap items-center justify-between gap-2 border-t border-charcoal/10 pt-3">
          <p role="status" aria-live="polite" className="text-[0.7rem] text-charcoal/70">
            {loading
              ? "Loading your assigned portfolio..."
              : `${resultCount.toLocaleString("en-IN")} of ${totalCount.toLocaleString("en-IN")} assigned ${totalCount === 1 ? "lead" : "leads"}`}
          </p>
          <p className="inline-flex items-center gap-1.5 text-[0.66rem] text-charcoal/55">
            <span aria-hidden="true" className="size-1.5 rounded-full bg-forest" />
            Priority is inferred from the current pipeline stage.
          </p>
        </div>
      </div>
    </Panel>
  );
}
