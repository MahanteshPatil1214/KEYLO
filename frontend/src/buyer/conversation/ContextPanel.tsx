import { useState } from "react";
import {
  Building2,
  MapPin,
  FileText,
  ShieldCheck,
  Calendar,
  Clock,
  UserCheck,
  CalendarCheck,
  ChevronDown,
  ChevronUp,
  X,
  ExternalLink,
  CheckCircle2,
} from "lucide-react";
import { Link } from "react-router-dom";
import type {
  Project,
  ProjectFact,
  BuyerBooking,
  Handoff,
  BuyerProfile,
} from "../api";

type ContextPanelProps = {
  project: Project | null;
  facts: ProjectFact[];
  activeBooking: BuyerBooking | null;
  activeHandoff: Handoff | null;
  buyer: BuyerProfile;
  onOpenBookVisit: () => void;
  onOpenRequestHandoff: () => void;
  isMobileDrawer?: boolean;
  onCloseMobileDrawer?: () => void;
};

export function ContextPanel({
  project,
  facts,
  activeBooking,
  activeHandoff,
  buyer,
  onOpenBookVisit,
  onOpenRequestHandoff,
  isMobileDrawer,
  onCloseMobileDrawer,
}: ContextPanelProps) {
  const [factsExpanded, setFactsExpanded] = useState(true);

  const formatDateTime = (dateStr: string) => {
    try {
      const d = new Date(dateStr);
      return {
        date: d.toLocaleDateString("en-US", {
          weekday: "short",
          month: "short",
          day: "numeric",
        }),
        time: d.toLocaleTimeString("en-US", {
          hour: "numeric",
          minute: "2-digit",
        }),
      };
    } catch {
      return { date: dateStr, time: "" };
    }
  };

  return (
    <div className="flex h-full flex-col overflow-y-auto bg-white p-4 space-y-6">
      {/* Mobile Drawer Header */}
      {isMobileDrawer && (
        <div className="flex items-center justify-between border-b border-charcoal/10 pb-3">
          <div className="flex items-center gap-2">
            <Building2 className="size-4 text-forest" />
            <h3 className="font-serif text-base font-medium text-charcoal">
              Project Context & Actions
            </h3>
          </div>
          <button
            type="button"
            onClick={onCloseMobileDrawer}
            className="rounded-lg p-1 text-charcoal/60 hover:bg-charcoal/5"
          >
            <X className="size-5" />
          </button>
        </div>
      )}

      {/* 1. Project Information */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <span className="eyebrow">Project Context</span>
          {project?.status && (
            <span className="rounded-full bg-forest/10 px-2.5 py-0.5 text-[0.68rem] font-semibold uppercase text-forest">
              {project.status}
            </span>
          )}
        </div>

        {project ? (
          <div className="rounded-2xl border border-charcoal/10 bg-ivory/40 p-4 space-y-2.5">
            <div className="flex items-start justify-between">
              <h3 className="font-serif text-lg font-normal text-charcoal">
                {project.name}
              </h3>
              <ShieldCheck className="size-4 text-forest shrink-0" />
            </div>

            <div className="flex items-center gap-1.5 text-xs text-charcoal/70">
              <MapPin className="size-3.5 text-forest shrink-0" />
              <span className="truncate">{project.location}</span>
            </div>

            {project.rera_number && (
              <div className="flex items-center gap-1.5 text-[0.72rem] text-charcoal/65">
                <FileText className="size-3 text-sand shrink-0" />
                <span>RERA: <strong className="font-mono text-charcoal">{project.rera_number}</strong></span>
              </div>
            )}

            <p className="text-[0.75rem] text-charcoal/75 leading-relaxed line-clamp-3">
              {project.description ||
                "A signature residential enclave designed with contemporary architecture and certified regulatory disclosures."}
            </p>

            <Link
              to="/buyer/project"
              className="inline-flex items-center gap-1 text-[0.72rem] font-semibold text-forest hover:text-forest-deep pt-1"
            >
              <span>Full Specifications</span>
              <ExternalLink className="size-3" />
            </Link>
          </div>
        ) : (
          <div className="rounded-xl border border-dashed border-charcoal/15 p-4 text-center text-xs text-charcoal/60">
            No project linked to conversation
          </div>
        )}
      </div>

      {/* 2. Upcoming Site Visit Status */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <span className="eyebrow">Site Visit Status</span>
          {activeBooking && (
            <span className="rounded-full bg-sand/20 px-2 py-0.5 text-[0.65rem] font-semibold text-charcoal">
              {activeBooking.status}
            </span>
          )}
        </div>

        {activeBooking ? (
          <div className="rounded-2xl border border-charcoal/10 bg-ivory/40 p-4 space-y-2">
            <div className="flex items-center gap-2">
              <CalendarCheck className="size-4 text-forest" />
              <span className="font-serif text-sm font-medium text-charcoal">
                {formatDateTime(activeBooking.slot_start_time).date}
              </span>
            </div>

            <div className="flex items-center gap-1.5 text-xs text-forest font-semibold">
              <Clock className="size-3.5" />
              <span>
                {formatDateTime(activeBooking.slot_start_time).time} –{" "}
                {formatDateTime(activeBooking.slot_end_time).time}
              </span>
            </div>

            {activeBooking.notes && (
              <p className="text-[0.7rem] text-charcoal/65 italic pt-1 border-t border-charcoal/10">
                Note: “{activeBooking.notes}”
              </p>
            )}

            <Link
              to="/buyer/visits"
              className="mt-2 block text-center rounded-xl border border-charcoal/15 bg-white py-1.5 text-xs font-semibold text-charcoal hover:bg-ivory"
            >
              View Tour Details
            </Link>
          </div>
        ) : (
          <div className="rounded-2xl border border-dashed border-charcoal/20 bg-ivory/20 p-4 space-y-2.5 text-center">
            <Calendar className="mx-auto size-6 text-charcoal/40" />
            <p className="text-xs font-medium text-charcoal/80">
              No upcoming visit scheduled
            </p>
            <p className="text-[0.7rem] text-charcoal/50">
              Book a guided walk-through of the model apartment with our advisory team.
            </p>
            <button
              type="button"
              onClick={onOpenBookVisit}
              className="inline-flex w-full items-center justify-center gap-1.5 rounded-xl bg-forest py-2 text-xs font-semibold text-ivory hover:bg-forest-deep shadow-xs"
            >
              <Calendar className="size-3.5" />
              <span>Book Site Visit</span>
            </button>
          </div>
        )}
      </div>

      {/* 3. Human Handoff Status */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <span className="eyebrow">Sales Advisory</span>
          {activeHandoff && (
            <span className="rounded-full bg-forest/10 px-2 py-0.5 text-[0.65rem] font-semibold text-forest uppercase">
              {activeHandoff.status}
            </span>
          )}
        </div>

        {activeHandoff ? (
          <div className="rounded-2xl border border-sand/40 bg-sand/10 p-4 space-y-2">
            <div className="flex items-center gap-2">
              <UserCheck className="size-4 text-forest" />
              <span className="font-serif text-sm font-medium text-charcoal">
                {activeHandoff.executive_name
                  ? `Assigned: ${activeHandoff.executive_name}`
                  : "Sales Executive Requested"}
              </span>
            </div>

            <p className="text-[0.72rem] text-charcoal/70 leading-relaxed">
              {activeHandoff.executive_name
                ? `Your inquiry is actively handled by ${activeHandoff.executive_name}. They will reach out to you directly.`
                : "A sales consultant has been notified and is reviewing your conversation context."}
            </p>

            <span className="block text-[0.65rem] text-charcoal/50">
              Requested: {formatDateTime(activeHandoff.created_at).date}
            </span>
          </div>
        ) : (
          <div className="rounded-2xl border border-charcoal/10 bg-ivory/40 p-4 space-y-2.5">
            <div className="flex items-center gap-2">
              <span className="size-2 rounded-full bg-forest animate-pulse" />
              <span className="text-xs font-semibold text-charcoal">
                AI Advisory Active
              </span>
            </div>
            <p className="text-[0.72rem] text-charcoal/70 leading-relaxed">
              All responses are fact-checked against approved developer disclosures. You can escalate to a human representative at any time.
            </p>
            <button
              type="button"
              onClick={onOpenRequestHandoff}
              className="inline-flex w-full items-center justify-center gap-1.5 rounded-xl border border-charcoal/20 bg-white py-2 text-xs font-semibold text-charcoal hover:bg-charcoal/5 hover:border-forest"
            >
              <UserCheck className="size-3.5 text-forest" />
              <span>Request Sales Executive</span>
            </button>
          </div>
        )}
      </div>

      {/* 4. Approved Facts Quick Accordion */}
      <div className="space-y-3">
        <button
          type="button"
          onClick={() => setFactsExpanded(!factsExpanded)}
          className="flex w-full items-center justify-between"
        >
          <span className="eyebrow">Approved Facts ({facts.length})</span>
          {factsExpanded ? (
            <ChevronUp className="size-3.5 text-charcoal/50" />
          ) : (
            <ChevronDown className="size-3.5 text-charcoal/50" />
          )}
        </button>

        {factsExpanded && (
          <div className="space-y-2">
            {facts.slice(0, 4).map((f) => (
              <div
                key={f.id}
                className="rounded-xl border border-charcoal/10 bg-white p-3 text-left space-y-1"
              >
                <div className="flex items-center gap-1.5 text-[0.68rem] font-semibold text-forest uppercase tracking-wider">
                  <CheckCircle2 className="size-3" />
                  <span>{f.category}</span>
                </div>
                <div className="text-xs font-medium text-charcoal">
                  {f.question}
                </div>
                <p className="text-[0.7rem] text-charcoal/70 line-clamp-2">
                  {f.answer}
                </p>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* 5. Buyer Account Info */}
      <div className="border-t border-charcoal/10 pt-4 space-y-2">
        <div className="flex items-center justify-between text-xs">
          <span className="text-charcoal/60">Verified Buyer:</span>
          <span className="font-semibold text-charcoal">{buyer.full_name}</span>
        </div>
        <div className="flex items-center justify-between text-xs">
          <span className="text-charcoal/60">Email:</span>
          <span className="font-mono text-[0.7rem] text-charcoal/80 truncate max-w-[160px]">
            {buyer.email}
          </span>
        </div>
        {buyer.phone && (
          <div className="flex items-center justify-between text-xs">
            <span className="text-charcoal/60">Phone:</span>
            <span className="font-mono text-[0.7rem] text-charcoal/80">
              {buyer.phone}
            </span>
          </div>
        )}
      </div>
    </div>
  );
}
