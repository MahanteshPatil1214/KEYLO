import { useEffect, useRef, useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { z } from "zod";
import {
  AlertCircle,
  ArrowRight,
  CheckCircle2,
  Eye,
  EyeOff,
  LoaderCircle,
} from "lucide-react";
import {
  ApiError,
  fetchCurrentUser,
  homeForRole,
  loginRequest,
  roleFromName,
} from "../auth/api";
import { fieldClasses } from "../auth/formStyles";
import {
  forgetRememberedEmail,
  getRememberedEmail,
  rememberEmail,
  saveSession,
} from "../auth/session";
import { AuthLayout } from "../components/AuthLayout";

type LoginLocationState = {
  registeredEmail?: string;
  justRegistered?: boolean;
};

const loginSchema = z.object({
  email: z
    .string()
    .trim()
    .min(1, "Enter your email address.")
    .email("Enter a valid email address."),
  password: z.string().min(1, "Enter your password."),
  remember: z.boolean(),
  privacyConsent: z
    .boolean()
    .refine((v) => v === true, {
      message: "You must agree to the privacy policy to continue.",
    }),
});

type LoginValues = z.infer<typeof loginSchema>;

const FORGOT_PASSWORD_MAILTO =
  "mailto:hello@keylo.dev?subject=Keylo%20password%20reset";

export function LoginPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const locationState = location.state as LoginLocationState | null;
  const [showPassword, setShowPassword] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [initialEmail] = useState(
    () => locationState?.registeredEmail ?? getRememberedEmail(),
  );
  const [registrationNotice] = useState(
    Boolean(locationState?.justRegistered),
  );
  const formErrorRef = useRef<HTMLDivElement>(null);

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
    setError,
    watch,
  } = useForm<LoginValues>({
    resolver: zodResolver(loginSchema),
    defaultValues: {
      email: initialEmail,
      password: "",
      remember: Boolean(initialEmail),
      privacyConsent: false,
    },
    mode: "onTouched",
  });

  const emailValue = watch("email");
  const passwordValue = watch("password");

  useEffect(() => {
    setFormError((current) => (current ? null : current));
  }, [emailValue, passwordValue]);

  useEffect(() => {
    if (formError) formErrorRef.current?.focus();
  }, [formError]);

  useEffect(() => {
    const previousTitle = document.title;
    document.title = "Sign in — Keylo";
    return () => {
      document.title = previousTitle;
    };
  }, []);

  const onSubmit = async (values: LoginValues) => {
    setFormError(null);

    try {
      const token = await loginRequest(values.email, values.password);
      const user = await fetchCurrentUser(token.access_token);
      const role = roleFromName(user.role.name);

      if (!role) {
        setFormError(
          "Your account role isn't recognised. Please contact Keylo support.",
        );
        return;
      }

      saveSession(token.access_token, token.expires_in);

      if (values.remember) {
        rememberEmail(values.email);
      } else {
        forgetRememberedEmail();
      }

      navigate(homeForRole(role), { replace: true });
    } catch (error) {
      if (!(error instanceof ApiError)) {
        setFormError("Something went wrong. Please try again.");
        return;
      }

      if (error.status === 422) {
        let handledFieldError = false;

        for (const detail of error.details) {
          if (detail.field === "email" || detail.field === "password") {
            setError(
              detail.field,
              {
                type: "server",
                message: detail.message || "Check this field and try again.",
              },
              { shouldFocus: true },
            );
            handledFieldError = true;
          }
        }

        if (handledFieldError) return;
      }

      if (error.status === 401) {
        setFormError("The email or password you entered is incorrect.");
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

  const emailDescribedBy =
    [errors.email ? "email-error" : "", formError ? "login-error" : ""]
      .filter(Boolean)
      .join(" ") || undefined;
  const passwordDescribedBy =
    [errors.password ? "password-error" : "", formError ? "login-error" : ""]
      .filter(Boolean)
      .join(" ") || undefined;

  return (
    <AuthLayout
      titleId="login-heading"
      eyebrow="Secure access"
      title="Sign in to Keylo."
      description="Continue to your enquiries, site visits and buyer conversations."
      skipLabel="Skip to sign-in form"
      footerText="Access is scoped to your role and assigned projects."
      asideEyebrow="Private access"
      asideQuote="Every considered reply begins with the right conversation."
      asideDescription="Sign in to manage enquiries, site visits and buyer conversations across your assigned projects."
    >
      {registrationNotice ? (
        <div
          role="status"
          aria-live="polite"
          className="mb-6 flex gap-3 rounded-lg border border-forest/20 bg-forest/5 px-4 py-3 text-sm leading-6 text-forest-deep"
        >
          <CheckCircle2
            aria-hidden="true"
            className="mt-0.5 size-4 shrink-0"
          />
          <p>Your buyer account is ready. Sign in to continue.</p>
        </div>
      ) : null}

      <form noValidate onSubmit={handleSubmit(onSubmit)} aria-busy={isSubmitting}>
        {formError ? (
          <div
            ref={formErrorRef}
            id="login-error"
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
            aria-describedby={emailDescribedBy}
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
            htmlFor="password"
            className="mb-2 block text-[0.82rem] font-semibold text-charcoal"
          >
            Password
          </label>
          <div className="relative">
            <input
              id="password"
              type={showPassword ? "text" : "password"}
              autoComplete="current-password"
              enterKeyHint="go"
              required
              placeholder="Enter your password"
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

        <div className="mt-2 flex flex-wrap items-center justify-between gap-x-4 gap-y-1">
          <label className="flex min-h-11 cursor-pointer items-center gap-2.5 text-sm text-charcoal/70">
            <input
              type="checkbox"
              className="size-4 cursor-pointer rounded border-charcoal/30 accent-forest"
              {...register("remember")}
            />
            Remember me
          </label>
          <a
            href={FORGOT_PASSWORD_MAILTO}
            title="Email Keylo support to reset your password"
            className="inline-flex min-h-11 items-center text-sm font-semibold text-forest underline-offset-4 transition-colors duration-200 hover:text-forest-deep hover:underline"
          >
            Forgot password?
          </a>
        </div>

        <div className="mt-3">
          <label className="flex items-start gap-2.5 cursor-pointer text-sm leading-6 text-charcoal/70">
            <input
              id="privacy-consent"
              type="checkbox"
              className="mt-1 size-4 cursor-pointer rounded border-charcoal/30 accent-forest shrink-0"
              {...register("privacyConsent")}
            />
            <span>
              I agree to the{" "}
              <Link
                to="/privacy"
                className="font-semibold text-forest underline-offset-4 transition-colors duration-200 hover:text-forest-deep hover:underline"
              >
                Privacy Policy
              </Link>
              {" and how Keylo handles my personal data."}
            </span>
          </label>
          {errors.privacyConsent ? (
            <p
              id="privacy-consent-error"
              className="mt-2 flex items-start gap-1.5 text-sm leading-5 text-clay"
            >
              <AlertCircle
                aria-hidden="true"
                className="mt-0.5 size-3.5 shrink-0"
              />
              {errors.privacyConsent.message}
            </p>
          ) : null}
        </div>

        <button
          type="submit"
          disabled={isSubmitting}
          className="group mt-3 inline-flex min-h-[52px] w-full items-center justify-center gap-2.5 rounded-full bg-forest px-6 text-[0.95rem] font-semibold text-ivory transition-colors duration-300 hover:bg-forest-deep disabled:cursor-not-allowed disabled:bg-forest/60"
        >
          {isSubmitting ? (
            <>
              <LoaderCircle
                aria-hidden="true"
                className="size-4 animate-spin motion-reduce:animate-none"
              />
              Signing in…
            </>
          ) : (
            <>
              Sign in
              <ArrowRight
                aria-hidden="true"
                className="size-4 transition-transform duration-300 group-hover:translate-x-0.5"
              />
            </>
          )}
        </button>

        <p className="mt-8 border-t border-charcoal/10 pt-6 text-sm leading-6 text-charcoal/65">
          New to Keylo?{" "}
          <Link
            to="/register"
            className="font-semibold text-forest underline-offset-4 transition-colors duration-200 hover:text-forest-deep hover:underline"
          >
            Create a buyer account
          </Link>
        </p>
      </form>
    </AuthLayout>
  );
}
