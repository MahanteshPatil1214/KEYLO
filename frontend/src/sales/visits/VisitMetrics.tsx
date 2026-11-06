import { CalendarDays, CalendarCheck, CheckCircle2, XCircle } from "lucide-react";
import type { VisitMetrics, VisitStatusFilter } from "./visitModel";

interface VisitMetricsProps {
  metrics: VisitMetrics;
  loading?: boolean;
  activeFilter?: VisitStatusFilter;
  onSelectFilter?: (status: VisitStatusFilter) => void;
}

export function VisitMetricsBar({
  metrics,
  loading = false,
  activeFilter,
  onSelectFilter,
}: VisitMetricsProps) {
  const cards: Array<{
    label: string;
    value: number;
    hint: string;
    icon: typeof CalendarDays;
    tone: string;
    iconColor: string;
    filterKey: VisitStatusFilter;
  }> = [
    {
      label: "Total Site Visits",
      value: metrics.total,
      hint: "All recorded visit reservations",
      icon: CalendarDays,
      tone: "text-charcoal bg-charcoal/5 border-charcoal/10",
      iconColor: "text-charcoal",
      filterKey: "ALL",
    },
    {
      label: "Upcoming Visits",
      value: metrics.upcoming,
      hint: "Confirmed & scheduled visits",
      icon: CalendarCheck,
      tone: "text-forest bg-forest/8 border-forest/20",
      iconColor: "text-forest",
      filterKey: "UPCOMING",
    },
    {
      label: "Completed Visits",
      value: metrics.completed,
      hint: "Prospect attended walkthrough",
      icon: CheckCircle2,
      tone: "text-emerald-800 bg-emerald-50 border-emerald-200",
      iconColor: "text-emerald-700",
      filterKey: "COMPLETED",
    },
    {
      label: "Cancelled & No-Show",
      value: metrics.cancelled,
      hint: "Cancelled or missed visits",
      icon: XCircle,
      tone: "text-clay bg-clay/8 border-clay/20",
      iconColor: "text-clay",
      filterKey: "CANCELLED",
    },
  ];

  return (
    <div className="grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-4">
      {cards.map((card) => {
        const Icon = card.icon;
        const isSelected = activeFilter === card.filterKey;
        return (
          <button
            type="button"
            key={card.label}
            onClick={() => onSelectFilter?.(card.filterKey)}
            className={`group flex flex-col justify-between rounded-2xl border p-4 sm:p-5 text-left transition-all ${
              isSelected
                ? "border-forest bg-forest/10 shadow-sm ring-1 ring-forest/30"
                : "border-charcoal/10 bg-white hover:border-charcoal/20 shadow-xs"
            }`}
          >
            <div className="flex items-center justify-between w-full">
              <span className="text-[0.66rem] font-bold tracking-[0.14em] text-charcoal/60 uppercase">
                {card.label}
              </span>
              <span className={`grid size-8 place-items-center rounded-xl border ${card.tone}`}>
                <Icon aria-hidden="true" className={`size-4 ${card.iconColor}`} />
              </span>
            </div>

            <div className="mt-3">
              {loading ? (
                <div className="h-8 w-14 animate-pulse rounded-md bg-charcoal/10" />
              ) : (
                <p className="font-display text-2xl sm:text-3xl font-bold tracking-tight text-charcoal">
                  {card.value.toLocaleString("en-IN")}
                </p>
              )}
              <p className="mt-1 text-[0.66rem] text-charcoal/60">{card.hint}</p>
            </div>
          </button>
        );
      })}
    </div>
  );
}
