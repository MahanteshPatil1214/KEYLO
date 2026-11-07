import { useState } from "react";
import { Edit3, X } from "lucide-react";
import type {
  NotificationTemplateItem,
  UpdateNotificationTemplatePayload,
} from "../settingsModel";

type EditTemplateModalProps = {
  template: NotificationTemplateItem | null;
  isOpen: boolean;
  onClose: () => void;
  onSave: (templateId: string, payload: UpdateNotificationTemplatePayload) => Promise<void>;
  isSubmitting: boolean;
};

export function EditTemplateModal({
  template,
  isOpen,
  onClose,
  onSave,
  isSubmitting,
}: EditTemplateModalProps) {
  if (!isOpen || !template) return null;

  const [titleTemplate, setTitleTemplate] = useState(template.title_template);
  const [bodyTemplate, setBodyTemplate] = useState(template.body_template);
  const [isActive, setIsActive] = useState(template.is_active);
  const [error, setError] = useState<string | null>(null);

  const insertVariable = (varName: string) => {
    setBodyTemplate((prev) => `${prev} {${varName}}`);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!titleTemplate.trim() || !bodyTemplate.trim()) {
      setError("Title and body templates cannot be empty.");
      return;
    }
    setError(null);
    try {
      await onSave(template.id, {
        title_template: titleTemplate.trim(),
        body_template: bodyTemplate.trim(),
        is_active: isActive,
      });
      onClose();
    } catch (err: any) {
      setError(err?.message || "Failed to update notification template.");
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-charcoal/40 p-4 backdrop-blur-xs">
      <div className="w-full max-w-lg rounded-2xl border border-charcoal/10 bg-white p-6 shadow-xl animate-in fade-in zoom-in-95 duration-150">
        <div className="flex items-center justify-between border-b border-charcoal/10 pb-3">
          <div className="flex items-center gap-2">
            <div className="flex size-8 items-center justify-center rounded-xl bg-charcoal/5 text-charcoal">
              <Edit3 className="size-4" />
            </div>
            <div>
              <h3 className="font-serif text-base font-bold text-charcoal">
                Edit Notification Template
              </h3>
              <p className="text-[11px] text-charcoal/60">
                {template.name} ({template.channel})
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg p-1 text-charcoal/50 hover:bg-charcoal/5 hover:text-charcoal"
          >
            <X className="size-4" />
          </button>
        </div>

        {error && (
          <div className="mt-4 rounded-xl border border-red-200 bg-red-50 p-3 text-xs text-red-700">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="mt-4 flex flex-col gap-3.5 text-xs">
          <div>
            <label className="font-semibold text-charcoal/70">Title Template</label>
            <input
              id="template-title-input"
              type="text"
              required
              value={titleTemplate}
              onChange={(e) => setTitleTemplate(e.target.value)}
              className="mt-1 w-full rounded-xl border border-charcoal/15 bg-white px-3 py-2 text-xs font-medium text-charcoal focus:border-charcoal focus:outline-hidden"
            />
          </div>

          <div>
            <div className="flex items-center justify-between">
              <label className="font-semibold text-charcoal/70">Message Body Template</label>
              <span className="text-[10px] text-charcoal/50">Click chip below to insert tag</span>
            </div>
            <textarea
              id="template-body-input"
              required
              rows={4}
              value={bodyTemplate}
              onChange={(e) => setBodyTemplate(e.target.value)}
              className="mt-1 w-full rounded-xl border border-charcoal/15 bg-white px-3 py-2 text-xs text-charcoal focus:border-charcoal focus:outline-hidden"
            />
          </div>

          {/* Variable chips */}
          {template.variables && template.variables.length > 0 && (
            <div>
              <span className="text-[11px] font-semibold text-charcoal/60 block mb-1.5">
                Available Dynamic Variables:
              </span>
              <div className="flex flex-wrap gap-1.5">
                {template.variables.map((v) => (
                  <button
                    key={v}
                    type="button"
                    onClick={() => insertVariable(v)}
                    className="inline-flex items-center gap-1 rounded-lg border border-charcoal/15 bg-charcoal/5 px-2 py-1 text-[11px] font-mono font-medium text-charcoal hover:bg-charcoal/10"
                    title={`Click to insert {${v}}`}
                  >
                    <span>{`{${v}}`}</span>
                  </button>
                ))}
              </div>
            </div>
          )}

          <div className="flex items-center gap-2 pt-1">
            <input
              type="checkbox"
              id="template-active-toggle"
              checked={isActive}
              onChange={(e) => setIsActive(e.target.checked)}
              className="size-4 rounded border-charcoal/20 text-charcoal focus:ring-0"
            />
            <label htmlFor="template-active-toggle" className="text-xs font-semibold text-charcoal">
              Enable Template for Automated Dispatch
            </label>
          </div>

          <div className="mt-2 flex items-center justify-end gap-2 border-t border-charcoal/10 pt-3">
            <button
              type="button"
              onClick={onClose}
              disabled={isSubmitting}
              className="rounded-xl border border-charcoal/15 bg-white px-4 py-2 font-medium text-charcoal hover:bg-charcoal/5"
            >
              Cancel
            </button>
            <button
              id="save-template-submit-btn"
              type="submit"
              disabled={isSubmitting}
              className="rounded-xl bg-charcoal px-4 py-2 font-semibold text-white shadow-xs hover:bg-charcoal/90 disabled:opacity-50"
            >
              {isSubmitting ? "Saving..." : "Save Template"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
