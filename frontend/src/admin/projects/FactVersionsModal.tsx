import { useEffect, useState } from "react";
import { History, LoaderCircle, X } from "lucide-react";
import type { FactItem, FactVersionItem } from "../projectModel";
import { fetchFactVersions } from "../api";
import { formatDate } from "../users/UserTable";

type FactVersionsModalProps = {
  fact: FactItem | null;
  isOpen: boolean;
  onClose: () => void;
};

export function FactVersionsModal({
  fact,
  isOpen,
  onClose,
}: FactVersionsModalProps) {
  const [versions, setVersions] = useState<FactVersionItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (fact && isOpen) {
      setLoading(true);
      setError(null);
      fetchFactVersions(fact.id)
        .then((res) => {
          setVersions(res.items || []);
        })
        .catch((err) => {
          setError(err?.message || "Failed to load version history.");
        })
        .finally(() => {
          setLoading(false);
        });
    }
  }, [fact, isOpen]);

  if (!isOpen || !fact) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-charcoal/50 backdrop-blur-xs transition-opacity"
        onClick={onClose}
      />

      {/* Modal Dialog */}
      <div className="relative w-full max-w-xl overflow-hidden rounded-2xl border border-charcoal/10 bg-white shadow-xl transition-all">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-charcoal/10 px-6 py-4">
          <div className="flex items-center gap-2.5">
            <div className="flex size-9 items-center justify-center rounded-xl bg-charcoal/5 text-charcoal">
              <History className="size-4" />
            </div>
            <div>
              <h2 className="font-semibold text-charcoal text-base">
                Fact Version History
              </h2>
              <p className="text-xs text-charcoal/60 line-clamp-1">
                {fact.question}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg p-1 text-charcoal/40 hover:bg-charcoal/5 hover:text-charcoal"
          >
            <X className="size-4" />
          </button>
        </div>

        {/* Content */}
        <div className="max-h-[60vh] overflow-y-auto p-6">
          {loading && (
            <div className="flex items-center justify-center py-10 text-charcoal/60">
              <LoaderCircle className="size-5 animate-spin" />
              <span className="ml-2 text-xs">Loading historical audits…</span>
            </div>
          )}

          {error && (
            <div className="rounded-xl border border-rose-200 bg-rose-50/70 p-3 text-xs text-rose-800">
              {error}
            </div>
          )}

          {!loading && !error && versions.length === 0 && (
            <p className="py-6 text-center text-xs text-charcoal/60">
              No historical revisions recorded for this fact.
            </p>
          )}

          {!loading && !error && versions.length > 0 && (
            <div className="relative flex flex-col gap-4 border-l-2 border-charcoal/10 pl-4 ml-2">
              {versions.map((v) => (
                <div key={v.id} className="relative flex flex-col gap-1.5">
                  {/* Timeline dot */}
                  <span className="absolute -left-[23px] top-1.5 size-3 rounded-full border-2 border-white bg-charcoal" />

                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-charcoal">
                      Version #{v.version_number}
                    </span>
                    <span className="text-[11px] text-charcoal/50">
                      {formatDate(v.created_at)}
                    </span>
                  </div>

                  {v.previous_answer && (
                    <div className="rounded-lg border border-charcoal/5 bg-charcoal/[0.02] p-2 text-xs">
                      <p className="text-[10px] uppercase font-semibold text-charcoal/50">
                        Previous Answer
                      </p>
                      <p className="mt-0.5 line-clamp-2 text-charcoal/70">
                        {v.previous_answer}
                      </p>
                    </div>
                  )}

                  <div className="rounded-lg border border-emerald-200/50 bg-emerald-50/40 p-2 text-xs">
                    <p className="text-[10px] uppercase font-semibold text-emerald-800">
                      {v.previous_answer ? "Updated Answer" : "Initial Seeded Answer"}
                    </p>
                    <p className="mt-0.5 text-charcoal">{v.new_answer}</p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end border-t border-charcoal/10 px-6 py-3 bg-charcoal/[0.02]">
          <button
            type="button"
            onClick={onClose}
            className="rounded-xl border border-charcoal/15 bg-white px-4 py-2 text-xs font-semibold text-charcoal hover:bg-charcoal/5"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}

