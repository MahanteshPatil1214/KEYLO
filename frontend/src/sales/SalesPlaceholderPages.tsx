import {
  CalendarDays,
  ListChecks,
} from "lucide-react";
import { SalesModulePlaceholder } from "./SalesModulePlaceholder";

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
