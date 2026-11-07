import type { ExecutivePerformanceItem } from "../analyticsModel";

type ExecutivePerformanceTableProps = {
  items: ExecutivePerformanceItem[];
  loading: boolean;
};

export function ExecutivePerformanceTable({
  items,
  loading,
}: ExecutivePerformanceTableProps) {
  const getInitials = (name: string) => {
    return name
      .split(" ")
      .map((n) => n[0])
      .join("")
      .toUpperCase()
      .slice(0, 2);
  };

  return (
    <div className="flex flex-col rounded-2xl border border-charcoal/10 bg-white/80 p-5 shadow-xs">
      {/* Header */}
      <div className="flex flex-col gap-1 border-b border-charcoal/5 pb-4">
        <div className="flex items-center gap-2">
          <h3 className="font-serif text-lg font-bold text-charcoal">
            Sales Executive Productivity
          </h3>
          <span className="rounded-full bg-charcoal/5 px-2 py-0.5 text-[10px] font-semibold text-charcoal/70">
            {items.length} executives
          </span>
        </div>
        <p className="text-xs text-charcoal/60">
          Conversion rates, site visit completions, and handoff closures by executive
        </p>
      </div>

      {/* Table */}
      <div className="mt-4 overflow-x-auto">
        <table className="w-full min-w-[700px] text-left text-xs">
          <thead>
            <tr className="border-b border-charcoal/10 text-[11px] font-semibold uppercase tracking-wider text-charcoal/60">
              <th className="pb-3 pl-1 font-semibold">Executive</th>
              <th className="pb-3 text-right font-semibold">Assigned Leads</th>
              <th className="pb-3 text-right font-semibold">Visits Scheduled</th>
              <th className="pb-3 text-right font-semibold">Visits Completed</th>
              <th className="pb-3 text-right font-semibold">Show-Up %</th>
              <th className="pb-3 text-right font-semibold">Handoffs</th>
              <th className="pb-3 text-right font-semibold">Deals Closed</th>
              <th className="pb-3 pr-1 text-right font-semibold">Lead-to-Deal %</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-charcoal/5 font-medium text-charcoal">
            {loading ? (
              <tr>
                <td colSpan={8} className="py-8 text-center text-charcoal/50">
                  <div className="flex justify-center items-center gap-2">
                    <div className="size-4 animate-spin rounded-full border-2 border-charcoal/20 border-t-charcoal" />
                    <span>Loading executive metrics...</span>
                  </div>
                </td>
              </tr>
            ) : items.length === 0 ? (
              <tr>
                <td colSpan={8} className="py-8 text-center text-charcoal/50">
                  No executive performance data found for the selected parameters.
                </td>
              </tr>
            ) : (
              items.map((exec) => (
                <tr key={exec.executive_id} className="hover:bg-charcoal/[0.02] transition-colors">
                  <td className="py-3 pl-1">
                    <div className="flex items-center gap-2.5">
                      <div className="flex size-7 items-center justify-center rounded-full bg-charcoal/10 font-bold text-xs text-charcoal">
                        {getInitials(exec.full_name)}
                      </div>
                      <div className="flex flex-col">
                        <span className="font-semibold text-charcoal">
                          {exec.full_name}
                        </span>
                        <span className="text-[11px] text-charcoal/50">
                          {exec.email}
                        </span>
                      </div>
                    </div>
                  </td>
                  <td className="py-3 text-right font-semibold text-charcoal">
                    {exec.assigned_leads}
                  </td>
                  <td className="py-3 text-right text-charcoal">
                    {exec.bookings}
                  </td>
                  <td className="py-3 text-right text-emerald-800 font-semibold">
                    {exec.completed_visits}
                  </td>
                  <td className="py-3 text-right">
                    <span className="inline-block rounded-md bg-emerald-50 px-1.5 py-0.5 text-[11px] font-semibold text-emerald-800">
                      {(exec.site_visit_show_up_rate * 100).toFixed(0)}%
                    </span>
                  </td>
                  <td className="py-3 text-right text-charcoal/80">
                    {exec.handoffs_resolved} / {exec.handoffs_total}
                  </td>
                  <td className="py-3 text-right font-bold text-charcoal">
                    {exec.conversions}
                  </td>
                  <td className="py-3 pr-1 text-right">
                    <span className="inline-block rounded-md bg-indigo-50 px-1.5 py-0.5 text-[11px] font-semibold text-indigo-800">
                      {(exec.lead_conversion_rate * 100).toFixed(1)}%
                    </span>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
