import {
  CheckCircle2,
  Loader2,
  X,
  AlertCircle,
} from "lucide-react";
import { useState } from "react";
import type { FollowUpOutcome, SalesFollowUp } from "../api";
import { completeFollowUp } from "../api";
import { OUTCOME_CONFIG } from "./followUpModel";

interface CompleteFollowUpModalProps {
  isOpen: boolean;
  onClose: () => void;
  followUp: SalesFollowUp | null;
  onCompleted: (followUp: SalesFollowUp) => void;
}

export function CompleteFollowUpModal({
  isOpen,
  onClose,
  followUp,
  onCompleted,
}: CompleteFollowUpModalProps) {
  const [outcome, setOutcome] = useState<FollowUpOutcome>("INTERESTED");
  const [outcomeNotes, setOutcomeNotes] = useState<string>("");
  const [nextAction, setNextAction] = useState<string>("");

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  if (!isOpen || !followUp) return null;

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!followUp) return;

    setIsSubmitting(true);
    setErrorMessage(null);

    try {
      const updated = await completeFollowUp(followUp.id, {
        outcome,
        outcome_notes: outcomeNotes.trim() || undefined,
        next_action: nextAction.trim() || undefined,
      });

      onCompleted(updated);
      onClose();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Failed to complete follow-up.";
      setErrorMessage(msg);
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="complete-followup-title"
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
            <span className="grid size-9 place-items-center rounded-xl bg-forest/10 text-forest">
              <CheckCircle2 className="size-5" />
            </span>
            <div>
              <h2
                id="complete-followup-title"
                className="font-display text-lg font-bold text-charcoal"
              >
                Record Follow-up Outcome
              </h2>
              <p className="text-xs text-charcoal/60">
                Log conversation results with <span className="font-semibold text-charcoal">{followUp.buyer_name}</span>
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

          {/* Outcome Choice Radio Tiles */}
          <div>
            <label className="block text-xs font-semibold text-charcoal">
              Interaction Outcome
            </label>
            <div className="mt-2 space-y-2 max-h-56 overflow-y-auto pr-1">
              {Object.entries(OUTCOME_CONFIG).map(([key, config]) => {
                const outcomeKey = key as FollowUpOutcome;
                const isSelected = outcome === outcomeKey;
                return (
                  <button
                    type="button"
                    key={key}
                    onClick={() => setOutcome(outcomeKey)}
                    className={`w-full rounded-xl border p-3 text-left transition-all ${
                      isSelected
                        ? "border-forest bg-forest/10 ring-1 ring-forest/30 shadow-xs"
                        : "border-charcoal/10 bg-white hover:border-charcoal/20"
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold text-charcoal">
                        {config.label}
                      </span>
                      {isSelected && (
                        <CheckCircle2 className="size-4 text-forest" />
                      )}
                    </div>
                    <p className="mt-1 text-[0.68rem] text-charcoal/65">
                      {config.description}
                    </p>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Outcome Notes */}
          <div>
            <label
              htmlFor="outcome-notes"
              className="block text-xs font-semibold text-charcoal"
            >
              Conversation Notes (optional)
            </label>
            <textarea
              id="outcome-notes"
              rows={2}
              value={outcomeNotes}
              onChange={(e) => setOutcomeNotes(e.target.value)}
              placeholder="e.g. Buyer loved 3BHK master bedroom view. Awaiting approval on customized payment schedule."
              className="mt-1 w-full rounded-xl border border-charcoal/15 bg-ivory/30 px-3.5 py-2 text-xs text-charcoal placeholder-charcoal/40 outline-none focus:border-forest/40"
            />
          </div>

          {/* Next Action */}
          <div>
            <label
              htmlFor="outcome-next-action"
              className="block text-xs font-semibold text-charcoal"
            >
              Next Step (optional)
            </label>
            <input
              type="text"
              id="outcome-next-action"
              value={nextAction}
              onChange={(e) => setNextAction(e.target.value)}
              placeholder="e.g. Call on Friday 11:00 AM to review token agreement"
              className="mt-1 w-full rounded-xl border border-charcoal/15 bg-ivory/30 px-3.5 py-2 text-xs text-charcoal placeholder-charcoal/40 outline-none focus:border-forest/40"
            />
          </div>

          {/* Submit */}
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
                  <CheckCircle2 className="size-3.5" />
                  Mark as Completed
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
