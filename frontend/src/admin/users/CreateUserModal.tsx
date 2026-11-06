import { useState } from "react";
import {
  Eye,
  EyeOff,
  LoaderCircle,
  UserPlus,
  X,
} from "lucide-react";
import type { AdminRoleName, CreateUserPayload, UserItem } from "../adminModel";
import { createUser } from "../api";

type CreateUserModalProps = {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: (newUser: UserItem) => void;
};

export function CreateUserModal({
  isOpen,
  onClose,
  onSuccess,
}: CreateUserModalProps) {
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [phone, setPhone] = useState("");
  const [role, setRole] = useState<AdminRoleName>("SALES_EXECUTIVE");
  const [isActive, setIsActive] = useState(true);

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    const trimmedName = fullName.trim();
    const trimmedEmail = email.trim();

    if (trimmedName.length < 2) {
      setError("Full name must be at least 2 characters.");
      return;
    }

    if (!trimmedEmail || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trimmedEmail)) {
      setError("Please enter a valid email address.");
      return;
    }

    if (password.length < 8) {
      setError("Password must be at least 8 characters long.");
      return;
    }

    setLoading(true);
    try {
      const payload: CreateUserPayload = {
        full_name: trimmedName,
        email: trimmedEmail,
        password,
        phone: phone.trim() || null,
        role,
        is_active: isActive,
      };

      const newUser = await createUser(payload);
      onSuccess(newUser);
      onClose();
    } catch (err: any) {
      setError(err?.message || "Failed to create user account.");
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
              <UserPlus className="size-4" />
            </div>
            <div>
              <h2 className="font-semibold text-charcoal text-base">
                Create User Account
              </h2>
              <p className="text-xs text-charcoal/60">
                Provision a new administrator, sales executive, or buyer account.
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
              htmlFor="create-fullname"
              className="text-xs font-semibold text-charcoal"
            >
              Full Name <span className="text-rose-500">*</span>
            </label>
            <input
              id="create-fullname"
              type="text"
              required
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              placeholder="e.g. Vikramaditya Rao"
              className="h-10 rounded-xl border border-charcoal/15 bg-white px-3 text-sm text-charcoal placeholder:text-charcoal/40 focus:border-charcoal focus:outline-hidden focus:ring-2 focus:ring-charcoal/10"
            />
          </div>

          {/* Email */}
          <div className="flex flex-col gap-1.5">
            <label
              htmlFor="create-email"
              className="text-xs font-semibold text-charcoal"
            >
              Email Address <span className="text-rose-500">*</span>
            </label>
            <input
              id="create-email"
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="e.g. vikram@keylo.com"
              className="h-10 rounded-xl border border-charcoal/15 bg-white px-3 text-sm text-charcoal placeholder:text-charcoal/40 focus:border-charcoal focus:outline-hidden focus:ring-2 focus:ring-charcoal/10"
            />
          </div>

          {/* Password */}
          <div className="flex flex-col gap-1.5">
            <label
              htmlFor="create-password"
              className="text-xs font-semibold text-charcoal"
            >
              Temporary Password <span className="text-rose-500">*</span>
            </label>
            <div className="relative">
              <input
                id="create-password"
                type={showPassword ? "text" : "password"}
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Minimum 8 characters"
                className="h-10 w-full rounded-xl border border-charcoal/15 bg-white pl-3 pr-10 text-sm text-charcoal placeholder:text-charcoal/40 focus:border-charcoal focus:outline-hidden focus:ring-2 focus:ring-charcoal/10"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 rounded-md p-1 text-charcoal/40 hover:text-charcoal"
                title={showPassword ? "Hide password" : "Show password"}
              >
                {showPassword ? (
                  <EyeOff className="size-4" />
                ) : (
                  <Eye className="size-4" />
                )}
              </button>
            </div>
            <p className="text-[11px] text-charcoal/50">
              Must be at least 8 characters. Includes uppercase, lowercase, numbers, and symbols.
            </p>
          </div>

          {/* Phone */}
          <div className="flex flex-col gap-1.5">
            <label
              htmlFor="create-phone"
              className="text-xs font-semibold text-charcoal"
            >
              Phone Number (Optional)
            </label>
            <input
              id="create-phone"
              type="text"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              placeholder="e.g. +91 98765 43210"
              className="h-10 rounded-xl border border-charcoal/15 bg-white px-3 text-sm text-charcoal placeholder:text-charcoal/40 focus:border-charcoal focus:outline-hidden focus:ring-2 focus:ring-charcoal/10"
            />
          </div>

          {/* Role Selection */}
          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-semibold text-charcoal">
              Account Role <span className="text-rose-500">*</span>
            </label>
            <div className="grid grid-cols-3 gap-2">
              {[
                {
                  id: "SALES_EXECUTIVE" as AdminRoleName,
                  label: "Sales Exec",
                  desc: "Handles leads & visits",
                },
                {
                  id: "BUYER" as AdminRoleName,
                  label: "Buyer",
                  desc: "Explores & books",
                },
                {
                  id: "ADMIN" as AdminRoleName,
                  label: "Admin",
                  desc: "Full management",
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
          </div>

          {/* Active Status Checkbox */}
          <div className="mt-1 flex items-center gap-2.5">
            <input
              id="create-active"
              type="checkbox"
              checked={isActive}
              onChange={(e) => setIsActive(e.target.checked)}
              className="size-4 rounded border-charcoal/20 text-charcoal accent-charcoal focus:ring-charcoal"
            />
            <label
              htmlFor="create-active"
              className="cursor-pointer text-xs font-medium text-charcoal"
            >
              Account is active immediately upon creation
            </label>
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
                  <UserPlus className="size-3.5" />
                  <span>Create Account</span>
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
