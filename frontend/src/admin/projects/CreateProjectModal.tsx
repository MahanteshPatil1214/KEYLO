import { useState } from "react";
import { Building2, LoaderCircle, Plus, X } from "lucide-react";
import type { AdminProjectStatus, CreateProjectPayload, ProjectItem } from "../projectModel";
import { createProject } from "../api";

type CreateProjectModalProps = {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: (newProject: ProjectItem) => void;
};

export function CreateProjectModal({
  isOpen,
  onClose,
  onSuccess,
}: CreateProjectModalProps) {
  const [name, setName] = useState("");
  const [slug, setSlug] = useState("");
  const [location, setLocation] = useState("");
  const [reraNumber, setReraNumber] = useState("");
  const [description, setDescription] = useState("");
  const [status, setStatus] = useState<AdminProjectStatus>("ACTIVE");

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    const trimmedName = name.trim();
    const trimmedLocation = location.trim();

    if (trimmedName.length < 2) {
      setError("Project name must be at least 2 characters.");
      return;
    }

    if (trimmedLocation.length < 2) {
      setError("Location must be at least 2 characters.");
      return;
    }

    setLoading(true);
    try {
      const payload: CreateProjectPayload = {
        name: trimmedName,
        slug: slug.trim() || null,
        location: trimmedLocation,
        rera_number: reraNumber.trim() || null,
        description: description.trim() || null,
        status,
      };

      const created = await createProject(payload);
      onSuccess(created);
      onClose();
    } catch (err: any) {
      setError(err?.message || "Failed to create project.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-charcoal/50 backdrop-blur-xs transition-opacity"
        onClick={!loading ? onClose : undefined}
      />

      {/* Modal Dialog */}
      <div className="relative w-full max-w-lg overflow-hidden rounded-2xl border border-charcoal/10 bg-white shadow-xl transition-all">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-charcoal/10 px-6 py-4">
          <div className="flex items-center gap-2.5">
            <div className="flex size-9 items-center justify-center rounded-xl bg-charcoal/5 text-charcoal">
              <Building2 className="size-4" />
            </div>
            <div>
              <h2 className="font-semibold text-charcoal text-base">
                Create New Project
              </h2>
              <p className="text-xs text-charcoal/60">
                Register a residential or commercial development in Keylo.
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            disabled={loading}
            className="rounded-lg p-1 text-charcoal/40 hover:bg-charcoal/5 hover:text-charcoal disabled:opacity-50"
          >
            <X className="size-4" />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="flex flex-col gap-4 p-6">
          {error && (
            <div className="rounded-xl border border-rose-200 bg-rose-50/70 p-3 text-xs text-rose-800">
              {error}
            </div>
          )}

          {/* Project Name */}
          <div className="flex flex-col gap-1.5">
            <label
              htmlFor="create-pname"
              className="text-xs font-semibold text-charcoal"
            >
              Project Name <span className="text-rose-500">*</span>
            </label>
            <input
              id="create-pname"
              type="text"
              required
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. Prestige Lavender Valley"
              className="h-10 rounded-xl border border-charcoal/15 bg-white px-3 text-sm text-charcoal placeholder:text-charcoal/40 focus:border-charcoal focus:outline-hidden focus:ring-2 focus:ring-charcoal/10"
            />
          </div>

          {/* Location */}
          <div className="flex flex-col gap-1.5">
            <label
              htmlFor="create-plocation"
              className="text-xs font-semibold text-charcoal"
            >
              Location / City <span className="text-rose-500">*</span>
            </label>
            <input
              id="create-plocation"
              type="text"
              required
              value={location}
              onChange={(e) => setLocation(e.target.value)}
              placeholder="e.g. Whitefield, Bangalore"
              className="h-10 rounded-xl border border-charcoal/15 bg-white px-3 text-sm text-charcoal placeholder:text-charcoal/40 focus:border-charcoal focus:outline-hidden focus:ring-2 focus:ring-charcoal/10"
            />
          </div>

          {/* Slug & RERA */}
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <div className="flex flex-col gap-1.5">
              <label
                htmlFor="create-pslug"
                className="text-xs font-semibold text-charcoal"
              >
                Custom URL Slug (Optional)
              </label>
              <input
                id="create-pslug"
                type="text"
                value={slug}
                onChange={(e) => setSlug(e.target.value)}
                placeholder="auto-generated-if-blank"
                className="h-10 rounded-xl border border-charcoal/15 bg-white px-3 text-sm text-charcoal placeholder:text-charcoal/40 focus:border-charcoal focus:outline-hidden focus:ring-2 focus:ring-charcoal/10"
              />
            </div>

            <div className="flex flex-col gap-1.5">
              <label
                htmlFor="create-prera"
                className="text-xs font-semibold text-charcoal"
              >
                RERA Registration No.
              </label>
              <input
                id="create-prera"
                type="text"
                value={reraNumber}
                onChange={(e) => setReraNumber(e.target.value)}
                placeholder="e.g. PRM/KA/RERA/..."
                className="h-10 rounded-xl border border-charcoal/15 bg-white px-3 text-sm text-charcoal placeholder:text-charcoal/40 focus:border-charcoal focus:outline-hidden focus:ring-2 focus:ring-charcoal/10"
              />
            </div>
          </div>

          {/* Description */}
          <div className="flex flex-col gap-1.5">
            <label
              htmlFor="create-pdesc"
              className="text-xs font-semibold text-charcoal"
            >
              Project Overview & Highlights
            </label>
            <textarea
              id="create-pdesc"
              rows={3}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Highlight project positioning, key configurations, and standout lifestyle amenities…"
              className="rounded-xl border border-charcoal/15 bg-white p-3 text-sm text-charcoal placeholder:text-charcoal/40 focus:border-charcoal focus:outline-hidden focus:ring-2 focus:ring-charcoal/10"
            />
          </div>

          {/* Initial Status */}
          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-semibold text-charcoal">
              Initial Lifecycle State
            </label>
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => setStatus("ACTIVE")}
                className={`flex items-center justify-between rounded-xl border p-3 text-left transition-all ${
                  status === "ACTIVE"
                    ? "border-charcoal bg-charcoal/5 ring-1 ring-charcoal"
                    : "border-charcoal/15 bg-white hover:border-charcoal/30"
                }`}
              >
                <div>
                  <p className="text-xs font-bold text-charcoal">Active</p>
                  <p className="text-[10px] text-charcoal/60">
                    Visible to buyers & sales team
                  </p>
                </div>
                <span className="size-2 rounded-full bg-emerald-500" />
              </button>

              <button
                type="button"
                onClick={() => setStatus("DRAFT")}
                className={`flex items-center justify-between rounded-xl border p-3 text-left transition-all ${
                  status === "DRAFT"
                    ? "border-charcoal bg-charcoal/5 ring-1 ring-charcoal"
                    : "border-charcoal/15 bg-white hover:border-charcoal/30"
                }`}
              >
                <div>
                  <p className="text-xs font-bold text-charcoal">Draft</p>
                  <p className="text-[10px] text-charcoal/60">
                    Restricted admin-only preview
                  </p>
                </div>
                <span className="size-2 rounded-full bg-amber-500" />
              </button>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="mt-4 flex items-center justify-end gap-2.5 border-t border-charcoal/10 pt-4">
            <button
              type="button"
              onClick={onClose}
              disabled={loading}
              className="rounded-xl border border-charcoal/15 bg-white px-4 py-2 text-xs font-semibold text-charcoal transition-colors hover:border-charcoal/30 hover:bg-charcoal/5"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              className="inline-flex items-center gap-1.5 rounded-xl bg-charcoal px-4 py-2 text-xs font-semibold text-ivory shadow-xs transition-opacity hover:opacity-95 disabled:opacity-50"
            >
              {loading ? (
                <>
                  <LoaderCircle className="size-3.5 animate-spin" />
                  <span>Creating…</span>
                </>
              ) : (
                <>
                  <Plus className="size-3.5" />
                  <span>Create Project</span>
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

