import { Eye, Mail, MapPin, MessageSquare, Phone } from "lucide-react";
import { StatusPill, sourceLabel } from "../ui";
import { formatDateTime, formatRelativeTime, initialsOf } from "../format";
import {
  PRIORITY_LABELS,
  PRIORITY_TONES,
  SOURCE_TONES,
  priorityExplanation,
} from "./leadModel";
import type { LeadRow } from "./leadModel";

type LeadCardListProps = {
  rows: LeadRow[];
  onOpenLead: (lead: LeadRow) => void;
  onOpenConversation: (lead: LeadRow) => void;
};

const PRIORITY_DOTS = {
  HIGH: "bg-clay",
  MEDIUM: "bg-sand",
  LOW: "bg-charcoal/40",
} as const;

export function LeadCardList({
  rows,
  onOpenLead,
  onOpenConversation,
}: LeadCardListProps) {
  return (
    <ul className="grid grid-cols-1 gap-3 p-4 sm:grid-cols-2 sm:p-5 lg:hidden">
      {rows.map((lead) => (
        <li
          key={lead.id}
          className="flex flex-col rounded-xl border border-charcoal/10 bg-white p-4 shadow-xs"
        >
          <div className="flex min-w-0 items-start gap-2.5">
            <span
              aria-hidden="true"
              className="mt-0.5 grid size-9 shrink-0 place-items-center rounded-lg border border-charcoal/10 bg-ivory font-display text-[0.7rem] font-bold text-charcoal/75"
            >
              {initialsOf(lead.full_name)}
            </span>
            <div className="min-w-0 flex-1">
              <div className="flex items-start justify-between gap-2">
                <button
                  type="button"
                  onClick={() => onOpenLead(lead)}
                  className="min-w-0 break-words text-left text-sm font-semibold leading-snug text-charcoal transition-colors hover:text-forest"
                >
                  {lead.full_name}
                </button>
                <span className="shrink-0">
                  <StatusPill status={lead.status} />
                </span>
              </div>
              <p className="mt-0.5 text-[0.66rem] leading-4 text-charcoal/55">
                Received {formatRelativeTime(lead.created_at).toLowerCase()}
              </p>
            </div>
          </div>

          <div className="mt-3 space-y-1">
            {lead.phone && (
              <p className="flex items-center gap-1.5 text-[0.72rem] text-charcoal/75">
                <Phone
                  aria-hidden="true"
                  className="size-3 shrink-0 text-forest"
                />
                <span className="truncate">{lead.phone}</span>
              </p>
            )}
            {lead.email && (
              <p className="flex items-center gap-1.5 text-[0.72rem] text-charcoal/75">
                <Mail
                  aria-hidden="true"
                  className="size-3 shrink-0 text-forest"
                />
                <span className="truncate">{lead.email}</span>
              </p>
            )}
            {!lead.phone && !lead.email && (
              <p className="text-[0.72rem] text-charcoal/55">
                No contact details on this lead.
              </p>
            )}
          </div>

          <div className="mt-3 grid grid-cols-2 gap-x-3 gap-y-2 border-t border-charcoal/8 pt-3">
            <div className="col-span-2">
              <p className="text-[0.58rem] font-semibold tracking-[0.14em] text-charcoal/50 uppercase">
                Project
              </p>
              <p className="mt-0.5 flex items-center gap-1 text-[0.72rem] font-medium text-charcoal">
                <MapPin
                  aria-hidden="true"
                  className="size-3 shrink-0 text-forest"
                />
                <span className="truncate">
                  {lead.project?.name ?? "Project unavailable"}
                </span>
              </p>
            </div>
            <div>
              <p className="text-[0.58rem] font-semibold tracking-[0.14em] text-charcoal/50 uppercase">
                Source
              </p>
              <span
                className={`mt-1 inline-flex max-w-full items-center rounded-full border px-2 py-0.5 text-[0.58rem] font-semibold ${SOURCE_TONES[lead.source]}`}
              >
                <span className="truncate">{sourceLabel(lead.source)}</span>
              </span>
            </div>
            <div>
              <p className="text-[0.58rem] font-semibold tracking-[0.14em] text-charcoal/50 uppercase">
                Priority
              </p>
              <span
                title={priorityExplanation(lead.priority)}
                className={`mt-1 inline-flex items-center gap-1.5 rounded-full border px-2 py-0.5 text-[0.58rem] font-semibold ${PRIORITY_TONES[lead.priority]}`}
              >
                <span
                  aria-hidden="true"
                  className={`size-1.5 rounded-full ${PRIORITY_DOTS[lead.priority]}`}
                />
                {PRIORITY_LABELS[lead.priority]}
              </span>
            </div>
            <div className="col-span-2">
              <p className="text-[0.58rem] font-semibold tracking-[0.14em] text-charcoal/50 uppercase">
                Last interaction
              </p>
              <time
                dateTime={lead.lastInteraction}
                title={formatDateTime(lead.lastInteraction)}
                className="mt-0.5 block text-[0.72rem] font-medium text-charcoal/80"
              >
                {formatRelativeTime(lead.lastInteraction)}
                <span className="font-normal text-charcoal/50">
                  {" "}
                  · {lead.lastInteractionSource}
                </span>
              </time>
            </div>
          </div>

          <div className="mt-3 grid grid-cols-2 gap-2">
            <button
              type="button"
              onClick={() => onOpenLead(lead)}
              className="inline-flex min-h-10 items-center justify-center gap-1.5 rounded-lg border border-charcoal/15 bg-ivory/60 px-2 text-[0.7rem] font-semibold text-charcoal transition-colors hover:border-forest/40 hover:text-forest"
            >
              <Eye aria-hidden="true" className="size-3.5" />
              View details
            </button>
            <button
              type="button"
              onClick={() => onOpenConversation(lead)}
              className="inline-flex min-h-10 items-center justify-center gap-1.5 rounded-lg bg-forest px-2 text-[0.7rem] font-semibold text-ivory transition-colors hover:bg-forest-deep"
            >
              <MessageSquare aria-hidden="true" className="size-3.5" />
              Conversation
            </button>
          </div>
        </li>
      ))}
    </ul>
  );
}
