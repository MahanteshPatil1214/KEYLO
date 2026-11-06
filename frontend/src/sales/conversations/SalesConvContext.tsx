import {
  X,
  Phone,
  Mail,
  Calendar,
  Tag,
  Building,
  IndianRupee,
  UserCheck,
  CheckCircle,
  Bot,
  ClipboardList,
} from "lucide-react";
import type { SalesConversation, SalesHandoff, SalesLead, SalesProject } from "../api";

interface SalesConvContextProps {
  conversation: SalesConversation;
  lead: SalesLead | undefined;
  project: SalesProject | undefined;
  handoff: SalesHandoff | undefined;
  onClose: () => void;
}

function InfoRow({
  icon: Icon,
  label,
  value,
}: {
  icon: typeof Phone;
  label: string;
  value: React.ReactNode;
}) {
  return (
    <div className="flex items-start gap-2.5 py-2.5">
      <Icon aria-hidden="true" className="mt-0.5 size-3.5 shrink-0 text-charcoal/40" />
      <div className="min-w-0 flex-1">
        <p className="text-[0.6rem] font-semibold uppercase tracking-widest text-charcoal/40">
          {label}
        </p>
        <p className="mt-0.5 text-xs text-charcoal">{value}</p>
      </div>
    </div>
  );
}

function Section({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <div className="border-b border-charcoal/8 px-4 py-3">
      <p className="mb-1 text-[0.6rem] font-semibold uppercase tracking-[0.18em] text-charcoal/40">
        {title}
      </p>
      {children}
    </div>
  );
}

function formatBudget(min: number | null, max: number | null): string {
  if (!min && !max) return "Not specified";
  const fmt = (n: number) => {
    if (n >= 10000000) return `₹${(n / 10000000).toFixed(1)}Cr`;
    if (n >= 100000) return `₹${(n / 100000).toFixed(0)}L`;
    return `₹${n.toLocaleString("en-IN")}`;
  };
  if (min && max) return `${fmt(min)} – ${fmt(max)}`;
  if (min) return `From ${fmt(min)}`;
  return `Up to ${fmt(max!)}`;
}

function statusChip(status: string) {
  const styles: Record<string, string> = {
    NEW: "bg-blue-50 text-blue-700",
    CONTACTED: "bg-amber-50 text-amber-700",
    QUALIFIED: "bg-purple-50 text-purple-700",
    NOT_INTERESTED: "bg-red-50 text-red-700",
    VISIT_BOOKED: "bg-green-50 text-green-700",
    VISITED: "bg-teal-50 text-teal-700",
    CONVERTED: "bg-forest/10 text-forest",
    LOST: "bg-charcoal/5 text-charcoal/50",
  };
  return (
    <span
      className={`rounded-full px-2.5 py-0.5 text-[0.65rem] font-semibold ${
        styles[status] ?? "bg-charcoal/5 text-charcoal/50"
      }`}
    >
      {status.replace(/_/g, " ")}
    </span>
  );
}

const HANDOFF_STATUS_LABEL: Record<string, string> = {
  PENDING: "Pending",
  ASSIGNED: "Assigned",
  IN_PROGRESS: "In Progress",
  RESOLVED: "Resolved",
  CANCELLED: "Cancelled",
};

export function SalesConvContext({
  conversation,
  lead,
  project,
  handoff,
  onClose,
}: SalesConvContextProps) {
  const startedAt = new Date(conversation.created_at).toLocaleDateString("en-IN", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });

  return (
    <div className="flex h-full flex-col overflow-hidden bg-white">
      {/* Header */}
      <div className="flex shrink-0 items-center justify-between border-b border-charcoal/8 px-4 py-3">
        <div>
          <p className="text-[0.6rem] font-semibold tracking-[0.18em] text-charcoal/40 uppercase">
            Buyer context
          </p>
          <h3 className="mt-0.5 font-serif text-sm font-normal text-charcoal">
            {lead?.full_name ?? "Unknown buyer"}
          </h3>
        </div>
        <button
          type="button"
          onClick={onClose}
          aria-label="Close context panel"
          className="rounded-lg p-1.5 text-charcoal/40 transition-colors hover:bg-charcoal/5 hover:text-charcoal"
        >
          <X aria-hidden="true" className="size-5" />
        </button>
      </div>

      {/* Scrollable body */}
      <div className="flex-1 overflow-y-auto">
        {/* Buyer section */}
        <Section title="Buyer">
          <div className="divide-y divide-charcoal/5">
            {lead?.phone && (
              <InfoRow icon={Phone} label="Phone" value={lead.phone} />
            )}
            {lead?.email && (
              <InfoRow icon={Mail} label="Email" value={lead.email} />
            )}
            {lead?.status && (
              <div className="flex items-center gap-2.5 py-2.5">
                <Tag
                  aria-hidden="true"
                  className="mt-0.5 size-3.5 shrink-0 text-charcoal/40"
                />
                <div>
                  <p className="text-[0.6rem] font-semibold uppercase tracking-widest text-charcoal/40">
                    Lead status
                  </p>
                  <div className="mt-0.5">{statusChip(lead.status)}</div>
                </div>
              </div>
            )}
            {(lead?.budget_min || lead?.budget_max) && (
              <InfoRow
                icon={IndianRupee}
                label="Budget"
                value={formatBudget(lead.budget_min, lead.budget_max)}
              />
            )}
            {lead?.preferred_configuration && (
              <InfoRow
                icon={ClipboardList}
                label="Configuration"
                value={lead.preferred_configuration}
              />
            )}
            {lead?.source && (
              <InfoRow
                icon={Tag}
                label="Lead source"
                value={lead.source.replace(/_/g, " ")}
              />
            )}
          </div>
        </Section>

        {/* Project section */}
        <Section title="Project">
          <div className="divide-y divide-charcoal/5">
            <InfoRow icon={Building} label="Name" value={project?.name ?? "—"} />
            {project?.location && (
              <InfoRow icon={Building} label="Location" value={project.location} />
            )}
            {project?.rera_number && (
              <InfoRow icon={ClipboardList} label="RERA" value={project.rera_number} />
            )}
            {project?.status && (
              <InfoRow
                icon={Tag}
                label="Status"
                value={project.status}
              />
            )}
          </div>
        </Section>

        {/* Conversation section */}
        <Section title="Conversation">
          <div className="divide-y divide-charcoal/5">
            <InfoRow icon={Calendar} label="Started" value={startedAt} />
            <div className="flex items-center gap-2.5 py-2.5">
              <Bot aria-hidden="true" className="mt-0.5 size-3.5 shrink-0 text-charcoal/40" />
              <div>
                <p className="text-[0.6rem] font-semibold uppercase tracking-widest text-charcoal/40">
                  Status
                </p>
                <div className="mt-0.5">
                  <span
                    className={[
                      "rounded-full px-2.5 py-0.5 text-[0.65rem] font-semibold",
                      conversation.status === "ACTIVE"
                        ? "bg-green-50 text-green-700"
                        : "bg-charcoal/5 text-charcoal/50",
                    ].join(" ")}
                  >
                    {conversation.status}
                  </span>
                </div>
              </div>
            </div>
          </div>
        </Section>

        {/* Handoff section */}
        {handoff && (
          <Section title="Human Handoff">
            <div className="divide-y divide-charcoal/5">
              <div className="flex items-center gap-2.5 py-2.5">
                <UserCheck
                  aria-hidden="true"
                  className="mt-0.5 size-3.5 shrink-0 text-charcoal/40"
                />
                <div>
                  <p className="text-[0.6rem] font-semibold uppercase tracking-widest text-charcoal/40">
                    Status
                  </p>
                  <div className="mt-0.5">
                    <span
                      className={[
                        "rounded-full px-2.5 py-0.5 text-[0.65rem] font-semibold",
                        handoff.status === "PENDING"
                          ? "bg-amber-50 text-amber-700"
                          : handoff.status === "IN_PROGRESS"
                            ? "bg-blue-50 text-blue-700"
                            : handoff.status === "RESOLVED"
                              ? "bg-green-50 text-green-700"
                              : "bg-forest/10 text-forest",
                      ].join(" ")}
                    >
                      {HANDOFF_STATUS_LABEL[handoff.status] ?? handoff.status}
                    </span>
                  </div>
                </div>
              </div>
              {handoff.reason && (
                <InfoRow icon={ClipboardList} label="Reason" value={handoff.reason} />
              )}
              {handoff.summary && (
                <div className="py-2.5">
                  <p className="mb-1 text-[0.6rem] font-semibold uppercase tracking-widest text-charcoal/40">
                    AI Summary
                  </p>
                  <p className="text-xs leading-relaxed text-charcoal/70">
                    {handoff.summary}
                  </p>
                </div>
              )}
              {handoff.resolution_notes && (
                <div className="py-2.5">
                  <p className="mb-1 text-[0.6rem] font-semibold uppercase tracking-widest text-charcoal/40">
                    Resolution Notes
                  </p>
                  <p className="text-xs leading-relaxed text-charcoal/70">
                    {handoff.resolution_notes}
                  </p>
                </div>
              )}
              {handoff.assigned_at && (
                <InfoRow
                  icon={CheckCircle}
                  label="Assigned at"
                  value={new Date(handoff.assigned_at).toLocaleString("en-IN")}
                />
              )}
              {handoff.resolved_at && (
                <InfoRow
                  icon={CheckCircle}
                  label="Resolved at"
                  value={new Date(handoff.resolved_at).toLocaleString("en-IN")}
                />
              )}
            </div>
          </Section>
        )}
      </div>
    </div>
  );
}

