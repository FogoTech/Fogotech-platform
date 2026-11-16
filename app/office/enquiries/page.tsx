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
  follow_up_on: string | null; closed_reason: string | null; assigned_to: string | null; job_id: string | null;
};

type Activity = { id: string; enquiry_id: string; body: string; created_at: string; author: { full_name: string | null } | null };

const CLOSED_REASONS = [
  { value: "too_expensive", label: "Too expensive" },
  { value: "went_elsewhere", label: "Went elsewhere" },
  { value: "no_response", label: "No response" },
  { value: "not_a_fit", label: "Not a job we do" },
  { value: "not_needed", label: "No longer needed" },
  { value: "other", label: "Other" },
];

function todayLondon() {
  return new Intl.DateTimeFormat("en-CA", { timeZone: "Europe/London" }).format(new Date());
}

function followUpBadge(date: string | null, open: boolean) {
  if (!date || !open) return null;
  const today = todayLondon();
  const label = new Date(date + "T12:00:00Z").toLocaleDateString("en-GB", { weekday: "short", day: "numeric", month: "short" });
  if (date < today) return { text: `Overdue · ${label}`, cls: "bg-red-100 text-red-800" };
  if (date === today) return { text: "Follow up today", cls: "bg-amber-100 text-amber-900" };
  return { text: `Follow up ${label}`, cls: "bg-stone-100 text-stone-700" };
}

function readFollowUp(formData: FormData) {
  const actions = formData.getAll("actions").map(String).filter((a) => ACTIONS.some((x) => x.value === a));
  const other = String(formData.get("action_other") ?? "").trim().slice(0, 300);
  if (other) actions.push("other");
  return {
    priority: String(formData.get("priority") ?? "standard"),
    actions,
    action_other: other || null,
    assigned_to: String(formData.get("assigned_to") ?? "") || null,
    follow_up_on: String(formData.get("follow_up_on") ?? "") || null,
  };
}

async function addActivity(supabase: Awaited<ReturnType<typeof requireProfile>>["supabase"], enquiryId: string, authorId: string, body: string) {
  if (body.trim()) await supabase.from("enquiry_activities").insert({ enquiry_id: enquiryId, author_id: authorId, body: body.trim().slice(0, 2000) });
}

async function addEnquiry(formData: FormData) {
  "use server";
  const { supabase, profile } = await requireProfile(["office"]);
  const get = (k: string) => String(formData.get(k) ?? "").trim() || null;
  const { data, error } = await supabase.from("enquiries").insert({
    name: get("name"), phone: get("phone"), email: get("email"),
    service: get("service"), postcode: get("postcode")?.toUpperCase() ?? null,
    message: get("message") ?? "(no details)", source: get("source") ?? "phone",
    created_by: profile.id,
    ...readFollowUp(formData),
  }).select("id").single();
  if (!error && data) await addActivity(supabase, data.id, profile.id, String(formData.get("note") ?? ""));
  if (error) {
    const msg = error.message.includes("enquiry_has_contact") ? "Add a phone number or email." : error.message;
    redirect(`/office/enquiries?add=1&error=${encodeURIComponent(msg)}`);
  }
  redirect("/office/enquiries?added=1");
}

async function updateEnquiry(formData: FormData) {
  "use server";
  const { supabase } = await requireProfile(["office"]);
  const status = String(formData.get("status"));
  const closed_reason = String(formData.get("closed_reason") ?? "") || null;
  if (status === "closed" && !closed_reason) {
    redirect(`/office/enquiries?tab=${formData.get("tab") ?? "open"}&error=${encodeURIComponent("Choose a reason when closing an enquiry.")}#e-${formData.get("id")}`);
  }
  const { error } = await supabase.from("enquiries").update({
    status,
    closed_reason: status === "closed" ? closed_reason : null,
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

async function logActivity(formData: FormData) {
  "use server";
  const { supabase, profile } = await requireProfile(["office"]);
  const id = String(formData.get("id"));
  await addActivity(supabase, id, profile.id, String(formData.get("body") ?? ""));
  const next = String(formData.get("follow_up_on") ?? "");
  const update: Record<string, unknown> = {};
  if (next) update.follow_up_on = next;
  if (formData.get("mark_contacted")) update.status = "contacted";
  if (Object.keys(update).length) await supabase.from("enquiries").update(update).eq("id", id);
  redirect(`/office/enquiries?tab=${formData.get("tab") ?? "open"}#e-${id}`);
}

async function bookSiteVisit(formData: FormData) {
  "use server";
  const { supabase, profile } = await requireProfile(["office"]);
  const id = String(formData.get("id"));
  const { data: e } = await supabase.from("enquiries").select("*").eq("id", id).single();
  if (!e) redirect("/office/enquiries");
  if (e.job_id) redirect(`/office/jobs/${e.job_id}`);

  // Make sure there's a customer (and a site if we know the postcode)
  let customerId: string | null = e.customer_id;
  if (!customerId) {
    const { data: c, error } = await supabase.from("customers").insert({
      name: e.name, email: e.email, phone: e.phone, billing_postcode: e.postcode,
      notes: `From enquiry (${e.service ?? "general"}): ${e.message}`,
    }).select("id").single();
    if (error) redirect(`/office/enquiries?error=${encodeURIComponent(error.message)}`);
    customerId = c!.id;
  }
  let siteId: string | null = null;
  if (e.postcode) {
    const { data: existing } = await supabase.from("sites").select("id").eq("customer_id", customerId).eq("postcode", e.postcode).maybeSingle();
    siteId = existing?.id ?? null;
    if (!siteId) {
      const { data: site } = await supabase.from("sites").insert({ customer_id: customerId, name: "Main site", postcode: e.postcode }).select("id").single();
      siteId = site?.id ?? null;
    }
  }
  const { data: job, error: jobErr } = await supabase.from("jobs").insert({
    customer_id: customerId, site_id: siteId, job_type: "site_survey", status: "awaiting_schedule",
    title: `Site survey${e.service ? ` – ${e.service}` : ""}`, description: e.message, created_by: profile.id,
    assigned_to: null,
  }).select("id, job_number").single();
  if (jobErr) redirect(`/office/enquiries?error=${encodeURIComponent(jobErr.message)}`);

  const done = { ...((e.actions_done as Record<string, unknown>) ?? {}) };
  done.site_visit = { at: new Date().toISOString(), by: profile.full_name || profile.email || "Office" };
  const actions = Array.from(new Set([...(e.actions ?? []), "site_visit"]));
  await supabase.from("enquiries").update({
    customer_id: customerId, job_id: job!.id, actions, actions_done: done,
    status: e.status === "new" ? "contacted" : e.status,
  }).eq("id", id);
  await addActivity(supabase, id, profile.id, `Site survey job ${job!.job_number} created`);
  redirect(`/office/jobs/${job!.id}?fromEnquiry=1`);
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
function FollowUpFields({ e, idPrefix, staff }: { e?: Enquiry; idPrefix: string; staff: { id: string; full_name: string | null; email: string | null }[] }) {
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
            <label key={a.value} htmlFor={`${idPrefix}-${a.value}`} className="flex items-center gap-2 rounded-lg border border-brand-line px-3 py-2 text-sm">
              <input id={`${idPrefix}-${a.value}`} type="checkbox" name="actions" value={a.value} defaultChecked={e?.actions?.includes(a.value)} className="h-4 w-4 accent-[#1f5a3a]" />
              {a.label}
            </label>
          ))}
        </div>
        <input className="input mt-2" name="action_other" defaultValue={e?.action_other ?? ""} placeholder="Other action (optional)" maxLength={300} />
      </div>
      <div>
        <label className="label">Assigned to</label>
        <select className="input" name="assigned_to" defaultValue={e?.assigned_to ?? ""}>
          <option value="">Anyone (everyone is notified)</option>
          {staff.map((p) => <option key={p.id} value={p.id}>{p.full_name || p.email}</option>)}
        </select>
      </div>
      <div>
        <label className="label">Next follow-up</label>
        <input className="input" type="date" name="follow_up_on" defaultValue={e?.follow_up_on ?? ""} />
      </div>
    </>
  );
}

export default async function Enquiries({ searchParams }: {
  searchParams: Promise<{ tab?: string; error?: string; add?: string; added?: string; saved?: string; p?: string; who?: string; due?: string }>;
}) {
  const { tab = "open", error, add, added, saved, p, who, due } = await searchParams;
  const { supabase, profile } = await requireProfile(["office"]);
  const { data: staffData } = await supabase.from("profiles").select("id, full_name, email").eq("role", "office").eq("active", true).order("full_name");
  const staff = staffData ?? [];
  const staffName = (id: string | null) => { const p = staff.find((x) => x.id === id); return p ? (p.full_name || p.email) : null; };
  let q = supabase.from("enquiries").select("*").order("created_at", { ascending: false }).limit(300);
  q = tab === "open" ? q.in("status", ["new", "contacted"]) : q.in("status", ["converted", "closed"]);
  if (p) q = q.eq("priority", p);
  if (who === "me") q = q.eq("assigned_to", profile.id);
  if (who === "none") q = q.is("assigned_to", null);
  if (due) q = q.lte("follow_up_on", todayLondon());
  const { data } = await q;
  const ids = (data ?? []).map((e) => e.id);
  const { data: actData } = ids.length
    ? await supabase.from("enquiry_activities").select("id, enquiry_id, body, created_at, author:profiles(full_name)").in("enquiry_id", ids).order("created_at", { ascending: false })
    : { data: [] };
  const activities = (actData ?? []) as unknown as Activity[];
  const enquiries = ((data ?? []) as Enquiry[]).sort((a, b) =>
    tab === "open" ? (PRIORITY_RANK[a.priority] ?? 9) - (PRIORITY_RANK[b.priority] ?? 9) : 0
  );

  const pill = (active: boolean) => `whitespace-nowrap rounded-full px-3 py-1.5 text-sm ${active ? "bg-brand-green text-white" : "border border-brand-line bg-white"}`;
  const qs = (o: Record<string, string | undefined>) => {
    const u = new URLSearchParams();
    Object.entries({ tab, p, who, due, ...o }).forEach(([k, v]) => v && u.set(k, v));
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
          <FollowUpFields idPrefix="new" staff={staff} />
          <div className="md:col-span-2"><label className="label">First note (optional)</label><input className="input" name="note" placeholder="e.g. Spoke to them, wants cameras on the front and back" /></div>
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
      <div className="mb-3 flex gap-2 overflow-x-auto">
        <Link href={qs({ who: "" })} className={pill(!who)}>Everyone&apos;s</Link>
        <Link href={qs({ who: "me" })} className={pill(who === "me")}>Mine</Link>
        <Link href={qs({ who: "none" })} className={pill(who === "none")}>Unassigned</Link>
        <Link href={qs({ due: due ? "" : "1" })} className={`whitespace-nowrap rounded-full px-3 py-1.5 text-sm ${due ? "bg-red-600 text-white" : "border border-red-200 bg-white text-red-700"}`}>Due / overdue</Link>
      </div>
      <div className="mb-4 flex gap-2 overflow-x-auto">
        <Link href={qs({ p: "" })} className={pill(!p)}>All priorities</Link>
        {PRIORITIES.map((x) => (
          <Link key={x.value} href={qs({ p: x.value })} className={`whitespace-nowrap rounded-full px-3 py-1.5 text-sm font-semibold ${p === x.value ? x.chip : "border border-brand-line bg-white text-stone-700"}`}>{x.label}</Link>
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
          const fu = followUpBadge(e.follow_up_on, ["new", "contacted"].includes(e.status));
          const history = activities.filter((a) => a.enquiry_id === e.id);
          const reason = CLOSED_REASONS.find((r) => r.value === e.closed_reason)?.label;
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
              <div className="mt-2 flex flex-wrap gap-1.5 text-xs">
                <span className="rounded-full bg-stone-100 px-2.5 py-0.5 text-stone-700">👤 {staffName(e.assigned_to) ?? "Unassigned"}</span>
                {fu && <span className={`rounded-full px-2.5 py-0.5 font-medium ${fu.cls}`}>📅 {fu.text}</span>}
                {reason && <span className="rounded-full bg-stone-200 px-2.5 py-0.5 text-stone-700">Closed: {reason}</span>}
                {e.job_id && <Link href={`/office/jobs/${e.job_id}`} className="rounded-full bg-brand-green-light px-2.5 py-0.5 font-medium text-brand-green-dark underline">Site survey job</Link>}
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
                          {a.key === "site_visit" && !d && !e.job_id && (
                            <form action={bookSiteVisit} className="ml-7 mt-1">
                              <input type="hidden" name="id" value={e.id} />
                              <SubmitButton className="btn-gold px-3 py-1 text-xs">Book site visit →</SubmitButton>
                            </form>
                          )}
                        </li>
                      );
                    })}
                  </ul>
                </div>
              )}
              <div className="mt-3">
                <div className="mb-1 text-xs font-semibold uppercase tracking-wide text-stone-500">History</div>
                {history.length ? (
                  <ul className="space-y-1 border-l-2 border-brand-line pl-3">
                    {history.map((h) => (
                      <li key={h.id} className="text-sm">
                        <span className="text-xs text-stone-500">{formatDateTime(h.created_at)}{h.author?.full_name ? ` · ${h.author.full_name}` : ""}</span>
                        <div className="whitespace-pre-wrap text-stone-800">{h.body}</div>
                      </li>
                    ))}
                  </ul>
                ) : <div className="text-xs text-stone-400">Nothing logged yet.</div>}
                <form action={logActivity} className="mt-2 grid gap-2 sm:grid-cols-[1fr_auto_auto] sm:items-end">
                  <input type="hidden" name="id" value={e.id} /><input type="hidden" name="tab" value={tab} />
                  <input className="input" name="body" required placeholder="Log a call, email or update…" />
                  <div><label className="text-xs text-stone-500">Next follow-up</label><input className="input" type="date" name="follow_up_on" /></div>
                  <SubmitButton className="btn-outline">Add</SubmitButton>
                  {e.status === "new" && <label className="flex items-center gap-2 text-xs text-stone-600 sm:col-span-3"><input type="checkbox" name="mark_contacted" defaultChecked /> Mark as contacted</label>}
                </form>
              </div>

              <details className="mt-4 border-t border-brand-line pt-3">
                <summary className="cursor-pointer text-sm font-semibold text-brand-green">Update priority, actions &amp; status</summary>
                <form action={updateEnquiry} className="mt-3 grid gap-3 md:grid-cols-2">
                  <input type="hidden" name="id" value={e.id} /><input type="hidden" name="tab" value={tab} />
                  <FollowUpFields e={e} idPrefix={e.id} staff={staff} />
                  <div>
                    <label className="label">Status</label>
                    <select className="input" name="status" defaultValue={e.status}>{STATUSES.map((s) => <option key={s.value} value={s.value}>{s.label}</option>)}</select>
                  </div>
                  <div>
                    <label className="label">Reason (if closing)</label>
                    <select className="input" name="closed_reason" defaultValue={e.closed_reason ?? ""}>
                      <option value="">—</option>
                      {CLOSED_REASONS.map((r) => <option key={r.value} value={r.value}>{r.label}</option>)}
                    </select>
                  </div>
                  <div className="md:col-span-2"><SubmitButton className="btn-primary w-full">Save</SubmitButton></div>
                </form>
              </details>

              {e.status !== "closed" && (
                <div className="mt-3 flex flex-wrap gap-2">
                  {!e.job_id && (
                    <form action={bookSiteVisit}>
                      <input type="hidden" name="id" value={e.id} />
                      <SubmitButton className="btn-outline">Book site visit</SubmitButton>
                    </form>
                  )}
                  {!e.customer_id && (
                    <form action={convertToCustomer}>
                      <input type="hidden" name="id" value={e.id} />
                      <SubmitButton className="btn-gold">Make them a customer</SubmitButton>
                    </form>
                  )}
                </div>
              )}
              {e.customer_id && <Link href={`/office/customers/${e.customer_id}`} className="mt-3 inline-block text-brand-green underline">View customer</Link>}
            </div>
          );
        })}
      </div>
    </>
  );
}
