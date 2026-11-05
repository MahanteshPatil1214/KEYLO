import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import {
  UserCheck,
  X,
  AlertCircle,
  LoaderCircle,
} from "lucide-react";
import { requestHandoff, type Handoff } from "../api";

type RequestHandoffModalProps = {
  isOpen: boolean;
  onClose: () => void;
  conversationId: string;
  projectName: string;
  onHandoffCreated?: (handoff: Handoff) => void;
};

const HANDOFF_REASONS = [
  {
    value: "BUYER_REQUESTED",
    label: "Speak with a Dedicated Sales Executive",
    description: "Receive a personalized callback or WhatsApp consultation from our advisory team.",
  },
  {
    value: "DISCOUNT_NEGOTIATION",
    label: "Pricing, Payment Plans & Official Quotations",
    description: "Discuss developer payment schemes, bank loan approvals, and official price breakdowns.",
  },
  {
    value: "OUT_OF_SCOPE_QUESTION",
    label: "Custom Architecture & Unit Modifications",
    description: "Ask detailed questions regarding floor plan combinations, vastu changes, or interior fittings.",
  },
  {
    value: "HIGH_INTENT",
    label: "Ready to Book / Token Deposit Inquiries",
    description: "Express immediate buying intent and reserve unit allotments directly.",
  },
];

export function RequestHandoffModal({
  isOpen,
  onClose,
  conversationId,
  projectName,
  onHandoffCreated,
}: RequestHandoffModalProps) {
  const queryClient = useQueryClient();
  const [reason, setReason] = useState("BUYER_REQUESTED");
  const [notes, setNotes] = useState("");
  const [submitError, setSubmitError] = useState<string | null>(null);

  const handoffMutation = useMutation({
    mutationFn: () =>
      requestHandoff({
        conversation_id: conversationId,
        reason,
        notes: notes.trim() || undefined,
      }),
    onSuccess: (newHandoff) => {
      queryClient.invalidateQueries({ queryKey: ["buyer", "handoffs"] });
      queryClient.invalidateQueries({ queryKey: ["buyer", "messages", conversationId] });
      queryClient.invalidateQueries({ queryKey: ["buyer", "conversations"] });
      if (onHandoffCreated) onHandoffCreated(newHandoff);
      onClose();
    },
    onError: (err: any) => {
      setSubmitError(
        err.message || "An active handoff is already in progress for this dialogue thread."
      );
    },
  });

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitError(null);
    handoffMutation.mutate();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-charcoal/40 backdrop-blur-xs">
      <div className="relative w-full max-w-lg rounded-2xl border border-charcoal/15 bg-white p-6 shadow-2xl">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-charcoal/10 pb-4">
          <div className="space-y-1">
            <span className="eyebrow">Human Consultation</span>
            <h3 className="font-serif text-xl font-normal text-charcoal">
              Request a Sales Executive
            </h3>
            <p className="text-xs text-charcoal/70">
              Project: <span className="font-semibold text-charcoal">{projectName}</span>
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close modal"
            className="rounded-lg p-1.5 text-charcoal/60 hover:bg-charcoal/5 hover:text-charcoal"
          >
            <X className="size-5" />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="mt-4 space-y-4">
          <div className="text-xs text-charcoal/75">
            Connect directly with an assigned property consultant. Your enquiry history and preferences will be shared with the executive.
          </div>

          {/* Reason selection */}
          <div className="space-y-2">
            <label className="text-xs font-semibold text-charcoal">
              Consultation Purpose
            </label>
            <div className="space-y-2">
              {HANDOFF_REASONS.map((item) => {
                const isSelected = reason === item.value;
                return (
                  <button
                    key={item.value}
                    type="button"
                    onClick={() => setReason(item.value)}
                    className={`flex w-full items-start gap-3 rounded-xl border p-3 text-left transition-all ${
                      isSelected
                        ? "border-forest bg-forest/5 shadow-xs"
                        : "border-charcoal/10 hover:border-forest/40 hover:bg-ivory/30"
                    }`}
                  >
                    <span className="mt-0.5 grid size-4 shrink-0 place-items-center rounded-full border border-charcoal/30">
                      {isSelected && (
                        <span className="size-2 rounded-full bg-forest" />
                      )}
                    </span>
                    <div className="space-y-0.5">
                      <div className="text-xs font-semibold text-charcoal">
                        {item.label}
                      </div>
                      <div className="text-[0.7rem] text-charcoal/60 leading-relaxed">
                        {item.description}
                      </div>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Additional Notes */}
          <div className="space-y-1.5">
            <label
              htmlFor="handoff-notes"
              className="text-xs font-semibold text-charcoal"
            >
              Additional Information (Optional)
            </label>
            <textarea
              id="handoff-notes"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="What specific questions or preferred callback time do you have in mind?"
              className="w-full rounded-xl border border-charcoal/15 p-3 text-xs text-charcoal placeholder:text-charcoal/40 focus:border-forest focus:outline-none"
              rows={2}
              maxLength={1000}
            />
          </div>

          {/* Submit Error */}
          {submitError && (
            <div className="flex items-center gap-2 rounded-lg bg-clay-soft/60 border border-clay/30 p-3 text-xs text-clay">
              <AlertCircle className="size-4 shrink-0" />
              <span>{submitError}</span>
            </div>
          )}

          {/* Footer */}
          <div className="mt-6 flex items-center justify-end gap-3 border-t border-charcoal/10 pt-4">
            <button
              type="button"
              onClick={onClose}
              className="rounded-xl border border-charcoal/15 px-4 py-2 text-xs font-semibold text-charcoal/70 hover:bg-charcoal/5"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={handoffMutation.isPending}
              className="inline-flex min-h-10 items-center justify-center gap-2 rounded-xl bg-forest px-5 text-xs font-semibold text-ivory shadow-xs hover:bg-forest-deep disabled:opacity-50"
            >
              {handoffMutation.isPending && (
                <LoaderCircle className="size-3.5 animate-spin" />
              )}
              <UserCheck className="size-3.5" />
              <span>Request Executive</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
