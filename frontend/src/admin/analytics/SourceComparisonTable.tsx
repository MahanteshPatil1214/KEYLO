import {
  Globe,
  Plus,
  Share2,
  TrendingUp,
  Tv,
  Users2,
  HelpCircle,
} from "lucide-react";
import type { LeadSource, SourcePerformanceItem } from "../analyticsModel";

type SourceComparisonTableProps = {
  items: SourcePerformanceItem[];
  loading: boolean;
  onAddSpend: () => void;
};

const SOURCE_LABELS: Record<LeadSource, { label: string; icon: any; color: string; bg: string }> = {
  WEBSITE: { label: "Direct Website", icon: Globe, color: "text-blue-700", bg: "bg-blue-50 border-blue-200" },
  PROPERTY_PORTAL: { label: "Property Portals", icon: Tv, color: "text-purple-700", bg: "bg-purple-50 border-purple-200" },
  SOCIAL_MEDIA: { label: "Social Campaigns", icon: Share2, color: "text-pink-700", bg: "bg-pink-50 border-pink-200" },
  REFERRAL: { label: "Referrals & VIP", icon: Users2, color: "text-emerald-700", bg: "bg-emerald-50 border-emerald-200" },
  HOARDING: { label: "Outdoor Hoardings", icon: TrendingUp, color: "text-amber-700", bg: "bg-amber-50 border-amber-200" },
  OTHER: { label: "Other Sources", icon: HelpCircle, color: "text-charcoal/70", bg: "bg-charcoal/5 border-charcoal/10" },
};

export function SourceComparisonTable({
  items,
  loading,
  onAddSpend,
}: SourceComparisonTableProps) {
  const formatCurrency = (val: number | null | undefined) => {
    if (val === null || val === undefined) return "—";
    return new Intl.NumberFormat("en-IN", {
      style: "currency",
      currency: "INR",
      maximumFractionDigits: 0,
    }).format(val);
  };

  return (
    <div className="flex flex-col rounded-2xl border border-charcoal/10 bg-white/80 p-5 shadow-xs">
      {/* Header */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between border-b border-charcoal/5 pb-4">
        <div>
          <div className="flex items-center gap-2">
            <h3 className="font-serif text-lg font-bold text-charcoal">
              Acquisition Channels & Marketing ROI
            </h3>
            <span className="rounded-full bg-charcoal/5 px-2 py-0.5 text-[10px] font-semibold text-charcoal/70">
              {items.length} channels
            </span>
          </div>
          <p className="mt-0.5 text-xs text-charcoal/60">
            Compare inquiries, visits, ad spend, and cost per visit across channels
          </p>
        </div>

        <button
          type="button"
          onClick={onAddSpend}
          className="inline-flex items-center gap-1.5 self-start sm:self-auto rounded-xl bg-charcoal px-3 py-2 text-xs font-semibold text-white shadow-2xs hover:bg-charcoal/90 transition-all"
        >
          <Plus className="size-3.5" />
          <span>Add Marketing Spend</span>
        </button>
      </div>

      {/* Table */}
      <div className="mt-4 overflow-x-auto">
        <table className="w-full min-w-[700px] text-left text-xs">
          <thead>
            <tr className="border-b border-charcoal/10 text-[11px] font-semibold uppercase tracking-wider text-charcoal/60">
              <th className="pb-3 pl-1 font-semibold">Channel / Source</th>
              <th className="pb-3 text-right font-semibold">Leads</th>
              <th className="pb-3 text-right font-semibold">Visits</th>
              <th className="pb-3 text-right font-semibold">Show-Up %</th>
              <th className="pb-3 text-right font-semibold">Deals</th>
              <th className="pb-3 text-right font-semibold">Spend</th>
              <th className="pb-3 text-right font-semibold">Cost / Visit</th>
              <th className="pb-3 pr-1 text-right font-semibold">Conv. Rate</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-charcoal/5 font-medium text-charcoal">
            {loading ? (
              <tr>
                <td colSpan={8} className="py-8 text-center text-charcoal/50">
                  <div className="flex justify-center items-center gap-2">
                    <div className="size-4 animate-spin rounded-full border-2 border-charcoal/20 border-t-charcoal" />
                    <span>Loading channel performance...</span>
                  </div>
                </td>
              </tr>
            ) : items.length === 0 ? (
              <tr>
                <td colSpan={8} className="py-8 text-center text-charcoal/50">
                  No channel records available for the selected range.
                </td>
              </tr>
            ) : (
              items.map((item) => {
                const meta = SOURCE_LABELS[item.source] || SOURCE_LABELS.OTHER;
                const Icon = meta.icon;
                return (
                  <tr key={item.source} className="hover:bg-charcoal/[0.02] transition-colors">
                    <td className="py-3 pl-1">
                      <div className="flex items-center gap-2">
                        <span className={`flex size-6 items-center justify-center rounded-lg border ${meta.bg}`}>
                          <Icon className={`size-3.5 ${meta.color}`} />
                        </span>
                        <span className="font-semibold text-charcoal">{meta.label}</span>
                      </div>
                    </td>
                    <td className="py-3 text-right font-semibold text-charcoal">
                      {item.leads}
                    </td>
                    <td className="py-3 text-right text-charcoal">
                      {item.completed_visits}
                      <span className="text-[10px] text-charcoal/50 ml-1 font-normal">
                        ({item.bookings} booked)
                      </span>
                    </td>
                    <td className="py-3 text-right">
                      <span className="inline-block rounded-md bg-emerald-50 px-1.5 py-0.5 text-[11px] font-semibold text-emerald-800">
                        {(item.site_visit_show_up_rate * 100).toFixed(0)}%
                      </span>
                    </td>
                    <td className="py-3 text-right font-semibold text-charcoal">
                      {item.conversions}
                    </td>
                    <td className="py-3 text-right font-medium text-charcoal/80">
                      {formatCurrency(item.marketing_spend)}
                    </td>
                    <td className="py-3 text-right">
                      {item.cost_per_visit !== null && item.cost_per_visit !== undefined ? (
                        <span className="font-bold text-charcoal">
                          {formatCurrency(item.cost_per_visit)}
                        </span>
                      ) : (
                        <span className="text-charcoal/40 text-[11px] italic">No visits</span>
                      )}
                    </td>
                    <td className="py-3 pr-1 text-right">
                      <span className="inline-block rounded-md bg-indigo-50 px-1.5 py-0.5 text-[11px] font-semibold text-indigo-800">
                        {(item.lead_conversion_rate * 100).toFixed(1)}%
                      </span>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
