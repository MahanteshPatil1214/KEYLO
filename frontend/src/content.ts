import {
  CalendarCheck,
  CalendarClock,
  Clock3,
  Inbox,
  MessagesSquare,
  MessageSquareText,
  ShieldAlert,
  ShieldCheck,
  UserRoundCheck,
  UserRoundX,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";

export type Challenge = {
  title: string;
  description: string;
  icon: LucideIcon;
};

export type WorkflowStep = {
  number: string;
  title: string;
  description: string;
  outcome: string;
  icon: LucideIcon;
};

export type TeamBenefit = {
  id: string;
  label: string;
  headline: string;
  description: string;
  bullets: string[];
  imageCaption: string;
};

export const navLinks = [
  { label: "The gap", href: "#challenges" },
  { label: "Product", href: "#product" },
  { label: "How it works", href: "#how-it-works" },
  { label: "For teams", href: "#teams" },
];

export const challenges: Challenge[] = [
  {
    title: "A lead arrives. Then it waits.",
    description:
      "Enquiries land across portals, social ads, the website and a hoarding number. A shared inbox turns the first reply into a race against the buyer's attention.",
    icon: Clock3,
  },
  {
    title: "Answers from memory.",
    description:
      "Buyers ask detailed questions about configuration, amenities and location. Without one approved source, every executive answers a little differently.",
    icon: ShieldAlert,
  },
  {
    title: "Visits promised, not checked.",
    description:
      "A site visit is offered before availability is confirmed. The buyer arrives, the team is not ready, and the momentum is gone.",
    icon: CalendarClock,
  },
  {
    title: "Handoffs without context.",
    description:
      "The buyer's budget, preferred configuration and conversation history are scattered by the time a human picks up the phone.",
    icon: UserRoundX,
  },
];

export const workflowSteps: WorkflowStep[] = [
  {
    number: "01",
    title: "Capture",
    description:
      "Every enquiry lands in one desk, tagged with its source: property portal, social, website or hoarding.",
    outcome: "Buyer record created",
    icon: Inbox,
  },
  {
    number: "02",
    title: "Understand",
    description:
      "Keylo asks about budget, configuration and timeline, and keeps the answers inside the buyer's thread.",
    outcome: "Requirements captured",
    icon: MessagesSquare,
  },
  {
    number: "03",
    title: "Answer",
    description:
      "Replies are built only from the sales head's approved fact sheet. A missing fact becomes a human handoff, never a guess.",
    outcome: "Grounded reply sent",
    icon: ShieldCheck,
  },
  {
    number: "04",
    title: "Book & hand over",
    description:
      "Genuine availability creates a confirmed site visit. A serious buyer then reaches a named executive with the full context.",
    outcome: "Visit confirmed",
    icon: CalendarCheck,
  },
];

export const teamBenefits: TeamBenefit[] = [
  {
    id: "developers",
    label: "Developers",
    headline: "Every campaign earns a real conversation.",
    description:
      "Keylo turns demand from every channel into an answered, qualified enquiry, without asking your team to live inside another dashboard.",
    bullets: [
      "One desk for portal, website, social and hoarding enquiries.",
      "Replies built only from the sales head's approved project facts.",
      "A clear path from first enquiry to a confirmed site visit.",
    ],
    imageCaption: "The Grove / Enquiry desk",
  },
  {
    id: "sales-heads",
    label: "Sales heads",
    headline: "See the desk, not just the dashboard.",
    description:
      "Know which enquiries are answered, which visits are booked and where a buyer is waiting for a person, before the day gets away.",
    bullets: [
      "A live view of enquiries that still need attention.",
      "Approved answers and flagged handoffs in one thread.",
      "Site-visit availability your team can stand behind.",
    ],
    imageCaption: "The Grove / Visit calendar",
  },
  {
    id: "executives",
    label: "Sales executives",
    headline: "Start the call with the buyer's story.",
    description:
      "Every handoff arrives with budget, configuration, preferred time and the full conversation, so the first human call begins with context.",
    bullets: [
      "A named handoff, not a name in a spreadsheet.",
      "The original messages, always preserved.",
      "A confirmed visit already on the calendar.",
    ],
    imageCaption: "The Grove / Buyer thread",
  },
];

export const demoExpectations = [
  {
    title: "The enquiry desk",
    description: "A walkthrough of a buyer conversation from first reply to visit.",
    icon: MessageSquareText,
  },
  {
    title: "Your approved facts",
    description: "See how project information becomes the only source of an answer.",
    icon: ShieldCheck,
  },
  {
    title: "The human handoff",
    description: "Review how a named executive receives the buyer and their context.",
    icon: UserRoundCheck,
  },
];

export const footerColumns = [
  {
    title: "Product",
    links: [
      { label: "The gap", href: "#challenges" },
      { label: "Product preview", href: "#product" },
      { label: "How it works", href: "#how-it-works" },
    ],
  },
  {
    title: "For teams",
    links: [
      { label: "Developers", href: "#teams" },
      { label: "Sales heads", href: "#teams" },
      { label: "Sales executives", href: "#teams" },
    ],
  },
];

export const DEMO_EMAIL = "hello@keylo.dev";
export const DEMO_MAILTO = `mailto:${DEMO_EMAIL}?subject=Keylo%20walkthrough%20request`;
