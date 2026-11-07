import { useState } from "react";
import {
  CheckCircle2,
  Edit3,
  FileText,
  RotateCcw,
} from "lucide-react";
import type {
  NotificationTemplateItem,
  UpdateNotificationTemplatePayload,
} from "../settingsModel";
import { EditTemplateModal } from "./EditTemplateModal";

type NotificationTemplatesTabProps = {
  templates: NotificationTemplateItem[];
  loading: boolean;
  onUpdateTemplate: (templateId: string, payload: UpdateNotificationTemplatePayload) => Promise<void>;
  onResetTemplate: (templateId: string) => Promise<void>;
  isSaving: boolean;
};

export function NotificationTemplatesTab({
  templates,
  loading,
  onUpdateTemplate,
  onResetTemplate,
  isSaving,
}: NotificationTemplatesTabProps) {
  const [selectedTemplate, setSelectedTemplate] = useState<NotificationTemplateItem | null>(null);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [resettingId, setResettingId] = useState<string | null>(null);

  const handleEdit = (tmpl: NotificationTemplateItem) => {
    setSelectedTemplate(tmpl);
    setIsEditModalOpen(true);
  };

  const handleReset = async (templateId: string) => {
    if (!window.confirm("Are you sure you want to restore this template to the default wording?")) {
      return;
    }
    setResettingId(templateId);
    try {
      await onResetTemplate(templateId);
    } finally {
      setResettingId(null);
    }
  };

  return (
    <div className="flex flex-col gap-6">
      {/* Header Info */}
      <div className="flex flex-col gap-1 border-b border-charcoal/10 pb-4">
        <h3 className="font-serif text-base font-bold text-charcoal">
          Automated Notification & Reminder Templates
        </h3>
        <p className="text-xs text-charcoal/60">
          Standardize messaging across appointment reminders, lead handoffs, and booking notices with dynamic parameter tags
        </p>
      </div>

      {/* Grid of Templates */}
      {loading ? (
        <div className="flex h-56 w-full items-center justify-center">
          <div className="flex flex-col items-center gap-2">
            <div className="size-6 animate-spin rounded-full border-2 border-charcoal/20 border-t-charcoal" />
            <span className="text-xs text-charcoal/50">Loading notification templates...</span>
          </div>
        </div>
      ) : templates.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-charcoal/15 bg-charcoal/5 p-8 text-center text-xs text-charcoal/60">
          No notification templates found.
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
          {templates.map((tmpl) => (
            <div
              key={tmpl.id}
              className="flex flex-col justify-between rounded-2xl border border-charcoal/10 bg-white/80 p-5 shadow-xs transition-all hover:border-charcoal/25 hover:shadow-sm"
            >
              <div>
                <div className="flex items-center justify-between border-b border-charcoal/10 pb-3">
                  <div className="flex items-center gap-2">
                    <FileText className="size-4 text-charcoal" />
                    <span className="font-serif text-sm font-bold text-charcoal">{tmpl.name}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="rounded-md border border-charcoal/10 bg-charcoal/5 px-2 py-0.5 text-[10px] font-bold text-charcoal/70 uppercase">
                      {tmpl.channel}
                    </span>
                    {tmpl.is_active ? (
                      <span className="inline-flex items-center gap-1 rounded-md bg-emerald-50 px-2 py-0.5 text-[10px] font-semibold text-emerald-800">
                        <CheckCircle2 className="size-3" />
                        <span>Active</span>
                      </span>
                    ) : (
                      <span className="rounded-md bg-charcoal/10 px-2 py-0.5 text-[10px] font-semibold text-charcoal/50">
                        Disabled
                      </span>
                    )}
                  </div>
                </div>

                <div className="mt-3 flex flex-col gap-2 text-xs">
                  <div>
                    <span className="text-[10px] font-bold tracking-wider text-charcoal/50 uppercase">
                      Title Template
                    </span>
                    <p className="mt-0.5 font-semibold text-charcoal bg-charcoal/5 rounded-lg px-2.5 py-1 text-xs">
                      {tmpl.title_template}
                    </p>
                  </div>

                  <div>
                    <span className="text-[10px] font-bold tracking-wider text-charcoal/50 uppercase">
                      Message Body
                    </span>
                    <p className="mt-0.5 font-medium text-charcoal/80 bg-charcoal/5 rounded-lg p-2.5 text-xs whitespace-pre-wrap">
                      {tmpl.body_template}
                    </p>
                  </div>

                  {tmpl.variables && tmpl.variables.length > 0 && (
                    <div className="mt-1">
                      <span className="text-[10px] font-bold tracking-wider text-charcoal/50 uppercase">
                        Placeholders:
                      </span>
                      <div className="mt-1 flex flex-wrap gap-1">
                        {tmpl.variables.map((v) => (
                          <span
                            key={v}
                            className="rounded-md border border-charcoal/10 bg-white px-1.5 py-0.5 font-mono text-[10px] text-charcoal/70"
                          >
                            {`{${v}}`}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </div>

              <div className="mt-4 flex items-center justify-between border-t border-charcoal/10 pt-3 text-xs">
                <span className="text-[11px] text-charcoal/50">
                  {tmpl.updated_by_name ? `Edited by ${tmpl.updated_by_name}` : "System Default"}
                </span>

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => handleReset(tmpl.id)}
                    disabled={resettingId === tmpl.id}
                    className="inline-flex items-center gap-1 rounded-lg border border-charcoal/15 bg-white px-2.5 py-1 text-[11px] font-semibold text-charcoal/70 hover:bg-charcoal/5 hover:text-charcoal disabled:opacity-50"
                    title="Restore default wording"
                  >
                    <RotateCcw className={`size-3 ${resettingId === tmpl.id ? "animate-spin" : ""}`} />
                    <span>Reset</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => handleEdit(tmpl)}
                    className="inline-flex items-center gap-1 rounded-lg bg-charcoal px-3 py-1 text-[11px] font-semibold text-white shadow-2xs hover:bg-charcoal/90"
                  >
                    <Edit3 className="size-3" />
                    <span>Edit</span>
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      <EditTemplateModal
        template={selectedTemplate}
        isOpen={isEditModalOpen}
        onClose={() => setIsEditModalOpen(false)}
        onSave={onUpdateTemplate}
        isSubmitting={isSaving}
      />
    </div>
  );
}
