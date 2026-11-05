type SectionLabelProps = {
  number: string;
  children: string;
  tone?: "dark" | "light";
};

export function SectionLabel({
  number,
  children,
  tone = "dark",
}: SectionLabelProps) {
  const base = tone === "light" ? "text-ivory" : "text-forest";

  return (
    <div className={`flex items-center gap-3 ${base}`}>
      <span className="font-sans text-[0.68rem] font-medium tabular-nums tracking-[0.16em]">
        {number}
      </span>
      <span className="h-px w-7 bg-current opacity-35" aria-hidden="true" />
      <span
        className={`text-[0.68rem] font-semibold uppercase tracking-[0.22em]`}
      >
        {children}
      </span>
    </div>
  );
}
