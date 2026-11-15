export const JOB_TYPES = [
  { value: "new_install", label: "New install" },
  { value: "fault", label: "Fault" },
  { value: "service", label: "Service" },
  { value: "site_survey", label: "Site survey" },
  { value: "other", label: "Other" },
] as const;

export const JOB_STATUSES = [
  { value: "new", label: "New" },
  { value: "awaiting_schedule", label: "Awaiting scheduling" },
  { value: "scheduled", label: "Scheduled" },
  { value: "in_progress", label: "In progress" },
  { value: "awaiting_parts", label: "Awaiting parts" },
  { value: "on_hold", label: "On hold" },
  { value: "completed", label: "Completed" },
  { value: "invoiced", label: "Invoiced" },
  { value: "cancelled", label: "Cancelled" },
] as const;

export const ENGINEER_STATUSES = ["scheduled", "in_progress", "awaiting_parts", "on_hold", "completed"];

export const ACTIVE_STATUSES = ["new", "awaiting_schedule", "scheduled", "in_progress", "awaiting_parts", "on_hold"];

export function jobTypeLabel(v: string) {
  return JOB_TYPES.find((t) => t.value === v)?.label ?? v;
}

export function statusLabel(v: string) {
  return JOB_STATUSES.find((s) => s.value === v)?.label ?? v;
}

export function statusClass(v: string) {
  switch (v) {
    case "new":
      return "bg-blue-100 text-blue-800";
    case "awaiting_schedule":
      return "bg-amber-100 text-amber-800";
    case "scheduled":
      return "bg-indigo-100 text-indigo-800";
    case "in_progress":
      return "bg-brand-gold/20 text-brand-green-dark";
    case "awaiting_parts":
    case "on_hold":
      return "bg-orange-100 text-orange-800";
    case "completed":
    case "invoiced":
      return "bg-emerald-100 text-emerald-800";
    case "cancelled":
      return "bg-gray-200 text-gray-600";
    default:
      return "bg-gray-100 text-gray-700";
  }
}

export function formatDateTime(v: string | null) {
  if (!v) return "—";
  return new Date(v).toLocaleString("en-GB", {
    timeZone: "Europe/London",
    weekday: "short",
    day: "numeric",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export function formatDate(v: string | null) {
  if (!v) return "—";
  return new Date(v).toLocaleDateString("en-GB", { timeZone: "Europe/London", day: "numeric", month: "short", year: "numeric" });
}
