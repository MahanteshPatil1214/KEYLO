import { Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import {
  MessageSquare,
  Calendar,
  Building2,
  ArrowRight,
  ShieldCheck,
  MapPin,
  CheckCircle2,
  CalendarCheck,
  FileText,
  UserCheck,
} from "lucide-react";
import { useBuyerUser } from "./BuyerAuthGuard";
import {
  fetchBuyerConversations,
  fetchBuyerBookings,
  fetchBuyerProjects,
  fetchBuyerNotifications,
  type Project,
  type BuyerBooking,
  type BuyerConversation,
} from "./api";

export function BuyerDashboardPage() {
  const { user } = useBuyerUser();

  // Queries for real backend data
  const {
    data: convData,
    isLoading: convLoading,
  } = useQuery({
    queryKey: ["buyer", "conversations"],
    queryFn: () => fetchBuyerConversations(1, 10),
  });

  const {
    data: bookingsData,
    isLoading: bookingsLoading,
  } = useQuery({
    queryKey: ["buyer", "bookings"],
    queryFn: () => fetchBuyerBookings(1, 10),
  });

  const {
    data: projectsData,
    isLoading: projectsLoading,
  } = useQuery({
    queryKey: ["buyer", "projects"],
    queryFn: () => fetchBuyerProjects(1, 10),
  });

  const {
    data: notificationsData,
    isLoading: notifLoading,
  } = useQuery({
    queryKey: ["buyer", "notifications"],
    queryFn: () => fetchBuyerNotifications(1, 10),
  });

  const firstName = user.full_name.trim().split(/\s+/)[0] || "Valued Buyer";

  // Determine active conversation
  const conversations: BuyerConversation[] = convData?.items || [];
  const activeConversation =
    conversations.find((c) => c.status === "ACTIVE") || conversations[0] || null;

  // Determine upcoming bookings
  const bookings: BuyerBooking[] = bookingsData?.items || [];
  const upcomingBooking =
    bookings
      .filter((b) => b.status === "CONFIRMED" || b.status === "PENDING")
      .sort(
        (a, b) =>
          new Date(a.slot_start_time).getTime() -
          new Date(b.slot_start_time).getTime()
      )[0] || null;

  // Determine associated project
  const projects: Project[] = projectsData?.items || [];
  const associatedProjectId =
    activeConversation?.project_id ||
    upcomingBooking?.project_id ||
    projects[0]?.id;

  const currentProject =
    projects.find((p) => p.id === associatedProjectId) || projects[0] || null;

  // Format date helper
  const formatDateTime = (dateStr: string) => {
    try {
      const d = new Date(dateStr);
      return {
        date: d.toLocaleDateString("en-US", {
          weekday: "short",
          month: "short",
          day: "numeric",
          year: "numeric",
        }),
        time: d.toLocaleTimeString("en-US", {
          hour: "numeric",
          minute: "2-digit",
          hour12: true,
        }),
      };
    } catch {
      return { date: dateStr, time: "" };
    }
  };

  return (
    <div className="space-y-8">
      {/* =====================================================================
          1. PERSONALIZED WELCOME BANNER
          ===================================================================== */}
      <section
        aria-label="Welcome section"
        className="relative overflow-hidden rounded-2xl border border-charcoal/10 bg-ivory-deep/60 p-6 sm:p-8 lg:p-10 shadow-xs"
      >
        <div className="relative z-10 flex flex-col justify-between gap-6 md:flex-row md:items-end">
          <div className="max-w-2xl space-y-3">
            <div className="flex flex-wrap items-center gap-2.5">
              <span className="inline-flex items-center gap-1.5 rounded-full bg-forest/10 px-3 py-1 text-xs font-semibold text-forest">
                <ShieldCheck className="size-3.5 text-forest" />
                Verified Buyer Account
              </span>
              {currentProject && (
                <span className="inline-flex items-center gap-1 rounded-full border border-sand/40 bg-sand/15 px-3 py-1 text-xs font-medium text-charcoal/80">
                  <Building2 className="size-3 text-sand" />
                  {currentProject.name}
                </span>
              )}
            </div>

            <h1 className="font-serif text-3xl font-normal tracking-tight text-charcoal sm:text-4xl lg:text-5xl">
              Welcome back, {firstName}
            </h1>

            <p className="text-sm sm:text-base text-charcoal/75 leading-relaxed">
              Your real estate concierge dashboard is synchronized with your active
              inquiries, verified developer disclosures, and scheduled property viewings.
            </p>
          </div>

          <div className="flex shrink-0 flex-col gap-2 text-left md:text-right">
            <div className="text-xs text-charcoal/50 uppercase tracking-widest font-semibold">
              Member Since
            </div>
            <div className="font-serif text-base text-charcoal">
              {new Date(user.created_at).toLocaleDateString("en-US", {
                month: "long",
                year: "numeric",
              })}
            </div>
          </div>
        </div>

        {/* Subtle decorative watermark */}
        <div
          aria-hidden="true"
          className="pointer-events-none absolute -bottom-10 -right-6 select-none opacity-5"
        >
          <Building2 className="size-64 text-charcoal" />
        </div>
      </section>

      {/* =====================================================================
          2. ASSOCIATED PROPERTY PROJECT
          ===================================================================== */}
      <section aria-labelledby="project-heading" className="space-y-3">
        <div className="flex items-center justify-between">
          <div>
            <span className="eyebrow">Enquiry Context</span>
            <h2 id="project-heading" className="font-serif text-2xl font-normal text-charcoal">
              Selected Property Project
            </h2>
          </div>
          <Link
            to="/buyer/project"
            className="group inline-flex items-center gap-1.5 text-xs font-semibold text-forest hover:text-forest-deep"
          >
            <span>View Approved Facts</span>
            <ArrowRight className="size-3.5 transition-transform group-hover:translate-x-0.5" />
          </Link>
        </div>

        {projectsLoading ? (
          <div className="rounded-2xl border border-charcoal/10 bg-white p-8 text-center text-sm text-charcoal/60">
            Retrieving project details...
          </div>
        ) : currentProject ? (
          <div className="rounded-2xl border border-charcoal/10 bg-white p-6 sm:p-8 shadow-xs transition-shadow duration-200 hover:shadow-sm">
            <div className="flex flex-col justify-between gap-6 lg:flex-row lg:items-start">
              <div className="space-y-3 max-w-2xl">
                <div className="flex flex-wrap items-center gap-2">
                  <h3 className="font-serif text-2xl font-normal text-charcoal">
                    {currentProject.name}
                  </h3>
                  <span className="rounded-full bg-forest/10 px-2.5 py-0.5 text-[0.7rem] font-semibold tracking-wide text-forest uppercase">
                    {currentProject.status}
                  </span>
                </div>

                <div className="flex flex-wrap items-center gap-4 text-xs text-charcoal/70">
                  <div className="flex items-center gap-1.5">
                    <MapPin className="size-3.5 text-forest" />
                    <span>{currentProject.location}</span>
                  </div>
                  {currentProject.rera_number && (
                    <div className="flex items-center gap-1.5 border-l border-charcoal/15 pl-4">
                      <FileText className="size-3.5 text-sand" />
                      <span>RERA: <span className="font-mono font-medium text-charcoal">{currentProject.rera_number}</span></span>
                    </div>
                  )}
                </div>

                <p className="text-sm text-charcoal/80 leading-relaxed">
                  {currentProject.description ||
                    "Premium residential enclave offering thoughtfully designed residences with world-class amenities and certified regulatory compliance."}
                </p>
              </div>

              <div className="flex shrink-0 flex-col sm:flex-row lg:flex-col gap-3">
                <Link
                  to="/buyer/project"
                  className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl border border-charcoal/15 bg-ivory px-5 text-xs font-semibold text-charcoal transition-colors hover:border-forest hover:text-forest"
                >
                  <Building2 className="size-3.5" />
                  <span>Project Fact Sheet</span>
                </Link>
                {activeConversation && (
                  <Link
                    to="/buyer/conversations"
                    className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl bg-forest px-5 text-xs font-semibold text-ivory transition-colors hover:bg-forest-deep"
                  >
                    <MessageSquare className="size-3.5" />
                    <span>Inquire About Project</span>
                  </Link>
                )}
              </div>
            </div>
          </div>
        ) : (
          <div className="rounded-2xl border border-charcoal/10 bg-white p-8 text-center text-sm text-charcoal/60">
            No active project currently linked. Check back shortly as your enquiry is routed.
          </div>
        )}
      </section>

      {/* =====================================================================
          3. TWO-COLUMN STATUS & ACTIONS:
             - Enquiry / Conversation Status
             - Upcoming Site Visit Information
          ===================================================================== */}
      <section aria-label="Status overview" className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        {/* ENQUIRY / CONVERSATION STATUS CARD */}
        <div className="flex flex-col justify-between rounded-2xl border border-charcoal/10 bg-white p-6 sm:p-7 shadow-xs">
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <span className="eyebrow">Dialogue Thread</span>
              {activeConversation ? (
                <span className="inline-flex items-center gap-1.5 rounded-full bg-forest/10 px-2.5 py-1 text-xs font-semibold text-forest">
                  <span className="size-2 rounded-full bg-forest animate-pulse" />
                  {activeConversation.status}
                </span>
              ) : (
                <span className="rounded-full bg-charcoal/5 px-2.5 py-1 text-xs font-medium text-charcoal/60">
                  Ready to Start
                </span>
              )}
            </div>

            <h3 className="font-serif text-xl font-normal text-charcoal">
              Enquiry & Advisory Status
            </h3>

            {convLoading ? (
              <p className="text-xs text-charcoal/60">Checking conversation records...</p>
            ) : activeConversation ? (
              <div className="space-y-3 rounded-xl border border-charcoal/10 bg-ivory/50 p-4">
                <div className="flex items-center justify-between text-xs">
                  <span className="text-charcoal/60">Conversation ID:</span>
                  <span className="font-mono text-[0.7rem] text-charcoal/80">
                    {activeConversation.id.slice(0, 8)}...
                  </span>
                </div>
                <div className="flex items-center justify-between text-xs">
                  <span className="text-charcoal/60">Last Updated:</span>
                  <span className="text-charcoal font-medium">
                    {formatDateTime(activeConversation.updated_at).date}
                  </span>
                </div>
                <div className="flex items-center justify-between text-xs">
                  <span className="text-charcoal/60">Advisory Channel:</span>
                  <span className="font-semibold text-forest">
                    Keylo AI & Sales Concierge
                  </span>
                </div>
              </div>
            ) : (
              <div className="rounded-xl border border-dashed border-charcoal/20 bg-ivory/30 p-5 text-center">
                <MessageSquare className="mx-auto size-7 text-charcoal/40" />
                <p className="mt-2 text-xs font-medium text-charcoal/70">
                  No active conversation started yet.
                </p>
                <p className="mt-1 text-[0.75rem] text-charcoal/50">
                  Connect with our advisory system to get answers on pricing, floor plans, and amenities.
                </p>
              </div>
            )}
          </div>

          <div className="mt-6 pt-4 border-t border-charcoal/10">
            <Link
              to="/buyer/conversations"
              className="inline-flex min-h-11 w-full items-center justify-center gap-2 rounded-xl bg-forest px-5 text-xs font-semibold text-ivory shadow-xs transition-colors duration-200 hover:bg-forest-deep"
            >
              <MessageSquare className="size-4" />
              <span>Continue Conversation</span>
              <ArrowRight className="size-3.5" />
            </Link>
          </div>
        </div>

        {/* UPCOMING SITE VISIT INFORMATION CARD */}
        <div className="flex flex-col justify-between rounded-2xl border border-charcoal/10 bg-white p-6 sm:p-7 shadow-xs">
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <span className="eyebrow">Property Tour</span>
              {upcomingBooking ? (
                <span className="inline-flex items-center gap-1.5 rounded-full bg-sand/20 px-2.5 py-1 text-xs font-semibold text-charcoal">
                  <CalendarCheck className="size-3 text-sand" />
                  {upcomingBooking.status}
                </span>
              ) : (
                <span className="rounded-full bg-charcoal/5 px-2.5 py-1 text-xs font-medium text-charcoal/60">
                  None Scheduled
                </span>
              )}
            </div>

            <h3 className="font-serif text-xl font-normal text-charcoal">
              Upcoming Site Visit
            </h3>

            {bookingsLoading ? (
              <p className="text-xs text-charcoal/60">Checking scheduled visits...</p>
            ) : upcomingBooking ? (
              <div className="space-y-3 rounded-xl border border-charcoal/10 bg-ivory/50 p-4">
                <div className="flex items-start justify-between">
                  <div>
                    <div className="text-xs text-charcoal/60">Scheduled Date:</div>
                    <div className="font-serif text-base font-medium text-charcoal">
                      {formatDateTime(upcomingBooking.slot_start_time).date}
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="text-xs text-charcoal/60">Time Window:</div>
                    <div className="text-xs font-semibold text-forest">
                      {formatDateTime(upcomingBooking.slot_start_time).time} –{" "}
                      {formatDateTime(upcomingBooking.slot_end_time).time}
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-2 border-t border-charcoal/10 pt-2.5 text-xs text-charcoal/70">
                  <MapPin className="size-3.5 shrink-0 text-forest" />
                  <span className="truncate">
                    {currentProject?.location || "On-site Experience Center"}
                  </span>
                </div>

                {upcomingBooking.notes && (
                  <p className="border-t border-charcoal/10 pt-2 text-[0.75rem] text-charcoal/65 italic">
                    Note: “{upcomingBooking.notes}”
                  </p>
                )}
              </div>
            ) : (
              <div className="rounded-xl border border-dashed border-charcoal/20 bg-ivory/30 p-5 text-center">
                <Calendar className="mx-auto size-7 text-charcoal/40" />
                <p className="mt-2 text-xs font-medium text-charcoal/70">
                  No upcoming site visit scheduled.
                </p>
                <p className="mt-1 text-[0.75rem] text-charcoal/50">
                  Experience the project first-hand with a guided site visit arranged by our team.
                </p>
              </div>
            )}
          </div>

          <div className="mt-6 pt-4 border-t border-charcoal/10">
            <Link
              to="/buyer/visits"
              className="inline-flex min-h-11 w-full items-center justify-center gap-2 rounded-xl border border-charcoal/15 bg-ivory px-5 text-xs font-semibold text-charcoal transition-colors duration-200 hover:border-forest hover:text-forest"
            >
              <Calendar className="size-4" />
              <span>{upcomingBooking ? "View Visit Schedule & Details" : "Explore Site Visits"}</span>
              <ArrowRight className="size-3.5" />
            </Link>
          </div>
        </div>
      </section>

      {/* =====================================================================
          4. RECENT ACTIVITY FEED
          ===================================================================== */}
      <section aria-labelledby="activity-heading" className="space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <span className="eyebrow">Timeline</span>
            <h2 id="activity-heading" className="font-serif text-2xl font-normal text-charcoal">
              Recent Activity
            </h2>
          </div>
          <span className="text-xs text-charcoal/50">
            Live updates from your property concierge
          </span>
        </div>

        <div className="rounded-2xl border border-charcoal/10 bg-white p-6 shadow-xs">
          {notifLoading ? (
            <div className="py-8 text-center text-xs text-charcoal/60">
              Loading recent activity...
            </div>
          ) : notificationsData?.items && notificationsData.items.length > 0 ? (
            <div className="divide-y divide-charcoal/5">
              {notificationsData.items.slice(0, 5).map((item) => (
                <div key={item.id} className="flex items-start gap-4 py-4 first:pt-0 last:pb-0">
                  <div className="grid size-9 shrink-0 place-items-center rounded-xl bg-ivory text-forest border border-charcoal/10">
                    <CheckCircle2 className="size-4.5" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <h4 className="text-xs font-semibold text-charcoal">
                        {item.title}
                      </h4>
                      <span className="text-[0.68rem] text-charcoal/45">
                        {new Date(item.created_at).toLocaleDateString("en-US", {
                          month: "short",
                          day: "numeric",
                          hour: "numeric",
                          minute: "2-digit",
                        })}
                      </span>
                    </div>
                    <p className="mt-1 text-xs text-charcoal/70 leading-relaxed">
                      {item.message}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="py-8 text-center">
              <CheckCircle2 className="mx-auto size-8 text-charcoal/30" />
              <p className="mt-2 text-xs font-medium text-charcoal/70">
                All caught up. No recent alerts or reminder events.
              </p>
              <p className="mt-1 text-[0.75rem] text-charcoal/50">
                You will receive in-app notifications when site visits are confirmed or new replies arrive.
              </p>
            </div>
          )}
        </div>
      </section>

      {/* =====================================================================
          5. CLEAR NAVIGATION QUICK-LINKS
          ===================================================================== */}
      <section aria-labelledby="quicknav-heading" className="space-y-4">
        <div>
          <span className="eyebrow">Quick Navigation</span>
          <h2 id="quicknav-heading" className="font-serif text-2xl font-normal text-charcoal">
            Portal Sections
          </h2>
        </div>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {/* Card 1: Conversations */}
          <Link
            to="/buyer/conversations"
            className="group flex flex-col justify-between rounded-2xl border border-charcoal/10 bg-white p-5 shadow-xs transition-all duration-200 hover:-translate-y-0.5 hover:border-forest/40 hover:shadow-sm"
          >
            <div className="space-y-3">
              <div className="grid size-10 place-items-center rounded-xl bg-ivory text-forest border border-charcoal/10 group-hover:bg-forest group-hover:text-ivory transition-colors">
                <MessageSquare className="size-5" />
              </div>
              <h3 className="font-serif text-lg font-normal text-charcoal group-hover:text-forest transition-colors">
                My Conversations
              </h3>
              <p className="text-xs text-charcoal/65 leading-relaxed">
                Review your inquiry threads, exchanged messages, and concierge responses.
              </p>
            </div>
            <div className="mt-4 flex items-center gap-1 text-xs font-semibold text-forest">
              <span>View threads</span>
              <ArrowRight className="size-3.5 transition-transform group-hover:translate-x-1" />
            </div>
          </Link>

          {/* Card 2: Site Visits */}
          <Link
            to="/buyer/visits"
            className="group flex flex-col justify-between rounded-2xl border border-charcoal/10 bg-white p-5 shadow-xs transition-all duration-200 hover:-translate-y-0.5 hover:border-forest/40 hover:shadow-sm"
          >
            <div className="space-y-3">
              <div className="grid size-10 place-items-center rounded-xl bg-ivory text-forest border border-charcoal/10 group-hover:bg-forest group-hover:text-ivory transition-colors">
                <Calendar className="size-5" />
              </div>
              <h3 className="font-serif text-lg font-normal text-charcoal group-hover:text-forest transition-colors">
                My Site Visits
              </h3>
              <p className="text-xs text-charcoal/65 leading-relaxed">
                Manage confirmed tours, check scheduled timings, and review visit history.
              </p>
            </div>
            <div className="mt-4 flex items-center gap-1 text-xs font-semibold text-forest">
              <span>View bookings</span>
              <ArrowRight className="size-3.5 transition-transform group-hover:translate-x-1" />
            </div>
          </Link>

          {/* Card 3: Project Information */}
          <Link
            to="/buyer/project"
            className="group flex flex-col justify-between rounded-2xl border border-charcoal/10 bg-white p-5 shadow-xs transition-all duration-200 hover:-translate-y-0.5 hover:border-forest/40 hover:shadow-sm"
          >
            <div className="space-y-3">
              <div className="grid size-10 place-items-center rounded-xl bg-ivory text-forest border border-charcoal/10 group-hover:bg-forest group-hover:text-ivory transition-colors">
                <Building2 className="size-5" />
              </div>
              <h3 className="font-serif text-lg font-normal text-charcoal group-hover:text-forest transition-colors">
                Project Information
              </h3>
              <p className="text-xs text-charcoal/65 leading-relaxed">
                Inspect officially approved project facts, verified amenities, and RERA details.
              </p>
            </div>
            <div className="mt-4 flex items-center gap-1 text-xs font-semibold text-forest">
              <span>Explore details</span>
              <ArrowRight className="size-3.5 transition-transform group-hover:translate-x-1" />
            </div>
          </Link>

          {/* Card 4: My Profile */}
          <Link
            to="/buyer/profile"
            className="group flex flex-col justify-between rounded-2xl border border-charcoal/10 bg-white p-5 shadow-xs transition-all duration-200 hover:-translate-y-0.5 hover:border-forest/40 hover:shadow-sm"
          >
            <div className="space-y-3">
              <div className="grid size-10 place-items-center rounded-xl bg-ivory text-forest border border-charcoal/10 group-hover:bg-forest group-hover:text-ivory transition-colors">
                <UserCheck className="size-5" />
              </div>
              <h3 className="font-serif text-lg font-normal text-charcoal group-hover:text-forest transition-colors">
                My Profile
              </h3>
              <p className="text-xs text-charcoal/65 leading-relaxed">
                Review your registered contact information, account verification, and security.
              </p>
            </div>
            <div className="mt-4 flex items-center gap-1 text-xs font-semibold text-forest">
              <span>View account</span>
              <ArrowRight className="size-3.5 transition-transform group-hover:translate-x-1" />
            </div>
          </Link>
        </div>
      </section>
    </div>
  );
}
