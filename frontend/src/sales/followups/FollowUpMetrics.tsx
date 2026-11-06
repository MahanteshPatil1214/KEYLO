import {
  AlertCircle,
  CalendarClock,
  CheckCircle2,
  Clock,
  ListTodo,
} from "lucide-react";
import type { FollowUpMetrics } from "../api";
import type { FollowUpCategoryFilter } from "./followUpModel";

interface FollowUpMetricsProps {
  metrics: FollowUpMetrics;
  loading?: boolean;
  activeCategory: FollowUpCategoryFilter;
  onSelectCategory: (category: FollowUpCategoryFilter) => void;
}

export function FollowUpMetricsBar({
  metrics,
  loading = false,
  activeCategory,
  onSelectCategory,
}: FollowUpMetricsProps) {
  const cards: Array<{
    label: string;
    value: number;
    hint: string;
    icon: typeof ListTodo;
    tone: string;
    iconColor: string;
    categoryKey: FollowUpCategoryFilter;
  }> = [
    {
      label: "Total Follow-ups",
      value: metrics.total,
      hint: "All recorded follow-up tasks",
      icon: ListTodo,
      tone: "text-charcoal bg-charcoal/5 border-charcoal/10",
      iconColor: "text-charcoal",
      categoryKey: "ALL",
    },
    {
      label: "Due Today",
      value: metrics.due_today,
      hint: "Pending calls & chats for today",
      icon: Clock,
      tone: "text-amber-700 bg-amber-50 border-amber-200",
      iconColor: "text-amber-600",
      categoryKey: "DUE_TODAY",
    },
    {
      label: "Overdue",
      value: metrics.overdue,
      hint: "Missed scheduled timeline",
      icon: AlertCircle,
      tone: "text-clay bg-clay-soft border-clay/25",
      iconColor: "text-clay",
      categoryKey: "OVERDUE",
    },
    {
      label: "Upcoming",
      value: metrics.upcoming,
      hint: "Scheduled in the coming days",
      icon: CalendarClock,
      tone: "text-forest bg-forest/8 border-forest/20",
      iconColor: "text-forest",
      categoryKey: "UPCOMING",
    },
    {
      label: "Completed",
      value: metrics.completed,
      hint: "Interactions finished with outcome",
      icon: CheckCircle2,
      tone: "text-emerald-800 bg-emerald-50 border-emerald-200",
      iconColor: "text-emerald-700",
      categoryKey: "COMPLETED",
    },
  ];

  return (
    <div className="grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-5">
      {cards.map((card) => {
        const Icon = card.icon;
        const isSelected = activeCategory === card.categoryKey;

        return (
          <button
            type="button"
            key={card.label}
            onClick={() => onSelectCategory(card.categoryKey)}
            className={`group flex flex-col justify-between rounded-2xl border p-4 text-left transition-all ${
              isSelected
                ? "border-forest bg-forest/10 shadow-sm ring-1 ring-forest/30"
                : "border-charcoal/10 bg-white hover:border-charcoal/20 shadow-xs"
            }`}
          >
            <div className="flex items-center justify-between w-full">
              <span className="text-[0.64rem] font-bold tracking-[0.14em] text-charcoal/60 uppercase">
                {card.label}
              </span>
              <span className={`grid size-7.5 place-items-center rounded-xl border ${card.tone}`}>
                <Icon aria-hidden="true" className={`size-3.5 ${card.iconColor}`} />
              </span>
            </div>

            <div className="mt-3">
              {loading ? (
                <div className="h-8 w-12 animate-pulse rounded-md bg-charcoal/10" />
              ) : (
                <p className="font-display text-2xl font-bold tracking-tight text-charcoal sm:text-3xl">
                  {card.value.toLocaleString("en-IN")}
                </p>
              )}
              <p className="mt-1 line-clamp-1 text-[0.64rem] text-charcoal/60">
                {card.hint}
              </p>
            </div>
          </button>
        );
      })}
    </div>
  );
}
