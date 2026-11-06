import { useEffect, useState } from "react";
import { Edit3, Info, LoaderCircle, X } from "lucide-react";
import type { AdminRoleName, UpdateUserPayload, UserItem } from "../adminModel";
import { updateUser } from "../api";

type EditUserModalProps = {
  user: UserItem | null;
  currentAdminId: string;
  isOpen: boolean;
  onClose: () => void;
  onSuccess: (updatedUser: UserItem) => void;
};

export function EditUserModal({
  user,
  currentAdminId,
  isOpen,
  onClose,
  onSuccess,
}: EditUserModalProps) {
  const [fullName, setFullName] = useState("");
  const [phone, setPhone] = useState("");
  const [role, setRole] = useState<AdminRoleName>("BUYER");

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (user) {
      setFullName(user.full_name);
      setPhone(user.phone || "");
      setRole(user.role.name);
      setError(null);
    }
  }, [user]);

  if (!isOpen || !user) return null;

  const isSelf = user.id === currentAdminId;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    const trimmedName = fullName.trim();
    if (trimmedName.length < 2) {
      setError("Full name must be at least 2 characters.");
      return;
    }

    setLoading(true);
    try {
      const payload: UpdateUserPayload = {
        full_name: trimmedName,
        phone: phone.trim() || null,
      };

      if (!isSelf && role !== user.role.name) {
        payload.role = role;
      }

      const updated = await updateUser(user.id, payload);
      onSuccess(updated);
      onClose();
    } catch (err: any) {
      setError(err?.message || "Failed to update user profile.");
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
              <Edit3 className="size-4" />
            </div>
            <div>
              <h2 className="font-semibold text-charcoal text-base">
                Edit User Details
              </h2>
              <p className="text-xs text-charcoal/60">
                Updating profile for <span className="font-medium text-charcoal">{user.email}</span>
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

          {/* Full Name */}
          <div className="flex flex-col gap-1.5">
            <label
              htmlFor="edit-fullname"
              className="text-xs font-semibold text-charcoal"
            >
              Full Name <span className="text-rose-500">*</span>
            </label>
            <input
              id="edit-fullname"
              type="text"
              required
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              className="h-10 rounded-xl border border-charcoal/15 bg-white px-3 text-sm text-charcoal placeholder:text-charcoal/40 focus:border-charcoal focus:outline-hidden focus:ring-2 focus:ring-charcoal/10"
            />
          </div>

          {/* Phone */}
          <div className="flex flex-col gap-1.5">
            <label
              htmlFor="edit-phone"
              className="text-xs font-semibold text-charcoal"
            >
              Phone Number
            </label>
            <input
              id="edit-phone"
              type="text"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              placeholder="e.g. +91 98765 43210"
              className="h-10 rounded-xl border border-charcoal/15 bg-white px-3 text-sm text-charcoal placeholder:text-charcoal/40 focus:border-charcoal focus:outline-hidden focus:ring-2 focus:ring-charcoal/10"
            />
          </div>

          {/* Role Selection */}
          <div className="flex flex-col gap-1.5">
            <div className="flex items-center justify-between">
              <label className="text-xs font-semibold text-charcoal">
                Account Role
              </label>
              {isSelf && (
                <span className="flex items-center gap-1 text-[11px] text-amber-700">
                  <Info className="size-3" />
                  Self role modification locked
                </span>
              )}
            </div>

            {isSelf ? (
              <div className="rounded-xl border border-charcoal/10 bg-charcoal/[0.03] p-3 text-xs text-charcoal/70">
                You are currently logged in as this administrator. Your role cannot be changed through this console to prevent accidental lockout.
              </div>
            ) : (
              <div className="grid grid-cols-3 gap-2">
                {[
                  {
                    id: "SALES_EXECUTIVE" as AdminRoleName,
                    label: "Sales Exec",
                    desc: "Assigned leads & visits",
                  },
                  {
                    id: "BUYER" as AdminRoleName,
                    label: "Buyer",
                    desc: "Property discovery",
                  },
                  {
                    id: "ADMIN" as AdminRoleName,
                    label: "Admin",
                    desc: "Full privileges",
                  },
                ].map((r) => (
                  <button
                    key={r.id}
                    type="button"
                    onClick={() => setRole(r.id)}
                    className={`flex flex-col items-start rounded-xl border p-2.5 text-left transition-all ${
                      role === r.id
                        ? "border-charcoal bg-charcoal/5 ring-1 ring-charcoal"
                        : "border-charcoal/15 bg-white hover:border-charcoal/30"
                    }`}
                  >
                    <span className="text-xs font-bold text-charcoal">
                      {r.label}
                    </span>
                    <span className="text-[10px] text-charcoal/60">{r.desc}</span>
                  </button>
                ))}
              </div>
            )}
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
                  <span>Saving…</span>
                </>
              ) : (
                <span>Save Changes</span>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

