import {
  CalendarClock,
  CheckCircle2,
  Clock,
  Eye,
  FileEdit,
  Mail,
  MessageCircle,
  Phone,
  UserCheck,
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

interface FollowUpTableProps {
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

export function FollowUpTable({
  followUps,
  projectMap,
  currentExecutiveId,
  onSelectFollowUp,
  onComplete,
  onReschedule,
  onEdit,
  onCancel,
}: FollowUpTableProps) {
  return (
    <div className="overflow-x-auto">
      <table className="w-full min-w-[1040px] border-collapse text-left">
        <caption className="sr-only">
          Scheduled and completed follow-up interactions with prospective buyers.
        </caption>
        <thead>
          <tr className="border-b border-charcoal/10 bg-ivory/55">
            <th scope="col" className="w-[22%] px-4 py-3 pl-5 sm:pl-6">
              <span className="text-[0.61rem] font-semibold tracking-[0.14em] text-charcoal/65 uppercase">
                Buyer & Contact
              </span>
            </th>
            <th scope="col" className="w-[16%] px-4 py-3">
              <span className="text-[0.61rem] font-semibold tracking-[0.14em] text-charcoal/65 uppercase">
                Project & Status
              </span>
            </th>
            <th scope="col" className="w-[16%] px-4 py-3">
              <span className="text-[0.61rem] font-semibold tracking-[0.14em] text-charcoal/65 uppercase">
                Date & Timing
              </span>
            </th>
            <th scope="col" className="w-[11%] px-4 py-3">
              <span className="text-[0.61rem] font-semibold tracking-[0.14em] text-charcoal/65 uppercase">
                Type
              </span>
            </th>
            <th scope="col" className="w-[12%] px-4 py-3">
              <span className="text-[0.61rem] font-semibold tracking-[0.14em] text-charcoal/65 uppercase">
                Executive
              </span>
            </th>
            <th scope="col" className="w-[10%] px-4 py-3">
              <span className="text-[0.61rem] font-semibold tracking-[0.14em] text-charcoal/65 uppercase">
                Priority
              </span>
            </th>
            <th scope="col" className="w-[13%] px-4 py-3 pr-5 text-right sm:pr-6">
              <span className="text-[0.61rem] font-semibold tracking-[0.14em] text-charcoal/65 uppercase">
                Actions
              </span>
            </th>
          </tr>
        </thead>
        <tbody className="divide-y divide-charcoal/8">
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
            const isAssignedToMe =
              !item.executive_id || (currentExecutiveId && item.executive_id === currentExecutiveId);

            return (
              <tr
                key={item.id}
                className="group transition-colors hover:bg-ivory/60"
              >
                {/* Buyer Column */}
                <td className="px-4 py-3.5 pl-5 align-top sm:pl-6">
                  <div className="flex items-start gap-2.5">
                    <span
                      aria-hidden="true"
                      className="mt-0.5 grid size-8 shrink-0 place-items-center rounded-lg border border-charcoal/10 bg-ivory font-display text-[0.66rem] font-bold text-charcoal/75"
                    >
                      {initialsOf(item.buyer_name)}
                    </span>
                    <div className="min-w-0">
                      <button
                        type="button"
                        onClick={() => onSelectFollowUp(item)}
                        className="block max-w-full truncate text-left text-[0.82rem] font-semibold text-charcoal transition-colors hover:text-forest"
                      >
                        {item.buyer_name}
                      </button>
                      {contact && (
                        <p className="mt-1 flex min-w-0 items-center gap-1.5 text-[0.68rem] text-charcoal/70">
                          {item.buyer_phone ? (
                            <Phone className="size-3 shrink-0 text-forest" />
                          ) : (
                            <Mail className="size-3 shrink-0 text-forest" />
                          )}
                          <span className="truncate">{contact}</span>
                        </p>
                      )}
                      {item.notes && (
                        <p className="mt-1 line-clamp-1 text-[0.65rem] italic text-charcoal/60">
                          "{item.notes}"
                        </p>
                      )}
                    </div>
                  </div>
                </td>

                {/* Project & Lead Status */}
                <td className="px-4 py-3.5 align-top">
                  <div>
                    <p className="line-clamp-1 text-[0.78rem] font-medium text-charcoal">
                      {project ? project.name : item.project_name}
                    </p>
                    <div className="mt-1 flex items-center gap-1.5">
                      <StatusPill status={item.lead_status} />
                    </div>
                  </div>
                </td>

                {/* Scheduled Time & Category */}
                <td className="px-4 py-3.5 align-top">
                  <div className="space-y-1">
                    <p className="flex items-center gap-1.5 text-[0.78rem] font-medium text-charcoal">
                      <Clock className="size-3.5 shrink-0 text-charcoal/50" />
                      <span>{formatShortDate(item.scheduled_at)} · {formatTime(item.scheduled_at)}</span>
                    </p>
                    <span
                      className={`inline-flex items-center rounded-full border px-2 py-0.5 text-[0.58rem] ${categoryInfo.tone}`}
                    >
                      {categoryInfo.label}
                    </span>
                  </div>
                </td>

                {/* Type */}
                <td className="px-4 py-3.5 align-top">
                  <div className="flex items-center gap-1.5">
                    <span className="grid size-6 place-items-center rounded-md border border-charcoal/10 bg-white">
                      <TypeIcon type={item.type} />
                    </span>
                    <span className="text-xs font-medium text-charcoal">
                      {typeInfo.label}
                    </span>
                  </div>
                </td>

                {/* Assigned Executive */}
                <td className="px-4 py-3.5 align-top">
                  <div className="flex items-center gap-1.5 text-[0.72rem] text-charcoal/80">
                    <UserCheck className="size-3.5 shrink-0 text-charcoal/45" />
                    <span className="truncate">
                      {isAssignedToMe ? (
                        <span className="font-medium text-forest">Assigned to you</span>
                      ) : (
                        item.executive_name
                      )}
                    </span>
                  </div>
                </td>

                {/* Priority */}
                <td className="px-4 py-3.5 align-top">
                  <span
                    className={`inline-flex items-center gap-1.5 rounded-full border px-2 py-0.5 text-[0.62rem] font-semibold ${priorityInfo.badge}`}
                  >
                    <span className={`size-1.5 rounded-full ${priorityInfo.dot}`} />
                    {priorityInfo.shortLabel}
                  </span>
                </td>

                {/* Actions */}
                <td className="px-4 py-3.5 pr-5 align-top text-right sm:pr-6">
                  <div className="flex items-center justify-end gap-1">
                    <button
                      type="button"
                      onClick={() => onSelectFollowUp(item)}
                      title="View follow-up details"
                      aria-label={`View details for follow-up with ${item.buyer_name}`}
                      className="inline-flex size-8 items-center justify-center rounded-lg border border-charcoal/10 bg-white text-charcoal/65 transition-colors hover:border-forest/40 hover:bg-forest/5 hover:text-forest"
                    >
                      <Eye className="size-3.5" />
                    </button>

                    {isPending && (
                      <button
                        type="button"
                        onClick={() => onComplete(item)}
                        title="Complete follow-up & record outcome"
                        aria-label={`Complete follow-up with ${item.buyer_name}`}
                        className="inline-flex size-8 items-center justify-center rounded-lg border border-forest/30 bg-forest/10 text-forest transition-colors hover:bg-forest/20"
                      >
                        <CheckCircle2 className="size-3.5" />
                      </button>
                    )}

                    {isPending && (
                      <button
                        type="button"
                        onClick={() => onReschedule(item)}
                        title="Reschedule follow-up"
                        aria-label={`Reschedule follow-up with ${item.buyer_name}`}
                        className="inline-flex size-8 items-center justify-center rounded-lg border border-sand/40 bg-sand/10 text-charcoal transition-colors hover:bg-sand/20"
                      >
                        <CalendarClock className="size-3.5 text-sand" />
                      </button>
                    )}

                    {isPending && (
                      <button
                        type="button"
                        onClick={() => onEdit(item)}
                        title="Edit follow-up details"
                        aria-label={`Edit follow-up with ${item.buyer_name}`}
                        className="inline-flex size-8 items-center justify-center rounded-lg border border-charcoal/10 bg-white text-charcoal/65 transition-colors hover:border-charcoal/25"
                      >
                        <FileEdit className="size-3.5" />
                      </button>
                    )}

                    {isPending && (
                      <button
                        type="button"
                        onClick={() => onCancel(item)}
                        title="Cancel follow-up"
                        aria-label={`Cancel follow-up with ${item.buyer_name}`}
                        className="inline-flex size-8 items-center justify-center rounded-lg border border-clay/30 bg-clay-soft text-clay transition-colors hover:bg-clay/15"
                      >
                        <XCircle className="size-3.5" />
                      </button>
                    )}
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
