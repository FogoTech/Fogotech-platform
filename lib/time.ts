const TZ = "Europe/London";

function offsetMinutes(date: Date) {
  const parts = new Intl.DateTimeFormat("en-GB", {
    timeZone: TZ, hourCycle: "h23", year: "numeric", month: "2-digit", day: "2-digit", hour: "2-digit", minute: "2-digit", second: "2-digit",
  }).formatToParts(date);
  const v = (t: string) => Number(parts.find((p) => p.type === t)?.value);
  const asUtc = Date.UTC(v("year"), v("month") - 1, v("day"), v("hour"), v("minute"), v("second"));
  return (asUtc - date.getTime()) / 60000;
}

/** "2026-11-16T09:00" entered in UK time -> ISO string in UTC */
export function londonLocalToIso(local: string | null) {
  if (!local) return null;
  const guess = new Date(local + ":00Z");
  return new Date(guess.getTime() - offsetMinutes(guess) * 60000).toISOString();
}

/** ISO string -> "2026-11-16T09:00" in UK time, for datetime-local inputs */
export function isoToLondonLocal(iso: string | null) {
  if (!iso) return "";
  const d = new Date(iso);
  const shifted = new Date(d.getTime() + offsetMinutes(d) * 60000);
  return shifted.toISOString().slice(0, 16);
}
