import { useEffect, useRef, useState, type ReactNode } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import {
  AlertTriangle,
  ArrowDown,
  CalendarCheck,
  CheckCircle2,
  Clock,
  Inbox,
  Mail,
  MapPin,
  MessageSquare,
  Phone,
  UserRound,
  Wallet,
  X,
} from "lucide-react";
import { useSalesUser } from "../SalesAuthGuard";
import {
  fetchLeadDetail,
  fetchLeadEnquiryHistory,
  updateLeadStatus,
  type LeadEnquiryHistory,
  type LeadStatus,
  type SalesMessage,
} from "../api";
import {
  formatBudget,
  priorityExplanation,
  deriveLeadPriority,
  PRIORITY_LABELS,
  PRIORITY_TONES,
  SENDER_LABELS,
  SENDER_TONES,
  SOURCE_TONES,
  STATUS_TRANSITIONS,
  CONTACT_REQUIRING_STATUSES,
  titleCaseStatus,
  LEAD_STATUSES,
  LEAD_SOURCES,
} from "./leadModel";
import type { LeadRow } from "./leadModel";
import {
  EmptyState,
  ErrorState,
  LoadingState,
  StatusPill,
  reasonLabel,
  sourceLabel,
} from "../ui";
import {
  formatDateTime,
  formatRelativeTime,
  formatShortDate,
  formatTimeRange,
  initialsOf,
} from "../format";

type DrawerSection = "details" | "history";

type LeadDetailDrawerProps = {
  lead: LeadRow | null;
  open: boolean;
  initialSection: DrawerSection;
  onClose: () => void;
};

type Feedback = {
  tone: "success" | "error";
  message: string;
} | null;

const focusableSelector =
  'a[href], button:not([disabled]), select:not([disabled]), input:not([disabled]), [tabindex]:not([tabindex="-1"])';

function SectionHeading({
  icon: Icon,
  title,
  count,
  description,
}: {
  icon: typeof UserRound;
  title: string;
  count?: number;
  description?: string;
}) {
  return (
    <div className="flex items-start justify-between gap-3 pb-2">
      <div className="flex items-start gap-2.5">
        <span className="mt-0.5 grid size-8 shrink-0 place-items-center rounded-lg border border-charcoal/10 bg-white text-forest">
          <Icon aria-hidden="true" className="size-4" />
        </span>
        <div>
          <h3 className="font-display text-lg leading-tight text-charcoal">
            {title}
          </h3>
          {description && (
            <p className="mt-0.5 text-[0.68rem] leading-4 text-charcoal/60">
              {description}
            </p>
          )}
        </div>
      </div>
      {count !== undefined && (
        <span className="inline-flex shrink-0 items-center rounded-full border border-charcoal/10 bg-white px-2 py-0.5 text-[0.62rem] font-semibold text-charcoal/70">
          {count}
        </span>
      )}
    </div>
  );
}

function DetailItem({
  label,
  children,
  className = "",
}: {
  label: string;
  children: ReactNode;
  className?: string;
}) {
  return (
    <div className={`rounded-xl border border-charcoal/10 bg-white p-3 ${className}`}>
      <dt className="text-[0.58rem] font-semibold tracking-[0.15em] text-charcoal/50 uppercase">
        {label}
      </dt>
      <dd className="mt-1 text-[0.76rem] leading-5 font-medium break-words text-charcoal">
        {children}
      </dd>
    </div>
  );
}

function ConversationMessages({
  messages,
}: {
  messages: SalesMessage[];
}) {
  if (messages.length === 0) {
    return (
      <p className="rounded-lg border border-dashed border-charcoal/15 bg-white/60 px-3 py-2 text-[0.68rem] text-charcoal/60">
        No messages in this conversation yet.
      </p>
    );
  }

  return (
    <ol className="space-y-2">
      {messages.map((message) => {
        const isBuyer = message.sender_type === "BUYER";
        return (
          <li
            key={message.id}
            className={`flex ${isBuyer ? "justify-start" : "justify-end"}`}
          >
            <div
              className={`max-w-[88%] rounded-xl border px-3 py-2 ${SENDER_TONES[message.sender_type]}`}
            >
              <div className="flex flex-wrap items-center gap-x-2 gap-y-0.5">
                <span className="text-[0.58rem] font-bold tracking-[0.08em] uppercase">
                  {SENDER_LABELS[message.sender_type]}
                </span>
                <time
                  dateTime={message.created_at}
                  className="text-[0.56rem] opacity-65"
                >
                  {formatDateTime(message.created_at)}
                </time>
              </div>
              <p className="mt-1 text-[0.74rem] leading-5 whitespace-pre-wrap">
                {message.content}
              </p>
            </div>
          </li>
        );
      })}
    </ol>
  );
}

function HistoryPanel({
  history,
  executiveId,
}: {
  history: LeadEnquiryHistory;
  executiveId: string;
}) {
  const conversations = [...history.conversations].sort(
    (left, right) =>
      new Date(right.updated_at).getTime() -
      new Date(left.updated_at).getTime(),
  );
  const bookings = [...history.bookings].sort(
    (left, right) =>
      new Date(right.slot_start_time).getTime() -
      new Date(left.slot_start_time).getTime(),
  );
  const handoffs = [...history.handoffs].sort(
    (left, right) =>
      new Date(right.created_at).getTime() -
      new Date(left.created_at).getTime(),
  );
  const assignments = [...history.assignments].sort(
    (left, right) =>
      new Date(right.assigned_at).getTime() -
      new Date(left.assigned_at).getTime(),
  );

  const hasActivity =
    conversations.length > 0 ||
    bookings.length > 0 ||
    handoffs.length > 0 ||
    assignments.length > 0;

  if (!hasActivity) {
    return (
      <EmptyState
        icon={Inbox}
        title="No enquiry activity yet"
        description="Conversations, site visits, handoffs and assignment changes for this lead will appear here."
      />
    );
  }

  return (
    <div className="space-y-5">
      <section aria-labelledby="drawer-conversations-heading">
        <div id="drawer-conversations-heading">
          <SectionHeading
            icon={MessageSquare}
            title="Conversations"
            count={conversations.length}
          />
        </div>
        {conversations.length === 0 ? (
          <p className="rounded-xl border border-dashed border-charcoal/15 bg-white/60 px-3 py-3 text-[0.7rem] text-charcoal/60">
            No buyer conversations have been opened for this lead.
          </p>
        ) : (
          <div className="space-y-3">
            {conversations.map((conversation) => {
              const messages =
                history.messagesByConversation[conversation.id] ?? [];
              return (
                <article
                  key={conversation.id}
                  className="rounded-xl border border-charcoal/10 bg-ivory/40 p-3"
                >
                  <header className="flex flex-wrap items-center justify-between gap-2 pb-2">
                    <div className="flex items-center gap-2">
                      <StatusPill status={conversation.status} />
                      <span className="text-[0.64rem] text-charcoal/60">
                        {messages.length}{" "}
                        {messages.length === 1 ? "message" : "messages"}
                      </span>
                    </div>
                    <time
                      dateTime={conversation.updated_at}
                      title={formatDateTime(conversation.updated_at)}
                      className="text-[0.62rem] text-charcoal/55"
                    >
                      Updated {formatRelativeTime(conversation.updated_at)}
                    </time>
                  </header>
                  <ConversationMessages messages={messages} />
                </article>
              );
            })}
          </div>
        )}
      </section>

      <section aria-labelledby="drawer-visits-heading">
        <div id="drawer-visits-heading">
          <SectionHeading
            icon={CalendarCheck}
            title="Site visits"
            count={bookings.length}
          />
        </div>
        {bookings.length === 0 ? (
          <p className="rounded-xl border border-dashed border-charcoal/15 bg-white/60 px-3 py-3 text-[0.7rem] text-charcoal/60">
            No site visits have been booked for this lead.
          </p>
        ) : (
          <ul className="space-y-2">
            {bookings.map((booking) => (
              <li
                key={booking.id}
                className="rounded-xl border border-charcoal/10 bg-white p-3"
              >
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <p className="text-[0.74rem] font-semibold text-charcoal">
                    {formatShortDate(booking.slot_start_time)}
                    <span className="font-normal text-charcoal/65">
                      {" "}
                      ·{" "}
                      {formatTimeRange(
                        booking.slot_start_time,
                        booking.slot_end_time,
                      )}
                    </span>
                  </p>
                  <StatusPill status={booking.status} />
                </div>
                {booking.notes && (
                  <p className="mt-1.5 text-[0.7rem] leading-5 text-charcoal/70">
                    {booking.notes}
                  </p>
                )}
                {booking.cancellation_reason && (
                  <p className="mt-1.5 text-[0.68rem] text-clay">
                    Cancelled: {booking.cancellation_reason}
                  </p>
                )}
                <time
                  dateTime={booking.created_at}
                  className="mt-1.5 block text-[0.6rem] text-charcoal/50"
                >
                  Booked {formatDateTime(booking.created_at)}
                </time>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section aria-labelledby="drawer-handoffs-heading">
        <div id="drawer-handoffs-heading">
          <SectionHeading
            icon={UserRound}
            title="Buyer handoffs"
            count={handoffs.length}
          />
        </div>
        {handoffs.length === 0 ? (
          <p className="rounded-xl border border-dashed border-charcoal/15 bg-white/60 px-3 py-3 text-[0.7rem] text-charcoal/60">
            No human handoffs have been requested.
          </p>
        ) : (
          <ul className="space-y-2">
            {handoffs.map((handoff) => (
              <li
                key={handoff.id}
                className="rounded-xl border border-charcoal/10 bg-white p-3"
              >
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <p className="text-[0.72rem] font-semibold text-charcoal">
                    {reasonLabel(handoff.reason)}
                  </p>
                  <StatusPill status={handoff.status} />
                </div>
                <p className="mt-1.5 text-[0.7rem] leading-5 text-charcoal/70">
                  {handoff.summary}
                </p>
                {handoff.resolution_notes && (
                  <p className="mt-1.5 rounded-lg bg-forest/5 px-2 py-1.5 text-[0.68rem] leading-5 text-forest-deep">
                    Resolution: {handoff.resolution_notes}
                  </p>
                )}
                <time
                  dateTime={handoff.created_at}
                  className="mt-1.5 block text-[0.6rem] text-charcoal/50"
                >
                  Raised {formatDateTime(handoff.created_at)}
                </time>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section aria-labelledby="drawer-assignments-heading">
        <div id="drawer-assignments-heading">
          <SectionHeading
            icon={Clock}
            title="Assignment history"
            count={assignments.length}
          />
        </div>
        {assignments.length === 0 ? (
          <p className="rounded-xl border border-dashed border-charcoal/15 bg-white/60 px-3 py-3 text-[0.7rem] text-charcoal/60">
            No assignment history is available.
          </p>
        ) : (
          <ol className="space-y-2">
            {assignments.map((assignment) => (
              <li
                key={assignment.id}
                className="flex items-start gap-2.5 rounded-xl border border-charcoal/10 bg-white p-3"
              >
                <span className="mt-0.5 grid size-7 shrink-0 place-items-center rounded-full bg-forest/10 text-[0.56rem] font-bold text-forest">
                  {assignment.executive_id === executiveId ? "You" : "SE"}
                </span>
                <div className="min-w-0 flex-1">
                  <p className="text-[0.72rem] font-semibold text-charcoal">
                    {assignment.executive_id === executiveId
                      ? "Assigned to you"
                      : "Assigned to a sales executive"}
                    {assignment.is_active && (
                      <span className="ml-2 rounded-full bg-forest/10 px-1.5 py-0.5 text-[0.56rem] font-semibold text-forest">
                        Current
                      </span>
                    )}
                  </p>
                  <p className="mt-0.5 text-[0.62rem] text-charcoal/55">
                    From {formatDateTime(assignment.assigned_at)}
                    {assignment.unassigned_at
                      ? ` · Until ${formatDateTime(assignment.unassigned_at)}`
                      : ""}
                  </p>
                </div>
              </li>
            ))}
          </ol>
        )}
      </section>
    </div>
  );
}

export function LeadDetailDrawer({
  lead,
  open,
  initialSection,
  onClose,
}: LeadDetailDrawerProps) {
  const { user } = useSalesUser();
  const queryClient = useQueryClient();
  const shouldReduceMotion = useReducedMotion();
  const panelRef = useRef<HTMLDivElement>(null);
  const closeButtonRef = useRef<HTMLButtonElement>(null);
  const historyRef = useRef<HTMLDivElement>(null);
  const restoreFocusRef = useRef<HTMLElement | null>(null);

  const [nextStatus, setNextStatus] = useState<LeadStatus | "">("");
  const [feedback, setFeedback] = useState<Feedback>(null);

  const leadId = lead?.id ?? null;

  const detailQuery = useQuery({
    queryKey: ["sales", "leads", leadId, "detail"],
    queryFn: () => fetchLeadDetail(leadId as string),
    enabled: open && Boolean(leadId),
    placeholderData: lead ?? undefined,
  });

  const historyQuery = useQuery({
    queryKey: ["sales", "leads", leadId, "history"],
    queryFn: () => fetchLeadEnquiryHistory(leadId as string),
    enabled: open && Boolean(leadId),
  });

  const statusMutation = useMutation({
    mutationFn: (status: LeadStatus) =>
      updateLeadStatus(leadId as string, status),
    onSuccess: (updated) => {
      queryClient.setQueryData(
        ["sales", "leads", leadId, "detail"],
        updated,
      );
      queryClient.invalidateQueries({ queryKey: ["sales", "leads"] });
      queryClient.invalidateQueries({ queryKey: ["sales", "dashboard"] });
      setNextStatus("");
      setFeedback({
        tone: "success",
        message: `Status updated to ${titleCaseStatus(updated.status)}.`,
      });
    },
    onError: (error) => {
      setFeedback({
        tone: "error",
        message:
          error instanceof Error
            ? error.message
            : "Keylo could not update this lead's status.",
      });
    },
  });

  useEffect(() => {
    setNextStatus("");
    setFeedback(null);
  }, [leadId]);

  useEffect(() => {
    if (!feedback) return;
    if (feedback.tone !== "success") return;
    const timer = window.setTimeout(() => setFeedback(null), 5000);
    return () => window.clearTimeout(timer);
  }, [feedback]);

  useEffect(() => {
    if (!open) return;

    restoreFocusRef.current =
      document.activeElement instanceof HTMLElement
        ? document.activeElement
        : null;

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    const focusTimer = window.setTimeout(() => {
      closeButtonRef.current?.focus();
    }, shouldReduceMotion ? 0 : 60);

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        event.preventDefault();
        onClose();
        return;
      }

      if (event.key !== "Tab" || !panelRef.current) return;

      const focusable = Array.from(
        panelRef.current.querySelectorAll<HTMLElement>(focusableSelector),
      ).filter((element) => element.offsetParent !== null);
      if (focusable.length === 0) return;

      const first = focusable[0];
      const last = focusable[focusable.length - 1];

      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    }

    document.addEventListener("keydown", handleKeyDown);

    return () => {
      window.clearTimeout(focusTimer);
      document.body.style.overflow = previousOverflow;
      document.removeEventListener("keydown", handleKeyDown);
      restoreFocusRef.current?.focus();
    };
  }, [open, onClose, shouldReduceMotion]);

  useEffect(() => {
    if (
      !open ||
      initialSection !== "history" ||
      !historyQuery.isSuccess ||
      !historyRef.current
    ) {
      return;
    }

    const timer = window.setTimeout(() => {
      historyRef.current?.scrollIntoView({
        block: "start",
        behavior: shouldReduceMotion ? "auto" : "smooth",
      });
    }, 80);

    return () => window.clearTimeout(timer);
  }, [open, initialSection, historyQuery.isSuccess, shouldReduceMotion]);

  const detail = detailQuery.data ?? lead;
  const project = lead?.project ?? null;
  const displayPriority = detail
    ? deriveLeadPriority(detail.status)
    : ("MEDIUM" as const);
  const allowedTransitions = detail
    ? STATUS_TRANSITIONS[detail.status]
    : [];
  const canUpdate = allowedTransitions.length > 0;
  const consentBlocked = detail ? !detail.consent_to_contact : false;

  return (
    <AnimatePresence>
      {open && lead && (
        <>
          <motion.div
            key="lead-drawer-backdrop"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: shouldReduceMotion ? 0 : 0.18 }}
            onClick={onClose}
            aria-hidden="true"
            className="fixed inset-0 z-40 bg-charcoal/45 backdrop-blur-xs"
          />
          <motion.div
            key="lead-drawer-panel"
            ref={panelRef}
            role="dialog"
            aria-modal="true"
            aria-labelledby="lead-drawer-heading"
            initial={shouldReduceMotion ? false : { x: "100%" }}
            animate={{ x: 0 }}
            exit={{ x: "100%" }}
            transition={{
              type: "spring",
              bounce: 0,
              duration: shouldReduceMotion ? 0 : 0.3,
            }}
            className="fixed inset-y-0 right-0 z-50 flex w-full flex-col border-l border-charcoal/15 bg-ivory shadow-2xl sm:max-w-[34rem] xl:max-w-[40rem]"
          >
            <header className="shrink-0 border-b border-charcoal/10 bg-white px-4 pt-4 pb-3 sm:px-5">
              <div className="flex items-start justify-between gap-3">
                <div className="flex min-w-0 items-start gap-3">
                  <span
                    aria-hidden="true"
                    className="grid size-11 shrink-0 place-items-center rounded-xl border border-charcoal/10 bg-sand/20 font-display text-sm font-bold text-charcoal"
                  >
                    {initialsOf(detail?.full_name ?? lead.full_name)}
                  </span>
                  <div className="min-w-0">
                    <p className="text-[0.6rem] font-semibold tracking-[0.2em] text-forest uppercase">
                      Lead record
                    </p>
                    <h2
                      id="lead-drawer-heading"
                      className="truncate font-display text-xl leading-tight text-charcoal sm:text-2xl"
                    >
                      {detail?.full_name ?? lead.full_name}
                    </h2>
                    <p className="mt-1 flex items-center gap-1 truncate text-[0.68rem] text-charcoal/60">
                      <MapPin
                        aria-hidden="true"
                        className="size-3 shrink-0 text-forest"
                      />
                      {project?.name ?? "Project name unavailable"}
                      {project?.location ? ` · ${project.location}` : ""}
                    </p>
                  </div>
                </div>
                <button
                  ref={closeButtonRef}
                  type="button"
                  onClick={onClose}
                  aria-label="Close lead details"
                  className="grid size-9 shrink-0 place-items-center rounded-lg border border-charcoal/10 bg-white text-charcoal/65 transition-colors hover:border-charcoal/25 hover:text-charcoal"
                >
                  <X aria-hidden="true" className="size-4" />
                </button>
              </div>

              <div className="mt-3 flex flex-wrap items-center gap-1.5">
                {detail && <StatusPill status={detail.status} />}
                {detail && (
                  <span
                    title={priorityExplanation(displayPriority)}
                    className={`inline-flex items-center gap-1.5 rounded-full border px-2 py-0.5 text-[0.58rem] font-semibold ${PRIORITY_TONES[displayPriority]}`}
                  >
                    <span
                      aria-hidden="true"
                      className="size-1.5 rounded-full bg-current opacity-70"
                    />
                    {PRIORITY_LABELS[displayPriority]} priority
                  </span>
                )}
                <span
                  className={`inline-flex items-center rounded-full border px-2 py-0.5 text-[0.58rem] font-semibold ${SOURCE_TONES[lead.source]}`}
                >
                  {sourceLabel(lead.source)}
                </span>
                <span className="inline-flex items-center gap-1 rounded-full border border-charcoal/10 bg-ivory px-2 py-0.5 text-[0.58rem] font-medium text-charcoal/65">
                  <Clock aria-hidden="true" className="size-2.5" />
                  {formatRelativeTime(lead.lastInteraction)}
                </span>
              </div>

              <div className="mt-3 flex flex-wrap gap-2">
                {detail?.phone && (
                  <a
                    href={`tel:${detail.phone}`}
                    className="inline-flex min-h-9 items-center gap-1.5 rounded-lg border border-charcoal/15 bg-white px-3 text-[0.68rem] font-semibold text-charcoal transition-colors hover:border-forest/40 hover:text-forest"
                  >
                    <Phone aria-hidden="true" className="size-3.5 text-forest" />
                    Call buyer
                  </a>
                )}
                {detail?.email && (
                  <a
                    href={`mailto:${detail.email}`}
                    className="inline-flex min-h-9 items-center gap-1.5 rounded-lg border border-charcoal/15 bg-white px-3 text-[0.68rem] font-semibold text-charcoal transition-colors hover:border-forest/40 hover:text-forest"
                  >
                    <Mail aria-hidden="true" className="size-3.5 text-forest" />
                    Email buyer
                  </a>
                )}
                <button
                  type="button"
                  onClick={() =>
                    historyRef.current?.scrollIntoView({
                      block: "start",
                      behavior: shouldReduceMotion ? "auto" : "smooth",
                    })
                  }
                  className="inline-flex min-h-9 items-center gap-1.5 rounded-lg bg-forest px-3 text-[0.68rem] font-semibold text-ivory transition-colors hover:bg-forest-deep"
                >
                  <MessageSquare aria-hidden="true" className="size-3.5" />
                  Conversation history
                </button>
              </div>
            </header>

            <div className="flex-1 overflow-y-auto overscroll-contain px-4 py-4 sm:px-5">
              {detailQuery.isPending && !detail ? (
                <LoadingState label="Loading lead details" rows={4} />
              ) : detailQuery.isError && !detail ? (
                <ErrorState
                  message="Keylo could not load this lead record."
                  onRetry={() => detailQuery.refetch()}
                />
              ) : detail ? (
                <div className="space-y-5">
                  <section aria-labelledby="drawer-buyer-heading">
                    <div id="drawer-buyer-heading">
                      <SectionHeading
                        icon={UserRound}
                        title="Buyer information"
                        description="Complete contact and requirement record."
                      />
                    </div>
                    <dl className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                      <DetailItem label="Phone">
                        {detail.phone ? (
                          <a
                            href={`tel:${detail.phone}`}
                            className="inline-flex items-center gap-1.5 text-forest hover:text-forest-deep"
                          >
                            <Phone
                              aria-hidden="true"
                              className="size-3 shrink-0"
                            />
                            {detail.phone}
                          </a>
                        ) : (
                          <span className="text-charcoal/50">
                            Not provided
                          </span>
                        )}
                      </DetailItem>
                      <DetailItem label="Email">
                        {detail.email ? (
                          <a
                            href={`mailto:${detail.email}`}
                            className="inline-flex items-center gap-1.5 break-all text-forest hover:text-forest-deep"
                          >
                            <Mail
                              aria-hidden="true"
                              className="size-3 shrink-0"
                            />
                            {detail.email}
                          </a>
                        ) : (
                          <span className="text-charcoal/50">
                            Not provided
                          </span>
                        )}
                      </DetailItem>
                      <DetailItem label="Consent to contact">
                        <span
                          className={`inline-flex items-center gap-1.5 text-[0.72rem] font-semibold ${detail.consent_to_contact ? "text-forest" : "text-clay"}`}
                        >
                          {detail.consent_to_contact ? (
                            <CheckCircle2
                              aria-hidden="true"
                              className="size-3.5"
                            />
                          ) : (
                            <AlertTriangle
                              aria-hidden="true"
                              className="size-3.5"
                            />
                          )}
                          {detail.consent_to_contact
                            ? "Consented"
                            : "Not consented"}
                        </span>
                      </DetailItem>
                      <DetailItem label="Preferred configuration">
                        {detail.preferred_configuration || (
                          <span className="text-charcoal/50">
                            Not specified
                          </span>
                        )}
                      </DetailItem>
                      <DetailItem label="Budget">
                        <span className="inline-flex items-center gap-1.5">
                          <Wallet
                            aria-hidden="true"
                            className="size-3.5 shrink-0 text-forest"
                          />
                          {formatBudget(
                            detail.budget_min,
                            detail.budget_max,
                          )}
                        </span>
                      </DetailItem>
                      <DetailItem label="Source">
                        {sourceLabel(detail.source)}
                      </DetailItem>
                      <DetailItem label="Received">
                        <time dateTime={detail.created_at}>
                          {formatDateTime(detail.created_at)}
                        </time>
                      </DetailItem>
                      <DetailItem label="Assigned">
                        {detail.assigned_at ? (
                          <time dateTime={detail.assigned_at}>
                            {formatDateTime(detail.assigned_at)}
                          </time>
                        ) : (
                          <span className="text-charcoal/50">
                            Assignment time unavailable
                          </span>
                        )}
                      </DetailItem>
                      <DetailItem label="Last updated">
                        <time dateTime={detail.updated_at}>
                          {formatDateTime(detail.updated_at)}
                        </time>
                      </DetailItem>
                      <DetailItem label="Priority">
                        {PRIORITY_LABELS[displayPriority]}{" "}
                        <span className="block text-[0.64rem] font-normal leading-4 text-charcoal/55">
                          {priorityExplanation(displayPriority)}
                        </span>
                      </DetailItem>
                    </dl>
                  </section>

                  <section
                    aria-labelledby="drawer-status-heading"
                    className="rounded-xl border border-charcoal/10 bg-white p-3.5"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <p className="text-[0.58rem] font-semibold tracking-[0.16em] text-forest uppercase">
                          Pipeline
                        </p>
                        <h3
                          id="drawer-status-heading"
                          className="mt-0.5 font-display text-lg leading-tight text-charcoal"
                        >
                          Update status
                        </h3>
                      </div>
                      <StatusPill status={detail.status} />
                    </div>

                    {canUpdate ? (
                      <>
                        <div className="mt-3 grid grid-cols-1 gap-2 sm:grid-cols-[minmax(0,1fr)_auto]">
                          <div>
                            <label
                              htmlFor="lead-next-status"
                              className="mb-1.5 block text-[0.6rem] font-semibold tracking-[0.14em] text-charcoal/60 uppercase"
                            >
                              Next step
                            </label>
                            <select
                              id="lead-next-status"
                              value={nextStatus}
                              onChange={(event) =>
                                setNextStatus(
                                  event.target.value as LeadStatus | "",
                                )
                              }
                              disabled={statusMutation.isPending}
                              className="min-h-10 w-full rounded-lg border border-charcoal/15 bg-white px-3 text-xs font-medium text-charcoal outline-none transition-colors focus:border-forest focus:ring-2 focus:ring-forest/15 disabled:opacity-60"
                            >
                              <option value="">Select next status</option>
                              {allowedTransitions.map((status) => {
                                const requiresConsent =
                                  CONTACT_REQUIRING_STATUSES.includes(status);
                                const blocked =
                                  requiresConsent && consentBlocked;
                                return (
                                  <option
                                    key={status}
                                    value={status}
                                    disabled={blocked}
                                  >
                                    {titleCaseStatus(status)}
                                    {blocked ? " — consent required" : ""}
                                  </option>
                                );
                              })}
                            </select>
                          </div>
                          <div className="flex items-end">
                            <button
                              type="button"
                              onClick={() => {
                                if (!nextStatus) return;
                                setFeedback(null);
                                statusMutation.mutate(nextStatus);
                              }}
                              disabled={
                                !nextStatus || statusMutation.isPending
                              }
                              className="inline-flex min-h-10 w-full items-center justify-center gap-1.5 rounded-lg bg-forest px-4 text-[0.7rem] font-semibold text-ivory transition-colors hover:bg-forest-deep disabled:cursor-not-allowed disabled:opacity-50 sm:w-auto"
                            >
                              {statusMutation.isPending ? (
                                <>
                                  <span
                                    aria-hidden="true"
                                    className="size-3.5 animate-spin rounded-full border-2 border-ivory/40 border-t-ivory motion-reduce:animate-none"
                                  />
                                  Updating
                                </>
                              ) : (
                                <>
                                  <ArrowDown
                                    aria-hidden="true"
                                    className="size-3.5"
                                  />
                                  Update status
                                </>
                              )}
                            </button>
                          </div>
                        </div>
                        <p className="mt-2 text-[0.64rem] leading-4 text-charcoal/55">
                          Only valid next steps from the current stage are
                          shown.
                          {consentBlocked
                            ? " Contact statuses stay locked until the buyer consents to contact."
                            : ""}
                        </p>
                      </>
                    ) : (
                      <p className="mt-3 rounded-lg border border-dashed border-charcoal/15 bg-ivory px-3 py-2 text-[0.7rem] text-charcoal/65">
                        This lead is in a final stage. No further status
                        changes are available.
                      </p>
                    )}

                    {feedback && (
                      <div
                        role={feedback.tone === "error" ? "alert" : "status"}
                        aria-live="polite"
                        className={`mt-3 flex items-start gap-2 rounded-lg border px-3 py-2 text-[0.7rem] leading-4 ${
                          feedback.tone === "success"
                            ? "border-forest/25 bg-forest/10 text-forest-deep"
                            : "border-clay/25 bg-clay-soft text-clay"
                        }`}
                      >
                        {feedback.tone === "success" ? (
                          <CheckCircle2
                            aria-hidden="true"
                            className="mt-0.5 size-3.5 shrink-0"
                          />
                        ) : (
                          <AlertTriangle
                            aria-hidden="true"
                            className="mt-0.5 size-3.5 shrink-0"
                          />
                        )}
                        <span>{feedback.message}</span>
                      </div>
                    )}
                  </section>

                  <div ref={historyRef} className="scroll-mt-4">
                    <SectionHeading
                      icon={Clock}
                      title="Enquiry history"
                      description="Real conversations, visits, handoffs and assignment changes."
                    />
                    {historyQuery.isPending ? (
                      <div className="rounded-xl border border-charcoal/10 bg-white">
                        <LoadingState
                          label="Loading enquiry history"
                          rows={3}
                        />
                      </div>
                    ) : historyQuery.isError ? (
                      <div className="rounded-xl border border-charcoal/10 bg-white">
                        <ErrorState
                          message="Enquiry history could not be loaded."
                          onRetry={() => historyQuery.refetch()}
                        />
                      </div>
                    ) : historyQuery.data ? (
                      <HistoryPanel
                        history={historyQuery.data}
                        executiveId={user.id}
                      />
                    ) : null}
                  </div>

                  <p className="pb-2 text-center text-[0.6rem] text-charcoal/45">
                    Lead ID {lead.id.slice(0, 8)} ·{" "}
                    {LEAD_SOURCES.includes(lead.source)
                      ? sourceLabel(lead.source)
                      : lead.source}
                    {" · "}
                    {LEAD_STATUSES.includes(lead.status)
                      ? titleCaseStatus(lead.status)
                      : lead.status}
                  </p>
                </div>
              ) : null}
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
