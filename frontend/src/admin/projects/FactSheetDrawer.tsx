import { useEffect, useState } from "react";
import {
  Check,
  CheckCircle2,
  Clock,
  Edit2,
  FileCheck2,
  FileSpreadsheet,
  FileText,
  History,
  LoaderCircle,
  MapPin,
  Plus,
  RotateCcw,
  Shield,
  X,
} from "lucide-react";
import type {
  AdminFactStatus,
  CreateFactPayload,
  FactItem,
  ProjectItem,
  UpdateFactPayload,
} from "../projectModel";
import { STANDARD_FACT_CATEGORIES } from "../projectModel";
import {
  approveFact,
  createFact,
  fetchProjectFacts,
  rejectFact,
  updateFact,
} from "../api";
import { ProjectStatusBadge } from "./ProjectTable";
import { FactVersionsModal } from "./FactVersionsModal";

type FactSheetDrawerProps = {
  project: ProjectItem | null;
  isOpen: boolean;
  onClose: () => void;
  onFactsChanged?: () => void;
};

export function FactSheetDrawer({
  project,
  isOpen,
  onClose,
  onFactsChanged,
}: FactSheetDrawerProps) {
  const [facts, setFacts] = useState<FactItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Filters
  const [selectedCategory, setSelectedCategory] = useState<string>("ALL");
  const [selectedStatus, setSelectedStatus] = useState<AdminFactStatus | "ALL">(
    "ALL",
  );

  // Add Fact Form State
  const [showAddForm, setShowAddForm] = useState(false);
  const [newCategory, setNewCategory] = useState<string>("AMENITIES");
  const [customCategory, setCustomCategory] = useState("");
  const [newQuestion, setNewQuestion] = useState("");
  const [newAnswer, setNewAnswer] = useState("");
  const [addLoading, setAddLoading] = useState(false);
  const [addError, setAddError] = useState<string | null>(null);

  // Edit Fact State
  const [editingFactId, setEditingFactId] = useState<string | null>(null);
  const [editCategory, setEditCategory] = useState("");
  const [editQuestion, setEditQuestion] = useState("");
  const [editAnswer, setEditAnswer] = useState("");
  const [editLoading, setEditLoading] = useState(false);

  // Action Loading states per fact ID
  const [actionLoadingId, setActionLoadingId] = useState<string | null>(null);

  // Version history modal target
  const [versionTargetFact, setVersionTargetFact] = useState<FactItem | null>(
    null,
  );

  // Success Feedback
  const [successToast, setSuccessToast] = useState<string | null>(null);

  const showToast = (msg: string) => {
    setSuccessToast(msg);
    setTimeout(() => {
      setSuccessToast((prev) => (prev === msg ? null : prev));
    }, 4000);
  };

  const loadFacts = async () => {
    if (!project) return;
    setLoading(true);
    setError(null);
    try {
      const res = await fetchProjectFacts(project.id, {
        status: selectedStatus,
        category: selectedCategory !== "ALL" ? selectedCategory : undefined,
        pageSize: 100,
      });
      setFacts(res.items || []);
    } catch (err: any) {
      setError(err?.message || "Failed to load project fact sheet.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (project && isOpen) {
      loadFacts();
    }
  }, [project, isOpen, selectedCategory, selectedStatus]);

  if (!isOpen || !project) return null;

  const handleCreateFact = async (e: React.FormEvent) => {
    e.preventDefault();
    setAddError(null);

    const categoryFinal =
      newCategory === "CUSTOM"
        ? customCategory.trim().toUpperCase()
        : newCategory;

    if (!categoryFinal) {
      setAddError("Please specify a valid category.");
      return;
    }
    if (!newQuestion.trim()) {
      setAddError("Question is required.");
      return;
    }
    if (!newAnswer.trim()) {
      setAddError("Answer is required.");
      return;
    }

    setAddLoading(true);
    try {
      const payload: CreateFactPayload = {
        category: categoryFinal,
        question: newQuestion.trim(),
        answer: newAnswer.trim(),
      };
      await createFact(project.id, payload);
      setShowAddForm(false);
      setNewQuestion("");
      setNewAnswer("");
      setCustomCategory("");
      showToast("Draft fact created successfully.");
      await loadFacts();
      onFactsChanged?.();
    } catch (err: any) {
      setAddError(err?.message || "Failed to create fact.");
    } finally {
      setAddLoading(false);
    }
  };

  const handleStartEdit = (f: FactItem) => {
    setEditingFactId(f.id);
    setEditCategory(f.pending_changes?.category || f.category);
    setEditQuestion(f.pending_changes?.question || f.question);
    setEditAnswer(f.pending_changes?.answer || f.answer);
  };

  const handleSaveEdit = async (factId: string) => {
    setEditLoading(true);
    try {
      const payload: UpdateFactPayload = {
        category: editCategory.trim().toUpperCase() || undefined,
        question: editQuestion.trim() || undefined,
        answer: editAnswer.trim() || undefined,
      };
      await updateFact(factId, payload);
      setEditingFactId(null);
      showToast("Fact updated successfully (staged if approved).");
      await loadFacts();
      onFactsChanged?.();
    } catch (err: any) {
      alert(err?.message || "Failed to save fact update.");
    } finally {
      setEditLoading(false);
    }
  };

  const handleApprove = async (factId: string) => {
    setActionLoadingId(factId);
    try {
      await approveFact(factId);
      showToast("Fact approved and published to buyer workspace.");
      await loadFacts();
      onFactsChanged?.();
    } catch (err: any) {
      alert(err?.message || "Failed to approve fact.");
    } finally {
      setActionLoadingId(null);
    }
  };

  const handleReject = async (factId: string) => {
    setActionLoadingId(factId);
    try {
      await rejectFact(factId);
      showToast("Pending changes discarded or fact unpublished to draft.");
      await loadFacts();
      onFactsChanged?.();
    } catch (err: any) {
      alert(err?.message || "Failed to reject fact.");
    } finally {
      setActionLoadingId(null);
    }
  };

  // Metrics counts from loaded facts
  const approvedCount = facts.filter((f) => f.status === "APPROVED").length;
  const draftCount = facts.filter((f) => f.status === "DRAFT").length;
  const pendingChangesCount = facts.filter((f) => Boolean(f.pending_changes)).length;

  return (
    <div className="fixed inset-0 z-50 overflow-hidden">
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-charcoal/50 backdrop-blur-xs transition-opacity"
        onClick={onClose}
      />

      {/* Drawer Container */}
      <div className="fixed inset-y-0 right-0 flex max-w-full pl-10">
        <div className="relative w-screen max-w-2xl bg-[#FAFAF7] shadow-2xl flex flex-col">
          {/* Header */}
          <div className="border-b border-charcoal/10 bg-white px-6 py-5">
            <div className="flex items-start justify-between gap-4">
              <div>
                <div className="flex items-center gap-2">
                  <span className="rounded bg-charcoal/10 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-charcoal/70">
                    Fact Sheet Workspace
                  </span>
                  <ProjectStatusBadge status={project.status} />
                </div>
                <h2 className="mt-1.5 font-serif text-2xl font-medium text-charcoal">
                  {project.name}
                </h2>
                <div className="mt-1 flex flex-wrap items-center gap-3 text-xs text-charcoal/60">
                  <span className="flex items-center gap-1">
                    <MapPin className="size-3 text-charcoal/40" />
                    {project.location}
                  </span>
                  {project.rera_number && (
                    <span className="flex items-center gap-1">
                      <Shield className="size-3 text-emerald-600" />
                      RERA: {project.rera_number}
                    </span>
                  )}
                </div>
              </div>
              <button
                type="button"
                onClick={onClose}
                className="rounded-lg p-1.5 text-charcoal/40 hover:bg-charcoal/5 hover:text-charcoal"
                title="Close Drawer"
              >
                <X className="size-5" />
              </button>
            </div>

            {/* Quick Metrics Pills */}
            <div className="mt-4 flex flex-wrap items-center gap-2 text-xs">
              <span className="inline-flex items-center gap-1.5 rounded-full border border-charcoal/10 bg-white px-3 py-1 font-medium text-charcoal">
                <FileText className="size-3 text-charcoal/60" />
                {facts.length} Total Facts
              </span>
              <span className="inline-flex items-center gap-1.5 rounded-full border border-emerald-200 bg-emerald-50 px-3 py-1 font-medium text-emerald-800">
                <CheckCircle2 className="size-3 text-emerald-600" />
                {approvedCount} Approved
              </span>
              <span className="inline-flex items-center gap-1.5 rounded-full border border-amber-200 bg-amber-50 px-3 py-1 font-medium text-amber-800">
                <Clock className="size-3 text-amber-600" />
                {draftCount} Drafts
              </span>
              {pendingChangesCount > 0 && (
                <span className="inline-flex items-center gap-1.5 rounded-full border border-indigo-200 bg-indigo-50 px-3 py-1 font-semibold text-indigo-700 animate-pulse">
                  <RotateCcw className="size-3" />
                  {pendingChangesCount} Pending Review
                </span>
              )}
            </div>
          </div>

          {/* Success Toast */}
          {successToast && (
            <div className="border-b border-emerald-200 bg-emerald-50 px-6 py-2.5 text-xs font-semibold text-emerald-800 flex items-center justify-between">
              <span>{successToast}</span>
              <button
                type="button"
                onClick={() => setSuccessToast(null)}
                className="text-emerald-700/70 hover:text-emerald-900"
              >
                Dismiss
              </button>
            </div>
          )}

          {/* Controls Bar: Filters & Add Action */}
          <div className="flex flex-col gap-2.5 border-b border-charcoal/10 bg-white/70 px-6 py-3 sm:flex-row sm:items-center sm:justify-between">
            {/* Category Dropdown */}
            <div className="flex items-center gap-2">
              <select
                value={selectedCategory}
                onChange={(e) => setSelectedCategory(e.target.value)}
                className="h-9 rounded-xl border border-charcoal/15 bg-white px-3 text-xs font-medium text-charcoal focus:border-charcoal focus:outline-hidden"
              >
                <option value="ALL">All Categories</option>
                {STANDARD_FACT_CATEGORIES.map((cat) => (
                  <option key={cat} value={cat}>
                    {cat}
                  </option>
                ))}
              </select>

              {/* Status Tab Toggle */}
              <select
                value={selectedStatus}
                onChange={(e) =>
                  setSelectedStatus(e.target.value as AdminFactStatus | "ALL")
                }
                className="h-9 rounded-xl border border-charcoal/15 bg-white px-3 text-xs font-medium text-charcoal focus:border-charcoal focus:outline-hidden"
              >
                <option value="ALL">All Statuses</option>
                <option value="APPROVED">Approved Only</option>
                <option value="DRAFT">Drafts Only</option>
              </select>
            </div>

            {/* Add Fact Button */}
            <button
              type="button"
              id="drawer-add-fact-btn"
              onClick={() => setShowAddForm(!showAddForm)}
              className="inline-flex items-center gap-1.5 rounded-xl bg-charcoal px-3 py-2 text-xs font-semibold text-ivory hover:opacity-95"
            >
              {showAddForm ? <X className="size-3.5" /> : <Plus className="size-3.5" />}
              <span>{showAddForm ? "Cancel" : "Add Fact"}</span>
            </button>
          </div>

          {/* Drawer Body Scrollable */}
          <div className="flex-1 overflow-y-auto p-6 flex flex-col gap-4">
            {/* Collapsible Add Fact Form */}
            {showAddForm && (
              <form
                onSubmit={handleCreateFact}
                className="rounded-2xl border border-charcoal/15 bg-white p-4 shadow-sm flex flex-col gap-3"
              >
                <h4 className="font-semibold text-charcoal text-xs uppercase tracking-wider">
                  New Fact Sheet Entry
                </h4>

                {addError && (
                  <div className="rounded-lg border border-rose-200 bg-rose-50 p-2 text-xs text-rose-800">
                    {addError}
                  </div>
                )}

                {/* Category Selection */}
                <div className="flex flex-col gap-1">
                  <label className="text-xs font-semibold text-charcoal">
                    Category
                  </label>
                  <select
                    id="new-fact-category"
                    value={newCategory}
                    onChange={(e) => setNewCategory(e.target.value)}
                    className="h-9 rounded-xl border border-charcoal/15 bg-white px-3 text-xs text-charcoal focus:border-charcoal focus:outline-hidden"
                  >
                    {STANDARD_FACT_CATEGORIES.map((c) => (
                      <option key={c} value={c}>
                        {c}
                      </option>
                    ))}
                    <option value="CUSTOM">+ Custom Category…</option>
                  </select>
                  {newCategory === "CUSTOM" && (
                    <input
                      type="text"
                      required
                      placeholder="e.g. SUSTAINABILITY & GREEN INITIATIVES"
                      value={customCategory}
                      onChange={(e) => setCustomCategory(e.target.value)}
                      className="mt-1 h-9 rounded-xl border border-charcoal/15 bg-white px-3 text-xs text-charcoal uppercase focus:border-charcoal focus:outline-hidden"
                    />
                  )}
                </div>

                {/* Question */}
                <div className="flex flex-col gap-1">
                  <label htmlFor="new-fact-question" className="text-xs font-semibold text-charcoal">
                    Question / Inquiry
                  </label>
                  <input
                    id="new-fact-question"
                    type="text"
                    required
                    placeholder="e.g. What is the car parking allocation per unit?"
                    value={newQuestion}
                    onChange={(e) => setNewQuestion(e.target.value)}
                    className="h-9 rounded-xl border border-charcoal/15 bg-white px-3 text-xs text-charcoal focus:border-charcoal focus:outline-hidden"
                  />
                </div>

                {/* Answer */}
                <div className="flex flex-col gap-1">
                  <label htmlFor="new-fact-answer" className="text-xs font-semibold text-charcoal">
                    Approved Answer / Specification
                  </label>
                  <textarea
                    id="new-fact-answer"
                    rows={3}
                    required
                    placeholder="Provide accurate, comprehensive factual information…"
                    value={newAnswer}
                    onChange={(e) => setNewAnswer(e.target.value)}
                    className="rounded-xl border border-charcoal/15 bg-white p-3 text-xs text-charcoal focus:border-charcoal focus:outline-hidden"
                  />
                </div>

                <div className="flex items-center justify-end gap-2 pt-2 border-t border-charcoal/10">
                  <button
                    type="button"
                    onClick={() => setShowAddForm(false)}
                    className="rounded-xl border border-charcoal/15 px-3 py-1.5 text-xs font-semibold text-charcoal hover:bg-charcoal/5"
                  >
                    Cancel
                  </button>
                  <button
                    id="submit-create-fact-btn"
                    type="submit"
                    disabled={addLoading}
                    className="inline-flex items-center gap-1.5 rounded-xl bg-charcoal px-3 py-1.5 text-xs font-semibold text-ivory disabled:opacity-50"
                  >
                    {addLoading ? (
                      <LoaderCircle className="size-3.5 animate-spin" />
                    ) : (
                      <Plus className="size-3.5" />
                    )}
                    <span>Save Draft Fact</span>
                  </button>
                </div>
              </form>
            )}

            {/* Loading State */}
            {loading && (
              <div className="flex flex-col items-center justify-center py-16 text-charcoal/60">
                <LoaderCircle className="size-6 animate-spin" />
                <span className="mt-2 text-xs">Loading fact sheet…</span>
              </div>
            )}

            {/* Error State */}
            {error && (
              <div className="rounded-xl border border-rose-200 bg-white p-4 text-xs text-rose-800">
                {error}
              </div>
            )}

            {/* Empty State */}
            {!loading && !error && facts.length === 0 && (
              <div className="flex flex-col items-center justify-center rounded-2xl border border-charcoal/10 bg-white p-12 text-center">
                <FileSpreadsheet className="size-8 text-charcoal/40" />
                <h4 className="mt-2 font-semibold text-charcoal text-sm">
                  No Facts Matching Filters
                </h4>
                <p className="mt-1 text-xs text-charcoal/60 max-w-xs">
                  Create new Q&A facts to provide accurate project information to the AI assistant and sales executives.
                </p>
                <button
                  type="button"
                  onClick={() => setShowAddForm(true)}
                  className="mt-3 inline-flex items-center gap-1 rounded-xl bg-charcoal px-3 py-1.5 text-xs font-semibold text-ivory"
                >
                  <Plus className="size-3.5" />
                  <span>Add First Fact</span>
                </button>
              </div>
            )}

            {/* Fact Cards */}
            {!loading &&
              !error &&
              facts.map((fact) => {
                const isEditing = editingFactId === fact.id;
                const isApproved = fact.status === "APPROVED";
                const hasPending = Boolean(fact.pending_changes);
                const isBusy = actionLoadingId === fact.id;

                return (
                  <div
                    key={fact.id}
                    className="rounded-2xl border border-charcoal/10 bg-white p-4 shadow-xs flex flex-col gap-3 transition-shadow hover:shadow-sm"
                  >
                    {/* Header: Category and Status Badge */}
                    <div className="flex items-center justify-between gap-2">
                      <span className="rounded-full border border-charcoal/10 bg-charcoal/[0.04] px-2.5 py-0.5 text-[11px] font-semibold text-charcoal">
                        {fact.category}
                      </span>
                      <div className="flex items-center gap-1.5">
                        {hasPending && (
                          <span className="rounded-full border border-indigo-200 bg-indigo-50 px-2 py-0.5 text-[10px] font-bold text-indigo-700">
                            Staged Revision
                          </span>
                        )}
                        {isApproved ? (
                          <span className="inline-flex items-center gap-1 rounded-full border border-emerald-200 bg-emerald-50 px-2 py-0.5 text-[10px] font-semibold text-emerald-800">
                            <span className="size-1.5 rounded-full bg-emerald-500" />
                            Approved
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 rounded-full border border-amber-200 bg-amber-50 px-2 py-0.5 text-[10px] font-semibold text-amber-800">
                            <span className="size-1.5 rounded-full bg-amber-500" />
                            Draft
                          </span>
                        )}
                      </div>
                    </div>

                    {/* Question & Answer (or inline edit form) */}
                    {isEditing ? (
                      <div className="flex flex-col gap-2.5 border-y border-charcoal/5 py-2.5">
                        <div>
                          <label className="text-[10px] uppercase font-bold text-charcoal/60">
                            Category
                          </label>
                          <input
                            type="text"
                            value={editCategory}
                            onChange={(e) => setEditCategory(e.target.value)}
                            className="mt-0.5 h-8 w-full rounded-lg border border-charcoal/15 px-2.5 text-xs text-charcoal uppercase"
                          />
                        </div>
                        <div>
                          <label className="text-[10px] uppercase font-bold text-charcoal/60">
                            Question
                          </label>
                          <input
                            type="text"
                            value={editQuestion}
                            onChange={(e) => setEditQuestion(e.target.value)}
                            className="mt-0.5 h-8 w-full rounded-lg border border-charcoal/15 px-2.5 text-xs text-charcoal"
                          />
                        </div>
                        <div>
                          <label className="text-[10px] uppercase font-bold text-charcoal/60">
                            Answer
                          </label>
                          <textarea
                            rows={3}
                            value={editAnswer}
                            onChange={(e) => setEditAnswer(e.target.value)}
                            className="mt-0.5 w-full rounded-lg border border-charcoal/15 p-2 text-xs text-charcoal"
                          />
                        </div>
                        <div className="flex items-center justify-end gap-2 pt-1">
                          <button
                            type="button"
                            onClick={() => setEditingFactId(null)}
                            className="rounded-lg border border-charcoal/15 px-2.5 py-1 text-xs text-charcoal hover:bg-charcoal/5"
                          >
                            Cancel
                          </button>
                          <button
                            type="button"
                            onClick={() => handleSaveEdit(fact.id)}
                            disabled={editLoading}
                            className="inline-flex items-center gap-1 rounded-lg bg-charcoal px-3 py-1 text-xs font-semibold text-ivory disabled:opacity-50"
                          >
                            {editLoading && (
                              <LoaderCircle className="size-3 animate-spin" />
                            )}
                            <span>Save Staged Changes</span>
                          </button>
                        </div>
                      </div>
                    ) : (
                      <div className="flex flex-col gap-1.5">
                        <h4 className="font-semibold text-charcoal text-xs">
                          {fact.question}
                        </h4>
                        <p className="text-xs leading-relaxed text-charcoal/80">
                          {fact.answer}
                        </p>
                      </div>
                    )}

                    {/* Staged Changes Review Box (if fact has pending_changes) */}
                    {hasPending && fact.pending_changes && !isEditing && (
                      <div className="rounded-xl border border-indigo-200 bg-indigo-50/60 p-3 text-xs flex flex-col gap-2">
                        <div className="flex items-center justify-between">
                          <span className="font-bold text-indigo-900 text-[11px] uppercase tracking-wide flex items-center gap-1">
                            <Clock className="size-3" />
                            Staged Revision (Pending Sales Head Approval)
                          </span>
                          <span className="text-[10px] text-indigo-700/80">
                            Category: {fact.pending_changes.category}
                          </span>
                        </div>
                        <div className="rounded-lg bg-white/80 p-2 border border-indigo-100">
                          <p className="font-medium text-charcoal text-xs">
                            {fact.pending_changes.question}
                          </p>
                          <p className="mt-1 text-charcoal/80 text-xs">
                            {fact.pending_changes.answer}
                          </p>
                        </div>
                        <div className="flex items-center justify-end gap-2 pt-1">
                          <button
                            type="button"
                            onClick={() => handleReject(fact.id)}
                            disabled={isBusy}
                            className="rounded-lg border border-rose-200 bg-white px-2.5 py-1 text-[11px] font-semibold text-rose-700 hover:bg-rose-50"
                          >
                            Discard Revision
                          </button>
                          <button
                            type="button"
                            onClick={() => handleApprove(fact.id)}
                            disabled={isBusy}
                            className="inline-flex items-center gap-1 rounded-lg bg-indigo-700 px-3 py-1 text-[11px] font-semibold text-white hover:bg-indigo-800"
                          >
                            {isBusy ? (
                              <LoaderCircle className="size-3 animate-spin" />
                            ) : (
                              <Check className="size-3" />
                            )}
                            <span>Publish Approved Changes</span>
                          </button>
                        </div>
                      </div>
                    )}

                    {/* Card Actions Footer */}
                    {!isEditing && (
                      <div className="flex flex-wrap items-center justify-between gap-2 border-t border-charcoal/5 pt-2.5 text-xs">
                        <button
                          type="button"
                          onClick={() => setVersionTargetFact(fact)}
                          className="inline-flex items-center gap-1 text-[11px] font-medium text-charcoal/60 hover:text-charcoal"
                          title="View Version Timeline"
                        >
                          <History className="size-3" />
                          <span>Version Audit</span>
                        </button>

                        <div className="flex items-center gap-1.5">
                          <button
                            type="button"
                            onClick={() => handleStartEdit(fact)}
                            className="inline-flex items-center gap-1 rounded-lg border border-charcoal/15 bg-white px-2 py-1 text-xs font-semibold text-charcoal/80 hover:bg-charcoal/5"
                          >
                            <Edit2 className="size-3" />
                            <span>Edit</span>
                          </button>

                          {/* Approve / Publish Button */}
                          {!isApproved && (
                            <button
                              type="button"
                              onClick={() => handleApprove(fact.id)}
                              disabled={isBusy}
                              className="inline-flex items-center gap-1 rounded-lg border border-emerald-200 bg-emerald-50 px-2.5 py-1 text-xs font-semibold text-emerald-800 hover:bg-emerald-100"
                            >
                              {isBusy ? (
                                <LoaderCircle className="size-3 animate-spin" />
                              ) : (
                                <FileCheck2 className="size-3" />
                              )}
                              <span>Approve & Publish</span>
                            </button>
                          )}

                          {/* Unpublish Button (when approved and no pending) */}
                          {isApproved && !hasPending && (
                            <button
                              type="button"
                              onClick={() => handleReject(fact.id)}
                              disabled={isBusy}
                              className="inline-flex items-center gap-1 rounded-lg border border-amber-200 bg-amber-50 px-2 py-1 text-xs font-semibold text-amber-800 hover:bg-amber-100"
                              title="Unpublish fact back to draft"
                            >
                              <span>Unpublish</span>
                            </button>
                          )}
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
          </div>
        </div>
      </div>

      {/* Version History Modal */}
      <FactVersionsModal
        fact={versionTargetFact}
        isOpen={Boolean(versionTargetFact)}
        onClose={() => setVersionTargetFact(null)}
      />
    </div>
  );
}
