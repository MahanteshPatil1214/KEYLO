import {
  Building2,
  Edit3,
  FileSpreadsheet,
  MapPin,
  Power,
  Shield,
} from "lucide-react";
import type { AdminProjectStatus, ProjectItem } from "../projectModel";
import { formatDate } from "../users/UserTable";

type ProjectTableProps = {
  projects: ProjectItem[];
  onManageFacts: (project: ProjectItem) => void;
  onEdit: (project: ProjectItem) => void;
  onToggleStatus: (project: ProjectItem) => void;
};

export function ProjectStatusBadge({
  status,
}: {
  status: AdminProjectStatus;
}) {
  switch (status) {
    case "ACTIVE":
      return (
        <span className="inline-flex items-center gap-1.5 rounded-full border border-emerald-200/60 bg-emerald-50 px-2.5 py-0.5 text-[11px] font-semibold text-emerald-800">
          <span className="size-1.5 rounded-full bg-emerald-500 animate-pulse" />
          Active
        </span>
      );
    case "DRAFT":
      return (
        <span className="inline-flex items-center gap-1.5 rounded-full border border-amber-200/60 bg-amber-50 px-2.5 py-0.5 text-[11px] font-semibold text-amber-800">
          <span className="size-1.5 rounded-full bg-amber-500" />
          Draft
        </span>
      );
    case "INACTIVE":
      return (
        <span className="inline-flex items-center gap-1.5 rounded-full border border-rose-200/60 bg-rose-50 px-2.5 py-0.5 text-[11px] font-semibold text-rose-700">
          <span className="size-1.5 rounded-full bg-rose-500" />
          Inactive
        </span>
      );
    default:
      return (
        <span className="inline-flex items-center rounded-full bg-charcoal/5 px-2.5 py-0.5 text-[11px] font-medium text-charcoal/70">
          {status}
        </span>
      );
  }
}

export function ProjectTable({
  projects,
  onManageFacts,
  onEdit,
  onToggleStatus,
}: ProjectTableProps) {
  return (
    <div className="overflow-hidden rounded-2xl border border-charcoal/10 bg-white shadow-xs">
      <div className="overflow-x-auto">
        <table className="w-full text-left text-sm text-charcoal">
          <thead className="border-b border-charcoal/10 bg-charcoal/[0.02] text-xs font-semibold uppercase tracking-wider text-charcoal/60">
            <tr>
              <th scope="col" className="px-6 py-3.5">
                Project
              </th>
              <th scope="col" className="px-6 py-3.5">
                Location & RERA
              </th>
              <th scope="col" className="px-6 py-3.5">
                Status
              </th>
              <th scope="col" className="px-6 py-3.5">
                Created Date
              </th>
              <th scope="col" className="px-6 py-3.5 text-right">
                Actions
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-charcoal/5">
            {projects.map((p) => {
              const isActive = p.status === "ACTIVE";

              return (
                <tr
                  key={p.id}
                  className="transition-colors hover:bg-charcoal/[0.015]"
                >
                  {/* Project Column */}
                  <td className="px-6 py-4">
                    <div className="flex items-start gap-3">
                      <div className="flex size-9 shrink-0 items-center justify-center rounded-xl bg-charcoal/5 text-charcoal">
                        <Building2 className="size-4" />
                      </div>
                      <div className="max-w-xs">
                        <p className="font-semibold text-charcoal text-sm">
                          {p.name}
                        </p>
                        <p className="text-xs text-charcoal/50">/{p.slug}</p>
                        {p.description && (
                          <p className="mt-1 line-clamp-1 text-xs text-charcoal/60">
                            {p.description}
                          </p>
                        )}
                      </div>
                    </div>
                  </td>

                  {/* Location & RERA */}
                  <td className="whitespace-nowrap px-6 py-4">
                    <div className="flex flex-col gap-1 text-xs">
                      <span className="flex items-center gap-1.5 font-medium text-charcoal">
                        <MapPin className="size-3.5 text-charcoal/50 shrink-0" />
                        {p.location}
                      </span>
                      {p.rera_number ? (
                        <span className="flex items-center gap-1 text-charcoal/60">
                          <Shield className="size-3 text-emerald-600 shrink-0" />
                          RERA: {p.rera_number}
                        </span>
                      ) : (
                        <span className="text-[11px] text-charcoal/40 italic">
                          No RERA registered
                        </span>
                      )}
                    </div>
                  </td>

                  {/* Status */}
                  <td className="whitespace-nowrap px-6 py-4">
                    <ProjectStatusBadge status={p.status} />
                  </td>

                  {/* Created Date */}
                  <td className="whitespace-nowrap px-6 py-4 text-xs text-charcoal/60">
                    {formatDate(p.created_at)}
                  </td>

                  {/* Actions */}
                  <td className="whitespace-nowrap px-6 py-4 text-right">
                    <div className="inline-flex items-center gap-1.5">
                      <button
                        type="button"
                        onClick={() => onManageFacts(p)}
                        className="inline-flex items-center gap-1 rounded-lg border border-charcoal/15 bg-white px-2.5 py-1.5 text-xs font-semibold text-charcoal shadow-2xs transition-colors hover:border-charcoal/30 hover:bg-charcoal/5 hover:text-charcoal"
                        title="Manage Project Fact Sheet"
                      >
                        <FileSpreadsheet className="size-3.5 text-emerald-700" />
                        <span>Fact Sheet</span>
                      </button>

                      <button
                        type="button"
                        onClick={() => onEdit(p)}
                        className="inline-flex items-center gap-1 rounded-lg border border-charcoal/15 bg-white px-2.5 py-1.5 text-xs font-semibold text-charcoal/80 transition-colors hover:border-charcoal/30 hover:bg-charcoal/5 hover:text-charcoal"
                        title="Edit Project Details"
                      >
                        <Edit3 className="size-3" />
                        <span>Edit</span>
                      </button>

                      <button
                        type="button"
                        onClick={() => onToggleStatus(p)}
                        className={`inline-flex items-center gap-1 rounded-lg border px-2.5 py-1.5 text-xs font-semibold transition-colors ${
                          isActive
                            ? "border-rose-200 bg-rose-50/50 text-rose-700 hover:border-rose-300 hover:bg-rose-100"
                            : "border-emerald-200 bg-emerald-50/50 text-emerald-800 hover:border-emerald-300 hover:bg-emerald-100"
                        }`}
                        title={
                          isActive
                            ? "Set project to Inactive"
                            : "Activate project"
                        }
                      >
                        <Power className="size-3" />
                        <span>{isActive ? "Deactivate" : "Activate"}</span>
                      </button>
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
