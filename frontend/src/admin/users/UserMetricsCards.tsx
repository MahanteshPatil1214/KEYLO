import {
  Briefcase,
  CheckCircle2,
  Shield,
  ShoppingBag,
  UserX,
  Users,
} from "lucide-react";
import type { AdminRoleName, UserMetrics } from "../adminModel";

type UserMetricsCardsProps = {
  metrics: UserMetrics | null;
  loading: boolean;
  selectedRole: AdminRoleName | "ALL";
  selectedStatus: "ALL" | "ACTIVE" | "DEACTIVATED";
  onSelectRole: (role: AdminRoleName | "ALL") => void;
  onSelectStatus: (status: "ALL" | "ACTIVE" | "DEACTIVATED") => void;
};

export function UserMetricsCards({
  metrics,
  loading,
  selectedRole,
  selectedStatus,
  onSelectRole,
  onSelectStatus,
}: UserMetricsCardsProps) {
  const cards = [
    {
      id: "total",
      label: "Total Users",
      count: metrics?.total ?? 0,
      icon: Users,
      isActive: selectedRole === "ALL" && selectedStatus === "ALL",
      onClick: () => {
        onSelectRole("ALL");
        onSelectStatus("ALL");
      },
      accent: "text-charcoal group-hover:text-charcoal",
      badgeBg: "bg-charcoal/5",
    },
    {
      id: "active",
      label: "Active Users",
      count: metrics?.active ?? 0,
      icon: CheckCircle2,
      isActive: selectedStatus === "ACTIVE",
      onClick: () => {
        onSelectStatus(selectedStatus === "ACTIVE" ? "ALL" : "ACTIVE");
      },
      accent: "text-emerald-700 group-hover:text-emerald-800",
      badgeBg: "bg-emerald-50 text-emerald-800 border-emerald-200/60",
    },
    {
      id: "deactivated",
      label: "Deactivated",
      count: metrics?.deactivated ?? 0,
      icon: UserX,
      isActive: selectedStatus === "DEACTIVATED",
      onClick: () => {
        onSelectStatus(selectedStatus === "DEACTIVATED" ? "ALL" : "DEACTIVATED");
      },
      accent: "text-rose-700 group-hover:text-rose-800",
      badgeBg: "bg-rose-50 text-rose-800 border-rose-200/60",
    },
    {
      id: "admins",
      label: "Admins",
      count: metrics?.admins ?? 0,
      icon: Shield,
      isActive: selectedRole === "ADMIN",
      onClick: () => {
        onSelectRole(selectedRole === "ADMIN" ? "ALL" : "ADMIN");
      },
      accent: "text-amber-800 group-hover:text-amber-900",
      badgeBg: "bg-amber-50 text-amber-900 border-amber-200/60",
    },
    {
      id: "sales_executives",
      label: "Sales Execs",
      count: metrics?.sales_executives ?? 0,
      icon: Briefcase,
      isActive: selectedRole === "SALES_EXECUTIVE",
      onClick: () => {
        onSelectRole(
          selectedRole === "SALES_EXECUTIVE" ? "ALL" : "SALES_EXECUTIVE",
        );
      },
      accent: "text-indigo-700 group-hover:text-indigo-800",
      badgeBg: "bg-indigo-50 text-indigo-800 border-indigo-200/60",
    },
    {
      id: "buyers",
      label: "Buyers",
      count: metrics?.buyers ?? 0,
      icon: ShoppingBag,
      isActive: selectedRole === "BUYER",
      onClick: () => {
        onSelectRole(selectedRole === "BUYER" ? "ALL" : "BUYER");
      },
      accent: "text-teal-700 group-hover:text-teal-800",
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

