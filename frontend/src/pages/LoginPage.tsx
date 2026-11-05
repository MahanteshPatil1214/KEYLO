import { useEffect, useRef, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { z } from "zod";
import {
  AlertCircle,
  ArrowLeft,
  ArrowRight,
  Eye,
  EyeOff,
  LoaderCircle,
  ShieldCheck,
} from "lucide-react";
import {
  ApiError,
  fetchCurrentUser,
  homeForRole,
  loginRequest,
  roleFromName,
} from "../auth/api";
import {
  forgetRememberedEmail,
  getRememberedEmail,
  rememberEmail,
  saveSession,
} from "../auth/session";
import { Logo } from "../components/Logo";

const loginSchema = z.object({
  email: z
    .string()
    .trim()
    .min(1, "Enter your email address.")
    .email("Enter a valid email address."),
  password: z.string().min(1, "Enter your password."),
  remember: z.boolean(),
});

type LoginValues = z.infer<typeof loginSchema>;

const FORGOT_PASSWORD_MAILTO =
  "mailto:hello@keylo.dev?subject=Keylo%20password%20reset";

function fieldClasses(invalid: boolean): string {
  return [
    "block h-12 w-full rounded-lg border px-4 text-base text-charcoal outline-none transition-colors duration-200",
    "placeholder:text-charcoal/60 focus:bg-white focus:ring-4",
    invalid
      ? "border-clay/70 bg-clay-soft/35 focus:border-clay focus:ring-clay/15"
      : "border-charcoal/15 bg-white/60 focus:border-forest focus:ring-forest/15",
  ].join(" ");
}

export function LoginPage() {
  const navigate = useNavigate();
  const [showPassword, setShowPassword] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [rememberedEmail] = useState(() => getRememberedEmail());
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
      email: rememberedEmail,
      password: "",
      remember: Boolean(rememberedEmail),
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
    <div className="min-h-svh bg-ivory lg:grid lg:grid-cols-[minmax(0,0.92fr)_minmax(0,1.08fr)]">
      <a
        href="#main"
        className="sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-[60] focus:rounded-full focus:bg-charcoal focus:px-5 focus:py-3 focus:text-sm focus:font-semibold focus:text-ivory"
      >
        Skip to sign-in form
      </a>

      <main
        id="main"
        tabIndex={-1}
        className="flex min-h-svh flex-col px-5 py-6 sm:px-8 lg:order-2 lg:px-12 lg:py-8 xl:px-20"
      >
        <div className="mx-auto flex w-full max-w-[440px] flex-1 flex-col">
          <header className="flex items-center justify-between gap-4">
            <Logo className="lg:hidden" />
            <a
              href="/"
              className="ml-auto inline-flex min-h-11 items-center gap-2 text-[0.8rem] font-semibold text-charcoal/65 transition-colors duration-200 hover:text-charcoal"
            >
              <ArrowLeft aria-hidden="true" className="size-3.5" />
              Back to home
            </a>
          </header>

          <div className="flex flex-1 items-center py-8 sm:py-10 lg:py-12">
            <section
              aria-labelledby="login-heading"
              className="w-full"
            >
              <p className="eyebrow">Secure access</p>
              <h1
                id="login-heading"
                className="mt-4 font-display text-[2.75rem] leading-[0.98] tracking-[-0.03em] sm:text-[3.25rem]"
              >
                Sign in to Keylo.
              </h1>
              <p className="mt-4 max-w-sm text-sm leading-7 text-charcoal/65">
                Continue to your enquiries, site visits and buyer conversations.
              </p>

              <form
                noValidate
                onSubmit={handleSubmit(onSubmit)}
                aria-busy={isSubmitting}
                className="mt-7 sm:mt-8"
              >
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
                      aria-label={
                        showPassword ? "Hide password" : "Show password"
                      }
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
            </section>
          </div>

          <footer className="mt-auto flex items-start gap-2 border-t border-charcoal/10 pt-5 text-xs leading-5 text-charcoal/70">
            <ShieldCheck
              aria-hidden="true"
              className="mt-0.5 size-4 shrink-0 text-forest"
            />
            <p>Access is scoped to your role and assigned projects.</p>
          </footer>
        </div>
      </main>

      <aside
        aria-label="About Keylo"
        className="relative hidden overflow-hidden bg-charcoal lg:sticky lg:top-0 lg:order-1 lg:block lg:h-svh"
      >
        <img
          src="/images/hero-villa-1200.webp"
          srcSet="/images/hero-villa-800.webp 800w, /images/hero-villa-1200.webp 1200w, /images/hero-villa-1600.webp 1600w"
          sizes="(min-width: 1024px) 46vw, 100vw"
          alt=""
          className="absolute inset-0 h-full w-full object-cover object-center"
        />
        <div
          aria-hidden="true"
          className="absolute inset-0 bg-charcoal/70"
        />

        <div className="relative flex h-full flex-col justify-between p-10 xl:p-14">
          <Logo tone="light" href="/" />

          <div className="max-w-[34rem]">
            <p className="eyebrow-light">Private access</p>
            <p className="mt-5 font-display text-[3.15rem] leading-[1.02] tracking-[-0.03em] text-ivory xl:text-[3.8rem]">
              Every considered reply begins with the right conversation.
            </p>
            <div aria-hidden="true" className="mt-8 h-px w-16 bg-sand" />
            <p className="mt-6 max-w-md text-sm leading-7 text-ivory/90">
              Sign in to manage enquiries, site visits and buyer conversations
              across your assigned projects.
            </p>
          </div>

          <p className="text-[0.65rem] font-semibold uppercase tracking-[0.2em] text-ivory/90">
            Keylo / Enquiry desk
          </p>
        </div>
      </aside>
    </div>
  );
}
