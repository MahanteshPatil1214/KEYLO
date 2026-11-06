import {
  FileEdit,
  Loader2,
  X,
  AlertCircle,
} from "lucide-react";
import { useEffect, useState } from "react";
import type {
  FollowUpPriority,
  FollowUpType,
  SalesFollowUp,
} from "../api";
import { updateFollowUp } from "../api";
import { PRIORITY_CONFIG, TYPE_CONFIG } from "./followUpModel";

interface EditFollowUpModalProps {
  isOpen: boolean;
  onClose: () => void;
  followUp: SalesFollowUp | null;
  onUpdated: (followUp: SalesFollowUp) => void;
}

export function EditFollowUpModal({
  isOpen,
  onClose,
  followUp,
  onUpdated,
}: EditFollowUpModalProps) {
  const [type, setType] = useState<FollowUpType>("CALL");
  const [priority, setPriority] = useState<FollowUpPriority>("MEDIUM");
  const [notes, setNotes] = useState<string>("");
  const [nextAction, setNextAction] = useState<string>("");

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  useEffect(() => {
    if (followUp) {
      setType(followUp.type);
      setPriority(followUp.priority);
      setNotes(followUp.notes || "");
      setNextAction(followUp.next_action || "");
    }
  }, [followUp]);

  if (!isOpen || !followUp) return null;

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!followUp) return;

    setIsSubmitting(true);
    setErrorMessage(null);

    try {
      const updated = await updateFollowUp(followUp.id, {
        type,
        priority,
        notes: notes.trim() || undefined,
        next_action: nextAction.trim() || undefined,
      });

      onUpdated(updated);
      onClose();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Failed to update follow-up.";
      setErrorMessage(msg);
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="edit-followup-title"
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
            <span className="grid size-9 place-items-center rounded-xl bg-forest/10 text-forest">
              <FileEdit className="size-5" />
            </span>
            <div>
              <h2
                id="edit-followup-title"
                className="font-display text-lg font-bold text-charcoal"
              >
                Edit Follow-up
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

          {/* Type & Priority */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label
                htmlFor="edit-fu-type"
                className="block text-xs font-semibold text-charcoal"
              >
                Channel / Type
              </label>
              <select
                id="edit-fu-type"
                value={type}
                onChange={(e) => setType(e.target.value as FollowUpType)}
                className="mt-1 w-full rounded-xl border border-charcoal/15 bg-ivory/30 px-3.5 py-2 text-xs font-semibold text-charcoal outline-none focus:border-forest/40"
              >
                {Object.entries(TYPE_CONFIG).map(([k, c]) => (
                  <option key={k} value={k}>
                    {c.label}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label
                htmlFor="edit-fu-priority"
                className="block text-xs font-semibold text-charcoal"
              >
                Priority
              </label>
              <select
                id="edit-fu-priority"
                value={priority}
                onChange={(e) => setPriority(e.target.value as FollowUpPriority)}
                className="mt-1 w-full rounded-xl border border-charcoal/15 bg-ivory/30 px-3.5 py-2 text-xs font-semibold text-charcoal outline-none focus:border-forest/40"
              >
                {Object.entries(PRIORITY_CONFIG).map(([k, c]) => (
                  <option key={k} value={k}>
                    {c.label}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Notes */}
          <div>
            <label
              htmlFor="edit-fu-notes"
              className="block text-xs font-semibold text-charcoal"
            >
              Notes / Objective
            </label>
            <textarea
              id="edit-fu-notes"
              rows={2}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="e.g. Discuss floor preference and price negotiation."
              className="mt-1 w-full rounded-xl border border-charcoal/15 bg-ivory/30 px-3.5 py-2 text-xs text-charcoal placeholder-charcoal/40 outline-none focus:border-forest/40"
            />
          </div>

          {/* Next Action */}
          <div>
            <label
              htmlFor="edit-fu-next-action"
              className="block text-xs font-semibold text-charcoal"
            >
              Next Action Plan
            </label>
            <input
              type="text"
              id="edit-fu-next-action"
              value={nextAction}
              onChange={(e) => setNextAction(e.target.value)}
              placeholder="e.g. Send payment plan via WhatsApp before call"
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
                  Saving…
                </>
              ) : (
                <>
                  <FileEdit className="size-3.5" />
                  Save Changes
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
