export function fieldClasses(invalid: boolean): string {
  return [
    "block h-12 w-full rounded-lg border px-4 text-base text-charcoal outline-none transition-colors duration-200",
    "placeholder:text-charcoal/60 focus:bg-white focus:ring-4",
    invalid
      ? "border-clay/70 bg-clay-soft/35 focus:border-clay focus:ring-clay/15"
      : "border-charcoal/15 bg-white/60 focus:border-forest focus:ring-forest/15",
  ].join(" ");
}
