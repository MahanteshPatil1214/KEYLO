import {
  Building2,
  Edit3,
  FileSpreadsheet,
  MapPin,
  Power,
  Shield,
} from "lucide-react";
import type { ProjectItem } from "../projectModel";
import { ProjectStatusBadge } from "./ProjectTable";

type ProjectCardListProps = {
  projects: ProjectItem[];
  onManageFacts: (project: ProjectItem) => void;
  onEdit: (project: ProjectItem) => void;
  onToggleStatus: (project: ProjectItem) => void;
};

export function ProjectCardList({
  projects,
  onManageFacts,
  onEdit,
  onToggleStatus,
}: ProjectCardListProps) {
  return (
    <div className="flex flex-col gap-3 md:hidden">
      {projects.map((p) => {
        const isActive = p.status === "ACTIVE";

        return (
          <div
            key={p.id}
            className="flex flex-col gap-3 rounded-2xl border border-charcoal/10 bg-white p-4 shadow-xs"
          >
            {/* Header: Project Name, Slug, and Status */}
            <div className="flex items-start justify-between gap-3">
              <div className="flex items-center gap-2.5">
                <div className="flex size-9 shrink-0 items-center justify-center rounded-xl bg-charcoal/5 text-charcoal">
                  <Building2 className="size-4" />
                </div>
                <div>
                  <h3 className="font-semibold text-charcoal text-sm">
                    {p.name}
                  </h3>
                  <p className="text-xs text-charcoal/50">/{p.slug}</p>
                </div>
              </div>
              <ProjectStatusBadge status={p.status} />
            </div>

            {/* Description */}
            {p.description && (
              <p className="text-xs leading-relaxed text-charcoal/70 line-clamp-2">
                {p.description}
              </p>
            )}

            {/* Location & RERA */}
            <div className="flex flex-col gap-1 border-t border-charcoal/5 pt-2 text-xs">
              <div className="flex items-center gap-1.5 text-charcoal/80">
                <MapPin className="size-3.5 text-charcoal/40 shrink-0" />
                <span>{p.location}</span>
              </div>
              {p.rera_number && (
                <div className="flex items-center gap-1.5 text-charcoal/60">
                  <Shield className="size-3.5 text-emerald-600 shrink-0" />
                  <span>RERA: {p.rera_number}</span>
                </div>
              )}
            </div>

            {/* Actions */}
            <div className="flex items-center gap-2 border-t border-charcoal/5 pt-3">
              <button
                type="button"
                onClick={() => onManageFacts(p)}
                className="flex flex-1 items-center justify-center gap-1.5 rounded-xl border border-charcoal/15 bg-white py-2 text-xs font-semibold text-charcoal transition-colors hover:border-charcoal/30 hover:bg-charcoal/5"
              >
                <FileSpreadsheet className="size-3.5 text-emerald-700" />
                <span>Fact Sheet</span>
              </button>

              <button
                type="button"
                onClick={() => onEdit(p)}
                className="flex items-center justify-center gap-1.5 rounded-xl border border-charcoal/15 bg-white px-3 py-2 text-xs font-semibold text-charcoal/80 transition-colors hover:border-charcoal/30 hover:bg-charcoal/5"
                title="Edit Project"
              >
                <Edit3 className="size-3.5" />
                <span>Edit</span>
              </button>

              <button
                type="button"
                onClick={() => onToggleStatus(p)}
                className={`flex items-center justify-center gap-1.5 rounded-xl border px-3 py-2 text-xs font-semibold transition-colors ${
                  isActive
                    ? "border-rose-200 bg-rose-50 text-rose-700"
                    : "border-emerald-200 bg-emerald-50 text-emerald-800"
                }`}
              >
                <Power className="size-3.5" />
                <span>{isActive ? "Deactivate" : "Activate"}</span>
              </button>
            </div>
          </div>
        );
      })}
    </div>
  );
}
