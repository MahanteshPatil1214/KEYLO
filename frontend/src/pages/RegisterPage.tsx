import { useEffect, useRef, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { z } from "zod";
import {
  AlertCircle,
  ArrowRight,
  Eye,
  EyeOff,
  LoaderCircle,
} from "lucide-react";
import { ApiError, registerBuyer } from "../auth/api";
import { fieldClasses } from "../auth/formStyles";
import { AuthLayout } from "../components/AuthLayout";

const registerSchema = z
  .object({
    fullName: z
      .string()
      .trim()
      .min(2, "Enter your full name.")
      .max(255, "Use 255 characters or fewer."),
    email: z
      .string()
      .trim()
      .min(1, "Enter your email address.")
      .email("Enter a valid email address."),
    phone: z.string().trim().max(32, "Use 32 characters or fewer."),
    password: z
      .string()
      .min(1, "Create a password.")
      .min(12, "Use at least 12 characters.")
      .max(128, "Use 128 characters or fewer.")
      .regex(/[a-z]/, "Include a lowercase letter.")
      .regex(/[A-Z]/, "Include an uppercase letter.")
      .regex(/\d/, "Include a number.")
      .regex(/[^A-Za-z0-9]/, "Include a symbol."),
    confirmPassword: z.string().min(1, "Confirm your password."),
  })
  .refine((values) => values.password === values.confirmPassword, {
    path: ["confirmPassword"],
    message: "Passwords do not match.",
  });

type RegisterValues = z.infer<typeof registerSchema>;

const SERVER_FIELD_MAP: Record<string, keyof RegisterValues> = {
  full_name: "fullName",
  email: "email",
  phone: "phone",
  password: "password",
};

function fieldErrorMessage(message?: string): string {
  const cleaned = message?.replace(/^Value error,\s*/i, "").trim();
  return cleaned || "Check this field and try again.";
}

export function RegisterPage() {
  const navigate = useNavigate();
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const formErrorRef = useRef<HTMLDivElement>(null);

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
    setError,
    watch,
  } = useForm<RegisterValues>({
    resolver: zodResolver(registerSchema),
    defaultValues: {
      fullName: "",
      email: "",
      phone: "",
      password: "",
      confirmPassword: "",
    },
    mode: "onTouched",
  });

  const [
    fullNameValue,
    emailValue,
    phoneValue,
    passwordValue,
    confirmPasswordValue,
  ] = watch([
    "fullName",
    "email",
    "phone",
    "password",
    "confirmPassword",
  ]);

  useEffect(() => {
    setFormError((current) => (current ? null : current));
  }, [
    fullNameValue,
    emailValue,
    phoneValue,
    passwordValue,
    confirmPasswordValue,
  ]);

  useEffect(() => {
    if (formError) formErrorRef.current?.focus();
  }, [formError]);

  useEffect(() => {
    const previousTitle = document.title;
    document.title = "Create a buyer account — Keylo";
    return () => {
      document.title = previousTitle;
    };
  }, []);

  const onSubmit = async (values: RegisterValues) => {
    setFormError(null);

    try {
      await registerBuyer({
        fullName: values.fullName,
        email: values.email,
        password: values.password,
        phone: values.phone,
      });

      navigate("/login", {
        replace: true,
        state: {
          registeredEmail: values.email.trim().toLowerCase(),
          justRegistered: true,
        },
      });
    } catch (error) {
      if (!(error instanceof ApiError)) {
        setFormError("Something went wrong. Please try again.");
        return;
      }

      if (error.status === 422) {
        let handledFieldError = false;

        for (const detail of error.details) {
          const field = detail.field ? SERVER_FIELD_MAP[detail.field] : null;

          if (!field) continue;

          setError(
            field,
            {
              type: "server",
              message: fieldErrorMessage(detail.message),
            },
            { shouldFocus: true },
          );
          handledFieldError = true;
        }

        if (handledFieldError) return;

        setFormError("Check your details and try again.");
      } else if (error.status === 409) {
        setError(
          "email",
          {
            type: "server",
            message:
              "An account with this email already exists. Try signing in instead.",
          },
          { shouldFocus: true },
        );
      } else if (error.status === 429) {
        setFormError("Too many attempts. Please wait a moment and try again.");
      } else if (error.status >= 500) {
        setFormError(
          "Keylo is temporarily unavailable. Please try again in a moment.",
        );
      } else {
        setFormError(error.message);
      }
    }
  };

  const describedBy = (fieldId: string, invalid: boolean): string | undefined =>
    [
      invalid ? `${fieldId}-error` : "",
      formError ? "register-error" : "",
    ]
      .filter(Boolean)
      .join(" ") || undefined;

  const passwordDescribedBy =
    [
      errors.password ? "password-error" : "",
      "password-hint",
      formError ? "register-error" : "",
    ]
      .filter(Boolean)
      .join(" ") || undefined;

  return (
    <AuthLayout
      titleId="register-heading"
      eyebrow="Buyer access"
      title="Create your buyer account."
      description="Follow enquiries, site visits and conversations with the sales team."
      skipLabel="Skip to registration form"
      footerText="Buyer accounts are scoped to your own enquiries and visits."
      asideEyebrow="Buyer access"
      asideQuote="A considered home for every buyer conversation."
      asideDescription="Create an account to follow enquiries, confirm site visits and keep every conversation in one place."
      contentAlign="start"
    >
      <form noValidate onSubmit={handleSubmit(onSubmit)} aria-busy={isSubmitting}>
        {formError ? (
          <div
            ref={formErrorRef}
            id="register-error"
            role="alert"
            aria-atomic="true"
            tabIndex={-1}
            className="mb-6 flex gap-3 rounded-lg border border-clay/25 bg-clay-soft px-4 py-3 text-sm leading-6 text-clay"
          >
            <AlertCircle
              aria-hidden="true"
              className="mt-0.5 size-4 shrink-0"
            />
            <p>{formError}</p>
          </div>
        ) : null}

        <div>
          <label
            htmlFor="full-name"
            className="mb-2 block text-[0.82rem] font-semibold text-charcoal"
          >
            Full name
          </label>
          <input
            id="full-name"
            type="text"
            autoComplete="name"
            enterKeyHint="next"
            required
            placeholder="Your full name"
            aria-invalid={Boolean(errors.fullName)}
            aria-describedby={describedBy("full-name", Boolean(errors.fullName))}
            className={fieldClasses(Boolean(errors.fullName))}
            {...register("fullName")}
          />
          {errors.fullName ? (
            <p
              id="full-name-error"
              className="mt-2 flex items-start gap-1.5 text-sm leading-5 text-clay"
            >
              <AlertCircle
                aria-hidden="true"
                className="mt-0.5 size-3.5 shrink-0"
              />
              {errors.fullName.message}
            </p>
          ) : null}
        </div>

        <div className="mt-5">
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
            spellCheck={false}
            required
            placeholder="name@example.com"
            aria-invalid={Boolean(errors.email)}
            aria-describedby={describedBy("email", Boolean(errors.email))}
            className={fieldClasses(Boolean(errors.email))}
            {...register("email")}
          />
          {errors.email ? (
            <p
              id="email-error"
              className="mt-2 flex items-start gap-1.5 text-sm leading-5 text-clay"
            >
              <AlertCircle
                aria-hidden="true"
                className="mt-0.5 size-3.5 shrink-0"
              />
              {errors.email.message}
            </p>
          ) : null}
        </div>

        <div className="mt-5">
          <label
            htmlFor="phone"
            className="mb-2 block text-[0.82rem] font-semibold text-charcoal"
          >
            Phone number{" "}
            <span className="font-normal text-charcoal/65">(optional)</span>
          </label>
          <input
            id="phone"
            type="tel"
            inputMode="tel"
            autoComplete="tel"
            enterKeyHint="next"
            placeholder="+91 98765 43210"
            aria-invalid={Boolean(errors.phone)}
            aria-describedby={describedBy("phone", Boolean(errors.phone))}
            className={fieldClasses(Boolean(errors.phone))}
            {...register("phone")}
          />
          {errors.phone ? (
            <p
              id="phone-error"
              className="mt-2 flex items-start gap-1.5 text-sm leading-5 text-clay"
            >
              <AlertCircle
                aria-hidden="true"
                className="mt-0.5 size-3.5 shrink-0"
              />
              {errors.phone.message}
            </p>
          ) : null}
        </div>

        <div className="mt-5">
          <label
            htmlFor="password"
            className="mb-2 block text-[0.82rem] font-semibold text-charcoal"
          >
            Password
          </label>
          <div className="relative">
            <input
              id="password"
              type={showPassword ? "text" : "password"}
              autoComplete="new-password"
              enterKeyHint="next"
              required
              placeholder="Create a password"
              aria-invalid={Boolean(errors.password)}
              aria-describedby={passwordDescribedBy}
              className={`${fieldClasses(Boolean(errors.password))} pr-12`}
              {...register("password")}
            />
            <button
              type="button"
              onClick={() => setShowPassword((visible) => !visible)}
              aria-label={showPassword ? "Hide password" : "Show password"}
              aria-pressed={showPassword}
              className="absolute right-0 top-0 grid size-12 place-items-center rounded-r-lg text-charcoal/55 transition-colors duration-200 hover:text-charcoal focus-visible:text-charcoal"
            >
              {showPassword ? (
                <EyeOff aria-hidden="true" className="size-[18px]" />
              ) : (
                <Eye aria-hidden="true" className="size-[18px]" />
              )}
            </button>
          </div>
          <p id="password-hint" className="mt-2 text-xs leading-5 text-charcoal/65">
            Use 12–128 characters with uppercase, lowercase, a number and a
            symbol.
          </p>
          {errors.password ? (
            <p
              id="password-error"
              className="mt-2 flex items-start gap-1.5 text-sm leading-5 text-clay"
            >
              <AlertCircle
                aria-hidden="true"
                className="mt-0.5 size-3.5 shrink-0"
              />
              {errors.password.message}
            </p>
          ) : null}
        </div>

        <div className="mt-5">
          <label
            htmlFor="confirm-password"
            className="mb-2 block text-[0.82rem] font-semibold text-charcoal"
          >
            Confirm password
          </label>
          <div className="relative">
            <input
              id="confirm-password"
              type={showConfirmPassword ? "text" : "password"}
              autoComplete="new-password"
              enterKeyHint="go"
              required
              placeholder="Re-enter your password"
              aria-invalid={Boolean(errors.confirmPassword)}
              aria-describedby={describedBy(
                "confirm-password",
                Boolean(errors.confirmPassword),
              )}
              className={`${fieldClasses(Boolean(errors.confirmPassword))} pr-12`}
              {...register("confirmPassword")}
            />
            <button
              type="button"
              onClick={() => setShowConfirmPassword((visible) => !visible)}
              aria-label={
                showConfirmPassword
                  ? "Hide confirmation password"
                  : "Show confirmation password"
              }
              aria-pressed={showConfirmPassword}
              className="absolute right-0 top-0 grid size-12 place-items-center rounded-r-lg text-charcoal/55 transition-colors duration-200 hover:text-charcoal focus-visible:text-charcoal"
            >
              {showConfirmPassword ? (
                <EyeOff aria-hidden="true" className="size-[18px]" />
              ) : (
                <Eye aria-hidden="true" className="size-[18px]" />
              )}
            </button>
          </div>
          {errors.confirmPassword ? (
            <p
              id="confirm-password-error"
              className="mt-2 flex items-start gap-1.5 text-sm leading-5 text-clay"
            >
              <AlertCircle
                aria-hidden="true"
                className="mt-0.5 size-3.5 shrink-0"
              />
              {errors.confirmPassword.message}
            </p>
          ) : null}
        </div>

        <button
          type="submit"
          disabled={isSubmitting}
          className="group mt-7 inline-flex min-h-[52px] w-full items-center justify-center gap-2.5 rounded-full bg-forest px-6 text-[0.95rem] font-semibold text-ivory transition-colors duration-300 hover:bg-forest-deep disabled:cursor-not-allowed disabled:bg-forest/60"
        >
          {isSubmitting ? (
            <>
              <LoaderCircle
                aria-hidden="true"
                className="size-4 animate-spin motion-reduce:animate-none"
              />
              Creating account…
            </>
          ) : (
            <>
              Create buyer account
              <ArrowRight
                aria-hidden="true"
                className="size-4 transition-transform duration-300 group-hover:translate-x-0.5"
              />
            </>
          )}
        </button>

        <p className="mt-6 text-xs leading-5 text-charcoal/65">
          Public registration creates a buyer account. Sales and admin access is
          provisioned by Keylo.
        </p>

        <p className="mt-6 border-t border-charcoal/10 pt-6 text-sm leading-6 text-charcoal/65">
          Already have an account?{" "}
          <Link
            to="/login"
            className="font-semibold text-forest underline-offset-4 transition-colors duration-200 hover:text-forest-deep hover:underline"
          >
            Sign in
          </Link>
        </p>
      </form>
    </AuthLayout>
  );
}
