export function money(v: number | string | null | undefined) {
  if (v === null || v === undefined || v === "") return "—";
  return Number(v).toLocaleString("en-GB", { style: "currency", currency: "GBP" });
}
