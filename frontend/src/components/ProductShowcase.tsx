import {
  ArrowRight,
  CalendarCheck,
  CalendarDays,
  Check,
  ChevronDown,
  ChevronLeft,
  House,
  Inbox,
  Lock,
  Search,
  Send,
  ShieldCheck,
  UserRoundCheck,
} from "lucide-react";
import { Reveal } from "./Reveal";
import { SectionLabel } from "./SectionLabel";

const sidebarItems = [
  { label: "Enquiries", icon: Inbox, active: true, count: "6" },
  { label: "Projects", icon: House, active: false },
  { label: "Visits", icon: CalendarDays, active: false, count: "3" },
  { label: "Handoffs", icon: UserRoundCheck, active: false },
];

const enquiries = [
  {
    initials: "AM",
    name: "Aarav Mehta",
    project: "The Grove · 3 BHK",
    message: "Is the 3 BHK available this weekend?",
    time: "11:42 PM",
    status: "Visit offered",
    statusTone: "forest",
    active: true,
  },
  {
    initials: "PN",
    name: "Priya Nair",
    project: "The Grove · 2 BHK",
    message: "Can we visit on Sunday morning?",
    time: "10:18 PM",
    status: "Needs reply",
    statusTone: "sand",
    active: false,
  },
  {
    initials: "RD",
    name: "Rohan Desai",
    project: "Meridian House · 4 BHK",
    message: "What is the possession timeline?",
    time: "9:54 PM",
    status: "Answered",
    statusTone: "charcoal",
    active: false,
  },
  {
    initials: "MS",
    name: "Meera Shah",
    project: "The Grove · 3 BHK",
    message: "Could you share the floor plan?",
    time: "9:12 PM",
    status: "Human requested",
    statusTone: "sand",
    active: false,
  },
];

const statusClasses: Record<string, string> = {
  forest: "text-forest",
  sand: "text-[#7a5c33]",
  charcoal: "text-charcoal/65",
};

export function ProductShowcase() {
  return (
    <section
      id="product"
      className="on-dark bg-charcoal py-20 text-ivory sm:py-24 lg:py-32"
    >
      <div className="shell">
        <Reveal>
          <div className="grid grid-cols-1 gap-8 lg:grid-cols-12 lg:items-end">
            <div className="lg:col-span-6">
              <SectionLabel number="02" tone="light">
                The product
              </SectionLabel>
              <h2 className="mt-7 max-w-[12ch] font-display text-[clamp(2.8rem,4.8vw,4.6rem)] leading-[0.97] tracking-[-0.03em] text-balance">
                One calm desk for every enquiry.
              </h2>
            </div>
            <p className="max-w-[46ch] text-[0.94rem] leading-7 text-ivory/70 lg:col-span-5 lg:col-start-8">
              Answer, qualify, book and hand over without leaving the buyer's
              thread. The approved facts remain the source. The named executive
              remains the closer.
            </p>
          </div>
        </Reveal>

        <Reveal delay={0.12} className="mt-12 lg:mt-16">
          <p className="sr-only">
            Product preview: a Keylo enquiry desk showing a buyer conversation
            about a 3 BHK at The Grove. The assistant answers from approved
            facts, offers a Saturday site visit, and prepares a handoff to a
            named sales executive.
          </p>

          <div className="mx-auto max-w-[1180px]">
            <div
              aria-hidden="true"
              className="overflow-hidden rounded-[18px] border border-ivory/14 bg-[#2a342c] shadow-[0_40px_100px_-40px_rgba(0,0,0,0.7)]"
            >
              <div className="flex items-center gap-3 border-b border-ivory/10 bg-[#1b231e] px-4 py-3 sm:px-5">
                <div className="flex gap-1.5">
                  <span className="size-2 rounded-full bg-ivory/18" />
                  <span className="size-2 rounded-full bg-ivory/18" />
                  <span className="size-2 rounded-full bg-ivory/18" />
                </div>
                <div className="mx-auto hidden items-center gap-1.5 rounded-full bg-ivory/7 px-3 py-1 text-[0.58rem] text-ivory/65 sm:flex">
                  <Lock className="size-2.5" />
                  app.keylo.dev/enquiries
                </div>
                <span className="ml-auto rounded-full border border-sand/30 px-2.5 py-1 text-[0.5rem] font-semibold uppercase tracking-[0.16em] text-sand-light sm:ml-0">
                  Illustrative preview
                </span>
              </div>

              <div
                data-preview-grid
                className="grid md:min-h-[600px] md:grid-cols-[240px_minmax(0,1fr)] lg:grid-cols-[190px_250px_minmax(0,1fr)] xl:grid-cols-[200px_270px_minmax(0,1fr)_250px]"
              >
                <aside className="hidden flex-col border-r border-ivory/8 bg-[#28332b] p-4 lg:flex xl:p-5">
                  <div className="flex items-center gap-2">
                    <span className="grid size-7 place-items-center rounded-md bg-ivory text-[0.68rem] font-bold text-charcoal">
                      K
                    </span>
                    <span className="font-display text-lg text-ivory">
                      keylo
                    </span>
                  </div>

                  <div className="mt-6 rounded-lg border border-ivory/10 bg-ivory/5 p-2.5">
                    <p className="text-[0.47rem] font-semibold uppercase tracking-[0.16em] text-ivory/60">
                      Workspace
                    </p>
                    <div className="mt-1 flex items-center justify-between text-[0.68rem] text-ivory/80">
                      The Grove
                      <ChevronDown className="size-3 text-ivory/60" />
                    </div>
                  </div>

                  <nav className="mt-6">
                    <ul className="space-y-1">
                      {sidebarItems.map((sidebarItem) => {
                        const Icon = sidebarItem.icon;
                        return (
                          <li key={sidebarItem.label}>
                            <div
                              className={`flex items-center gap-2.5 rounded-md px-2.5 py-2 text-[0.65rem] ${
                                sidebarItem.active
                                  ? "bg-ivory/10 font-semibold text-ivory"
                                  : "text-ivory/70"
                              }`}
                            >
                              <Icon className="size-3.5" />
                              {sidebarItem.label}
                              {sidebarItem.count && (
                                <span className="ml-auto rounded-full bg-ivory/10 px-1.5 py-0.5 text-[0.45rem] text-ivory/85">
                                  {sidebarItem.count}
                                </span>
                              )}
                            </div>
                          </li>
                        );
                      })}
                    </ul>
                  </nav>

                  <div className="mt-auto border-t border-ivory/10 pt-4">
                    <p className="flex items-center gap-1.5 text-[0.55rem] text-sand-light">
                      <span className="size-1.5 rounded-full bg-sand" />
                      AI desk active
                    </p>
                    <div className="mt-4 flex items-center gap-2.5">
                      <span className="grid size-7 place-items-center rounded-full bg-sand text-[0.52rem] font-bold text-charcoal">
                        AS
                      </span>
                      <div>
                        <p className="text-[0.62rem] text-ivory/85">
                          Arjun Shah
                        </p>
                        <p className="text-[0.5rem] text-ivory/60">
                          Sales head
                        </p>
                      </div>
                    </div>
                  </div>
                </aside>

                <div className="hidden flex-col border-r border-charcoal/10 bg-[#f7f4ee] md:flex">
                  <div className="border-b border-charcoal/10 p-4">
                    <div className="flex items-center justify-between">
                      <h3 className="font-display text-xl tracking-[-0.02em] text-charcoal">
                        Enquiries
                      </h3>
                      <span className="rounded-full bg-forest/10 px-2 py-1 text-[0.48rem] font-semibold uppercase tracking-[0.1em] text-forest">
                        6 open
                      </span>
                    </div>
                    <div className="mt-3 flex h-8 items-center gap-2 rounded-full border border-charcoal/10 bg-white/45 px-3 text-[0.56rem] text-charcoal/65">
                      <Search className="size-3" />
                      Search enquiries
                    </div>
                  </div>

                  <div className="flex gap-4 border-b border-charcoal/10 px-4 py-2.5 text-[0.5rem] font-semibold uppercase tracking-[0.12em]">
                    <span className="border-b border-forest pb-1 text-forest">
                      All
                    </span>
                    <span className="text-charcoal/65">Needs reply</span>
                    <span className="text-charcoal/65">Handoff</span>
                  </div>

                  <ul className="flex-1 overflow-hidden">
                    {enquiries.map((enquiry) => (
                      <li
                        key={enquiry.name}
                        className={`border-b border-charcoal/8 p-3.5 ${
                          enquiry.active
                            ? "bg-[#faf8f3] shadow-[inset_2px_0_0_#536b59]"
                            : ""
                        }`}
                      >
                        <div className="flex gap-2.5">
                          <span
                            className={`grid size-8 shrink-0 place-items-center rounded-full text-[0.52rem] font-bold ${
                              enquiry.active
                                ? "bg-forest text-ivory"
                                : "bg-ivory-deep text-charcoal/70"
                            }`}
                          >
                            {enquiry.initials}
                          </span>
                          <div className="min-w-0 flex-1">
                            <div className="flex items-baseline justify-between gap-2">
                              <p className="truncate text-[0.68rem] font-semibold text-charcoal">
                                {enquiry.name}
                              </p>
                              <span className="shrink-0 text-[0.47rem] text-charcoal/65">
                                {enquiry.time}
                              </span>
                            </div>
                            <p className="mt-0.5 truncate text-[0.53rem] text-charcoal/65">
                              {enquiry.project}
                            </p>
                            <p className="mt-1 truncate text-[0.57rem] text-charcoal/70">
                              {enquiry.message}
                            </p>
                            <p
                              className={`mt-1 flex items-center gap-1 text-[0.49rem] ${statusClasses[enquiry.statusTone]}`}
                            >
                              <span className="size-1 rounded-full bg-current" />
                              {enquiry.status}
                            </p>
                          </div>
                        </div>
                      </li>
                    ))}
                  </ul>
                </div>

                <div className="flex min-h-[580px] flex-col bg-[#faf8f3] text-charcoal md:min-h-0">
                  <div className="flex items-center gap-3 border-b border-charcoal/10 px-4 py-3.5 sm:px-5">
                    <ChevronLeft className="size-4 text-charcoal/65 md:hidden" />
                    <span className="grid size-8 shrink-0 place-items-center rounded-full bg-forest text-[0.55rem] font-bold text-ivory">
                      AM
                    </span>
                    <div className="min-w-0">
                      <p className="text-[0.72rem] font-semibold text-charcoal">
                        Aarav Mehta
                      </p>
                      <p className="truncate text-[0.53rem] text-charcoal/65">
                        The Grove · 3 BHK · Property portal
                      </p>
                    </div>
                    <span className="ml-auto hidden items-center gap-1.5 rounded-full border border-forest/20 bg-forest/5 px-2.5 py-1 text-[0.5rem] font-semibold text-forest sm:flex">
                      <span className="size-1.5 rounded-full bg-forest" />
                      AI handling
                    </span>
                  </div>

                  <div
                    data-preview-messages
                    className="flex-1 space-y-4 overflow-hidden px-4 py-4 sm:px-5 sm:py-5"
                  >
                    <p className="text-center text-[0.48rem] font-medium uppercase tracking-[0.16em] text-charcoal/65">
                      Today
                    </p>

                    <div className="max-w-[84%]">
                      <div className="rounded-2xl rounded-bl-sm bg-[#ece7dc] px-3.5 py-2.5 text-[0.67rem] leading-5 text-charcoal/80">
                        Hi, is the 3 BHK still available? We would like to visit
                        this weekend.
                      </div>
                      <p className="mt-1 text-[0.47rem] text-charcoal/65">
                        11:39 PM
                      </p>
                    </div>

                    <div className="ml-auto max-w-[88%]">
                      <div className="mb-1.5 flex items-center justify-end gap-1.5 text-[0.47rem] font-medium uppercase tracking-[0.12em] text-forest">
                        <ShieldCheck className="size-2.5" />
                        Approved facts · configurations
                      </div>
                      <div className="rounded-2xl rounded-br-sm bg-forest-deep px-3.5 py-2.5 text-[0.67rem] leading-5 text-ivory">
                        Hello Aarav, yes. The 3 BHK is part of the current
                        release. I can check Saturday's site-visit slots. May I
                        confirm your budget range first?
                      </div>
                      <p className="mt-1 text-right text-[0.47rem] text-charcoal/65">
                        11:40 PM
                      </p>
                    </div>

                    <div className="max-w-[84%]">
                      <div className="rounded-2xl rounded-bl-sm bg-[#ece7dc] px-3.5 py-2.5 text-[0.67rem] leading-5 text-charcoal/80">
                        Around ₹1.4 Cr. Saturday morning works for us.
                      </div>
                      <p className="mt-1 text-[0.47rem] text-charcoal/65">
                        11:41 PM
                      </p>
                    </div>

                    <div className="ml-auto max-w-[88%]">
                      <div className="rounded-2xl rounded-br-sm bg-forest-deep px-3.5 py-2.5 text-[0.67rem] leading-5 text-ivory">
                        There is a slot at 11:00 AM this Saturday at The Grove
                        sales gallery. I can hold it for you.
                        <div className="mt-3 rounded-xl border border-ivory/18 bg-ivory/8 p-3">
                          <p className="flex items-center gap-1.5 text-[0.47rem] font-semibold uppercase tracking-[0.13em] text-ivory">
                            <CalendarCheck className="size-3" />
                            Site visit
                          </p>
                          <p className="mt-1.5 font-display text-base leading-tight text-ivory">
                            Saturday, 14 Nov · 11:00 AM
                          </p>
                          <p className="mt-1 text-[0.53rem] text-ivory/85">
                            The Grove sales gallery
                          </p>
                          <span className="mt-2 inline-flex rounded-full bg-sand px-2 py-1 text-[0.45rem] font-bold uppercase tracking-[0.1em] text-charcoal">
                            Confirmed
                          </span>
                        </div>
                      </div>
                      <p className="mt-1 text-right text-[0.47rem] text-charcoal/65">
                        11:42 PM
                      </p>
                    </div>
                  </div>

                  <div className="border-t border-charcoal/10 p-3 sm:p-4">
                    <div className="flex items-center gap-2 rounded-full border border-charcoal/12 bg-white/60 px-4 py-2.5">
                      <span className="truncate text-[0.6rem] text-charcoal/65">
                        Message Aarav…
                      </span>
                      <span className="ml-auto grid size-7 place-items-center rounded-full bg-forest text-ivory">
                        <Send className="size-3" />
                      </span>
                    </div>
                    <p className="mt-2 text-center text-[0.47rem] text-charcoal/65">
                      Replies use approved facts only. A person can join at any
                      time.
                    </p>
                  </div>
                </div>

                <aside className="hidden flex-col border-l border-charcoal/10 bg-[#eee9df] p-4 xl:flex">
                  <div className="flex items-center justify-between">
                    <h3 className="text-[0.53rem] font-semibold uppercase tracking-[0.15em] text-charcoal/70">
                      Buyer context
                    </h3>
                    <span className="rounded-full bg-forest/10 px-2 py-1 text-[0.45rem] font-semibold uppercase tracking-[0.1em] text-forest-deep">
                      Synced
                    </span>
                  </div>

                  <dl className="mt-4 space-y-3">
                    <div>
                      <dt className="text-[0.47rem] uppercase tracking-[0.12em] text-charcoal/75">
                        Budget
                      </dt>
                      <dd className="mt-0.5 text-[0.68rem] font-semibold text-charcoal">
                        ₹1.2 – 1.5 Cr
                      </dd>
                    </div>
                    <div>
                      <dt className="text-[0.47rem] uppercase tracking-[0.12em] text-charcoal/75">
                        Configuration
                      </dt>
                      <dd className="mt-0.5 text-[0.68rem] font-semibold text-charcoal">
                        3 BHK
                      </dd>
                    </div>
                    <div>
                      <dt className="text-[0.47rem] uppercase tracking-[0.12em] text-charcoal/75">
                        Preferred time
                      </dt>
                      <dd className="mt-0.5 text-[0.68rem] font-semibold text-charcoal">
                        Saturday morning
                      </dd>
                    </div>
                    <div>
                      <dt className="text-[0.47rem] uppercase tracking-[0.12em] text-charcoal/75">
                        Source
                      </dt>
                      <dd className="mt-0.5 text-[0.68rem] font-semibold text-charcoal">
                        Property portal
                      </dd>
                    </div>
                  </dl>

                  <div className="my-4 h-px bg-charcoal/10" />

                  <div>
                    <p className="text-[0.53rem] font-semibold uppercase tracking-[0.15em] text-charcoal/70">
                      Handoff
                    </p>
                    <p className="mt-2 text-[0.59rem] leading-5 text-charcoal/70">
                      Budget and visit confirmed. Ready for a named executive.
                    </p>
                    <div className="mt-3 flex items-center justify-between rounded-lg bg-forest px-3 py-2 text-[0.57rem] font-semibold text-ivory">
                      Assign to sales
                      <ArrowRight className="size-3" />
                    </div>
                  </div>

                  <div className="mt-auto pt-5">
                    <p className="text-[0.47rem] font-semibold uppercase tracking-[0.14em] text-charcoal/75">
                      Approved facts used
                    </p>
                    <ul className="mt-2 space-y-1.5">
                      {[
                        "Location & connectivity",
                        "Configurations & area",
                        "Visit slot availability",
                      ].map((fact) => (
                        <li
                          key={fact}
                          className="flex items-center gap-1.5 text-[0.55rem] text-charcoal/70"
                        >
                          <Check className="size-2.5 text-forest" />
                          {fact}
                        </li>
                      ))}
                    </ul>
                  </div>
                </aside>
              </div>
            </div>

            <div className="mt-5 flex flex-col gap-2 text-[0.65rem] text-ivory/60 sm:flex-row sm:items-center sm:justify-between">
              <p>
                Illustrative interface. Buyer details and project names are
                sample data.
              </p>
              <p className="flex items-center gap-1.5">
                <ShieldCheck className="size-3 text-sand" />
                Answers are limited to approved project facts.
              </p>
            </div>
          </div>
        </Reveal>
      </div>
    </section>
  );
}
