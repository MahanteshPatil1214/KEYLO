type LogoProps = {
  tone?: "dark" | "light";
  className?: string;
  href?: string;
};

export function Logo({
  tone = "dark",
  className = "",
  href = "#top",
}: LogoProps) {
  const wordmark = tone === "dark" ? "text-charcoal" : "text-ivory";
  const mark =
    tone === "dark"
      ? "bg-charcoal text-ivory"
      : "bg-sand text-charcoal";

  return (
    <a
      href={href}
      aria-label="Keylo home"
      className={`group inline-flex items-center gap-2.5 ${className}`}
    >
      <span
        className={`grid size-9 shrink-0 place-items-center rounded-[10px] transition-transform duration-500 ease-out group-hover:-rotate-3 ${mark}`}
      >
        <svg viewBox="0 0 24 24" aria-hidden="true" className="size-[19px]">
          <path
            d="M6.5 19.5v-15h2.7v6.2l5.5-6.2h3.4l-5.9 6.5 6.1 8.5h-3.4l-4.6-6.6-1.1 1.2v5.4H6.5Z"
            fill="currentColor"
          />
          <circle cx="20" cy="4.7" r="1.15" fill="#C5A77D" />
        </svg>
      </span>
      <span
        className={`font-display text-[1.68rem] leading-none tracking-[-0.035em] ${wordmark}`}
      >
        keylo
      </span>
    </a>
  );
}
