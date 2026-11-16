import { notFound, redirect } from "next/navigation";
import { requireProfile } from "@/lib/auth";
import { Notice, PageHeader, StatusBadge } from "@/components/ui";
import { ENGINEER_STATUSES, formatDateTime, jobTypeLabel, statusLabel } from "@/lib/labels";
import { SubmitButton } from "@/components/SubmitButton";

async function setStatus(formData: FormData) {
  "use server";
  const { supabase } = await requireProfile(["engineer"]);
  const id = String(formData.get("id"));
  const status = String(formData.get("status"));
  if (!ENGINEER_STATUSES.includes(status)) redirect(`/engineer/jobs/${id}`);
  await supabase.from("jobs").update({ status, completed_at: status === "completed" ? new Date().toISOString() : null }).eq("id", id);
  redirect(`/engineer/jobs/${id}?saved=1`);
}

async function addNote(formData: FormData) {
  "use server";
  const { supabase, profile } = await requireProfile(["engineer"]);
  const id = String(formData.get("id"));
  await supabase.from("job_notes").insert({
    job_id: id, author_id: profile.id, body: String(formData.get("body") ?? "").trim(),
    visible_to_customer: formData.get("visible") === "on",
  });
  redirect(`/engineer/jobs/${id}`);
}

async function addExpense(formData: FormData) {
  "use server";
  const { supabase, profile } = await requireProfile(["engineer"]);
  const id = String(formData.get("id"));
  const { error } = await supabase.from("job_expenses").insert({
    job_id: id, engineer_id: profile.id,
    description: String(formData.get("description") ?? "").trim(),
    amount: Number(formData.get("amount")),
    paid_by: String(formData.get("paid_by")),
  });
  if (error) redirect(`/engineer/jobs/${id}?error=${encodeURIComponent(error.message)}`);
  redirect(`/engineer/jobs/${id}?expense=1`);
}

export default async function EngineerJob({ params, searchParams }: {
  params: Promise<{ id: string }>; searchParams: Promise<Record<string, string | undefined>>;
}) {
  const { id } = await params;
  const sp = await searchParams;
  const { supabase } = await requireProfile(["engineer"]);
  const { data: job } = await supabase.from("jobs")
    .select("*, customers(name), sites(name, address_line1, address_line2, town, postcode, access_notes)")
    .eq("id", id).single();
  if (!job) notFound();
  const { data: notes } = await supabase.from("job_notes").select("id, body, created_at, visible_to_customer").eq("job_id", id).order("created_at");
  const site = job.sites;
  const mapQuery = site ? encodeURIComponent([site.address_line1, site.town, site.postcode].filter(Boolean).join(", ")) : "";

  return (
    <>
      <PageHeader title={`${job.job_number} · ${job.title}`} action={<StatusBadge status={job.status} />} />
      {sp.saved && <Notice tone="success">Status updated.</Notice>}
      {sp.expense && <Notice tone="success">Expense recorded.</Notice>}
      {sp.error && <Notice tone="error">{sp.error}</Notice>}
      <div className="grid gap-4 md:grid-cols-2">
        <div className="card space-y-1 text-sm">
          <div className="font-semibold text-brand-green">{job.customers?.name}</div>
          {site && <>
            <div>{site.name}</div>
            <div className="text-stone-600">{[site.address_line1, site.address_line2, site.town, site.postcode].filter(Boolean).join(", ")}</div>
            {mapQuery && <a className="text-brand-green underline" href={`https://maps.google.com/?q=${mapQuery}`} target="_blank">Open in Maps</a>}
            {site.access_notes && <div className="text-xs text-stone-500">Access: {site.access_notes}</div>}
          </>}
          <div className="pt-2 text-stone-600">{jobTypeLabel(job.job_type)} · Visit {formatDateTime(job.scheduled_start)}</div>
        </div>
        <div className="card text-sm"><div className="mb-1 font-semibold">Details</div><p className="whitespace-pre-wrap text-stone-700">{job.description || "—"}</p></div>
      </div>

      <form action={setStatus} className="card mt-4 flex flex-wrap items-end gap-3">
        <input type="hidden" name="id" value={job.id} />
        <div className="flex-1"><label className="label">Update status</label>
          <select className="input" name="status" defaultValue={job.status}>
            {ENGINEER_STATUSES.map((s) => <option key={s} value={s}>{statusLabel(s)}</option>)}
          </select>
        </div>
        <SubmitButton className="btn-primary">Update</SubmitButton>
      </form>

      <h2 className="mb-3 mt-8 text-lg font-semibold">Notes</h2>
      <ul className="space-y-2">{(notes ?? []).map((n) => <li key={n.id} className="card text-sm"><div className="text-xs text-stone-500">{formatDateTime(n.created_at)}{n.visible_to_customer ? " · visible to customer" : ""}</div><p className="mt-1 whitespace-pre-wrap">{n.body}</p></li>)}</ul>
      <form action={addNote} className="card mt-3 space-y-3">
        <input type="hidden" name="id" value={job.id} />
        <textarea className="input min-h-20" name="body" required placeholder="What was done, parts used, follow-ups…" />
        <label className="flex items-center gap-2 text-sm"><input type="checkbox" name="visible" /> Show to customer</label>
        <SubmitButton className="btn-outline">Add note</SubmitButton>
      </form>

      <h2 className="mb-3 mt-8 text-lg font-semibold">Add an expense</h2>
      <form action={addExpense} className="card grid gap-3 md:grid-cols-2">
        <input type="hidden" name="id" value={job.id} />
        <div className="md:col-span-2"><input className="input" name="description" required placeholder="What was bought" /></div>
        <div><input className="input" name="amount" type="number" step="0.01" min="0" required placeholder="Amount £" /></div>
        <div><select className="input" name="paid_by"><option value="engineer">I paid (reimburse me)</option><option value="fogotech">Paid on FogoTech account</option></select></div>
        <div><SubmitButton className="btn-outline">Save expense</SubmitButton></div>
      </form>
    </>
  );
}
