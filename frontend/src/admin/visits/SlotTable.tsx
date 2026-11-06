import {
  Edit3,
  MapPin,
  Power,
  Users,
} from "lucide-react";
import type { VisitSlotItem } from "../visitModel";
import { formatDateTimeRange } from "./VisitTable";

type SlotTableProps = {
  slots: VisitSlotItem[];
  onEdit: (slot: VisitSlotItem) => void;
  onToggleActive: (slot: VisitSlotItem) => void;
};

export function SlotTable({
  slots,
  onEdit,
  onToggleActive,
}: SlotTableProps) {
  return (
    <div className="overflow-hidden rounded-2xl border border-charcoal/10 bg-white shadow-xs">
      <div className="overflow-x-auto">
        <table className="w-full text-left text-sm text-charcoal">
          <thead className="border-b border-charcoal/10 bg-[#F4F4F0] text-[11px] font-bold tracking-wider text-charcoal/60 uppercase">
            <tr>
              <th scope="col" className="px-6 py-4">
                Project
              </th>
              <th scope="col" className="px-6 py-4">
                Time Window
              </th>
              <th scope="col" className="px-6 py-4">
                Capacity & Bookings
              </th>
              <th scope="col" className="px-6 py-4">
                Status
              </th>
              <th scope="col" className="px-6 py-4">
                Notes
              </th>
              <th scope="col" className="px-6 py-4 text-right">
                Actions
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-charcoal/5">
            {slots.map((s) => {
              const booked = s.booked_count ?? 0;
              const capacity = s.capacity;
              const percent = Math.min(100, Math.round((booked / capacity) * 100));

              return (
                <tr
                  key={s.id}
                  className="transition-colors hover:bg-[#FAFAF7]/80"
                >
                  {/* Project */}
                  <td className="px-6 py-4 font-semibold text-charcoal text-xs">
                    <div className="flex items-center gap-1.5">
                      <MapPin className="size-3.5 text-charcoal/40 shrink-0" />
                      <span>{s.project_name || "Development Project"}</span>
                    </div>
                  </td>

                  {/* Time Window */}
                  <td className="px-6 py-4 text-xs font-medium text-charcoal">
                    {formatDateTimeRange(s.start_time, s.end_time)}
                  </td>

                  {/* Capacity & Bookings */}
                  <td className="px-6 py-4">
                    <div className="flex flex-col gap-1 text-xs">
                      <div className="flex items-center justify-between gap-2">
                        <span className="font-semibold text-charcoal flex items-center gap-1">
                          <Users className="size-3 text-charcoal/50" />
                          {booked} / {capacity} Booked
                        </span>
                        <span className="text-[11px] text-charcoal/60">
                          {s.available_capacity ?? (capacity - booked)} left
                        </span>
                      </div>
                      <div className="h-1.5 w-32 overflow-hidden rounded-full bg-charcoal/10">
                        <div
                          className={`h-full rounded-full transition-all ${
                            percent >= 100
                              ? "bg-rose-500"
                              : percent > 50
                              ? "bg-amber-500"
                              : "bg-emerald-600"
                          }`}
                          style={{ width: `${percent}%` }}
                        />
                      </div>
                    </div>
                  </td>

                  {/* Status */}
                  <td className="px-6 py-4">
                    {s.is_active ? (
                      <span className="inline-flex items-center gap-1.5 rounded-full border border-emerald-200/70 bg-emerald-50 px-2.5 py-0.5 text-[11px] font-semibold text-emerald-800">
                        <span className="size-1.5 rounded-full bg-emerald-500" />
                        Available
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1.5 rounded-full border border-amber-200/70 bg-amber-50 px-2.5 py-0.5 text-[11px] font-semibold text-amber-800">
                        <span className="size-1.5 rounded-full bg-amber-500" />
                        Blocked
                      </span>
                    )}
                  </td>

                  {/* Notes */}
                  <td className="px-6 py-4 text-xs text-charcoal/65">
                    {s.notes || <span className="italic text-charcoal/35">—</span>}
                  </td>

                  {/* Actions */}
                  <td className="px-6 py-4 text-right">
                    <div className="inline-flex items-center gap-1.5">
                      <button
                        type="button"
                        onClick={() => onEdit(s)}
                        className="inline-flex items-center gap-1 rounded-lg border border-charcoal/15 bg-white px-2.5 py-1.5 text-xs font-semibold text-charcoal shadow-2xs hover:border-charcoal/30 hover:bg-charcoal/5"
                        title="Edit Slot Capacity and Timings"
                      >
                        <Edit3 className="size-3 text-charcoal/70" />
                        <span>Edit</span>
                      </button>

                      <button
                        type="button"
                        onClick={() => onToggleActive(s)}
                        className={`inline-flex items-center gap-1 rounded-lg border px-2.5 py-1.5 text-xs font-semibold shadow-2xs transition-colors ${
                          s.is_active
                            ? "border-amber-200 bg-amber-50 text-amber-800 hover:bg-amber-100"
                            : "border-emerald-200 bg-emerald-50 text-emerald-800 hover:bg-emerald-100"
                        }`}
                        title={s.is_active ? "Block this visit slot" : "Unblock this visit slot"}
                      >
                        <Power className="size-3" />
                        <span>{s.is_active ? "Block" : "Unblock"}</span>
                      </button>
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
