import { useEffect, useState } from "react";
import { Edit3, LoaderCircle, X } from "lucide-react";
import type { UpdateSlotPayload, VisitSlotItem } from "../visitModel";
import { updateSlot } from "../api";

type EditSlotModalProps = {
  slot: VisitSlotItem | null;
  isOpen: boolean;
  onClose: () => void;
  onSuccess: (updated: VisitSlotItem) => void;
};

export function EditSlotModal({
  slot,
  isOpen,
  onClose,
  onSuccess,
}: EditSlotModalProps) {
  const [capacity, setCapacity] = useState<number>(1);
  const [notes, setNotes] = useState("");
  const [isActive, setIsActive] = useState<boolean>(true);

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (slot) {
      setCapacity(slot.capacity);
      setNotes(slot.notes || "");
      setIsActive(slot.is_active);
      setError(null);
    }
  }, [slot]);

  if (!isOpen || !slot) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (capacity < 1 || capacity > 50) {
      setError("Capacity must be between 1 and 50.");
      return;
    }

    if ((slot.booked_count ?? 0) > capacity) {
      setError(`Cannot set capacity to ${capacity}: ${slot.booked_count} visits are already booked for this slot.`);
      return;
    }

    setLoading(true);
    try {
      const payload: UpdateSlotPayload = {
        capacity: Number(capacity),
        notes: notes.trim() || undefined,
        is_active: isActive,
      };

      const updated = await updateSlot(slot.id, payload);
      onSuccess(updated);
      onClose();
    } catch (err: any) {
      setError(err?.message || "Failed to update visit slot.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-charcoal/50 backdrop-blur-xs transition-opacity"
        onClick={!loading ? onClose : undefined}
      />

      {/* Modal Dialog */}
      <div className="relative w-full max-w-md overflow-hidden rounded-2xl border border-charcoal/10 bg-white shadow-xl transition-all">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-charcoal/10 px-6 py-4">
          <div className="flex items-center gap-2.5">
            <div className="flex size-9 items-center justify-center rounded-xl bg-charcoal/5 text-charcoal">
              <Edit3 className="size-4" />
            </div>
            <div>
              <h2 className="font-semibold text-charcoal text-base">
                Edit Visit Slot
              </h2>
              <p className="text-xs text-charcoal/60">
                Update capacity and availability settings.
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            disabled={loading}
            className="rounded-lg p-1 text-charcoal/40 hover:bg-charcoal/5 hover:text-charcoal disabled:opacity-50"
          >
            <X className="size-4" />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="flex flex-col gap-4 p-6">
          {error && (
            <div className="rounded-xl border border-rose-200 bg-rose-50/70 p-3 text-xs text-rose-800">
              {error}
            </div>
          )}

          {/* Project & Timing Readout */}
          <div className="rounded-xl border border-charcoal/10 bg-[#FAFAF7] p-3 text-xs">
            <p className="font-semibold text-charcoal">
              {slot.project_name || "Development Project"}
            </p>
            <p className="mt-0.5 text-charcoal/65">
              Current Bookings: <span className="font-semibold text-charcoal">{slot.booked_count ?? 0}</span> / {slot.capacity}
            </p>
          </div>

          {/* Capacity Input */}
          <div className="flex flex-col gap-1.5">
            <label
              htmlFor="edit-slot-capacity"
              className="text-xs font-semibold text-charcoal"
            >
              Slot Capacity <span className="text-rose-500">*</span>
            </label>
            <input
              id="edit-slot-capacity"
              type="number"
              min={1}
              max={50}
              value={capacity}
              onChange={(e) => setCapacity(Number(e.target.value))}
              required
              className="h-10 rounded-xl border border-charcoal/15 bg-white px-3 text-sm text-charcoal focus:border-charcoal focus:outline-hidden focus:ring-2 focus:ring-charcoal/10"
            />
          </div>

          {/* Notes */}
          <div className="flex flex-col gap-1.5">
            <label
              htmlFor="edit-slot-notes"
              className="text-xs font-semibold text-charcoal"
            >
              Slot Notes
            </label>
            <input
              id="edit-slot-notes"
              type="text"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="e.g. Sales gallery tour, sample flat walkthrough…"
              className="h-10 rounded-xl border border-charcoal/15 bg-white px-3 text-sm text-charcoal placeholder:text-charcoal/40 focus:border-charcoal focus:outline-hidden focus:ring-2 focus:ring-charcoal/10"
            />
          </div>

          {/* Availability State */}
          <div className="flex items-center justify-between rounded-xl border border-charcoal/10 bg-charcoal/5 p-3">
            <div>
              <p className="text-xs font-semibold text-charcoal">
                Availability State
              </p>
              <p className="text-[11px] text-charcoal/60">
                {isActive ? "Available for bookings" : "Blocked (no new reservations)"}
              </p>
            </div>
            <button
              type="button"
              onClick={() => setIsActive(!isActive)}
              className={`rounded-lg px-3 py-1.5 text-xs font-semibold transition-colors ${
                isActive
                  ? "bg-emerald-600 text-white"
                  : "bg-amber-600 text-white"
              }`}
            >
              {isActive ? "Available" : "Blocked"}
            </button>
          </div>

          {/* Actions */}
          <div className="mt-2 flex items-center justify-end gap-3 border-t border-charcoal/10 pt-4">
            <button
              type="button"
              onClick={onClose}
              disabled={loading}
              className="rounded-xl border border-charcoal/15 px-4 py-2 text-xs font-semibold text-charcoal hover:bg-charcoal/5 disabled:opacity-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              className="inline-flex items-center gap-2 rounded-xl bg-charcoal px-5 py-2 text-xs font-semibold text-ivory shadow-xs hover:opacity-95 disabled:opacity-50"
            >
              {loading ? (
                <>
                  <LoaderCircle className="size-3.5 animate-spin" />
                  <span>Saving…</span>
                </>
              ) : (
                <span>Save Changes</span>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
