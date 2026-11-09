import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { ArrowRight, LoaderCircle, Lock, Mail } from "lucide-react";
import { resetPasswordRequest, ResetPasswordResponse } from "../auth/api";
import { fieldClasses } from "../auth/formStyles";
import { AuthLayout } from "../components/AuthLayout";

const resetSchema = z.object({
  email: z
    .string()
    .trim()
    .min(1, "Enter your email address.")
    .email("Enter a valid email address."),
  password: z
    .string()
    .min(1, "Create a new password.")
    .min(12, "Use at least 12 characters.")
    .max(128, "Use 128 characters or fewer.")
    .regex(/[a-z]/, "Include a lowercase letter.")
    .regex(/[A-Z]/, "Include an uppercase letter.")
    .regex(/\d/, "Include a number.")
    .regex(/[^A-Za-z0-9]/, "Include a symbol."),
  confirmPassword: z.string().min(1, "Confirm your password."),
}).refine((values) => values.password === values.confirmPassword, {
  path: ["confirmPassword"],
  message: "Passwords do not match.",
});

type ResetValues = z.infer<typeof resetSchema>;

export function ForgotPasswordPage() {
  const navigate = useNavigate();
  const [step, setStep] = useState<"form" | "success">("form");
  const [formError, setFormError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting: formIsSubmitting },
  } = useForm<ResetValues>({
    resolver: zodResolver(resetSchema),
    defaultValues: { email: "", password: "", confirmPassword: "" },
    mode: "onTouched",
  });

  const asideProps = {
    asideEyebrow: "Private access",
    asideQuote: "Every considered reply begins with the right conversation.",
    asideDescription:
      "Sign in to manage enquiries, site visits and buyer conversations across your assigned projects.",
  };

  const onSubmit = async (values: ResetValues) => {
    setFormError(null);
    setIsSubmitting(true);

    try {
      const response: ResetPasswordResponse = await resetPasswordRequest({
        email: values.email,
        password: values.password,
        confirmPassword: values.confirmPassword,
      });

      if (!response.message) {
        setFormError("Something went wrong. Please try again.");
        setIsSubmitting(false);
        return;
      }

      setStep("success");
    } catch (error) {
      if (!(error instanceof Error)) {
        setFormError("Something went wrong. Please try again.");
        setIsSubmitting(false);
        return;
      }

      const apiError = error as {
        status?: number;
        code?: string;
        message?: string;
        details?: { field?: string; message?: string }[];
      };

      if (apiError.status && apiError.status >= 500) {
        setFormError(
          "Keylo is temporarily unavailable. Please try again in a moment.",
        );
      } else if (apiError.status === 422) {
        const detail = apiError.details?.[0]?.message;
        setFormError(detail || "Please check your details and try again.");
      } else {
        setFormError(apiError.message || "Something went wrong. Please try again.");
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  if (step === "success") {
    return (
      <AuthLayout
        titleId="reset-success-heading"
        eyebrow="Password reset"
        title="Password changed"
        description="Your password has been reset successfully. You can now sign in with your new password."
        skipLabel="Skip to sign in"
        footerText="Your new password is now active across all Keylo roles."
        {...asideProps}
      >
        <div
          role="status"
          aria-live="polite"
          className="mb-6 flex gap-3 rounded-lg border border-forest/20 bg-forest/5 px-4 py-3 text-sm leading-6 text-forest-deep"
        >
          <Mail aria-hidden={true} className="mt-0.5 size-4 shrink-0" />
          <p>Your password has been reset successfully.</p>
        </div>

        <button
          type="button"
          onClick={() => navigate("/login", { replace: true })}
          className="inline-flex min-h-[52px] items-center justify-center gap-2.5 rounded-full bg-forest px-6 text-[0.95rem] font-semibold text-ivory transition-colors duration-300 hover:bg-forest-deep"
        >
          <ArrowRight className="size-4 shrink-0" aria-hidden={true} />
          Sign in with new password
        </button>
      </AuthLayout>
    );
  }

  return (
    <AuthLayout
      titleId="reset-heading"
      eyebrow="Password reset"
      title="Set a new password"
      description="Enter your email and choose a new password for your Keylo account."
      skipLabel="Skip to password form"
      footerText="Works for buyer, sales executive and administrator accounts."
      {...asideProps}
    >
      {formError ? (
        <div
          id="reset-error"
          role="alert"
          aria-atomic="true"
          className="mb-6 flex gap-3 rounded-lg border border-clay/25 bg-clay-soft px-4 py-3 text-sm leading-6 text-clay"
        >
          <Lock aria-hidden={true} className="mt-0.5 size-4 shrink-0 text-clay" />
          <p>{formError}</p>
        </div>
      ) : null}

      <form noValidate onSubmit={handleSubmit(onSubmit)}>
        <div>
          <label
            htmlFor="email"
            className="mb-2 block text-[0.82rem] font-semibold text-charcoal"
          >
            Email address
          </label>
          <input
            id="email"
            type="email"
            inputMode="email"
            autoComplete="email"
            autoCapitalize="none"
            enterKeyHint="next"
            required
            placeholder="name@example.com"
            aria-invalid={Boolean(errors.email)}
            aria-describedby={errors.email ? "email-error" : undefined}
            className={fieldClasses(Boolean(errors.email))}
            {...register("email")}
          />
          {errors.email ? (
            <p
              id="email-error"
              className="mt-2 flex items-start gap-1.5 text-sm leading-5 text-clay"
            >
              <AlertCircleInline aria-hidden={true} className="mt-0.5 size-3.5 shrink-0" />
              {errors.email.message}
            </p>
          ) : null}
        </div>

        <div className="mt-5">
          <label
            htmlFor="password"
            className="mb-2 block text-[0.82rem] font-semibold text-charcoal"
          >
            New password
          </label>
          <input
            id="password"
            type="password"
            autoComplete="new-password"
            enterKeyHint="next"
            required
            placeholder="••••••••••••"
            aria-invalid={Boolean(errors.password)}
            aria-describedby={errors.password ? "password-error" : undefined}
            className={fieldClasses(Boolean(errors.password))}
            {...register("password")}
          />
          {errors.password ? (
            <p
              id="password-error"
              className="mt-2 flex items-start gap-1.5 text-sm leading-5 text-clay"
            >
              <AlertCircleInline aria-hidden={true} className="mt-0.5 size-3.5 shrink-0" />
              {errors.password.message}
            </p>
          ) : null}
        </div>

        <div className="mt-5">
          <label
            htmlFor="confirmPassword"
            className="mb-2 block text-[0.82rem] font-semibold text-charcoal"
          >
            Confirm new password
          </label>
          <input
            id="confirmPassword"
            type="password"
            autoComplete="new-password"
            enterKeyHint="go"
            required
            placeholder="••••••••••••"
            aria-invalid={Boolean(errors.confirmPassword)}
            aria-describedby={errors.confirmPassword ? "confirm-error" : undefined}
            className={fieldClasses(Boolean(errors.confirmPassword))}
            {...register("confirmPassword")}
          />
          {errors.confirmPassword ? (
            <p
              id="confirm-error"
              className="mt-2 flex items-start gap-1.5 text-sm leading-5 text-clay"
            >
              <AlertCircleInline aria-hidden={true} className="mt-0.5 size-3.5 shrink-0" />
              {errors.confirmPassword.message}
            </p>
          ) : null}
        </div>

        <button
          type="submit"
          disabled={isSubmitting || formIsSubmitting}
          className="group mt-4 inline-flex min-h-[52px] w-full items-center justify-center gap-2.5 rounded-full bg-forest px-6 text-[0.95rem] font-semibold text-ivory transition-colors duration-300 hover:bg-forest-deep disabled:cursor-not-allowed disabled:bg-forest/60"
        >
          {isSubmitting || formIsSubmitting ? (
            <>
              <LoaderCircle
                aria-hidden={true}
                className="size-4 animate-spin motion-reduce:animate-none"
              />
              Resetting…
            </>
          ) : (
            <>
              <Lock className="size-4 shrink-0" aria-hidden={true} />
              Reset password
            </>
          )}
        </button>

        <p className="mt-6 text-sm leading-6 text-charcoal/65">
          Remember your password?{" "}
          <Link
            to="/login"
            className="font-semibold text-forest underline-offset-4 transition-colors duration-200 hover:text-forest-deep hover:underline"
          >
            Sign in instead
          </Link>
        </p>
      </form>
    </AuthLayout>
  );
}

function AlertCircleInline(props: {
  "aria-hidden"?: boolean;
  className: string;
}) {
  return (
    <svg
      aria-hidden={props["aria-hidden"]}
      className={props.className}
      fill="none"
      viewBox="0 0 24 24"
      stroke="currentColor"
      strokeWidth={2}
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3"
      />
    </svg>
  );
}
