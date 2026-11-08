import {
  ArrowDown,
  ArrowUp,
  ArrowUpDown,
  AlertCircle,
  Eye,
  Mail,
  MessageSquare,
  Phone,
} from "lucide-react";
import { StatusPill, sourceLabel } from "../ui";
import { formatDateTime, formatRelativeTime, initialsOf } from "../format";
import {
  PRIORITY_LABELS,
  PRIORITY_TONES,
  SOURCE_TONES,
  priorityExplanation,
  titleCaseStatus,
} from "./leadModel";
import type { LeadRow, LeadSortKey, SortDirection } from "./leadModel";

type LeadTableProps = {
  rows: LeadRow[];
  sortKey: LeadSortKey;
  sortDirection: SortDirection;
  onSort: (key: LeadSortKey) => void;
  onOpenLead: (lead: LeadRow) => void;
  onOpenConversation: (lead: LeadRow) => void;
};

const PRIORITY_DOTS = {
  HIGH: "bg-clay",
  MEDIUM: "bg-sand",
  LOW: "bg-charcoal/40",
} as const;

const COLUMNS: Array<{
  key: LeadSortKey;
  label: string;
  className?: string;
}> = [
  { key: "buyer", label: "Buyer", className: "w-[26%]" },
  { key: "project", label: "Project", className: "w-[17%]" },
  { key: "source", label: "Source", className: "w-[11%]" },
  { key: "status", label: "Status", className: "w-[12%]" },
  { key: "priority", label: "Priority", className: "w-[9%]" },
  { key: "lastInteraction", label: "Last interaction", className: "w-[13%]" },
];

const actionButtonClass =
  "inline-flex size-9 items-center justify-center rounded-lg border border-charcoal/10 bg-white text-charcoal/65 transition-colors hover:border-forest/40 hover:bg-forest/5 hover:text-forest";

function SortIndicator({
  active,
  direction,
}: {
  active: boolean;
  direction: SortDirection;
}) {
  if (!active) {
    return (
      <ArrowUpDown
        aria-hidden="true"
        className="size-3 shrink-0 text-charcoal/35 transition-colors group-hover:text-charcoal/60"
      />
    );
  }
  return direction === "asc" ? (
    <ArrowUp aria-hidden="true" className="size-3 shrink-0 text-forest" />
  ) : (
    <ArrowDown aria-hidden="true" className="size-3 shrink-0 text-forest" />
  );
}

export function LeadTable({
  rows,
  sortKey,
  sortDirection,
  onSort,
  onOpenLead,
  onOpenConversation,
}: LeadTableProps) {
  return (
    <div className="overflow-x-auto">
      <table className="w-full min-w-[940px] border-collapse text-left">
        <caption className="sr-only">
          Leads assigned to you, with contact details, project, source, status,
          priority and last interaction.
        </caption>
        <thead>
          <tr className="border-b border-charcoal/10 bg-ivory/55">
            {COLUMNS.map((column) => {
              const active = sortKey === column.key;
              return (
                <th
                  key={column.key}
                  scope="col"
                  aria-sort={
                    active
                      ? sortDirection === "asc"
                        ? "ascending"
                        : "descending"
                      : "none"
                  }
                  className={`px-4 py-2.5 first:pl-5 last:pr-5 sm:first:pl-6 sm:last:pr-6 ${column.className ?? ""}`}
                >
                  <button
                    type="button"
                    onClick={() => onSort(column.key)}
                    title={`Sort by ${column.label.toLowerCase()}`}
                    className="group -mx-1.5 -my-1 inline-flex items-center gap-1.5 rounded px-1.5 py-1 text-[0.61rem] font-semibold tracking-[0.14em] text-charcoal/65 uppercase transition-colors hover:bg-charcoal/5 hover:text-charcoal"
                  >
                    {column.label}
                    <SortIndicator active={active} direction={sortDirection} />
                  </button>
                </th>
              );
            })}
            <th
              scope="col"
              className="w-[12%] px-4 py-2.5 pr-5 text-right sm:pr-6"
            >
              <span className="text-[0.61rem] font-semibold tracking-[0.14em] text-charcoal/65 uppercase">
                Actions
              </span>
            </th>
          </tr>
        </thead>
        <tbody className="divide-y divide-charcoal/8">
          {rows.map((lead) => {
            const contact = lead.phone ?? lead.email;
            return (
              <tr
                key={lead.id}
                className="group transition-colors hover:bg-ivory/60"
              >
                <td className="px-4 py-3.5 pl-5 align-top sm:pl-6">
                  <div className="flex items-start gap-2.5">
                    <span
                      aria-hidden="true"
                      className="mt-0.5 grid size-8 shrink-0 place-items-center rounded-lg border border-charcoal/10 bg-ivory font-display text-[0.66rem] font-bold text-charcoal/75"
                    >
                      {initialsOf(lead.full_name)}
                    </span>
                    <div className="min-w-0">
                      <button
                        type="button"
                        onClick={() => onOpenLead(lead)}
                        className="block max-w-full truncate text-left text-[0.82rem] font-semibold text-charcoal transition-colors hover:text-forest"
                      >
                        {lead.full_name}
                      </button>
                      {contact ? (
                        <p className="mt-1 flex min-w-0 items-center gap-1.5 text-[0.68rem] text-charcoal/70">
                          {lead.phone ? (
                            <Phone
                              aria-hidden="true"
                              className="size-3 shrink-0 text-forest"
                            />
                          ) : (
                            <Mail
                              aria-hidden="true"
                              className="size-3 shrink-0 text-forest"
                            />
                          )}
                          <span className="truncate">{contact}</span>
                        </p>
                      ) : (
                        <p className="mt-1 text-[0.68rem] text-charcoal/55">
                          No contact details
                        </p>
                      )}
                      <span className="mt-0.5 block truncate text-[0.62rem] text-charcoal/50">
                        {titleCaseStatus(lead.status)}
                        {lead.preferred_configuration
                          ? ` · ${lead.preferred_configuration}`
                          : ""}
                      </span>
                      {lead.opted_out && (
                        <span
                          className="mt-0.5 inline-flex items-center gap-1 rounded-full border border-clay/25 bg-clay-soft px-2 py-0.5 text-[0.6rem] font-semibold text-clay"
                          title="DPDP opt-out: contact consent withdrawn">
                          <AlertCircle
                            aria-hidden="true"
                            className="size-2.5 shrink-0"
                          />
                          Opted out
                        </span>
                      )}
                    </div>
                  </div>
                </td>

                <td className="px-4 py-3.5 align-top">
                  {lead.project ? (
                    <>
                      <p className="line-clamp-1 text-[0.76rem] font-medium text-charcoal">
                        {lead.project.name}
                      </p>
                      <p className="mt-0.5 line-clamp-1 text-[0.64rem] text-charcoal/55">
                        {lead.project.location}
                      </p>
                    </>
                  ) : (
                    <p className="text-[0.72rem] text-charcoal/50">
                      Project unavailable
                    </p>
                  )}
                </td>

                <td className="px-4 py-3.5 align-top">
                  <span
                    className={`inline-flex max-w-full items-center rounded-full border px-2 py-0.5 text-[0.6rem] font-semibold tracking-[0.04em] ${SOURCE_TONES[lead.source]}`}
                  >
                    <span className="truncate">{sourceLabel(lead.source)}</span>
                  </span>
                </td>

                <td className="px-4 py-3.5 align-top">
                  <StatusPill status={lead.status} />
                </td>

                <td className="px-4 py-3.5 align-top">
                  <span
                    title={priorityExplanation(lead.priority)}
                    className={`inline-flex items-center gap-1.5 rounded-full border px-2 py-0.5 text-[0.6rem] font-semibold ${PRIORITY_TONES[lead.priority]}`}
                  >
                    <span
                      aria-hidden="true"
                      className={`size-1.5 rounded-full ${PRIORITY_DOTS[lead.priority]}`}
                    />
                    {PRIORITY_LABELS[lead.priority]}
                  </span>
                </td>

                <td className="px-4 py-3.5 align-top">
                  <time
                    dateTime={lead.lastInteraction}
                    title={formatDateTime(lead.lastInteraction)}
                    className="block text-[0.72rem] font-medium text-charcoal/80"
                  >
                    {formatRelativeTime(lead.lastInteraction)}
                  </time>
                  <span className="mt-0.5 block text-[0.62rem] text-charcoal/50">
                    {lead.lastInteractionSource}
                  </span>
                </td>

                <td className="px-4 py-3.5 pr-5 text-right align-top sm:pr-6">
                  <div className="flex items-center justify-end gap-1.5">
                    <button
                      type="button"
                      onClick={() => onOpenConversation(lead)}
                      aria-label={`Open conversation history for ${lead.full_name}`}
                      title={
                        lead.conversationCount > 0
                          ? `${lead.conversationCount} conversation${lead.conversationCount === 1 ? "" : "s"}`
                          : "Open enquiry history"
                      }
                      className={actionButtonClass}
                    >
                      <MessageSquare aria-hidden="true" className="size-4" />
                    </button>
                    <button
                      type="button"
                      onClick={() => onOpenLead(lead)}
                      aria-label={`View details for ${lead.full_name}`}
                      title="View lead details"
                      className={actionButtonClass}
                    >
                      <Eye aria-hidden="true" className="size-4" />
                    </button>
                  </div>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
