import Link from "next/link";
import { redirect } from "next/navigation";
import { requireProfile } from "@/lib/auth";
import { SubmitButton } from "@/components/SubmitButton";
import { Notice, PageHeader } from "@/components/ui";
import { formatDateTime } from "@/lib/labels";
import { ENQUIRY_SERVICES } from "@/lib/site-shared";

const STATUSES = [
  { value: "new", label: "New", cls: "bg-blue-100 text-blue-800" },
  { value: "contacted", label: "Contacted", cls: "bg-indigo-100 text-indigo-800" },
  { value: "converted", label: "Became a customer", cls: "bg-emerald-100 text-emerald-800" },
  { value: "closed", label: "Closed", cls: "bg-stone-200 text-stone-600" },
];

const PRIORITIES = [
  { value: "urgent", label: "Urgent", chip: "bg-red-600 text-white", border: "border-l-red-600", ring: "peer-checked:bg-red-600 peer-checked:text-white peer-checked:border-red-600" },
  { value: "high", label: "High", chip: "bg-orange-500 text-white", border: "border-l-orange-500", ring: "peer-checked:bg-orange-500 peer-checked:text-white peer-checked:border-orange-500" },
  { value: "asap", label: "ASAP", chip: "bg-amber-400 text-amber-950", border: "border-l-amber-400", ring: "peer-checked:bg-amber-400 peer-checked:text-amber-950 peer-checked:border-amber-400" },
  { value: "standard", label: "Standard", chip: "bg-emerald-600 text-white", border: "border-l-emerald-600", ring: "peer-checked:bg-emerald-600 peer-checked:text-white peer-checked:border-emerald-600" },
];
const PRIORITY_RANK: Record<string, number> = { urgent: 0, high: 1, asap: 2, standard: 3 };

const ACTIONS = [
  { value: "site_visit", label: "Schedule site visit" },
  { value: "send_estimate", label: "Send estimate" },
  { value: "call_back", label: "Call back" },
  { value: "supplier_quotes", label: "Get quotes from suppliers" },
  { value: "request_info", label: "Ask for floor plans, timelines etc." },
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

type Enquiry = {
  id: string; name: string; phone: string | null; email: string | null; service: string | null; postcode: string | null;
  message: string; status: string; office_notes: string | null; customer_id: string | null; created_at: string;
  source: string; priority: string; actions: string[]; action_other: string | null;
  actions_done: Record<string, { at: string; by: string }>;
};

function readFollowUp(formData: FormData) {
  const actions = formData.getAll("actions").map(String).filter((a) => ACTIONS.some((x) => x.value === a));
  const other = String(formData.get("action_other") ?? "").trim().slice(0, 300);
  if (other) actions.push("other");
  return {
    priority: String(formData.get("priority") ?? "standard"),
    actions,
    action_other: other || null,
    office_notes: String(formData.get("office_notes") ?? "").trim() || null,
  };
}

async function addEnquiry(formData: FormData) {
  "use server";
  const { supabase, profile } = await requireProfile(["office"]);
  const get = (k: string) => String(formData.get(k) ?? "").trim() || null;
  const { error } = await supabase.from("enquiries").insert({
    name: get("name"), phone: get("phone"), email: get("email"),
    service: get("service"), postcode: get("postcode")?.toUpperCase() ?? null,
    message: get("message") ?? "(no details)", source: get("source") ?? "phone",
    created_by: profile.id,
    ...readFollowUp(formData),
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
  const { error } = await supabase.from("enquiries").update({
    status: String(formData.get("status")),
    ...readFollowUp(formData),
  }).eq("id", String(formData.get("id")));
  if (error) redirect(`/office/enquiries?error=${encodeURIComponent(error.message)}`);
  redirect(`/office/enquiries?tab=${formData.get("tab") ?? "open"}&saved=1#e-${formData.get("id")}`);
}

async function toggleAction(formData: FormData) {
  "use server";
  const { supabase, profile } = await requireProfile(["office"]);
  const id = String(formData.get("id"));
  const action = String(formData.get("action"));
  const { data: e } = await supabase.from("enquiries").select("actions_done").eq("id", id).single();
  const done = { ...((e?.actions_done as Record<string, unknown>) ?? {}) };
  if (done[action]) delete done[action];
  else done[action] = { at: new Date().toISOString(), by: profile.full_name || profile.email || "Office" };
  await supabase.from("enquiries").update({ actions_done: done }).eq("id", id);
  redirect(`/office/enquiries?tab=${formData.get("tab") ?? "open"}#e-${id}`);
}

async function convertToCustomer(formData: FormData) {
  "use server";
  const { supabase } = await requireProfile(["office"]);
  const id = String(formData.get("id"));
  const { data: e } = await supabase.from("enquiries").select("*").eq("id", id).single();
  if (!e) redirect("/office/enquiries");
  const { data: c, error } = await supabase.from("customers").insert({
    name: e.name, email: e.email, phone: e.phone, billing_postcode: e.postcode,
    notes: `From enquiry (${e.service ?? "general"}): ${e.message}`,
  }).select("id").single();
  if (error) redirect(`/office/enquiries?error=${encodeURIComponent(error.message)}`);
  await supabase.from("enquiries").update({ status: "converted", customer_id: c!.id }).eq("id", id);
  redirect(`/office/customers/${c!.id}`);
}

/** Priority chips, action tick boxes, "other" box and notes – shared by the add and edit forms. */
function FollowUpFields({ e, idPrefix }: { e?: Enquiry; idPrefix: string }) {
  const current = e?.priority ?? "standard";
  return (
    <>
      <div className="md:col-span-2">
        <div className="label">Priority</div>
        <div className="flex flex-wrap gap-2">
          {PRIORITIES.map((p) => (
            <label key={p.value} className="cursor-pointer">
              <input type="radio" name="priority" value={p.value} defaultChecked={current === p.value} className="peer sr-only" />
              <span className={`inline-block rounded-full border border-stone-300 bg-white px-4 py-1.5 text-sm font-semibold text-stone-700 ${p.ring}`}>{p.label}</span>
            </label>
          ))}
        </div>
      </div>
      <div className="md:col-span-2">
        <div className="label">Actions</div>
        <div className="grid gap-2 sm:grid-cols-2">
          {ACTIONS.map((a) => (
            <label key={a.value} htmlFor={`${idPrefix}-${a.value}`} className="flex items-center gap-2 rounded-lg border border-stone-200 px-3 py-2 text-sm">
              <input id={`${idPrefix}-${a.value}`} type="checkbox" name="actions" value={a.value} defaultChecked={e?.actions?.includes(a.value)} className="h-4 w-4 accent-[#1f5a3a]" />
              {a.label}
            </label>
          ))}
        </div>
        <input className="input mt-2" name="action_other" defaultValue={e?.action_other ?? ""} placeholder="Other action (optional)" maxLength={300} />
      </div>
      <div className="md:col-span-2">
        <label className="label">Follow-up notes</label>
        <input className="input" name="office_notes" defaultValue={e?.office_notes ?? ""} placeholder="e.g. Call back Tuesday after 2pm" />
      </div>
    </>
  );
}

export default async function Enquiries({ searchParams }: {
  searchParams: Promise<{ tab?: string; error?: string; add?: string; added?: string; saved?: string; p?: string }>;
}) {
  const { tab = "open", error, add, added, saved, p } = await searchParams;
  const { supabase } = await requireProfile(["office"]);
  let q = supabase.from("enquiries").select("*").order("created_at", { ascending: false }).limit(300);
  q = tab === "open" ? q.in("status", ["new", "contacted"]) : q.in("status", ["converted", "closed"]);
  if (p) q = q.eq("priority", p);
  const { data } = await q;
  const enquiries = ((data ?? []) as Enquiry[]).sort((a, b) =>
    tab === "open" ? (PRIORITY_RANK[a.priority] ?? 9) - (PRIORITY_RANK[b.priority] ?? 9) : 0
  );

  const pill = (active: boolean) => `whitespace-nowrap rounded-full px-3 py-1.5 text-sm ${active ? "bg-brand-green text-white" : "border border-stone-200 bg-white"}`;
  const qs = (o: Record<string, string | undefined>) => {
    const u = new URLSearchParams();
    Object.entries({ tab, p, ...o }).forEach(([k, v]) => v && u.set(k, v));
    return `/office/enquiries?${u}`;
  };

  return (
    <>
      <PageHeader title="Enquiries" action={!add && <Link href="/office/enquiries?add=1" className="btn-gold">+ Add enquiry</Link>} />
      {error && <Notice tone="error">{error}</Notice>}
      {added && <Notice tone="success">Enquiry added.</Notice>}
      {saved && <Notice tone="success">Saved.</Notice>}

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
          <FollowUpFields idPrefix="new" />
          <div className="flex gap-2 md:col-span-2">
            <SubmitButton>Save enquiry</SubmitButton>
            <Link href="/office/enquiries" className="btn-outline">Cancel</Link>
          </div>
        </form>
      )}

      <div className="mb-3 flex gap-2 overflow-x-auto">
        <Link href={qs({ tab: "open" })} className={pill(tab === "open")}>Open</Link>
        <Link href={qs({ tab: "done" })} className={pill(tab === "done")}>Done</Link>
      </div>
      <div className="mb-4 flex gap-2 overflow-x-auto">
        <Link href={qs({ p: "" })} className={pill(!p)}>All priorities</Link>
        {PRIORITIES.map((x) => (
          <Link key={x.value} href={qs({ p: x.value })} className={`whitespace-nowrap rounded-full px-3 py-1.5 text-sm font-semibold ${p === x.value ? x.chip : "border border-stone-200 bg-white text-stone-700"}`}>{x.label}</Link>
        ))}
      </div>

      {!enquiries.length && <div className="card text-sm text-stone-500">No enquiries here.</div>}
      <div className="space-y-3">
        {enquiries.map((e) => {
          const st = STATUSES.find((s) => s.value === e.status)!;
          const pr = PRIORITIES.find((x) => x.value === e.priority) ?? PRIORITIES[3];
          const actionItems = [
            ...ACTIONS.filter((a) => e.actions?.includes(a.value)).map((a) => ({ key: a.value, label: a.label })),
            ...(e.action_other ? [{ key: "other", label: e.action_other }] : []),
          ];
          const doneCount = actionItems.filter((a) => e.actions_done?.[a.key]).length;
          return (
            <div key={e.id} id={`e-${e.id}`} className={`card border-l-8 text-sm ${pr.border}`}>
              <div className="flex flex-wrap items-start justify-between gap-2">
                <div>
                  <div className="text-base font-semibold">{e.name}</div>
                  <div className="text-xs text-stone-500">
                    {formatDateTime(e.created_at)} · {SOURCES.find((x) => x.value === e.source)?.label ?? e.source}
                    {e.service ? ` · ${e.service}` : ""}{e.postcode ? ` · ${e.postcode}` : ""}
                  </div>
                </div>
                <div className="flex gap-1">
                  <span className={`rounded-full px-2.5 py-0.5 text-xs font-semibold ${pr.chip}`}>{pr.label}</span>
                  <span className={`rounded-full px-2.5 py-0.5 text-xs font-medium ${st.cls}`}>{st.label}</span>
                </div>
              </div>
              <div className="mt-2 flex flex-wrap gap-3">
                {e.phone && <a className="font-semibold text-brand-green underline" href={`tel:${e.phone.replace(/\s/g, "")}`}>{e.phone}</a>}
                {e.email && <a className="font-semibold text-brand-green underline" href={`mailto:${e.email}`}>{e.email}</a>}
              </div>
              <p className="mt-3 whitespace-pre-wrap text-stone-700">{e.message}</p>
              {actionItems.length > 0 && (
                <div className="mt-3 rounded-lg bg-stone-50 p-3">
                  <div className="mb-2 text-xs font-semibold uppercase tracking-wide text-stone-500">
                    Actions · {doneCount} of {actionItems.length} done
                  </div>
                  <ul className="space-y-1.5">
                    {actionItems.map((a) => {
                      const d = e.actions_done?.[a.key];
                      return (
                        <li key={a.key}>
                          <form action={toggleAction} className="flex items-start gap-2">
                            <input type="hidden" name="id" value={e.id} /><input type="hidden" name="action" value={a.key} /><input type="hidden" name="tab" value={tab} />
                            <button type="submit" aria-label={d ? `Mark "${a.label}" not done` : `Mark "${a.label}" done`}
                              className={`mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded border text-xs ${d ? "border-brand-green bg-brand-green text-white" : "border-stone-400 bg-white"}`}>
                              {d ? "✓" : ""}
                            </button>
                            <span className={d ? "text-stone-400 line-through" : "font-medium text-stone-800"}>{a.label}</span>
                            {d && <span className="text-xs text-stone-500">· {formatDateTime(d.at)} · {d.by}</span>}
                          </form>
                        </li>
                      );
                    })}
                  </ul>
                </div>
              )}
              {e.office_notes && <p className="mt-2 text-xs text-stone-600">📝 {e.office_notes}</p>}

              <details className="mt-4 border-t border-stone-100 pt-3">
                <summary className="cursor-pointer text-sm font-semibold text-brand-green">Update priority, actions &amp; status</summary>
                <form action={updateEnquiry} className="mt-3 grid gap-3 md:grid-cols-2">
                  <input type="hidden" name="id" value={e.id} /><input type="hidden" name="tab" value={tab} />
                  <FollowUpFields e={e} idPrefix={e.id} />
                  <div>
                    <label className="label">Status</label>
                    <select className="input" name="status" defaultValue={e.status}>{STATUSES.map((s) => <option key={s.value} value={s.value}>{s.label}</option>)}</select>
                  </div>
                  <div className="flex items-end"><SubmitButton className="btn-primary w-full">Save</SubmitButton></div>
                </form>
              </details>

              {!e.customer_id && e.status !== "closed" && (
                <form action={convertToCustomer} className="mt-3">
                  <input type="hidden" name="id" value={e.id} />
                  <SubmitButton className="btn-gold">Make them a customer</SubmitButton>
                </form>
              )}
              {e.customer_id && <Link href={`/office/customers/${e.customer_id}`} className="mt-3 inline-block text-brand-green underline">View customer</Link>}
            </div>
          );
        })}
      </div>
    </>
  );
}
