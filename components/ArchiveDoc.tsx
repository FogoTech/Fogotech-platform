import Link from "next/link";
import { money } from "@/lib/money";
import { formatDate } from "@/lib/labels";

export type ArchiveLine = {
  id: string; line_number: number; section?: string | null; item_code: string | null; description: string | null;
  quantity: number | null; unit_price: number | null; discount_pct: number | null; amount: number | null;
};

/** Read-only view of an old Tradify estimate or invoice, with sections kept. */
export function ArchiveDoc({ kind, doc, lines, liveCustomerId }: {
  kind: "Estimate" | "Invoice";
  doc: Record<string, unknown>;
  lines: ArchiveLine[];
  liveCustomerId: string | null;
}) {
  const sections: { name: string; items: ArchiveLine[] }[] = [];
  for (const l of lines) {
    const name = l.section ?? "";
    const last = sections[sections.length - 1];
    if (last && last.name === name) last.items.push(l);
    else sections.push({ name, items: [l] });
  }
  const sum = (ls: ArchiveLine[]) => ls.reduce((t, l) => t + Number(l.amount ?? 0), 0);
  const num = String(kind === "Estimate" ? doc.quote_number : doc.invoice_number);
  const date = (kind === "Estimate" ? doc.quote_date : doc.invoice_date) as string | null;

  return (
    <>
      <div className="mb-2 text-sm"><Link href={`/office/archive?tab=${kind === "Estimate" ? "estimates" : "invoices"}`} className="text-brand-green underline">← Archive</Link></div>
      <div className="mb-6 flex flex-wrap items-start justify-between gap-3">
        <div>
          <div className="text-xs font-semibold uppercase tracking-wide text-brand-gold-dark">Tradify {kind.toLowerCase()} · archive</div>
          <h1 className="text-2xl font-bold">{num} · {String(doc.customer_name)}</h1>
          {liveCustomerId && <Link href={`/office/customers/${liveCustomerId}`} className="text-sm text-brand-green underline">Open customer</Link>}
        </div>
        {doc.status_in_tradify ? <span className="rounded-full bg-stone-100 px-3 py-1 text-xs">Tradify: {String(doc.status_in_tradify)}</span> : null}
      </div>
      <div className="mb-4 grid gap-4 md:grid-cols-2">
        <div className="card text-sm space-y-1">
          <div><span className="text-brand-mute">Date:</span> {formatDate(date)}</div>
          {kind === "Estimate" ? <div><span className="text-brand-mute">Expires:</span> {formatDate(doc.expiry_date as string | null)}</div>
            : <div><span className="text-brand-mute">Due:</span> {formatDate(doc.due_date as string | null)}</div>}
          {doc.reference ? <div><span className="text-brand-mute">Reference:</span> {String(doc.reference)}</div> : null}
          {doc.sent_to ? <div><span className="text-brand-mute">Sent to:</span> {String(doc.sent_to)}</div> : null}
          {doc.tradify_jobs ? <div><span className="text-brand-mute">Tradify job:</span> {String(doc.tradify_jobs)}</div> : null}
        </div>
        <div className="card whitespace-pre-wrap text-sm">{String(doc.description ?? doc.postal_address ?? "—")}</div>
      </div>

      <div className="overflow-x-auto rounded-xl border border-brand-line bg-white">
        <table className="w-full text-sm">
          <thead className="bg-brand-bg text-left text-xs uppercase tracking-wide text-brand-mute">
            <tr><th className="px-3 py-2">Item</th><th className="px-3 py-2 text-right">Qty</th><th className="px-3 py-2 text-right">Price</th><th className="px-3 py-2 text-right">Amount</th></tr>
          </thead>
          <tbody>
            {sections.map((s, i) => (
              <SectionRows key={i} name={s.name} items={s.items} subtotal={sections.length > 1 && s.name ? sum(s.items) : null} />
            ))}
          </tbody>
        </table>
      </div>

      <div className="ml-auto mt-4 w-full max-w-xs space-y-1 text-sm">
        {Number(doc.discount ?? 0) > 0 && <Row label="Discount" v={-Number(doc.discount)} />}
        <Row label="Subtotal" v={doc.subtotal as number} />
        <Row label="VAT" v={doc.tax as number} />
        <Row label="Total" v={doc.total as number} bold />
        {kind === "Invoice" && <><Row label="Paid (per Tradify)" v={doc.paid as number} /><Row label="Due (per Tradify)" v={doc.due as number} /></>}
      </div>
    </>
  );
}

function Row({ label, v, bold }: { label: string; v: number | null | undefined; bold?: boolean }) {
  return <div className={`flex justify-between ${bold ? "border-t border-brand-line pt-1 text-base font-bold" : ""}`}><span>{label}</span><span>{money(v)}</span></div>;
}

function SectionRows({ name, items, subtotal }: { name: string; items: ArchiveLine[]; subtotal: number | null }) {
  return (
    <>
      {name && <tr className="bg-brand-green-light"><td colSpan={4} className="px-3 py-2 font-semibold text-brand-green-dark">{name}</td></tr>}
      {items.map((l) => (
        <tr key={l.id} className="border-t border-brand-line align-top">
          <td className="px-3 py-2"><div className="whitespace-pre-wrap">{l.description}</div>{l.item_code && <div className="text-xs text-brand-mute">{l.item_code}</div>}</td>
          <td className="px-3 py-2 text-right">{l.quantity ?? ""}</td>
          <td className="px-3 py-2 text-right">{money(l.unit_price)}{Number(l.discount_pct ?? 0) > 0 && <div className="text-xs text-brand-mute">−{l.discount_pct}%</div>}</td>
          <td className="px-3 py-2 text-right">{money(l.amount)}</td>
        </tr>
      ))}
      {subtotal !== null && <tr className="border-t border-brand-line"><td colSpan={3} className="px-3 py-1.5 text-right text-xs text-brand-mute">{name} subtotal</td><td className="px-3 py-1.5 text-right font-semibold">{money(subtotal)}</td></tr>}
    </>
  );
}
