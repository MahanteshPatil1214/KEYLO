import {
  Edit3,
  MapPin,
  Power,
  Users,
} from "lucide-react";
import type { VisitSlotItem } from "../visitModel";
import { formatDateTimeRange } from "./VisitTable";

type SlotCardListProps = {
  slots: VisitSlotItem[];
  onEdit: (slot: VisitSlotItem) => void;
  onToggleActive: (slot: VisitSlotItem) => void;
};

export function SlotCardList({
  slots,
  onEdit,
  onToggleActive,
}: SlotCardListProps) {
  return (
    <div className="flex flex-col gap-3">
      {slots.map((s) => {
        const booked = s.booked_count ?? 0;
        const capacity = s.capacity;
        const percent = Math.min(100, Math.round((booked / capacity) * 100));

        return (
          <div
            key={s.id}
            className="flex flex-col gap-3 rounded-2xl border border-charcoal/10 bg-white p-4 shadow-xs"
          >
            {/* Header: Project & Status */}
            <div className="flex items-start justify-between gap-2">
              <div className="flex items-center gap-1.5 font-semibold text-charcoal text-sm">
                <MapPin className="size-3.5 text-charcoal/40 shrink-0" />
                <span>{s.project_name || "Development Project"}</span>
              </div>
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
            </div>

            {/* Time Window */}
            <div className="text-xs font-medium text-charcoal">
              {formatDateTimeRange(s.start_time, s.end_time)}
            </div>

            {/* Capacity Progress */}
            <div className="flex flex-col gap-1 rounded-xl bg-charcoal/5 p-3 text-xs">
              <div className="flex items-center justify-between">
                <span className="font-semibold text-charcoal flex items-center gap-1">
                  <Users className="size-3 text-charcoal/50" />
                  {booked} / {capacity} Booked
                </span>
                <span className="text-[11px] text-charcoal/60">
                  {s.available_capacity ?? (capacity - booked)} available
                </span>
              </div>
              <div className="h-1.5 w-full overflow-hidden rounded-full bg-charcoal/10">
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

            {s.notes && (
              <p className="text-xs text-charcoal/70">
                {s.notes}
              </p>
            )}

            {/* Actions Bar */}
            <div className="flex items-center justify-end gap-2 border-t border-charcoal/5 pt-2">
              <button
                type="button"
                onClick={() => onEdit(s)}
                className="inline-flex items-center gap-1 rounded-lg border border-charcoal/15 bg-white px-2.5 py-1.5 text-xs font-semibold text-charcoal"
              >
                <Edit3 className="size-3" />
                <span>Edit</span>
              </button>

              <button
                type="button"
                onClick={() => onToggleActive(s)}
                className={`inline-flex items-center gap-1 rounded-lg border px-2.5 py-1.5 text-xs font-semibold ${
                  s.is_active
                    ? "border-amber-200 bg-amber-50 text-amber-800"
                    : "border-emerald-200 bg-emerald-50 text-emerald-800"
                }`}
              >
                <Power className="size-3" />
                <span>{s.is_active ? "Block" : "Unblock"}</span>
              </button>
            </div>
          </div>
        );
      })}
    </div>
  );
}
