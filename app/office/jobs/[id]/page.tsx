import { notFound, redirect } from "next/navigation";
import { requireProfile } from "@/lib/auth";
import { Notice, PageHeader, StatusBadge } from "@/components/ui";
import { JOB_STATUSES, JOB_TYPES, formatDateTime } from "@/lib/labels";
import { isoToLondonLocal, londonLocalToIso } from "@/lib/time";
import { SubmitButton } from "@/components/SubmitButton";

async function updateJob(formData: FormData) {
  "use server";
  const { supabase } = await requireProfile(["office"]);
  const id = String(formData.get("id"));
  const get = (k: string) => String(formData.get(k) ?? "").trim() || null;
  const assigned_to = get("assigned_to");
  const scheduled_start = londonLocalToIso(get("scheduled_start"));
  let scheduled_end = londonLocalToIso(get("scheduled_end"));
  if (scheduled_start && !scheduled_end) scheduled_end = new Date(new Date(scheduled_start).getTime() + 2 * 3600_000).toISOString();
  let status = get("status")!;
  if (scheduled_start && assigned_to && ["new", "awaiting_schedule"].includes(status)) status = "scheduled";

  // Overlap check for the same engineer
  if (assigned_to && scheduled_start && scheduled_end && !formData.get("confirm_overlap")) {
    const { data: clashes } = await supabase
      .from("jobs")
      .select("job_number, title")
      .eq("assigned_to", assigned_to)
      .neq("id", id)
      .not("status", "in", "(cancelled,completed,invoiced)")
      .lt("scheduled_start", scheduled_end)
      .gt("scheduled_end", scheduled_start);
    if (clashes && clashes.length) {
      const q = new URLSearchParams({
        overlap: clashes.map((c) => `${c.job_number} ${c.title}`).join("; "),
        s: get("scheduled_start") ?? "", e: get("scheduled_end") ?? "", a: assigned_to, st: status,
      });
      redirect(`/office/jobs/${id}?${q}`);
    }
  }

  const { error } = await supabase.from("jobs").update({
    title: get("title"),
    description: get("description"),
    job_type: get("job_type"),
    status,
    assigned_to,
    scheduled_start,
    scheduled_end: scheduled_start ? scheduled_end : null,
    completed_at: status === "completed" ? new Date().toISOString() : null,
  }).eq("id", id);
  if (error) redirect(`/office/jobs/${id}?error=${encodeURIComponent(error.message)}`);
  redirect(`/office/jobs/${id}?saved=1`);
}

async function addNote(formData: FormData) {
  "use server";
  const { supabase, profile } = await requireProfile(["office"]);
  const id = String(formData.get("id"));
  await supabase.from("job_notes").insert({
    job_id: id, author_id: profile.id,
    body: String(formData.get("body") ?? "").trim(),
    visible_to_customer: formData.get("visible") === "on",
  });
  redirect(`/office/jobs/${id}`);
}

async function addExpense(formData: FormData) {
  "use server";
  const { supabase } = await requireProfile(["office"]);
  const id = String(formData.get("id"));
  const { error } = await supabase.from("job_expenses").insert({
    job_id: id,
    engineer_id: String(formData.get("engineer_id") || "") || null,
    description: String(formData.get("description") ?? "").trim(),
    amount: Number(formData.get("amount")),
    paid_by: String(formData.get("paid_by")),
  });
  if (error) redirect(`/office/jobs/${id}?error=${encodeURIComponent(error.message)}`);
  redirect(`/office/jobs/${id}`);
}

async function markReimbursed(formData: FormData) {
  "use server";
  const { supabase } = await requireProfile(["office"]);
  await supabase.from("job_expenses").update({ reimbursed: true }).eq("id", String(formData.get("expense_id")));
  redirect(`/office/jobs/${String(formData.get("id"))}`);
}

export default async function OfficeJob({ params, searchParams }: {
  params: Promise<{ id: string }>;
  searchParams: Promise<Record<string, string | undefined>>;
}) {
  const { id } = await params;
  const sp = await searchParams;
  const { supabase } = await requireProfile(["office"]);
  const { data: job } = await supabase
    .from("jobs")
    .select("*, customers(name, phone, email), sites(name, address_line1, address_line2, town, postcode, access_notes)")
    .eq("id", id).single();
  if (!job) notFound();
  const [{ data: engineers }, { data: notes }, { data: expenses }] = await Promise.all([
    supabase.from("profiles").select("id, full_name, email, is_subcontractor").eq("role", "engineer").eq("active", true).order("full_name"),
    supabase.from("job_notes").select("id, body, visible_to_customer, created_at, author:profiles(full_name)").eq("job_id", id).order("created_at"),
    supabase.from("job_expenses").select("*, engineer:profiles(full_name)").eq("job_id", id).order("created_at"),
  ]);

  const startDefault = sp.s ?? isoToLondonLocal(job.scheduled_start);
  const endDefault = sp.e ?? isoToLondonLocal(job.scheduled_end);
  const assignedDefault = sp.a ?? job.assigned_to ?? "";
  const statusDefault = sp.st ?? job.status;
  const site = job.sites;

  return (
    <>
      <PageHeader title={`${job.job_number} · ${job.title}`} action={<StatusBadge status={job.status} />} />
      {sp.saved && <Notice tone="success">Saved.</Notice>}
      {sp.fromEnquiry && <Notice>Site survey job created from the enquiry. Choose an engineer and a visit time below, then save.</Notice>}
      {sp.error && <Notice tone="error">{sp.error}</Notice>}

      <div className="mb-4 grid gap-4 md:grid-cols-2">
        <div className="card text-sm">
          <div className="font-semibold text-brand-green">{job.customers?.name}</div>
          <div className="text-stone-600">{[job.customers?.phone, job.customers?.email].filter(Boolean).join(" · ")}</div>
          {site && (
            <div className="mt-3">
              <div className="font-medium">{site.name}</div>
              <div className="text-stone-600">{[site.address_line1, site.address_line2, site.town, site.postcode].filter(Boolean).join(", ")}</div>
              {site.access_notes && <div className="mt-1 text-xs text-stone-500">Access: {site.access_notes}</div>}
            </div>
          )}
          {job.customer_reference && <div className="mt-3 text-stone-600">Customer ref: {job.customer_reference}</div>}
        </div>
        <div className="card text-sm text-stone-600">
          <div>Logged {formatDateTime(job.created_at)}</div>
          <div>Visit: {formatDateTime(job.scheduled_start)}</div>
          {job.completed_at && <div>Completed {formatDateTime(job.completed_at)}</div>}
        </div>
      </div>

      <form action={updateJob} className="card space-y-4">
        <input type="hidden" name="id" value={job.id} />
        {sp.overlap && (
          <div className="rounded-lg border border-orange-300 bg-orange-50 p-4 text-sm text-orange-900">
            <strong>Overlapping {sp.overlap}.</strong> Do you want to proceed?
            <label className="mt-2 flex items-center gap-2"><input type="checkbox" name="confirm_overlap" required /> Yes, book it anyway</label>
          </div>
        )}
        <div className="grid gap-4 md:grid-cols-2">
          <div className="md:col-span-2"><label className="label">Summary</label><input className="input" name="title" defaultValue={job.title} required /></div>
          <div className="md:col-span-2"><label className="label">Details</label><textarea className="input min-h-24" name="description" defaultValue={job.description ?? ""} /></div>
          <div>
            <label className="label">Type</label>
            <select className="input" name="job_type" defaultValue={job.job_type}>{JOB_TYPES.map((t) => <option key={t.value} value={t.value}>{t.label}</option>)}</select>
          </div>
          <div>
            <label className="label">Status</label>
            <select className="input" name="status" defaultValue={statusDefault}>{JOB_STATUSES.map((s) => <option key={s.value} value={s.value}>{s.label}</option>)}</select>
          </div>
          <div className="md:col-span-2">
            <label className="label">Assigned engineer</label>
            <select className="input" name="assigned_to" defaultValue={assignedDefault}>
              <option value="">Unassigned</option>
              {(engineers ?? []).map((e) => <option key={e.id} value={e.id}>{e.full_name || e.email}{e.is_subcontractor ? " (sub-contractor)" : ""}</option>)}
            </select>
          </div>
          <div><label className="label">Visit start</label><input className="input" type="datetime-local" name="scheduled_start" defaultValue={startDefault} /></div>
          <div><label className="label">Visit end (default +2h)</label><input className="input" type="datetime-local" name="scheduled_end" defaultValue={endDefault} /></div>
        </div>
        <SubmitButton className="btn-primary">Save job</SubmitButton>
      </form>

      <h2 className="mb-3 mt-8 text-lg font-semibold">Notes</h2>
      <ul className="space-y-2">
        {(notes ?? []).map((n) => (
          <li key={n.id} className="card text-sm">
            <div className="text-xs text-stone-500">
              {formatDateTime(n.created_at)} · {(n.author as unknown as { full_name: string } | null)?.full_name ?? ""}
              {n.visible_to_customer ? <span className="ml-2 rounded bg-brand-gold-light px-1.5 text-brand-green-dark">visible to customer</span> : <span className="ml-2 text-stone-400">internal</span>}
            </div>
            <p className="mt-1 whitespace-pre-wrap">{n.body}</p>
          </li>
        ))}
      </ul>
      <form action={addNote} className="card mt-3 space-y-3">
        <input type="hidden" name="id" value={job.id} />
        <textarea className="input min-h-20" name="body" required placeholder="Add a note…" />
        <label className="flex items-center gap-2 text-sm"><input type="checkbox" name="visible" /> Show this update to the customer</label>
        <SubmitButton className="btn-outline">Add note</SubmitButton>
      </form>

      <h2 className="mb-3 mt-8 text-lg font-semibold">Expenses</h2>
      {(expenses ?? []).length > 0 && (
        <ul className="mb-3 space-y-2">
          {(expenses ?? []).map((x) => (
            <li key={x.id} className="card flex flex-wrap items-center justify-between gap-2 text-sm">
              <div>
                <div className="font-medium">£{Number(x.amount).toFixed(2)} · {x.description}</div>
                <div className="text-xs text-stone-500">
                  {x.paid_by === "engineer" ? `Laid out by ${(x.engineer as { full_name: string } | null)?.full_name ?? "engineer"}` : "Paid by FogoTech"}
                  {x.paid_by === "engineer" && (x.reimbursed ? " · reimbursed" : " · needs reimbursing")}
                </div>
              </div>
              {x.paid_by === "engineer" && !x.reimbursed && (
                <form action={markReimbursed}>
                  <input type="hidden" name="id" value={job.id} /><input type="hidden" name="expense_id" value={x.id} />
                  <SubmitButton className="btn-outline text-xs">Mark reimbursed</SubmitButton>
                </form>
              )}
            </li>
          ))}
        </ul>
      )}
      <form action={addExpense} className="card grid gap-3 md:grid-cols-2">
        <input type="hidden" name="id" value={job.id} />
        <div className="md:col-span-2"><label className="label">Description</label><input className="input" name="description" required placeholder="e.g. Cable and clips from Screwfix" /></div>
        <div><label className="label">Amount (£)</label><input className="input" name="amount" type="number" step="0.01" min="0" required /></div>
        <div>
          <label className="label">Paid by</label>
          <select className="input" name="paid_by"><option value="fogotech">FogoTech</option><option value="engineer">Engineer (to reimburse)</option></select>
        </div>
        <div className="md:col-span-2">
          <label className="label">Engineer</label>
          <select className="input" name="engineer_id" defaultValue={job.assigned_to ?? ""}>
            <option value="">—</option>
            {(engineers ?? []).map((e) => <option key={e.id} value={e.id}>{e.full_name || e.email}</option>)}
          </select>
        </div>
        <div><SubmitButton className="btn-outline">Add expense</SubmitButton></div>
      </form>
    </>
  );
}
