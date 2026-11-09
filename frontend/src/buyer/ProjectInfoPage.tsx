import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useNavigate } from "react-router-dom";
import {
  MapPin,
  FileText,
  ShieldCheck,
  CheckCircle2,
  MessageSquare,
  ArrowRight,
} from "lucide-react";
import {
  fetchBuyerProjects,
  fetchProjectFacts,
  fetchBuyerConversations,
  startBuyerConversation,
  type Project,
  type ProjectFact,
} from "./api";
import { useBuyerUser } from "./BuyerAuthGuard";

export function ProjectInfoPage() {
  const { user } = useBuyerUser();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [selectedProjectId, setSelectedProjectId] = useState<string | null>(null);
  const [isStarting, setIsStarting] = useState(false);
  const [startError, setStartError] = useState<string | null>(null);

  // Fetch conversations to determine associated project context
  const { data: convData } = useQuery({
    queryKey: ["buyer", "conversations"],
    queryFn: () => fetchBuyerConversations(1, 10),
  });

  const handleStartConversation = async () => {
    if (!user || !activeProject) return;
    setIsStarting(true);
    setStartError(null);
    try {
      const conversation = await startBuyerConversation({
        project_id: activeProject.id,
        full_name: user.full_name,
        email: user.email || undefined,
        source: "WEBSITE",
        consent_to_contact: true,
        initial_message: "Hi, I'm interested in this project.",
      });
      // Refresh conversations so the new conversation appears in the list
      await queryClient.invalidateQueries({ queryKey: ["buyer", "conversations"] });
      navigate(`/buyer/conversations?conversation_id=${conversation.id}`);
    } catch (err: any) {
      setStartError(
        err.message || "Failed to start conversation. Please try again."
      );
    } finally {
      setIsStarting(false);
    }
  };

  // Fetch available projects
  const { data: projectsData, isLoading: projectsLoading } = useQuery({
    queryKey: ["buyer", "projects"],
    queryFn: () => fetchBuyerProjects(1, 20),
  });

  const projects: Project[] = projectsData?.items || [];
  const defaultProjectId =
    convData?.items?.[0]?.project_id || projects[0]?.id;

  const activeProject =
    projects.find((p) => p.id === (selectedProjectId || defaultProjectId)) || projects[0] || null;

  // Check if a conversation already exists for the active project
  const existingConversationForProject =
    convData?.items?.find((c) => c.project_id === activeProject?.id) || null;

  // Fetch facts for active project
  const { data: factsData, isLoading: factsLoading } = useQuery({
    queryKey: ["buyer", "projectFacts", activeProject?.id],
    queryFn: () => (activeProject ? fetchProjectFacts(activeProject.id, 1, 100) : null),
    enabled: Boolean(activeProject?.id),
  });

  const facts: ProjectFact[] = factsData?.items || [];

  // Group facts by category
  const categories: Record<string, ProjectFact[]> = {};
  facts.forEach((fact) => {
    const cat = fact.category || "GENERAL";
    if (!categories[cat]) categories[cat] = [];
    categories[cat].push(fact);
  });

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex flex-col gap-2">
        <span className="eyebrow">Verified Disclosures</span>
        <h1 className="font-serif text-3xl font-normal text-charcoal sm:text-4xl">
          Project Information
        </h1>
        <p className="text-sm text-charcoal/70">
          Official real estate disclosures, regulatory filings, and verified fact sheets.
        </p>
      </div>

      {/* Project Selector if multiple active projects exist */}
      {projects.length > 1 && (
        <div className="flex items-center gap-3 overflow-x-auto pb-2">
          {projects.map((p) => (
            <button
              key={p.id}
              type="button"
              onClick={() => setSelectedProjectId(p.id)}
              className={`shrink-0 rounded-full px-4 py-2 text-xs font-semibold transition-colors ${
                (activeProject?.id === p.id)
                  ? "bg-forest text-ivory shadow-xs"
                  : "bg-white border border-charcoal/10 text-charcoal/70 hover:border-forest/40"
              }`}
            >
              {p.name}
            </button>
          ))}
        </div>
      )}

      {/* Project Card */}
      {projectsLoading ? (
        <div className="rounded-2xl border border-charcoal/10 bg-white p-12 text-center text-sm text-charcoal/60">
          Loading project specifications...
        </div>
      ) : activeProject ? (
        <div className="space-y-8">
          <div className="rounded-2xl border border-charcoal/10 bg-white p-6 sm:p-8 shadow-xs">
            <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <h2 className="font-serif text-2xl font-normal text-charcoal sm:text-3xl">
                    {activeProject.name}
                  </h2>
                  <span className="rounded-full bg-forest/10 px-2.5 py-0.5 text-[0.68rem] font-semibold uppercase text-forest">
                    {activeProject.status}
                  </span>
                </div>

                <div className="flex flex-wrap items-center gap-4 text-xs text-charcoal/70">
                  <div className="flex items-center gap-1.5">
                    <MapPin className="size-3.5 text-forest" />
                    <span>{activeProject.location}</span>
                  </div>
                  {activeProject.rera_number && (
                    <div className="flex items-center gap-1.5 border-l border-charcoal/15 pl-4">
                      <FileText className="size-3.5 text-sand" />
                      <span>RERA: <span className="font-mono font-medium text-charcoal">{activeProject.rera_number}</span></span>
                    </div>
                  )}
                </div>
              </div>

              <div className="inline-flex items-center gap-1.5 rounded-full border border-sand/40 bg-sand/15 px-3 py-1 text-xs font-semibold text-charcoal">
                <ShieldCheck className="size-3.5 text-forest" />
                <span>Verified RERA Project</span>
              </div>
            </div>

            <p className="mt-4 text-sm text-charcoal/80 leading-relaxed border-t border-charcoal/10 pt-4">
              {activeProject.description ||
                "A distinguished luxury residential destination curated with architectural excellence, eco-conscious planning, and tailored buyer services."}
            </p>

            {/* Start Conversation CTA */}
            {existingConversationForProject ? (
              <button
                type="button"
                onClick={() =>
                  navigate(
                    `/buyer/conversations?conversation_id=${existingConversationForProject.id}`
                  )
                }
                className="mt-6 inline-flex w-full items-center justify-center gap-2 rounded-xl border border-charcoal/15 bg-ivory px-5 py-3 text-xs font-semibold text-charcoal transition-colors hover:border-forest hover:text-forest"
              >
                <MessageSquare className="size-3.5" />
                <span>Continue Conversation</span>
                <ArrowRight className="size-3.5" />
              </button>
            ) : (
              <button
                type="button"
                onClick={handleStartConversation}
                disabled={isStarting}
                className={`mt-6 inline-flex w-full items-center justify-center gap-2 rounded-xl bg-forest px-5 py-3 text-xs font-semibold text-ivory shadow-xs transition-colors duration-200 ${
                  isStarting
                    ? "bg-charcoal/40 cursor-not-allowed"
                    : "hover:bg-forest-deep"
                }`}
              >
                {isStarting ? (
                  <>
                    <svg
                      className="animate-spin size-4"
                      xmlns="http://www.w3.org/2000/svg"
                      fill="none"
                      viewBox="0 0 24 24"
                    >
                      <circle
                        className="opacity-25"
                        cx="12"
                        cy="12"
                        r="10"
                        stroke="currentColor"
                        strokeWidth="4"
                      ></circle>
                      <path
                        className="opacity-75"
                        fill="currentColor"
                        d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                      ></path>
                    </svg>
                    <span>Starting conversation...</span>
                  </>
                ) : (
                  <>
                    <MessageSquare className="size-3.5" />
                    <span>Chat with Keylo Concierge</span>
                  </>
                )}
              </button>
            )}

            {startError && (
              <div
                className="mt-4 p-3 rounded-lg border border-charcoal/20 bg-charcoal/5 text-[0.75rem] text-charcoal/80"
                role="alert"
              >
                {startError}
              </div>
            )}
          </div>

          {/* Approved Fact Sheet */}
          <div className="space-y-6">
            <div className="flex items-center justify-between">
              <div>
                <span className="eyebrow">Approved Facts</span>
                <h3 className="font-serif text-2xl font-normal text-charcoal">
                  Official Fact Sheet & Specifications
                </h3>
              </div>
              <span className="text-xs text-charcoal/50">
                {facts.length} verified item{facts.length === 1 ? "" : "s"}
              </span>
            </div>

            {factsLoading ? (
              <div className="rounded-2xl border border-charcoal/10 bg-white p-10 text-center text-sm text-charcoal/60">
                Loading approved facts...
              </div>
            ) : Object.keys(categories).length > 0 ? (
              <div className="space-y-6">
                {Object.entries(categories).map(([category, items]) => (
                  <div
                    key={category}
                    className="overflow-hidden rounded-2xl border border-charcoal/10 bg-white shadow-xs"
                  >
                    <div className="border-b border-charcoal/10 bg-ivory/50 px-6 py-3.5">
                      <h4 className="font-serif text-base font-medium tracking-tight text-charcoal">
                        {category}
                      </h4>
                    </div>

                    <div className="divide-y divide-charcoal/5">
                      {items.map((fact) => (
                        <div key={fact.id} className="p-6 transition-colors hover:bg-ivory/20">
                          <div className="flex items-start gap-3">
                            <span className="mt-0.5 grid size-5 shrink-0 place-items-center rounded-full bg-forest/10 text-forest">
                              <CheckCircle2 className="size-3.5" />
                            </span>
                            <div className="space-y-1.5">
                              <h5 className="text-sm font-semibold text-charcoal">
                                {fact.question}
                              </h5>
                              <p className="text-xs sm:text-sm text-charcoal/75 leading-relaxed whitespace-pre-line">
                                {fact.answer}
                              </p>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="rounded-2xl border border-dashed border-charcoal/20 bg-white p-10 text-center">
                <FileText className="mx-auto size-8 text-charcoal/30" />
                <h4 className="mt-2 font-serif text-base font-normal text-charcoal">
                  Fact sheet being updated
                </h4>
                <p className="mt-1 text-xs text-charcoal/60">
                  Approved regulatory disclosures for this development are currently being published by the admin team.
                </p>
              </div>
            )}
          </div>
        </div>
      ) : (
        <div className="rounded-2xl border border-dashed border-charcoal/20 bg-white p-12 text-center text-sm text-charcoal/60">
          No project records found.
        </div>
      )}
    </div>
  );
}
