import Link from "next/link";
import { redirect } from "next/navigation";
import { requireProfile } from "@/lib/auth";
import { SubmitButton } from "@/components/SubmitButton";
import { Notice, PageHeader } from "@/components/ui";
import { formatDateTime } from "@/lib/labels";

const STATUSES = [
  { value: "new", label: "New", cls: "bg-blue-100 text-blue-800" },
  { value: "contacted", label: "Contacted", cls: "bg-amber-100 text-amber-800" },
  { value: "converted", label: "Became a customer", cls: "bg-emerald-100 text-emerald-800" },
  { value: "closed", label: "Closed", cls: "bg-stone-200 text-stone-600" },
];

async function updateEnquiry(formData: FormData) {
  "use server";
  const { supabase } = await requireProfile(["office"]);
  await supabase.from("enquiries").update({
    status: String(formData.get("status")),
    office_notes: String(formData.get("office_notes") ?? "").trim() || null,
  }).eq("id", String(formData.get("id")));
  redirect(`/office/enquiries?tab=${formData.get("tab") ?? "open"}`);
}

async function convertToCustomer(formData: FormData) {
  "use server";
  const { supabase } = await requireProfile(["office"]);
  const id = String(formData.get("id"));
  const { data: e } = await supabase.from("enquiries").select("*").eq("id", id).single();
  if (!e) redirect("/office/enquiries");
  const { data: c, error } = await supabase.from("customers").insert({
    name: e.name, email: e.email, phone: e.phone, billing_postcode: e.postcode,
    notes: `From website enquiry (${e.service ?? "general"}): ${e.message}`,
  }).select("id").single();
  if (error) redirect(`/office/enquiries?error=${encodeURIComponent(error.message)}`);
  await supabase.from("enquiries").update({ status: "converted", customer_id: c!.id }).eq("id", id);
  redirect(`/office/customers/${c!.id}`);
}

export default async function Enquiries({ searchParams }: { searchParams: Promise<{ tab?: string; error?: string }> }) {
  const { tab = "open", error } = await searchParams;
  const { supabase } = await requireProfile(["office"]);
  let q = supabase.from("enquiries").select("*").order("created_at", { ascending: false }).limit(200);
  q = tab === "open" ? q.in("status", ["new", "contacted"]) : q.in("status", ["converted", "closed"]);
  const { data: enquiries } = await q;

  return (
    <>
      <PageHeader title="Website enquiries" />
      {error && <Notice tone="error">{error}</Notice>}
      <div className="mb-4 flex gap-2">
        {[["open", "Open"], ["done", "Done"]].map(([k, l]) => (
          <Link key={k} href={`/office/enquiries?tab=${k}`} className={`rounded-full px-3 py-1.5 text-sm ${tab === k ? "bg-brand-green text-white" : "border border-stone-200 bg-white"}`}>{l}</Link>
        ))}
      </div>
      {!enquiries?.length && <div className="card text-sm text-stone-500">No enquiries here.</div>}
      <div className="space-y-3">
        {(enquiries ?? []).map((e) => {
          const st = STATUSES.find((s) => s.value === e.status)!;
          return (
            <div key={e.id} className="card text-sm">
              <div className="flex flex-wrap items-start justify-between gap-2">
                <div>
                  <div className="text-base font-semibold">{e.name}</div>
                  <div className="text-xs text-stone-500">{formatDateTime(e.created_at)}{e.service ? ` · ${e.service}` : ""}{e.postcode ? ` · ${e.postcode}` : ""}</div>
                </div>
                <span className={`rounded-full px-2.5 py-0.5 text-xs font-medium ${st.cls}`}>{st.label}</span>
              </div>
              <div className="mt-2 flex flex-wrap gap-3">
                {e.phone && <a className="font-semibold text-brand-green underline" href={`tel:${e.phone.replace(/\s/g, "")}`}>{e.phone}</a>}
                {e.email && <a className="font-semibold text-brand-green underline" href={`mailto:${e.email}`}>{e.email}</a>}
              </div>
              <p className="mt-3 whitespace-pre-wrap text-stone-700">{e.message}</p>
              <form action={updateEnquiry} className="mt-4 grid gap-2 border-t border-stone-100 pt-3 md:grid-cols-4 md:items-end">
                <input type="hidden" name="id" value={e.id} /><input type="hidden" name="tab" value={tab} />
                <div className="md:col-span-2"><input className="input" name="office_notes" defaultValue={e.office_notes ?? ""} placeholder="Office notes (only you see these)" /></div>
                <select className="input" name="status" defaultValue={e.status}>{STATUSES.map((s) => <option key={s.value} value={s.value}>{s.label}</option>)}</select>
                <SubmitButton className="btn-outline">Save</SubmitButton>
              </form>
              {!e.customer_id && e.status !== "closed" && (
                <form action={convertToCustomer} className="mt-2">
                  <input type="hidden" name="id" value={e.id} />
                  <SubmitButton className="btn-gold">Make them a customer</SubmitButton>
                </form>
              )}
              {e.customer_id && <Link href={`/office/customers/${e.customer_id}`} className="mt-2 inline-block text-brand-green underline">View customer</Link>}
            </div>
          );
        })}
      </div>
    </>
  );
}
