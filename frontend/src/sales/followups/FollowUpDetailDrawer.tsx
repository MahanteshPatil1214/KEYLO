import {
  CalendarClock,
  CheckCircle2,
  Clock,
  ExternalLink,
  FileEdit,
  FileText,
  Mail,
  MapPin,
  MessageCircle,
  Phone,
  User,
  Users,
  X,
  XCircle,
  Sparkles,
} from "lucide-react";
import { useEffect } from "react";
import type { FollowUpType, SalesFollowUp, SalesLead, SalesProject } from "../api";
import { formatDateTime, formatLongDate, formatTime, initialsOf } from "../format";
import { StatusPill } from "../ui";
import {
  CATEGORY_CONFIG,
  OUTCOME_CONFIG,
  PRIORITY_CONFIG,
  TYPE_CONFIG,
} from "./followUpModel";

interface FollowUpDetailDrawerProps {
  followUp: SalesFollowUp | null;
  project: SalesProject | null;
  lead: SalesLead | null;
  onClose: () => void;
  onComplete: (followUp: SalesFollowUp) => void;
  onReschedule: (followUp: SalesFollowUp) => void;
  onEdit: (followUp: SalesFollowUp) => void;
  onCancel: (followUp: SalesFollowUp) => void;
  onNavigateToLead?: (leadId: string) => void;
}

function TypeIcon({ type }: { type: FollowUpType }) {
  switch (type) {
    case "CALL":
      return <Phone className="size-4 text-forest" />;
    case "WHATSAPP":
      return <MessageCircle className="size-4 text-emerald-600" />;
    case "EMAIL":
      return <Mail className="size-4 text-blue-600" />;
    case "MEETING":
      return <Users className="size-4 text-amber-600" />;
    default:
      return <Clock className="size-4 text-charcoal/60" />;
  }
}

export function FollowUpDetailDrawer({
  followUp,
  project,
  lead,
  onClose,
  onComplete,
  onReschedule,
  onEdit,
  onCancel,
  onNavigateToLead,
}: FollowUpDetailDrawerProps) {
  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") {
        onClose();
      }
    }
    if (followUp) {
      document.body.style.overflow = "hidden";
      window.addEventListener("keydown", handleKeyDown);
    }
    return () => {
      document.body.style.overflow = "";
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [followUp, onClose]);

  if (!followUp) return null;

  const isPending = followUp.status === "PENDING";
  const priorityInfo = PRIORITY_CONFIG[followUp.priority] || PRIORITY_CONFIG.MEDIUM;
  const typeInfo = TYPE_CONFIG[followUp.type] || TYPE_CONFIG.OTHER;
  const categoryInfo = CATEGORY_CONFIG[followUp.category as keyof typeof CATEGORY_CONFIG] || {
    label: followUp.category,
    tone: "border-charcoal/15 bg-charcoal/5 text-charcoal",
  };
  const outcomeInfo = followUp.outcome ? OUTCOME_CONFIG[followUp.outcome] : null;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="followup-drawer-title"
      className="fixed inset-0 z-50 flex justify-end bg-charcoal/40 backdrop-blur-xs transition-opacity animate-fade-in"
    >
      <div
        className="fixed inset-0"
        onClick={onClose}
        aria-hidden="true"
      />

      <div className="relative z-10 flex h-full w-full max-w-xl flex-col bg-white shadow-2xl transition-transform animate-slide-in-right">
        {/* Header */}
        <div className="flex items-start justify-between border-b border-charcoal/10 bg-ivory/60 px-6 py-5">
          <div className="flex items-center gap-3">
            <span
              aria-hidden="true"
              className="grid size-11 shrink-0 place-items-center rounded-xl border border-charcoal/10 bg-white font-display text-sm font-bold text-charcoal shadow-xs"
            >
              {initialsOf(followUp.buyer_name)}
            </span>
            <div>
              <div className="flex items-center gap-2">
                <h2
                  id="followup-drawer-title"
                  className="font-display text-lg font-bold text-charcoal"
                >
                  {followUp.buyer_name}
                </h2>
                <span
                  className={`inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[0.62rem] font-semibold ${priorityInfo.badge}`}
                >
                  <span className={`size-1.5 rounded-full ${priorityInfo.dot}`} />
                  {priorityInfo.shortLabel}
                </span>
              </div>
              <p className="mt-0.5 text-xs text-charcoal/65">
                Lead Follow-up · {project ? project.name : followUp.project_name}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close details"
            className="rounded-lg p-2 text-charcoal/40 transition-colors hover:bg-charcoal/5 hover:text-charcoal"
          >
            <X className="size-5" />
          </button>
        </div>

        {/* Action Toolbar */}
        {isPending && (
          <div className="flex flex-wrap items-center gap-2 border-b border-charcoal/10 bg-white px-6 py-3">
            <button
              type="button"
              onClick={() => onComplete(followUp)}
              className="inline-flex min-h-9 items-center gap-2 rounded-lg border border-forest/30 bg-forest/10 px-3.5 text-xs font-semibold text-forest transition-colors hover:bg-forest/20"
            >
              <CheckCircle2 className="size-4" />
              Complete & Outcome
            </button>

            <button
              type="button"
              onClick={() => onReschedule(followUp)}
              className="inline-flex min-h-9 items-center gap-2 rounded-lg border border-sand/50 bg-sand/10 px-3.5 text-xs font-semibold text-charcoal transition-colors hover:bg-sand/20"
            >
              <CalendarClock className="size-4 text-sand" />
              Reschedule
            </button>

            <button
              type="button"
              onClick={() => onEdit(followUp)}
              className="inline-flex min-h-9 items-center gap-1.5 rounded-lg border border-charcoal/15 bg-white px-3 text-xs font-semibold text-charcoal transition-colors hover:border-charcoal/25"
            >
              <FileEdit className="size-4 text-charcoal/60" />
              Edit
            </button>

            <button
              type="button"
              onClick={() => onCancel(followUp)}
              className="inline-flex min-h-9 items-center gap-1.5 rounded-lg border border-clay/30 bg-clay-soft px-3 text-xs font-semibold text-clay transition-colors hover:bg-clay/15"
            >
              <XCircle className="size-4" />
              Cancel
            </button>
          </div>
        )}

        {/* Scrollable details */}
        <div className="flex-1 space-y-5 overflow-y-auto p-6">
          {/* Section 1: Schedule highlight */}
          <div className="rounded-xl border border-charcoal/10 bg-ivory/30 p-4">
            <div className="flex items-center justify-between">
              <span className="text-[0.66rem] font-bold tracking-[0.14em] text-charcoal/60 uppercase">
                Schedule Status
              </span>
              <span className={`rounded-full border px-2.5 py-0.5 text-[0.65rem] ${categoryInfo.tone}`}>
                {categoryInfo.label}
              </span>
            </div>
            <div className="mt-3 flex items-start gap-3">
              <Clock className="mt-0.5 size-5 shrink-0 text-forest" />
              <div>
                <p className="font-display text-base font-semibold text-charcoal">
                  {formatLongDate(followUp.scheduled_at)}
                </p>
                <p className="mt-0.5 text-xs text-charcoal/70">
                  Time: <span className="font-medium text-charcoal">{formatTime(followUp.scheduled_at)}</span>
                </p>
              </div>
            </div>
          </div>

          {/* Section 2: Follow-up Type & Channel */}
          <div className="flex items-center justify-between rounded-xl border border-charcoal/10 bg-white p-4 shadow-xs">
            <div>
              <span className="text-[0.65rem] font-bold tracking-[0.12em] text-charcoal/50 uppercase">
                Interaction Channel
              </span>
              <p className="mt-1 text-sm font-semibold text-charcoal">
                {typeInfo.label}
              </p>
            </div>
            <span className={`grid size-9 place-items-center rounded-xl border ${typeInfo.tone}`}>
              <TypeIcon type={followUp.type} />
            </span>
          </div>

          {/* Section 3: Completed Outcome if finished */}
          {outcomeInfo && (
            <div className="rounded-xl border border-forest/25 bg-forest/8 p-4">
              <div className="flex items-center gap-2">
                <Sparkles className="size-4 text-forest" />
                <h3 className="text-xs font-bold text-forest uppercase tracking-wider">
                  Follow-up Outcome
                </h3>
              </div>
              <div className="mt-2.5 space-y-1.5">
                <span className={`inline-flex rounded-full border px-2.5 py-1 text-xs font-semibold ${outcomeInfo.tone}`}>
                  {outcomeInfo.label}
                </span>
                <p className="text-xs text-charcoal/75">
                  {outcomeInfo.description}
                </p>
                {followUp.outcome_notes && (
                  <div className="mt-2 rounded-lg bg-white/80 p-2.5 text-xs text-charcoal">
                    <span className="font-semibold text-charcoal">Outcome Notes:</span>{" "}
                    {followUp.outcome_notes}
                  </div>
                )}
                {followUp.completed_at && (
                  <p className="text-[0.68rem] text-charcoal/50">
                    Completed on {formatDateTime(followUp.completed_at)}
                  </p>
                )}
              </div>
            </div>
          )}

          {/* Section 4: Notes and Next Action */}
          <div className="space-y-3 rounded-xl border border-charcoal/10 bg-white p-4 shadow-xs">
            <h3 className="text-[0.68rem] font-bold tracking-[0.14em] text-charcoal/65 uppercase">
              Action Plan & Notes
            </h3>
            {followUp.notes ? (
              <div className="flex items-start gap-2.5 rounded-lg bg-ivory/40 p-3 text-xs text-charcoal/85 leading-relaxed">
                <FileText className="mt-0.5 size-4 shrink-0 text-charcoal/40" />
                <p className="whitespace-pre-wrap">{followUp.notes}</p>
              </div>
            ) : (
              <p className="text-xs italic text-charcoal/50">No notes recorded.</p>
            )}

            {followUp.next_action && (
              <div className="mt-2 rounded-lg border border-forest/20 bg-forest/5 p-3 text-xs">
                <span className="font-bold text-forest">Next Action:</span>
                <p className="mt-0.5 text-charcoal/85">{followUp.next_action}</p>
              </div>
            )}
          </div>

          {/* Section 5: Buyer & Project Context */}
          <div className="space-y-3 rounded-xl border border-charcoal/10 bg-ivory/20 p-4">
            <h3 className="text-[0.68rem] font-bold tracking-[0.14em] text-charcoal/65 uppercase">
              Buyer & Property Details
            </h3>
            <div className="space-y-2.5 text-xs">
              <div className="flex items-center gap-2">
                <User className="size-4 text-charcoal/40" />
                <span className="font-semibold text-charcoal">{followUp.buyer_name}</span>
                <StatusPill status={followUp.lead_status} />
              </div>
              {followUp.buyer_phone && (
                <div className="flex items-center gap-2">
                  <Phone className="size-4 text-forest" />
                  <a
                    href={`tel:${followUp.buyer_phone}`}
                    className="font-medium text-forest hover:underline"
                  >
                    {followUp.buyer_phone}
                  </a>
                </div>
              )}
              {followUp.buyer_email && (
                <div className="flex items-center gap-2">
                  <Mail className="size-4 text-forest" />
                  <a
                    href={`mailto:${followUp.buyer_email}`}
                    className="font-medium text-forest hover:underline"
                  >
                    {followUp.buyer_email}
                  </a>
                </div>
              )}
              {project && (
                <div className="flex items-start gap-2 border-t border-charcoal/8 pt-2">
                  <MapPin className="mt-0.5 size-4 shrink-0 text-forest" />
                  <div>
                    <span className="font-semibold text-charcoal">{project.name}</span>
                    <span className="text-charcoal/60"> · {project.location}</span>
                  </div>
                </div>
              )}
            </div>

            {onNavigateToLead && lead && (
              <button
                type="button"
                onClick={() => onNavigateToLead(lead.id)}
                className="mt-2 inline-flex items-center gap-1 text-[0.68rem] font-semibold text-forest hover:underline"
              >
                View Complete Lead Profile <ExternalLink className="size-3" />
              </button>
            )}
          </div>

          {/* Footer Metadata */}
          <div className="space-y-1 border-t border-charcoal/10 pt-4 text-[0.68rem] text-charcoal/50">
            <p>Task ID: {followUp.id}</p>
            <p>Created: {formatDateTime(followUp.created_at)}</p>
            <p>Last Updated: {formatDateTime(followUp.updated_at)}</p>
          </div>
        </div>
      </div>
    </div>
  );
}
