import { notFound, redirect } from "next/navigation";
import { requireProfile } from "@/lib/auth";
import { CredentialList, CREDENTIAL_SELECT, type CredentialRow } from "@/components/CredentialList";
import { SubmitButton } from "@/components/SubmitButton";
import { JobPhotos } from "@/components/JobPhotos";
import { JobPhotoUploader } from "@/components/JobPhotoUploader";
import { Notice, PageHeader, StatusBadge } from "@/components/ui";
import { ENGINEER_STATUSES, formatDateTime, jobTypeLabel, statusLabel } from "@/lib/labels";

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

async function requestLogins(formData: FormData) {
  "use server";
  const { supabase, profile } = await requireProfile(["engineer"]);
  const id = String(formData.get("id"));
  const { error } = await supabase.from("credential_access_requests").insert({
    job_id: id, engineer_id: profile.id, reason: String(formData.get("reason") ?? "").trim().slice(0, 500) || null,
  });
  if (error) redirect(`/engineer/jobs/${id}?error=${encodeURIComponent(error.message)}`);
  redirect(`/engineer/jobs/${id}?requested=1#logins`);
}

export default async function EngineerJob({ params, searchParams }: {
  params: Promise<{ id: string }>; searchParams: Promise<Record<string, string | undefined>>;
}) {
  const { id } = await params;
  const sp = await searchParams;
  const { supabase, profile } = await requireProfile(["engineer"]);
  const { data: job } = await supabase.from("jobs")
    .select("*, customers(name), sites(name, address_line1, address_line2, town, postcode, access_notes)")
    .eq("id", id).single();
  if (!job) notFound();
  const { data: notes } = await supabase.from("job_notes").select("id, body, created_at, visible_to_customer").eq("job_id", id).order("created_at");
  const site = job.sites;
  const open = !["completed", "invoiced", "cancelled"].includes(job.status);
  const { data: hasAccess } = await supabase.rpc("engineer_login_access", { p_customer: job.customer_id, p_site: job.site_id });
  let credQuery = supabase.from("site_credentials").select(CREDENTIAL_SELECT).eq("customer_id", job.customer_id).order("label");
  credQuery = job.site_id ? credQuery.or(`site_id.is.null,site_id.eq.${job.site_id}`) : credQuery;
  const { data: creds } = hasAccess ? await credQuery : { data: [] };
  const { data: lastReq } = await supabase.from("credential_access_requests").select("status, valid_until, created_at")
    .eq("job_id", job.id).order("created_at", { ascending: false }).limit(1).maybeSingle();
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

      <h2 id="logins" className="mb-3 mt-8 text-lg font-semibold">Site logins</h2>
      {sp.requested && <Notice tone="success">Request sent. You&apos;ll see the logins here once it&apos;s approved.</Notice>}
      {hasAccess ? (
        <CredentialList items={(creds ?? []) as unknown as CredentialRow[]} emptyText="No logins stored for this site." />
      ) : !open ? (
        <div className="card text-sm text-brand-mute">This job is closed.</div>
      ) : lastReq?.status === "pending" ? (
        <div className="card text-sm">⏳ Your request is waiting for the office to approve.</div>
      ) : (
        <form action={requestLogins} className="card space-y-3 text-sm">
          <input type="hidden" name="id" value={job.id} />
          {lastReq?.status === "declined" && <div className="text-red-700">Your last request was declined.</div>}
          {lastReq?.status === "approved" && <div className="text-brand-mute">Your earlier access has expired.</div>}
          <p>You don&apos;t have access to this site&apos;s logins. Ask the office and, once approved, you can view them until midnight.</p>
          <input className="input" name="reason" placeholder="What do you need it for? (optional)" maxLength={500} />
          <SubmitButton className="btn-primary">Request access</SubmitButton>
        </form>
      )}

      <h2 className="mb-3 mt-8 text-lg font-semibold">Photos</h2>
      <JobPhotos jobId={job.id} />
      <div className="mt-3"><JobPhotoUploader jobId={job.id} userId={profile.id} stages={["in_progress", "completed"]} /></div>

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
