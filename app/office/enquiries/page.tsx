import Link from "next/link";
import { redirect } from "next/navigation";
import { requireProfile } from "@/lib/auth";
import { SubmitButton } from "@/components/SubmitButton";
import { Notice, PageHeader } from "@/components/ui";
import { formatDateTime } from "@/lib/labels";
import { ENQUIRY_SERVICES } from "@/lib/site-shared";

const STATUSES = [
  { value: "new", label: "New", cls: "bg-blue-100 text-blue-800" },
  { value: "contacted", label: "Contacted", cls: "bg-amber-100 text-amber-800" },
  { value: "converted", label: "Became a customer", cls: "bg-emerald-100 text-emerald-800" },
  { value: "closed", label: "Closed", cls: "bg-stone-200 text-stone-600" },
];

const SOURCES = [
  { value: "phone", label: "Phone call" },
  { value: "email", label: "Email" },
  { value: "whatsapp", label: "WhatsApp" },
  { value: "in_person", label: "In person" },
  { value: "referral", label: "Referral" },
  { value: "other", label: "Other" },
  { value: "website", label: "Website" },
];

async function addEnquiry(formData: FormData) {
  "use server";
  const { supabase, profile } = await requireProfile(["office"]);
  const get = (k: string) => String(formData.get(k) ?? "").trim() || null;
  const { error } = await supabase.from("enquiries").insert({
    name: get("name"), phone: get("phone"), email: get("email"),
    service: get("service"), postcode: get("postcode")?.toUpperCase() ?? null,
    message: get("message") ?? "(no details)", source: get("source") ?? "phone",
    office_notes: get("office_notes"), created_by: profile.id,
  });
  if (error) {
    const msg = error.message.includes("enquiry_has_contact") ? "Add a phone number or email." : error.message;
    redirect(`/office/enquiries?add=1&error=${encodeURIComponent(msg)}`);
  }
  redirect("/office/enquiries?added=1");
}

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

export default async function Enquiries({ searchParams }: { searchParams: Promise<{ tab?: string; error?: string; add?: string; added?: string }> }) {
  const { tab = "open", error, add, added } = await searchParams;
  const { supabase } = await requireProfile(["office"]);
  let q = supabase.from("enquiries").select("*").order("created_at", { ascending: false }).limit(200);
  q = tab === "open" ? q.in("status", ["new", "contacted"]) : q.in("status", ["converted", "closed"]);
  const { data: enquiries } = await q;

  return (
    <>
      <PageHeader title="Enquiries" action={!add && <Link href="/office/enquiries?add=1" className="btn-gold">+ Add enquiry</Link>} />
      {error && <Notice tone="error">{error}</Notice>}
      {added && <Notice tone="success">Enquiry added.</Notice>}
      {add && (
        <form action={addEnquiry} className="card mb-6 grid gap-3 md:grid-cols-2">
          <h2 className="text-lg font-semibold md:col-span-2">Add an enquiry</h2>
          <div><label className="label">Name</label><input className="input" name="name" required autoFocus /></div>
          <div>
            <label className="label">How did they get in touch?</label>
            <select className="input" name="source" defaultValue="phone">{SOURCES.map((s) => <option key={s.value} value={s.value}>{s.label}</option>)}</select>
          </div>
          <div><label className="label">Phone</label><input className="input" name="phone" type="tel" /></div>
          <div><label className="label">Email</label><input className="input" name="email" type="email" /></div>
          <div>
            <label className="label">What do they need?</label>
            <select className="input" name="service" defaultValue=""><option value="">Choose…</option>{ENQUIRY_SERVICES.map((x) => <option key={x}>{x}</option>)}</select>
          </div>
          <div><label className="label">Postcode</label><input className="input" name="postcode" /></div>
          <div className="md:col-span-2"><label className="label">Details</label><textarea className="input min-h-24" name="message" placeholder="What they asked for" /></div>
          <div className="md:col-span-2"><label className="label">Follow-up notes</label><input className="input" name="office_notes" placeholder="e.g. Call back Tuesday after 2pm" /></div>
          <div className="flex gap-2 md:col-span-2">
            <SubmitButton>Save enquiry</SubmitButton>
            <Link href="/office/enquiries" className="btn-outline">Cancel</Link>
          </div>
        </form>
      )}
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
                  <div className="text-xs text-stone-500">{formatDateTime(e.created_at)} · {SOURCES.find((x) => x.value === e.source)?.label ?? e.source}{e.service ? ` · ${e.service}` : ""}{e.postcode ? ` · ${e.postcode}` : ""}</div>
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
