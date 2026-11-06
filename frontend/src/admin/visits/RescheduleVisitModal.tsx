import { useEffect, useState } from "react";
import {
  CalendarClock,
  LoaderCircle,
  X,
} from "lucide-react";
import type { BookingItem, RescheduleBookingPayload, VisitSlotItem } from "../visitModel";
import { fetchSlots, rescheduleBooking } from "../api";
import { formatDateTimeRange } from "./VisitTable";

type RescheduleVisitModalProps = {
  booking: BookingItem | null;
  isOpen: boolean;
  onClose: () => void;
  onSuccess: (updated: BookingItem) => void;
};

export function RescheduleVisitModal({
  booking,
  isOpen,
  onClose,
  onSuccess,
}: RescheduleVisitModalProps) {
  const tomorrow = new Date();
  tomorrow.setDate(tomorrow.getDate() + 1);
  const defaultDateStr = tomorrow.toISOString().split("T")[0];

  const [mode, setMode] = useState<"slot" | "custom">("slot");
  const [selectedSlotId, setSelectedSlotId] = useState<string>("");
  const [dateStr, setDateStr] = useState<string>(defaultDateStr);
  const [startTimeStr, setStartTimeStr] = useState("10:00");
  const [endTimeStr, setEndTimeStr] = useState("11:00");
  const [notes, setNotes] = useState("");

  const [availableSlots, setAvailableSlots] = useState<VisitSlotItem[]>([]);
  const [loadingSlots, setLoadingSlots] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (booking && isOpen) {
      setError(null);
      setLoadingSlots(true);
      // Fetch upcoming active slots for the booking's project
      fetchSlots({
        projectId: booking.project_id,
        isActive: true,
        fromTime: new Date().toISOString(),
      })
        .then((res) => {
          const eligible = (res.items || []).filter(
            (s) => s.id !== booking.slot_id && (s.available_capacity ?? 1) > 0,
          );
          setAvailableSlots(eligible);
          if (eligible.length > 0) {
            setSelectedSlotId(eligible[0].id);
            setMode("slot");
          } else {
            setMode("custom");
          }
        })
        .catch(() => {
          setMode("custom");
        })
        .finally(() => setLoadingSlots(false));
    }
  }, [booking, isOpen]);

  if (!isOpen || !booking) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    let payload: RescheduleBookingPayload;

    if (mode === "slot") {
      if (!selectedSlotId) {
        setError("Please select an available visit slot.");
        return;
      }
      payload = {
        slot_id: selectedSlotId,
        notes: notes.trim() || undefined,
      };
    } else {
      if (!dateStr || !startTimeStr || !endTimeStr) {
        setError("Please specify the date, start time, and end time.");
        return;
      }
      const startDateTime = new Date(`${dateStr}T${startTimeStr}:00`);
      const endDateTime = new Date(`${dateStr}T${endTimeStr}:00`);

      if (startDateTime >= endDateTime) {
        setError("Start time must be strictly before end time.");
        return;
      }

      payload = {
        start_time: startDateTime.toISOString(),
        end_time: endDateTime.toISOString(),
        notes: notes.trim() || undefined,
      };
    }

    setLoading(true);
    try {
      const updated = await rescheduleBooking(booking.id, payload);
      onSuccess(updated);
      onClose();
    } catch (err: any) {
      setError(err?.message || "Failed to reschedule site visit.");
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
      <div className="relative w-full max-w-lg overflow-hidden rounded-2xl border border-charcoal/10 bg-white shadow-xl transition-all">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-charcoal/10 px-6 py-4">
          <div className="flex items-center gap-2.5">
            <div className="flex size-9 items-center justify-center rounded-xl bg-charcoal/5 text-charcoal">
              <CalendarClock className="size-4" />
            </div>
            <div>
              <h2 className="font-semibold text-charcoal text-base">
                Reschedule Site Visit
              </h2>
              <p className="text-xs text-charcoal/60">
                Move {booking.buyer_name}'s appointment to a new time window.
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

        {/* Current Slot Info */}
        <div className="border-b border-charcoal/10 bg-[#FAFAF7] px-6 py-3 text-xs">
          <div className="flex items-center justify-between">
            <span className="text-charcoal/60">Current Reservation:</span>
            <span className="font-semibold text-charcoal">
              {formatDateTimeRange(booking.slot_start_time, booking.slot_end_time)}
            </span>
          </div>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="flex flex-col gap-4 p-6">
          {error && (
            <div className="rounded-xl border border-rose-200 bg-rose-50/70 p-3 text-xs text-rose-800">
              {error}
            </div>
          )}

          {/* Mode Selector */}
          <div className="grid grid-cols-2 gap-2 rounded-xl bg-charcoal/5 p-1 text-xs font-semibold">
            <button
              type="button"
              onClick={() => setMode("slot")}
              className={`rounded-lg py-1.5 transition-all ${
                mode === "slot"
                  ? "bg-white text-charcoal shadow-xs"
                  : "text-charcoal/60 hover:text-charcoal"
              }`}
            >
              Choose Existing Slot ({availableSlots.length})
            </button>
            <button
              type="button"
              onClick={() => setMode("custom")}
              className={`rounded-lg py-1.5 transition-all ${
                mode === "custom"
                  ? "bg-white text-charcoal shadow-xs"
                  : "text-charcoal/60 hover:text-charcoal"
              }`}
            >
              Custom Date & Time
            </button>
          </div>

          {/* Mode 1: Select Available Slot */}
          {mode === "slot" && (
            <div className="flex flex-col gap-1.5">
              <label
                htmlFor="reschedule-slot-id"
                className="text-xs font-semibold text-charcoal"
              >
                Available Slot for {booking.project_name || "Project"}
              </label>
              {loadingSlots ? (
                <div className="flex items-center gap-2 py-3 text-xs text-charcoal/60">
                  <LoaderCircle className="size-3.5 animate-spin" />
                  <span>Loading available slots…</span>
                </div>
              ) : availableSlots.length === 0 ? (
                <div className="rounded-xl border border-amber-200 bg-amber-50 p-3 text-xs text-amber-800">
                  No other active slots currently configured for this project. Please select "Custom Date & Time" above.
                </div>
              ) : (
                <select
                  id="reschedule-slot-id"
                  value={selectedSlotId}
                  onChange={(e) => setSelectedSlotId(e.target.value)}
                  className="h-10 rounded-xl border border-charcoal/15 bg-white px-3 text-xs font-medium text-charcoal focus:border-charcoal focus:outline-hidden"
                >
                  {availableSlots.map((s) => (
                    <option key={s.id} value={s.id}>
                      {formatDateTimeRange(s.start_time, s.end_time)} ({s.available_capacity ?? s.capacity} capacity left)
                    </option>
                  ))}
                </select>
              )}
            </div>
          )}

          {/* Mode 2: Custom Date & Time */}
          {mode === "custom" && (
            <div className="flex flex-col gap-3">
              <div className="flex flex-col gap-1.5">
                <label
                  htmlFor="reschedule-date"
                  className="text-xs font-semibold text-charcoal"
                >
                  New Visit Date <span className="text-rose-500">*</span>
                </label>
                <input
                  id="reschedule-date"
                  type="date"
                  value={dateStr}
                  onChange={(e) => setDateStr(e.target.value)}
                  required
                  className="h-10 rounded-xl border border-charcoal/15 bg-white px-3 text-sm text-charcoal focus:border-charcoal focus:outline-hidden"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="flex flex-col gap-1.5">
                  <label
                    htmlFor="reschedule-start-time"
                    className="text-xs font-semibold text-charcoal"
                  >
                    Start Time <span className="text-rose-500">*</span>
                  </label>
                  <input
                    id="reschedule-start-time"
                    type="time"
                    value={startTimeStr}
                    onChange={(e) => setStartTimeStr(e.target.value)}
                    required
                    className="h-10 rounded-xl border border-charcoal/15 bg-white px-3 text-sm text-charcoal focus:border-charcoal focus:outline-hidden"
                  />
                </div>

                <div className="flex flex-col gap-1.5">
                  <label
                    htmlFor="reschedule-end-time"
                    className="text-xs font-semibold text-charcoal"
                  >
                    End Time <span className="text-rose-500">*</span>
                  </label>
                  <input
                    id="reschedule-end-time"
                    type="time"
                    value={endTimeStr}
                    onChange={(e) => setEndTimeStr(e.target.value)}
                    required
                    className="h-10 rounded-xl border border-charcoal/15 bg-white px-3 text-sm text-charcoal focus:border-charcoal focus:outline-hidden"
                  />
                </div>
              </div>
            </div>
          )}

          {/* Reschedule Notes */}
          <div className="flex flex-col gap-1.5">
            <label
              htmlFor="reschedule-notes"
              className="text-xs font-semibold text-charcoal"
            >
              Reason / Reschedule Notes
            </label>
            <input
              id="reschedule-notes"
              type="text"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="e.g. Rescheduled as buyer requested morning hour…"
              className="h-10 rounded-xl border border-charcoal/15 bg-white px-3 text-sm text-charcoal placeholder:text-charcoal/40 focus:border-charcoal focus:outline-hidden"
            />
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
                  <span>Rescheduling…</span>
                </>
              ) : (
                <span>Confirm Reschedule</span>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
