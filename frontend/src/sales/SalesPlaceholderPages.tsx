import {
  ListChecks,
} from "lucide-react";
import { SalesModulePlaceholder } from "./SalesModulePlaceholder";

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
