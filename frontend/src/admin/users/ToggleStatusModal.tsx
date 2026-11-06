import { useState } from "react";
import { AlertTriangle, CheckCircle, LoaderCircle, Power, X } from "lucide-react";
import type { UserItem } from "../adminModel";
import { updateUserStatus } from "../api";

type ToggleStatusModalProps = {
  user: UserItem | null;
  currentAdminId: string;
  isOpen: boolean;
  onClose: () => void;
  onSuccess: (updatedUser: UserItem) => void;
};

export function ToggleStatusModal({
  user,
  currentAdminId,
  isOpen,
  onClose,
  onSuccess,
}: ToggleStatusModalProps) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!isOpen || !user) return null;

  const isDeactivating = user.is_active;
  const isSelf = user.id === currentAdminId;

  const handleConfirm = async () => {
    if (isSelf && isDeactivating) {
      setError("You cannot deactivate your own administrator account.");
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const updated = await updateUserStatus(user.id, !user.is_active);
      onSuccess(updated);
      onClose();
    } catch (err: any) {
      setError(
        err?.message ||
          `Failed to ${isDeactivating ? "deactivate" : "activate"} user account.`,
      );
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
      <div className="relative w-full max-w-md overflow-hidden rounded-2xl border border-charcoal/10 bg-white shadow-xl transition-all">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-charcoal/10 px-6 py-4">
          <div className="flex items-center gap-2.5">
            <div
              className={`flex size-9 items-center justify-center rounded-xl ${
                isDeactivating
                  ? "bg-rose-50 text-rose-700"
                  : "bg-emerald-50 text-emerald-800"
              }`}
            >
              {isDeactivating ? (
                <AlertTriangle className="size-4" />
              ) : (
                <CheckCircle className="size-4" />
              )}
            </div>
            <div>
              <h2 className="font-semibold text-charcoal text-base">
                {isDeactivating ? "Deactivate Account" : "Activate Account"}
              </h2>
              <p className="text-xs text-charcoal/60">
                Update login and system access permissions.
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

        {/* Content */}
        <div className="flex flex-col gap-4 p-6">
          {error && (
            <div className="rounded-xl border border-rose-200 bg-rose-50/70 p-3 text-xs text-rose-800">
              {error}
            </div>
          )}

          <div className="rounded-xl border border-charcoal/10 bg-charcoal/[0.02] p-4">
            <p className="text-xs text-charcoal/60">Account Holder</p>
            <p className="mt-0.5 font-semibold text-charcoal text-sm">
              {user.full_name}
            </p>
            <p className="text-xs text-charcoal/70">{user.email}</p>
            <div className="mt-2 text-[11px] font-medium text-charcoal/50">
              Role: <span className="text-charcoal">{user.role.name}</span>
            </div>
          </div>

          {isDeactivating ? (
            <p className="text-xs leading-relaxed text-charcoal/70">
              Are you sure you want to deactivate this account? The user will immediately be blocked from logging in and accessing any workspace endpoints. You can reactivate this account anytime.
            </p>
          ) : (
            <p className="text-xs leading-relaxed text-charcoal/70">
              Are you sure you want to reactivate this account? The user will regain normal login and workspace access immediately.
            </p>
          )}

          {/* Action Buttons */}
          <div className="mt-2 flex items-center justify-end gap-2.5 border-t border-charcoal/10 pt-4">
            <button
              type="button"
              onClick={onClose}
              disabled={loading}
              className="rounded-xl border border-charcoal/15 bg-white px-4 py-2 text-xs font-semibold text-charcoal transition-colors hover:border-charcoal/30 hover:bg-charcoal/5"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={handleConfirm}
              disabled={loading}
              className={`inline-flex items-center gap-1.5 rounded-xl px-4 py-2 text-xs font-semibold text-white shadow-xs transition-opacity hover:opacity-95 disabled:opacity-50 ${
                isDeactivating
                  ? "bg-rose-600 hover:bg-rose-700"
                  : "bg-emerald-700 hover:bg-emerald-800"
              }`}
            >
              {loading ? (
                <>
                  <LoaderCircle className="size-3.5 animate-spin" />
                  <span>Processing…</span>
                </>
              ) : (
                <>
                  <Power className="size-3.5" />
                  <span>
                    {isDeactivating
                      ? "Confirm Deactivation"
                      : "Confirm Activation"}
                  </span>
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

