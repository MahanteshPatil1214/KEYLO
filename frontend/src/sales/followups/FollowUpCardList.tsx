import {
  CalendarClock,
  CheckCircle2,
  Clock,
  Eye,
  FileEdit,
  Mail,
  MapPin,
  MessageCircle,
  Phone,
  Users,
  XCircle,
} from "lucide-react";
import type { FollowUpType, SalesFollowUp, SalesProject } from "../api";
import { formatShortDate, formatTime, initialsOf } from "../format";
import { StatusPill } from "../ui";
import {
  CATEGORY_CONFIG,
  PRIORITY_CONFIG,
  TYPE_CONFIG,
} from "./followUpModel";

interface FollowUpCardListProps {
  followUps: SalesFollowUp[];
  projectMap: Map<string, SalesProject>;
  currentExecutiveId?: string;
  onSelectFollowUp: (followUp: SalesFollowUp) => void;
  onComplete: (followUp: SalesFollowUp) => void;
  onReschedule: (followUp: SalesFollowUp) => void;
  onEdit: (followUp: SalesFollowUp) => void;
  onCancel: (followUp: SalesFollowUp) => void;
}

function TypeIcon({ type }: { type: FollowUpType }) {
  switch (type) {
    case "CALL":
      return <Phone className="size-3.5 text-forest" />;
    case "WHATSAPP":
      return <MessageCircle className="size-3.5 text-emerald-600" />;
    case "EMAIL":
      return <Mail className="size-3.5 text-blue-600" />;
    case "MEETING":
      return <Users className="size-3.5 text-amber-600" />;
    default:
      return <Clock className="size-3.5 text-charcoal/60" />;
  }
}

export function FollowUpCardList({
  followUps,
  projectMap,
  onSelectFollowUp,
  onComplete,
  onReschedule,
  onEdit,
  onCancel,
}: FollowUpCardListProps) {
  return (
    <ul className="grid grid-cols-1 gap-3 p-4 sm:grid-cols-2 sm:p-5 lg:hidden">
      {followUps.map((item) => {
        const project = projectMap.get(item.project_id);
        const contact = item.buyer_phone || item.buyer_email;
        const priorityInfo = PRIORITY_CONFIG[item.priority] || PRIORITY_CONFIG.MEDIUM;
        const typeInfo = TYPE_CONFIG[item.type] || TYPE_CONFIG.OTHER;
        const categoryInfo = CATEGORY_CONFIG[item.category as keyof typeof CATEGORY_CONFIG] || {
          label: item.category,
          tone: "border-charcoal/15 bg-charcoal/5 text-charcoal",
        };
        const isPending = item.status === "PENDING";

        return (
          <li
            key={item.id}
            className="flex flex-col rounded-xl border border-charcoal/10 bg-white p-4 shadow-xs"
          >
            {/* Header: Buyer, Avatar, Priority */}
            <div className="flex min-w-0 items-start gap-2.5">
              <span
                aria-hidden="true"
                className="mt-0.5 grid size-9 shrink-0 place-items-center rounded-lg border border-charcoal/10 bg-ivory font-display text-[0.7rem] font-bold text-charcoal/75"
              >
                {initialsOf(item.buyer_name)}
              </span>
              <div className="min-w-0 flex-1">
                <div className="flex items-start justify-between gap-2">
                  <button
                    type="button"
                    onClick={() => onSelectFollowUp(item)}
                    className="min-w-0 break-words text-left text-sm font-semibold leading-snug text-charcoal transition-colors hover:text-forest"
                  >
                    {item.buyer_name}
                  </button>
                  <span
                    className={`inline-flex shrink-0 items-center gap-1 rounded-full border px-2 py-0.5 text-[0.58rem] font-semibold ${priorityInfo.badge}`}
                  >
                    <span className={`size-1.5 rounded-full ${priorityInfo.dot}`} />
                    {priorityInfo.shortLabel}
                  </span>
                </div>
                {contact && (
                  <p className="mt-1 flex items-center gap-1.5 text-[0.72rem] text-charcoal/75">
                    {item.buyer_phone ? (
                      <Phone className="size-3 shrink-0 text-forest" />
                    ) : (
                      <Mail className="size-3 shrink-0 text-forest" />
                    )}
                    <span className="truncate">{contact}</span>
                  </p>
                )}
              </div>
            </div>

            {/* Middle info panel */}
            <div className="mt-3 space-y-2 rounded-lg bg-ivory/40 p-2.5 text-xs">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-1.5 text-charcoal font-medium">
                  <MapPin className="size-3.5 text-forest shrink-0" />
                  <span className="truncate">{project ? project.name : item.project_name}</span>
                </div>
                <StatusPill status={item.lead_status} />
              </div>

              <div className="flex items-center justify-between gap-2 border-t border-charcoal/8 pt-2">
                <div className="flex items-center gap-1.5 text-charcoal/80">
                  <Clock className="size-3.5 text-charcoal/40" />
                  <span>{formatShortDate(item.scheduled_at)} · {formatTime(item.scheduled_at)}</span>
                </div>
                <span className={`rounded-full border px-2 py-0.5 text-[0.58rem] ${categoryInfo.tone}`}>
                  {categoryInfo.label}
                </span>
              </div>

              <div className="flex items-center gap-1.5 text-charcoal/70">
                <TypeIcon type={item.type} />
                <span className="font-medium text-charcoal">{typeInfo.label}</span>
              </div>
            </div>

            {/* Notes if any */}
            {item.notes && (
              <p className="mt-2 line-clamp-2 rounded bg-charcoal/5 p-2 text-[0.7rem] italic text-charcoal/70">
                "{item.notes}"
              </p>
            )}

            {/* Next action if any */}
            {item.next_action && (
              <p className="mt-1 line-clamp-1 text-[0.68rem] text-forest font-semibold">
                Next: {item.next_action}
              </p>
            )}

            {/* Action buttons */}
            <div className="mt-3.5 flex items-center justify-end gap-1.5 border-t border-charcoal/8 pt-3">
              <button
                type="button"
                onClick={() => onSelectFollowUp(item)}
                className="inline-flex min-h-8 items-center gap-1.5 rounded-lg border border-charcoal/15 bg-white px-2.5 text-xs font-semibold text-charcoal transition-colors hover:border-forest/40 hover:text-forest"
              >
                <Eye className="size-3.5" />
                Details
              </button>

              {isPending && (
                <button
                  type="button"
                  onClick={() => onComplete(item)}
                  className="inline-flex min-h-8 items-center gap-1.5 rounded-lg border border-forest/30 bg-forest/10 px-2.5 text-xs font-semibold text-forest transition-colors hover:bg-forest/20"
                >
                  <CheckCircle2 className="size-3.5" />
                  Outcome
                </button>
              )}

              {isPending && (
                <button
                  type="button"
                  onClick={() => onReschedule(item)}
                  className="inline-flex min-h-8 items-center gap-1.5 rounded-lg border border-sand/40 bg-sand/10 px-2.5 text-xs font-semibold text-charcoal transition-colors hover:bg-sand/20"
                >
                  <CalendarClock className="size-3.5 text-sand" />
                  Reschedule
                </button>
              )}

              {isPending && (
                <button
                  type="button"
                  onClick={() => onEdit(item)}
                  className="inline-flex min-h-8 items-center gap-1.5 rounded-lg border border-charcoal/15 bg-white px-2 text-xs font-semibold text-charcoal transition-colors hover:border-charcoal/25"
                >
                  <FileEdit className="size-3.5" />
                </button>
              )}

              {isPending && (
                <button
                  type="button"
                  onClick={() => onCancel(item)}
                  className="inline-flex min-h-8 items-center gap-1 rounded-lg border border-clay/30 bg-clay-soft px-2 text-xs font-semibold text-clay transition-colors hover:bg-clay/15"
                >
                  <XCircle className="size-3.5" />
                </button>
              )}
            </div>
          </li>
        );
      })}
    </ul>
  );
}
