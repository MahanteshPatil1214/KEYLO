const shortDateFormatter = new Intl.DateTimeFormat("en-IN", {
  weekday: "short",
  day: "numeric",
  month: "short",
});

const longDateFormatter = new Intl.DateTimeFormat("en-IN", {
  weekday: "long",
  day: "numeric",
  month: "long",
});

const dayFormatter = new Intl.DateTimeFormat("en-IN", {
  weekday: "short",
});

const datePartsFormatter = new Intl.DateTimeFormat("en-IN", {
  day: "numeric",
  month: "short",
});

const timeFormatter = new Intl.DateTimeFormat("en-IN", {
  hour: "numeric",
  minute: "2-digit",
});

const monthYearFormatter = new Intl.DateTimeFormat("en-IN", {
  month: "long",
  year: "numeric",
});

const dateTimeFormatter = new Intl.DateTimeFormat("en-IN", {
  dateStyle: "medium",
  timeStyle: "short",
});

function toDate(value: string | Date): Date | null {
  const date = value instanceof Date ? value : new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
}

export function formatLongDate(value: string | Date = new Date()): string {
  const date = toDate(value);
  return date ? longDateFormatter.format(date) : "";
}

export function formatShortDate(value: string | Date): string {
  const date = toDate(value);
  return date ? shortDateFormatter.format(date) : "—";
}

export function formatDateTime(value: string | Date): string {
  const date = toDate(value);
  return date ? dateTimeFormatter.format(date) : "—";
}

export function formatTime(value: string | Date): string {
  const date = toDate(value);
  return date ? timeFormatter.format(date) : "—";
}

export function formatTimeRange(start: string | Date, end: string | Date): string {
  const startLabel = formatTime(start);
  const endLabel = formatTime(end);
  if (startLabel === "—" || endLabel === "—") return "—";
  return `${startLabel} – ${endLabel}`;
}

export function formatMonthYear(value: string | Date): string {
  const date = toDate(value);
  return date ? monthYearFormatter.format(date) : "—";
}

export function formatDayParts(value: string | Date): {
  weekday: string;
  date: string;
} {
  const parsed = toDate(value);
  if (!parsed) return { weekday: "—", date: "—" };
  return {
    weekday: dayFormatter.format(parsed),
    date: datePartsFormatter.format(parsed),
  };
}

export function formatRelativeTime(
  value: string | Date,
  now: number = Date.now(),
): string {
  const date = toDate(value);
  if (!date) return "—";

  const diffSeconds = Math.round((date.getTime() - now) / 1000);
  const absSeconds = Math.abs(diffSeconds);

  if (absSeconds < 60) {
    return diffSeconds > 0 ? "In a moment" : "Just now";
  }

  const minutes = Math.round(absSeconds / 60);
  if (minutes < 60) {
    return diffSeconds > 0 ? `In ${minutes}m` : `${minutes}m ago`;
  }

  const hours = Math.round(minutes / 60);
  if (hours < 24) {
    return diffSeconds > 0 ? `In ${hours}h` : `${hours}h ago`;
  }

  const days = Math.round(hours / 24);
  if (days === 1) return diffSeconds > 0 ? "Tomorrow" : "Yesterday";
  if (days < 7) {
    return diffSeconds > 0 ? `In ${days}d` : `${days}d ago`;
  }

  return shortDateFormatter.format(date);
}

export function startOfToday(now: Date = new Date()): Date {
  const start = new Date(now);
  start.setHours(0, 0, 0, 0);
  return start;
}

export function endOfToday(now: Date = new Date()): Date {
  const end = new Date(now);
  end.setHours(23, 59, 59, 999);
  return end;
}

export function initialsOf(fullName: string): string {
  return (
    fullName
      .trim()
      .split(/\s+/)
      .map((part) => part[0])
      .filter(Boolean)
      .slice(0, 2)
      .join("")
      .toUpperCase() || "SE"
  );
}

export function firstNameOf(fullName: string): string {
  return fullName.trim().split(/\s+/)[0] || "there";
}

export function greetingFor(date: Date = new Date()): string {
  const hour = date.getHours();
  if (hour < 12) return "Good morning";
  if (hour < 17) return "Good afternoon";
  return "Good evening";
}
