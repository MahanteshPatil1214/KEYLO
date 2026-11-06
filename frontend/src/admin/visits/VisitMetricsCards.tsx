import {
  CalendarCheck,
  CalendarDays,
  CalendarOff,
  CheckCircle2,
  Clock,
  PowerOff,
} from "lucide-react";
import type { AdminBookingStatus, BookingMetrics } from "../visitModel";

type VisitMetricsCardsProps = {
  metrics: BookingMetrics | null;
  loading: boolean;
  activeTab: "visits" | "slots";
  selectedStatus: AdminBookingStatus | "ALL";
  slotFilter: "ALL" | "ACTIVE" | "BLOCKED";
  onSelectStatus: (status: AdminBookingStatus | "ALL") => void;
  onSelectSlotFilter: (filter: "ALL" | "ACTIVE" | "BLOCKED") => void;
  onSwitchTab: (tab: "visits" | "slots") => void;
};

export function VisitMetricsCards({
  metrics,
  loading,
  activeTab,
  selectedStatus,
  slotFilter,
  onSelectStatus,
  onSelectSlotFilter,
  onSwitchTab,
}: VisitMetricsCardsProps) {
  const cards = [
    {
      id: "total_visits",
      label: "Total Visits",
      count: metrics?.total_visits ?? 0,
      icon: CalendarDays,
      isActive: activeTab === "visits" && selectedStatus === "ALL",
      onClick: () => {
        onSwitchTab("visits");
        onSelectStatus("ALL");
      },
      accent: "text-charcoal",
      badgeBg: "bg-charcoal/5",
    },
    {
      id: "upcoming_visits",
      label: "Upcoming Visits",
      count: metrics?.upcoming_visits ?? 0,
      icon: Clock,
      isActive: activeTab === "visits" && selectedStatus === "CONFIRMED",
      onClick: () => {
        onSwitchTab("visits");
        onSelectStatus("CONFIRMED");
      },
      accent: "text-blue-700",
      badgeBg: "bg-blue-50 text-blue-800 border-blue-200/60",
    },
    {
      id: "completed_visits",
      label: "Completed",
      count: metrics?.completed_visits ?? 0,
      icon: CheckCircle2,
      isActive: activeTab === "visits" && selectedStatus === "COMPLETED",
      onClick: () => {
        onSwitchTab("visits");
        onSelectStatus("COMPLETED");
      },
      accent: "text-emerald-700",
      badgeBg: "bg-emerald-50 text-emerald-800 border-emerald-200/60",
    },
    {
      id: "cancelled_visits",
      label: "Cancelled",
      count: metrics?.cancelled_visits ?? 0,
      icon: CalendarOff,
      isActive: activeTab === "visits" && selectedStatus === "CANCELLED",
      onClick: () => {
        onSwitchTab("visits");
        onSelectStatus("CANCELLED");
      },
      accent: "text-rose-700",
      badgeBg: "bg-rose-50 text-rose-800 border-rose-200/60",
    },
    {
      id: "active_slots",
      label: "Active Slots",
      count: metrics?.active_slots ?? 0,
      icon: CalendarCheck,
      isActive: activeTab === "slots" && slotFilter === "ACTIVE",
      onClick: () => {
        onSwitchTab("slots");
        onSelectSlotFilter("ACTIVE");
      },
      accent: "text-emerald-800",
      badgeBg: "bg-emerald-50 text-emerald-800 border-emerald-200/60",
    },
    {
      id: "blocked_slots",
      label: "Blocked Slots",
      count: metrics?.blocked_slots ?? 0,
      icon: PowerOff,
      isActive: activeTab === "slots" && slotFilter === "BLOCKED",
      onClick: () => {
        onSwitchTab("slots");
        onSelectSlotFilter("BLOCKED");
      },
      accent: "text-amber-800",
      badgeBg: "bg-amber-50 text-amber-800 border-amber-200/60",
    },
  ];

  return (
    <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
      {cards.map((c) => {
        const Icon = c.icon;
        return (
          <button
            key={c.id}
            type="button"
            onClick={c.onClick}
            className={`group relative flex flex-col justify-between rounded-2xl border p-4 text-left transition-all duration-200 ${
              c.isActive
                ? "border-charcoal bg-white shadow-md ring-2 ring-charcoal/10"
                : "border-charcoal/10 bg-white/70 shadow-2xs hover:border-charcoal/30 hover:bg-white hover:shadow-xs"
            }`}
          >
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-semibold tracking-wider text-charcoal/60 uppercase">
                {c.label}
              </span>
              <div
                className={`flex size-8 items-center justify-center rounded-xl transition-colors ${
                  c.isActive
                    ? "bg-charcoal text-ivory"
                    : "bg-charcoal/5 text-charcoal/70 group-hover:bg-charcoal/10"
                }`}
              >
                <Icon className="size-4" />
              </div>
            </div>

            <div className="mt-3">
              {loading ? (
                <div className="h-7 w-12 animate-pulse rounded bg-charcoal/10" />
              ) : (
                <span className={`font-serif text-2xl font-bold tracking-tight ${c.accent}`}>
                  {c.count}
                </span>
              )}
            </div>
          </button>
        );
      })}
    </div>
  );
}
