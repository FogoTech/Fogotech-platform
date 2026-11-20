import Link from "next/link";
import { requireProfile } from "@/lib/auth";
import { PageHeader } from "@/components/ui";
import { formatDate } from "@/lib/labels";
import { money } from "@/lib/money";

const TABS = [
  { key: "estimates", label: "Estimates" },
  { key: "invoices", label: "Invoices" },
  { key: "prices", label: "Old price list" },
];
const PAGE = 50;

export default async function Archive({ searchParams }: { searchParams: Promise<{ tab?: string; q?: string; page?: string }> }) {
  const { tab = "estimates", q = "", page = "1" } = await searchParams;
  const p = Math.max(1, Number(page) || 1);
  const from = (p - 1) * PAGE;
  const { supabase } = await requireProfile(["office"]);
  const term = q.trim().replace(/[%,()]/g, " ");

  let rows: Record<string, unknown>[] = [];
  let count = 0;
  if (tab === "estimates") {
    let query = supabase.from("tradify_quotes").select("id, quote_number, customer_name, reference, quote_date, total, status_in_tradify", { count: "exact" })
      .order("quote_number", { ascending: false }).range(from, from + PAGE - 1);
    if (term) query = query.or(`quote_number.ilike.%${term}%,customer_name.ilike.%${term}%,reference.ilike.%${term}%,description.ilike.%${term}%`);
    const r = await query; rows = r.data ?? []; count = r.count ?? 0;
  } else if (tab === "invoices") {
    let query = supabase.from("tradify_invoices").select("id, invoice_number, customer_name, reference, invoice_date, total, due, status_in_tradify", { count: "exact" })
      .order("invoice_number", { ascending: false }).range(from, from + PAGE - 1);
    if (term) query = query.or(`invoice_number.ilike.%${term}%,customer_name.ilike.%${term}%,reference.ilike.%${term}%,description.ilike.%${term}%`);
    const r = await query; rows = r.data ?? []; count = r.count ?? 0;
  } else {
    let query = supabase.from("tradify_price_list").select("id, item_code, description, supplier, category, buy_price, buy_price_includes_vat, sell_price_standard", { count: "exact" })
      .order("item_code").range(from, from + PAGE - 1);
    if (term) query = query.or(`item_code.ilike.%${term}%,description.ilike.%${term}%,supplier.ilike.%${term}%,category.ilike.%${term}%`);
    const r = await query; rows = r.data ?? []; count = r.count ?? 0;
  }
  const pages = Math.max(1, Math.ceil(count / PAGE));
  const link = (o: Record<string, string>) => `/office/archive?${new URLSearchParams({ tab, q, page: String(p), ...o })}`;

  return (
    <>
      <PageHeader title="Tradify archive" />
      <p className="mb-4 text-sm text-brand-mute">
        Read-only copy of your Tradify records from 19 November 2026, for reference. Only the office can see this. Tradify&apos;s
        paid/unpaid status isn&apos;t reliable, so check Xero for what&apos;s actually outstanding.
      </p>
      <div className="mb-3 flex gap-2 overflow-x-auto">
        {TABS.map((t) => (
          <Link key={t.key} href={`/office/archive?tab=${t.key}`}
            className={`whitespace-nowrap rounded-full px-3 py-1.5 text-sm ${tab === t.key ? "bg-brand-green text-white" : "border border-brand-line bg-white"}`}>{t.label}</Link>
        ))}
      </div>
      <form className="mb-4 flex gap-2">
        <input type="hidden" name="tab" value={tab} />
        <input className="input max-w-md" name="q" defaultValue={q} placeholder="Search number, customer, reference or description…" />
        <button className="btn-outline">Search</button>
      </form>
      <div className="mb-2 text-xs text-brand-mute">{count} {count === 1 ? "record" : "records"}</div>

      <div className="overflow-hidden rounded-xl border border-brand-line bg-white">
        <ul className="divide-y divide-brand-line text-sm">
          {rows.map((r) => {
            if (tab === "prices") {
              return (
                <li key={String(r.id)} className="flex flex-wrap justify-between gap-2 px-4 py-2.5">
                  <div className="min-w-0">
                    <div className="font-medium">{String(r.description ?? r.item_code)}</div>
                    <div className="text-xs text-brand-mute">{[r.item_code, r.supplier, r.category].filter(Boolean).join(" · ")}</div>
                  </div>
                  <div className="text-right text-xs">
                    <div>Sell: <strong>{money(r.sell_price_standard as number)}</strong></div>
                    <div className="text-brand-mute">Buy: {money(r.buy_price as number)}{r.buy_price_includes_vat ? " inc VAT" : ""}</div>
                  </div>
                </li>
              );
            }
            const isQ = tab === "estimates";
            const num = String(isQ ? r.quote_number : r.invoice_number);
            const date = (isQ ? r.quote_date : r.invoice_date) as string | null;
            return (
              <li key={String(r.id)}>
                <Link href={`/office/archive/${tab}/${r.id}`} className="flex flex-wrap items-start justify-between gap-2 px-4 py-2.5 hover:bg-brand-bg">
                  <div className="min-w-0">
                    <div className="font-semibold"><span className="text-brand-mute">{num}</span> {String(r.customer_name)}</div>
                    <div className="text-xs text-brand-mute">{formatDate(date)}{r.reference ? ` · ${r.reference}` : ""}</div>
                  </div>
                  <div className="text-right">
                    <div className="font-semibold">{money(r.total as number)}</div>
                    {r.status_in_tradify ? <div className="text-xs text-brand-mute">{String(r.status_in_tradify)}</div> : null}
                  </div>
                </Link>
              </li>
            );
          })}
          {!rows.length && <li className="px-4 py-3 text-brand-mute">Nothing found.</li>}
        </ul>
      </div>
      {pages > 1 && (
        <div className="mt-4 flex items-center gap-3 text-sm">
          {p > 1 && <Link className="btn-outline" href={link({ page: String(p - 1) })}>← Previous</Link>}
          <span className="text-brand-mute">Page {p} of {pages}</span>
          {p < pages && <Link className="btn-outline" href={link({ page: String(p + 1) })}>Next →</Link>}
        </div>
      )}
    </>
  );
}
