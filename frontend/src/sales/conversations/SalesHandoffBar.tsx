import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { UserCheck, CheckCircle, Loader2, AlertCircle, ChevronDown, ChevronUp } from "lucide-react";
import { updateHandoffStatus, type SalesHandoff, type HandoffStatus } from "../api";

interface SalesHandoffBarProps {
  handoff: SalesHandoff;
}

const STATUS_LABEL: Record<string, string> = {
  PENDING: "Pending — awaiting executive",
  ASSIGNED: "Assigned to you",
  IN_PROGRESS: "In progress",
  RESOLVED: "Resolved",
  CANCELLED: "Cancelled",
};

const STATUS_STYLES: Record<string, string> = {
  PENDING: "bg-amber-50 border-amber-200 text-amber-800",
  ASSIGNED: "bg-forest/8 border-forest/20 text-forest",
  IN_PROGRESS: "bg-blue-50 border-blue-200 text-blue-800",
  RESOLVED: "bg-green-50 border-green-200 text-green-800",
  CANCELLED: "bg-charcoal/5 border-charcoal/15 text-charcoal/50",
};

export function SalesHandoffBar({ handoff }: SalesHandoffBarProps) {
  const queryClient = useQueryClient();
  const [expanded, setExpanded] = useState(false);
  const [resolutionNotes, setResolutionNotes] = useState("");
  const [localError, setLocalError] = useState<string | null>(null);

  const mutation = useMutation({
    mutationFn: ({
      status,
      notes,
    }: {
      status: HandoffStatus;
      notes?: string;
    }) => updateHandoffStatus(handoff.id, status, notes),
    onSuccess: () => {
      setLocalError(null);
      setResolutionNotes("");
      setExpanded(false);
      queryClient.invalidateQueries({ queryKey: ["sales", "handoffs"] });
      queryClient.invalidateQueries({
        queryKey: ["sales", "conversations"],
      });
    },
    onError: (err: any) => {
      setLocalError(err.message ?? "Failed to update handoff status.");
    },
  });

  const canTakeOver =
    handoff.status === "PENDING" || handoff.status === "ASSIGNED";
  const canResolve =
    handoff.status === "ASSIGNED" || handoff.status === "IN_PROGRESS";
  const isResolved =
    handoff.status === "RESOLVED" || handoff.status === "CANCELLED";

  const statusStyle = STATUS_STYLES[handoff.status] ?? STATUS_STYLES.PENDING;

  return (
    <div
      className={`shrink-0 border-b px-4 py-2.5 ${statusStyle}`}
      role="status"
      aria-label={`Handoff status: ${STATUS_LABEL[handoff.status] ?? handoff.status}`}
    >
      <div className="flex items-center justify-between gap-3">
        {/* Left: status info */}
        <div className="flex min-w-0 items-center gap-2">
          <UserCheck aria-hidden="true" className="size-3.5 shrink-0" />
          <div className="min-w-0">
            <span className="text-xs font-semibold">
              Human Handoff — {STATUS_LABEL[handoff.status] ?? handoff.status}
            </span>
            {handoff.reason && (
              <p className="mt-0.5 truncate text-[0.68rem] opacity-75">
                Reason: {handoff.reason}
              </p>
            )}
          </div>
        </div>

        {/* Right: actions */}
        <div className="flex shrink-0 items-center gap-2">
          {!isResolved && (
            <button
              type="button"
              onClick={() => setExpanded((p) => !p)}
              className="rounded-md px-2.5 py-1 text-[0.68rem] font-semibold transition-colors hover:bg-black/5"
              aria-expanded={expanded}
            >
              Actions
              {expanded ? (
                <ChevronUp aria-hidden="true" className="ml-1 inline size-3" />
              ) : (
                <ChevronDown aria-hidden="true" className="ml-1 inline size-3" />
              )}
            </button>
          )}
          {isResolved && (
            <span className="flex items-center gap-1 text-[0.68rem] font-medium opacity-70">
              <CheckCircle aria-hidden="true" className="size-3.5" />
              {handoff.status}
            </span>
          )}
        </div>
      </div>

      {/* Expanded actions */}
      {expanded && !isResolved && (
        <div className="mt-2.5 space-y-2 rounded-lg bg-white/60 p-3">
          {/* Summary from AI */}
          {handoff.summary && (
            <div>
              <p className="mb-1 text-[0.6rem] font-semibold uppercase tracking-widest opacity-70">
                AI Summary
              </p>
              <p className="text-[0.72rem] leading-relaxed text-charcoal/80">
                {handoff.summary}
              </p>
            </div>
          )}

          {/* Resolution notes input */}
          <div>
            <label
              htmlFor={`handoff-notes-${handoff.id}`}
              className="mb-1 block text-[0.6rem] font-semibold uppercase tracking-widest opacity-70"
            >
              Resolution notes (optional)
            </label>
            <textarea
              id={`handoff-notes-${handoff.id}`}
              value={resolutionNotes}
              onChange={(e) => setResolutionNotes(e.target.value)}
              rows={2}
              placeholder="Add any notes about the resolution…"
              className="w-full rounded-md border border-charcoal/15 bg-white px-2.5 py-1.5 text-xs text-charcoal placeholder-charcoal/40 outline-none focus:border-forest/40 focus:ring-1 focus:ring-forest/20"
            />
          </div>

          {/* Error */}
          {localError && (
            <p className="flex items-center gap-1 text-xs text-red-600">
              <AlertCircle aria-hidden="true" className="size-3.5" />
              {localError}
            </p>
          )}

          {/* Action buttons */}
          <div className="flex flex-wrap gap-2">
            {canTakeOver && (
              <button
                type="button"
                onClick={() =>
                  mutation.mutate({ status: "IN_PROGRESS", notes: resolutionNotes || undefined })
                }
                disabled={mutation.isPending}
                className="inline-flex items-center gap-1.5 rounded-md bg-blue-600 px-3 py-1.5 text-xs font-semibold text-white transition-colors hover:bg-blue-700 disabled:opacity-50"
              >
                {mutation.isPending ? (
                  <Loader2 aria-hidden="true" className="size-3 animate-spin" />
                ) : (
                  <UserCheck aria-hidden="true" className="size-3" />
                )}
                Take Over
              </button>
            )}
            {canResolve && (
              <button
                type="button"
                onClick={() =>
                  mutation.mutate({
                    status: "RESOLVED",
                    notes: resolutionNotes || undefined,
                  })
                }
                disabled={mutation.isPending}
                className="inline-flex items-center gap-1.5 rounded-md bg-forest px-3 py-1.5 text-xs font-semibold text-ivory transition-colors hover:bg-forest/90 disabled:opacity-50"
              >
                {mutation.isPending ? (
                  <Loader2 aria-hidden="true" className="size-3 animate-spin" />
                ) : (
                  <CheckCircle aria-hidden="true" className="size-3" />
                )}
                Mark Resolved
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
