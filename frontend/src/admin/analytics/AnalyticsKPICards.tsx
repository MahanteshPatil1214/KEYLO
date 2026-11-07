import {
  Award,
  CalendarCheck,
  CheckCircle2,
  TrendingUp,
  Users,
  Zap,
} from "lucide-react";
import type { DashboardSummary } from "../analyticsModel";

type AnalyticsKPICardsProps = {
  summary: DashboardSummary | null;
  loading: boolean;
};

export function formatResponseTime(seconds: number | null): string {
  if (seconds === null || seconds === undefined) return "—";
  if (seconds < 60) return `${Math.round(seconds)}s`;
  const mins = seconds / 60;
  if (mins < 60) return `${mins.toFixed(1)}m`;
  const hours = mins / 60;
  return `${hours.toFixed(1)}h`;
}

export function AnalyticsKPICards({
  summary,
  loading,
}: AnalyticsKPICardsProps) {
  const cards = [
    {
      id: "total_leads",
      label: "Total Inquiries",
      value: summary?.total_leads ?? 0,
      subtext: summary
        ? `${summary.new_leads} new • ${summary.assigned_leads} assigned`
        : "Leads captured",
      icon: Users,
      accent: "text-charcoal",
      badgeBg: "bg-charcoal/5",
    },
    {
      id: "response_time",
      label: "Avg Response Time",
      value: formatResponseTime(summary?.average_first_response_seconds ?? null),
      subtext: summary?.first_response_sample_size
        ? `${summary.first_response_sample_size} leads sampled`
        : "First response speed",
      icon: Zap,
      accent: "text-amber-700",
      badgeBg: "bg-amber-50 text-amber-800",
    },
    {
      id: "site_visits",
      label: "Site Visits",
      value: summary?.bookings ?? 0,
      subtext: summary
        ? `${summary.completed_visits} completed • ${summary.no_show_visits} no-show`
        : "Visits scheduled",
      icon: CalendarCheck,
      accent: "text-blue-700",
      badgeBg: "bg-blue-50 text-blue-800",
    },
    {
      id: "lead_to_visit_rate",
      label: "Lead to Visit Rate",
      value: summary
        ? `${(summary.lead_to_visit_conversion_rate * 100).toFixed(1)}%`
        : "0.0%",
      subtext: "Inquiries converting to visits",
      icon: TrendingUp,
      accent: "text-emerald-700",
      badgeBg: "bg-emerald-50 text-emerald-800",
    },
    {
      id: "show_up_rate",
      label: "Visit Show-Up Rate",
      value: summary
        ? `${(summary.site_visit_show_up_rate * 100).toFixed(1)}%`
        : "0.0%",
      subtext: "Scheduled visits completed",
      icon: CheckCircle2,
      accent: "text-emerald-800",
      badgeBg: "bg-emerald-50 text-emerald-800",
    },
    {
      id: "conversion_rate",
      label: "Overall Conversion Rate",
      value: summary
        ? `${(summary.lead_conversion_rate * 100).toFixed(1)}%`
        : "0.0%",
      subtext: summary ? `${summary.conversions} closed deals` : "Deal closure rate",
      icon: Award,
      accent: "text-indigo-700",
      badgeBg: "bg-indigo-50 text-indigo-800",
    },
  ];

  return (
    <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
      {cards.map((c) => {
        const Icon = c.icon;
        return (
          <div
            key={c.id}
            className="relative flex flex-col justify-between rounded-2xl border border-charcoal/10 bg-white/80 p-4 shadow-2xs transition-all hover:border-charcoal/25 hover:shadow-xs"
          >
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-semibold tracking-wider text-charcoal/60 uppercase">
                {c.label}
              </span>
              <div
                className={`flex size-8 items-center justify-center rounded-xl ${c.badgeBg}`}
              >
                <Icon className="size-4" />
              </div>
            </div>

            <div className="mt-3">
              {loading ? (
                <div className="h-7 w-16 animate-pulse rounded bg-charcoal/10" />
              ) : (
                <div className="flex flex-col">
                  <span
                    className={`font-serif text-2xl font-bold tracking-tight ${c.accent}`}
                  >
                    {c.value}
                  </span>
                  <span className="mt-0.5 truncate text-[11px] text-charcoal/60">
                    {c.subtext}
                  </span>
                </div>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}
