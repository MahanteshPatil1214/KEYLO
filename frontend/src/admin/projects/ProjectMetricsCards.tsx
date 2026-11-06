import {
  Building2,
  CheckCircle2,
  Clock,
  FileCheck2,
  FileText,
  PowerOff,
} from "lucide-react";
import type { AdminProjectStatus, ProjectMetrics } from "../projectModel";

type ProjectMetricsCardsProps = {
  metrics: ProjectMetrics | null;
  loading: boolean;
  selectedStatus: AdminProjectStatus | "ALL";
  onSelectStatus: (status: AdminProjectStatus | "ALL") => void;
};

export function ProjectMetricsCards({
  metrics,
  loading,
  selectedStatus,
  onSelectStatus,
}: ProjectMetricsCardsProps) {
  const cards = [
    {
      id: "total_projects",
      label: "Total Projects",
      count: metrics?.total_projects ?? 0,
      icon: Building2,
      isActive: selectedStatus === "ALL",
      onClick: () => onSelectStatus("ALL"),
      accent: "text-charcoal",
      badgeBg: "bg-charcoal/5",
    },
    {
      id: "active_projects",
      label: "Active Projects",
      count: metrics?.active_projects ?? 0,
      icon: CheckCircle2,
      isActive: selectedStatus === "ACTIVE",
      onClick: () => onSelectStatus(selectedStatus === "ACTIVE" ? "ALL" : "ACTIVE"),
      accent: "text-emerald-700",
      badgeBg: "bg-emerald-50 text-emerald-800 border-emerald-200/60",
    },
    {
      id: "draft_projects",
      label: "Draft Projects",
      count: metrics?.draft_projects ?? 0,
      icon: Clock,
      isActive: selectedStatus === "DRAFT",
      onClick: () => onSelectStatus(selectedStatus === "DRAFT" ? "ALL" : "DRAFT"),
      accent: "text-amber-800",
      badgeBg: "bg-amber-50 text-amber-900 border-amber-200/60",
    },
    {
      id: "inactive_projects",
      label: "Inactive Projects",
      count: metrics?.inactive_projects ?? 0,
      icon: PowerOff,
      isActive: selectedStatus === "INACTIVE",
      onClick: () => onSelectStatus(selectedStatus === "INACTIVE" ? "ALL" : "INACTIVE"),
      accent: "text-rose-700",
      badgeBg: "bg-rose-50 text-rose-800 border-rose-200/60",
    },
    {
      id: "approved_facts",
      label: "Approved Facts",
      count: metrics?.approved_facts ?? 0,
      icon: FileCheck2,
      isActive: false,
      onClick: () => {},
      accent: "text-indigo-700",
      badgeBg: "bg-indigo-50 text-indigo-800 border-indigo-200/60",
    },
    {
      id: "total_facts",
      label: "Total Facts",
      count: metrics?.total_facts ?? 0,
      icon: FileText,
      isActive: false,
      onClick: () => {},
      accent: "text-teal-700",
      badgeBg: "bg-teal-50 text-teal-800 border-teal-200/60",
    },
  ];

  return (
    <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
      {cards.map((card) => {
        const Icon = card.icon;
        return (
          <button
            key={card.id}
            type="button"
            onClick={card.onClick}
            className={`group flex flex-col justify-between rounded-xl border p-4 text-left transition-all ${
              card.isActive
                ? "border-charcoal bg-white shadow-sm ring-2 ring-charcoal/10"
                : "border-charcoal/10 bg-white/70 hover:border-charcoal/25 hover:bg-white"
            }`}
          >
            <div className="flex items-center justify-between">
              <span className="text-xs font-medium text-charcoal/60">
                {card.label}
              </span>
              <div
                className={`flex size-7 items-center justify-center rounded-lg border border-transparent ${card.badgeBg}`}
              >
                <Icon className={`size-3.5 ${card.accent}`} />
              </div>
            </div>
            <div className="mt-3">
              {loading ? (
                <div className="h-7 w-12 animate-pulse rounded bg-charcoal/10" />
              ) : (
                <span className="text-2xl font-bold tracking-tight text-charcoal">
                  {card.count}
                </span>
              )}
            </div>
          </button>
        );
      })}
    </div>
  );
}

