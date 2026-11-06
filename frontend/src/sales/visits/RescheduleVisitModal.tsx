import {
  CalendarClock,
  Loader2,
  Sparkles,
  X,
  AlertCircle,
} from "lucide-react";
import { useEffect, useState } from "react";
import type { AvailableSlot, SalesBooking, SalesProject } from "../api";
import { fetchAvailableSlots, rescheduleBooking } from "../api";
import { formatLongDate, formatTimeRange } from "../format";

interface RescheduleVisitModalProps {
  isOpen: boolean;
  onClose: () => void;
  booking: SalesBooking | null;
  project: SalesProject | null;
  onRescheduled: (booking: SalesBooking) => void;
}

export function RescheduleVisitModal({
  isOpen,
  onClose,
  booking,
  project,
  onRescheduled,
}: RescheduleVisitModalProps) {
  const [scheduleMode, setScheduleMode] = useState<"slot" | "custom">("slot");
  const [availableSlots, setAvailableSlots] = useState<AvailableSlot[]>([]);
  const [isLoadingSlots, setIsLoadingSlots] = useState(false);
  const [selectedSlotId, setSelectedSlotId] = useState<string>("");

  const [customDate, setCustomDate] = useState<string>("");
  const [customStartTime, setCustomStartTime] = useState<string>("11:00");
  const [customEndTime, setCustomEndTime] = useState<string>("12:00");

  const [notes, setNotes] = useState<string>("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Set default custom date to tomorrow
  useEffect(() => {
    if (isOpen) {
      const tomorrow = new Date(Date.now() + 86400000);
      setCustomDate(tomorrow.toISOString().slice(0, 10));
      setNotes(booking?.notes || "");
    }
  }, [isOpen, booking]);

  // Load available slots
  useEffect(() => {
    if (!isOpen || !booking || !project) {
      setAvailableSlots([]);
      return;
    }

    let isMounted = true;
    setIsLoadingSlots(true);
    setErrorMessage(null);

    fetchAvailableSlots(project.id)
      .then((res) => {
        if (!isMounted) return;
        const filtered = (res.items || []).filter((s) => s.id !== booking.slot_id);
        setAvailableSlots(filtered);
        if (filtered.length > 0) {
          setSelectedSlotId(filtered[0].id);
        } else {
          setScheduleMode("custom");
        }
      })
      .catch((err) => {
        if (!isMounted) return;
        console.warn("Could not fetch slots:", err);
        setScheduleMode("custom");
      })
      .finally(() => {
        if (isMounted) setIsLoadingSlots(false);
      });

    return () => {
      isMounted = false;
    };
  }, [isOpen, booking, project]);

  if (!isOpen || !booking) return null;

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!booking) return;

    setIsSubmitting(true);
    setErrorMessage(null);

    try {
      let updated: SalesBooking;

      if (scheduleMode === "slot") {
        if (!selectedSlotId) {
          throw new Error("Please select an available slot or switch to custom time.");
        }
        updated = await rescheduleBooking(booking.id, {
          slotId: selectedSlotId,
          notes: notes.trim() || undefined,
        });
      } else {
        if (!customDate || !customStartTime || !customEndTime) {
          throw new Error("Please provide date, start time, and end time.");
        }
        const startIso = new Date(`${customDate}T${customStartTime}:00`).toISOString();
        const endIso = new Date(`${customDate}T${customEndTime}:00`).toISOString();

        if (new Date(startIso).getTime() <= Date.now()) {
          throw new Error("Rescheduled start time must be in the future.");
        }
        if (new Date(endIso).getTime() <= new Date(startIso).getTime()) {
          throw new Error("End time must be after start time.");
        }

        updated = await rescheduleBooking(booking.id, {
          startTime: startIso,
          endTime: endIso,
          notes: notes.trim() || undefined,
        });
      }

      onRescheduled(updated);
      onClose();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Failed to reschedule visit.";
      setErrorMessage(msg);
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="reschedule-modal-title"
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-charcoal/40 backdrop-blur-xs transition-opacity animate-fade-in"
    >
      <div
        className="fixed inset-0"
        onClick={onClose}
        aria-hidden="true"
      />

      <div className="relative z-10 w-full max-w-lg rounded-2xl border border-charcoal/10 bg-white p-6 shadow-2xl animate-scale-in">
        <div className="flex items-center justify-between border-b border-charcoal/10 pb-4">
          <div className="flex items-center gap-2.5">
            <span className="grid size-9 place-items-center rounded-xl bg-sand/20 text-sand">
              <CalendarClock className="size-5" />
            </span>
            <div>
              <h2
                id="reschedule-modal-title"
                className="font-display text-lg font-bold text-charcoal"
              >
                Reschedule Site Visit
              </h2>
              <p className="text-xs text-charcoal/60">
                Buyer: <span className="font-semibold text-charcoal">{booking.buyer_name}</span>
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close modal"
            className="rounded-lg p-1.5 text-charcoal/40 hover:bg-charcoal/5 hover:text-charcoal"
          >
            <X className="size-4.5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="mt-4 space-y-4">
          {errorMessage && (
            <div
              role="alert"
              className="flex items-start gap-2.5 rounded-xl border border-clay/30 bg-clay-soft p-3 text-xs text-clay"
            >
              <AlertCircle className="mt-0.5 size-4 shrink-0" />
              <span>{errorMessage}</span>
            </div>
          )}

          {/* Current booking info */}
          <div className="rounded-xl border border-charcoal/10 bg-ivory/40 p-3 text-xs text-charcoal/80">
            <span className="text-[0.65rem] font-bold text-charcoal/50 uppercase">
              Current Visit Time
            </span>
            <p className="mt-0.5 font-semibold text-charcoal">
              {formatLongDate(booking.slot_start_time)} ·{" "}
              {formatTimeRange(booking.slot_start_time, booking.slot_end_time)}
            </p>
            {project && (
              <p className="mt-0.5 text-[0.68rem] text-charcoal/60">
                {project.name} · {project.location}
              </p>
            )}
          </div>

          {/* Mode Switcher */}
          <div className="flex items-center rounded-xl border border-charcoal/10 bg-ivory/40 p-1">
            <button
              type="button"
              onClick={() => setScheduleMode("slot")}
              className={`flex-1 rounded-lg py-1.5 text-xs font-semibold transition-colors ${
                scheduleMode === "slot"
                  ? "bg-white text-forest shadow-xs"
                  : "text-charcoal/65 hover:text-charcoal"
              }`}
            >
              Available Slots ({availableSlots.length})
            </button>
            <button
              type="button"
              onClick={() => setScheduleMode("custom")}
              className={`flex-1 rounded-lg py-1.5 text-xs font-semibold transition-colors ${
                scheduleMode === "custom"
                  ? "bg-white text-forest shadow-xs"
                  : "text-charcoal/65 hover:text-charcoal"
              }`}
            >
              Custom Date & Time
            </button>
          </div>

          {/* Slot Mode Details */}
          {scheduleMode === "slot" ? (
            <div>
              <label className="block text-xs font-semibold text-charcoal">
                Select New Slot
              </label>
              {isLoadingSlots ? (
                <div className="mt-2 flex items-center justify-center py-6 text-xs text-charcoal/50">
                  <Loader2 className="mr-2 size-4 animate-spin text-forest" />
                  Loading available slots…
                </div>
              ) : availableSlots.length === 0 ? (
                <div className="mt-2 rounded-xl border border-dashed border-charcoal/20 p-4 text-center text-xs text-charcoal/60">
                  <p>No other open slots for this project.</p>
                  <button
                    type="button"
                    onClick={() => setScheduleMode("custom")}
                    className="mt-2 inline-flex items-center gap-1 font-semibold text-forest hover:underline"
                  >
                    <Sparkles className="size-3.5" /> Pick a custom date & time
                  </button>
                </div>
              ) : (
                <div className="mt-2 max-h-44 space-y-2 overflow-y-auto pr-1">
                  {availableSlots.map((slot) => {
                    const isSelected = selectedSlotId === slot.id;
                    return (
                      <button
                        type="button"
                        key={slot.id}
                        onClick={() => setSelectedSlotId(slot.id)}
                        className={`flex w-full items-center justify-between rounded-xl border p-3 text-left transition-colors ${
                          isSelected
                            ? "border-forest bg-forest/5 text-charcoal"
                            : "border-charcoal/10 bg-white hover:border-charcoal/25"
                        }`}
                      >
                        <div>
                          <p className="text-xs font-semibold text-charcoal">
                            {formatLongDate(slot.start_time)}
                          </p>
                          <p className="mt-0.5 text-[0.68rem] text-charcoal/60">
                            {formatTimeRange(slot.start_time, slot.end_time)}
                          </p>
                        </div>
                        <span className="text-[0.62rem] font-semibold text-forest">
                          {slot.available_capacity} spot(s) left
                        </span>
                      </button>
                    );
                  })}
                </div>
              )}
            </div>
          ) : (
            <div className="space-y-3">
              <div>
                <label
                  htmlFor="reschedule-visit-date"
                  className="block text-xs font-semibold text-charcoal"
                >
                  New Date
                </label>
                <input
                  type="date"
                  id="reschedule-visit-date"
                  value={customDate}
                  min={new Date().toISOString().slice(0, 10)}
                  onChange={(e) => setCustomDate(e.target.value)}
                  required
                  className="mt-1 w-full rounded-xl border border-charcoal/15 bg-ivory/30 px-3.5 py-2.5 text-xs text-charcoal outline-none transition-colors focus:border-forest/40 focus:ring-1 focus:ring-forest/20"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label
                    htmlFor="reschedule-start-time"
                    className="block text-xs font-semibold text-charcoal"
                  >
                    Start Time
                  </label>
                  <input
                    type="time"
                    id="reschedule-start-time"
                    value={customStartTime}
                    onChange={(e) => setCustomStartTime(e.target.value)}
                    required
                    className="mt-1 w-full rounded-xl border border-charcoal/15 bg-ivory/30 px-3.5 py-2.5 text-xs text-charcoal outline-none transition-colors focus:border-forest/40 focus:ring-1 focus:ring-forest/20"
                  />
                </div>
                <div>
                  <label
                    htmlFor="reschedule-end-time"
                    className="block text-xs font-semibold text-charcoal"
                  >
                    End Time
                  </label>
                  <input
                    type="time"
                    id="reschedule-end-time"
                    value={customEndTime}
                    onChange={(e) => setCustomEndTime(e.target.value)}
                    required
                    className="mt-1 w-full rounded-xl border border-charcoal/15 bg-ivory/30 px-3.5 py-2.5 text-xs text-charcoal outline-none transition-colors focus:border-forest/40 focus:ring-1 focus:ring-forest/20"
                  />
                </div>
              </div>
            </div>
          )}

          {/* Notes */}
          <div>
            <label
              htmlFor="reschedule-notes"
              className="block text-xs font-semibold text-charcoal"
            >
              Reschedule Notes (optional)
            </label>
            <textarea
              id="reschedule-notes"
              rows={2}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="e.g. Buyer requested to postpone due to travel."
              className="mt-1 w-full rounded-xl border border-charcoal/15 bg-ivory/30 px-3.5 py-2 text-xs text-charcoal placeholder-charcoal/40 outline-none transition-colors focus:border-forest/40 focus:ring-1 focus:ring-forest/20"
            />
          </div>

          <div className="flex items-center justify-end gap-2.5 border-t border-charcoal/10 pt-4">
            <button
              type="button"
              onClick={onClose}
              disabled={isSubmitting}
              className="rounded-xl border border-charcoal/15 px-4 py-2 text-xs font-semibold text-charcoal hover:bg-charcoal/5"
            >
              Keep Current Time
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="inline-flex items-center gap-1.5 rounded-xl bg-forest px-4 py-2 text-xs font-semibold text-ivory transition-colors hover:bg-forest-deep disabled:opacity-50"
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="size-3.5 animate-spin" />
                  Updating…
                </>
              ) : (
                <>
                  <CalendarClock className="size-3.5" />
                  Save New Time
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
