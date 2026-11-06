import {
  CalendarDays,
  ListChecks,
  MessageSquare,
  Users,
} from "lucide-react";
import { SalesModulePlaceholder } from "./SalesModulePlaceholder";

export function SalesLeadsPage() {
  return (
    <SalesModulePlaceholder
      eyebrow="Pipeline"
      title="My leads"
      moduleName="Lead"
      description="The lead board will live here, scoped to the enquiries actively assigned to you."
      icon={Users}
    />
  );
}

export function SalesConversationsPage() {
  return (
    <SalesModulePlaceholder
      eyebrow="Buyer dialogue"
      title="Conversations"
      moduleName="Conversation"
      description="Buyer conversations and handoff context will be managed from this workspace in the next module."
      icon={MessageSquare}
    />
  );
}

export function SalesVisitsPage() {
  return (
    <SalesModulePlaceholder
      eyebrow="Site visits"
      title="Site visits"
      moduleName="Site visit"
      description="The visit calendar and booking workflow will be added after the dashboard release."
      icon={CalendarDays}
    />
  );
}

export function SalesFollowUpsPage() {
  return (
    <SalesModulePlaceholder
      eyebrow="Follow-ups"
      title="Follow-ups"
      moduleName="Follow-up"
      description="Contacted and qualified leads that need a follow-up will be worked from this queue in a later module."
      icon={ListChecks}
    />
  );
}
