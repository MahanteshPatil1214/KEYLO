import { Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import {
  MessageSquare,
  Clock,
  ArrowRight,
  Sparkles,
} from "lucide-react";
import { fetchBuyerConversations, fetchBuyerProjects } from "./api";

export function ConversationsPage() {
  const { data: convData, isLoading: convLoading } = useQuery({
    queryKey: ["buyer", "conversations"],
    queryFn: () => fetchBuyerConversations(1, 20),
  });

  const { data: projectsData } = useQuery({
    queryKey: ["buyer", "projects"],
    queryFn: () => fetchBuyerProjects(1, 20),
  });

  const conversations = convData?.items || [];
  const projects = projectsData?.items || [];

  const getProjectName = (projectId: string) => {
    const found = projects.find((p) => p.id === projectId);
    return found ? found.name : "Property Development";
  };

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex flex-col gap-2">
        <span className="eyebrow">Dialogue History</span>
        <h1 className="font-serif text-3xl font-normal text-charcoal sm:text-4xl">
          My Conversations
        </h1>
        <p className="text-sm text-charcoal/70">
          All your inquiry threads and communication records with the Keylo real estate concierge team.
        </p>
      </div>

      {/* Module 11 Preview Notice */}
      <div className="flex items-start gap-3 rounded-2xl border border-sand/40 bg-sand/10 p-5">
        <Sparkles className="size-5 shrink-0 text-sand mt-0.5" />
        <div className="text-xs text-charcoal/80 leading-relaxed">
          <strong className="font-semibold text-charcoal">Interactive AI Chat Integration:</strong>{" "}
          Full real-time streaming dialogue, fact-checked AI answers, and direct sales handoffs are being connected in Module 11. Your existing conversation threads and inquiry records are securely tracked below.
        </div>
      </div>

      {/* Conversations List */}
      <div className="space-y-4">
        {convLoading ? (
          <div className="rounded-2xl border border-charcoal/10 bg-white p-12 text-center text-sm text-charcoal/60">
            Loading conversation threads...
          </div>
        ) : conversations.length > 0 ? (
          conversations.map((c) => (
            <div
              key={c.id}
              className="flex flex-col justify-between gap-4 rounded-2xl border border-charcoal/10 bg-white p-6 shadow-xs transition-shadow hover:shadow-sm sm:flex-row sm:items-center"
            >
              <div className="space-y-2">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="font-serif text-lg font-normal text-charcoal">
                    {getProjectName(c.project_id)}
                  </span>
                  <span
                    className={`rounded-full px-2.5 py-0.5 text-[0.68rem] font-semibold uppercase tracking-wider ${
                      c.status === "ACTIVE"
                        ? "bg-forest/10 text-forest"
                        : "bg-charcoal/10 text-charcoal/70"
                    }`}
                  >
                    {c.status}
                  </span>
                </div>

                <div className="flex flex-wrap items-center gap-4 text-xs text-charcoal/60">
                  <span className="flex items-center gap-1.5">
                    <Clock className="size-3.5" />
                    Updated: {new Date(c.updated_at).toLocaleDateString("en-US", {
                      month: "short",
                      day: "numeric",
                      year: "numeric",
                    })}
                  </span>
                  <span>ID: <code className="font-mono text-[0.7rem]">{c.id.slice(0, 8)}</code></span>
                </div>
              </div>

              <div className="flex shrink-0 items-center gap-3">
                <span className="text-xs text-charcoal/50">Thread active</span>
              </div>
            </div>
          ))
        ) : (
          <div className="rounded-2xl border border-dashed border-charcoal/20 bg-white p-12 text-center">
            <MessageSquare className="mx-auto size-10 text-charcoal/30" />
            <h3 className="mt-3 font-serif text-lg font-normal text-charcoal">
              No conversations initiated yet
            </h3>
            <p className="mx-auto mt-1 max-w-sm text-xs text-charcoal/60">
              When you submit an inquiry regarding a property project, your dialogue thread will appear here.
            </p>
            <div className="mt-6">
              <Link
                to="/buyer"
                className="inline-flex min-h-10 items-center gap-2 rounded-xl bg-forest px-4 text-xs font-semibold text-ivory hover:bg-forest-deep"
              >
                <span>Back to Overview</span>
                <ArrowRight className="size-3.5" />
              </Link>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
