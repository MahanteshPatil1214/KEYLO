import {
  CalendarClock,
  Loader2,
  X,
  AlertCircle,
} from "lucide-react";
import { useEffect, useState } from "react";
import type { SalesFollowUp } from "../api";
import { rescheduleFollowUp } from "../api";
import { formatDateTime } from "../format";

interface RescheduleFollowUpModalProps {
  isOpen: boolean;
  onClose: () => void;
  followUp: SalesFollowUp | null;
  onRescheduled: (followUp: SalesFollowUp) => void;
}

export function RescheduleFollowUpModal({
  isOpen,
  onClose,
  followUp,
  onRescheduled,
}: RescheduleFollowUpModalProps) {
  const [date, setDate] = useState<string>("");
  const [time, setTime] = useState<string>("11:00");
  const [notes, setNotes] = useState<string>("");

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen) {
      const tomorrow = new Date(Date.now() + 86400000).toISOString().slice(0, 10);
      setDate(tomorrow);
      setNotes("");
    }
  }, [isOpen]);

  if (!isOpen || !followUp) return null;

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!followUp) return;
    if (!date || !time) {
      setErrorMessage("Please select both date and time.");
      return;
    }

    setIsSubmitting(true);
    setErrorMessage(null);

    try {
      const scheduledIso = new Date(`${date}T${time}:00`).toISOString();
      const updated = await rescheduleFollowUp(followUp.id, {
        scheduled_at: scheduledIso,
        notes: notes.trim() || undefined,
      });

      onRescheduled(updated);
      onClose();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Failed to reschedule follow-up.";
      setErrorMessage(msg);
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="reschedule-followup-title"
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-charcoal/40 backdrop-blur-xs transition-opacity animate-fade-in"
    >
      <div
        className="fixed inset-0"
        onClick={onClose}
        aria-hidden="true"
      />

      <div className="relative z-10 w-full max-w-md rounded-2xl border border-charcoal/10 bg-white p-6 shadow-2xl animate-scale-in">
        <div className="flex items-center justify-between border-b border-charcoal/10 pb-4">
          <div className="flex items-center gap-2.5">
            <span className="grid size-9 place-items-center rounded-xl bg-sand/20 text-sand">
              <CalendarClock className="size-5" />
            </span>
            <div>
              <h2
                id="reschedule-followup-title"
                className="font-display text-lg font-bold text-charcoal"
              >
                Reschedule Follow-up
              </h2>
              <p className="text-xs text-charcoal/60">
                Buyer: <span className="font-semibold text-charcoal">{followUp.buyer_name}</span>
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

          {/* Current schedule */}
          <div className="rounded-xl border border-charcoal/10 bg-ivory/40 p-3 text-xs text-charcoal/80">
            <span className="text-[0.65rem] font-bold text-charcoal/50 uppercase">
              Current Time
            </span>
            <p className="mt-0.5 font-semibold text-charcoal">
              {formatDateTime(followUp.scheduled_at)}
            </p>
          </div>

          {/* New Date and Time */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label
                htmlFor="reschedule-fu-date"
                className="block text-xs font-semibold text-charcoal"
              >
                New Date
              </label>
              <input
                type="date"
                id="reschedule-fu-date"
                value={date}
                onChange={(e) => setDate(e.target.value)}
                required
                className="mt-1 w-full rounded-xl border border-charcoal/15 bg-ivory/30 px-3.5 py-2 text-xs text-charcoal outline-none focus:border-forest/40"
              />
            </div>
            <div>
              <label
                htmlFor="reschedule-fu-time"
                className="block text-xs font-semibold text-charcoal"
              >
                New Time
              </label>
              <input
                type="time"
                id="reschedule-fu-time"
                value={time}
                onChange={(e) => setTime(e.target.value)}
                required
                className="mt-1 w-full rounded-xl border border-charcoal/15 bg-ivory/30 px-3.5 py-2 text-xs text-charcoal outline-none focus:border-forest/40"
              />
            </div>
          </div>

          {/* Notes */}
          <div>
            <label
              htmlFor="reschedule-fu-notes"
              className="block text-xs font-semibold text-charcoal"
            >
              Reschedule Reason / Update (optional)
            </label>
            <textarea
              id="reschedule-fu-notes"
              rows={2}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="e.g. Buyer was in a meeting; asked to call tomorrow morning."
              className="mt-1 w-full rounded-xl border border-charcoal/15 bg-ivory/30 px-3.5 py-2 text-xs text-charcoal placeholder-charcoal/40 outline-none focus:border-forest/40"
            />
          </div>

          <div className="flex items-center justify-end gap-2.5 border-t border-charcoal/10 pt-4">
            <button
              type="button"
              onClick={onClose}
              disabled={isSubmitting}
              className="rounded-xl border border-charcoal/15 px-4 py-2 text-xs font-semibold text-charcoal hover:bg-charcoal/5"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="inline-flex items-center gap-1.5 rounded-xl bg-forest px-4 py-2 text-xs font-semibold text-ivory hover:bg-forest-deep disabled:opacity-50"
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
