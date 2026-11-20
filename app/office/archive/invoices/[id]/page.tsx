import { notFound } from "next/navigation";
import { requireProfile } from "@/lib/auth";
import { ArchiveDoc, type ArchiveLine } from "@/components/ArchiveDoc";

export default async function ArchiveInvoice({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const { supabase } = await requireProfile(["office"]);
  const { data: doc } = await supabase.from("tradify_invoices").select("*").eq("id", id).single();
  if (!doc) notFound();
  const [{ data: lines }, { data: live }] = await Promise.all([
    supabase.from("tradify_invoice_lines").select("id, line_number, item_code, description, quantity, unit_price, discount_pct, amount").eq("invoice_id", id).order("line_number"),
    supabase.from("customers").select("id").eq("tradify_customer_id", doc.customer_id).maybeSingle(),
  ]);
  return <ArchiveDoc kind="Invoice" doc={doc} lines={(lines ?? []) as ArchiveLine[]} liveCustomerId={live?.id ?? null} />;
}
