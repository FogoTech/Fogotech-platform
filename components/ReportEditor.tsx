/* eslint-disable @next/next/no-img-element */
import Link from "next/link";
import { notFound } from "next/navigation";
import { requireProfile } from "@/lib/auth";
import { Notice } from "@/components/ui";
import { SubmitButton } from "@/components/SubmitButton";
import { JobPhotoUploader } from "@/components/JobPhotoUploader";
import { createReport, saveReport, deleteReport } from "@/app/actions/reports";
import { formatDateTime } from "@/lib/labels";

const SECTIONS = [
  { key: "reason", title: "1. Reason for call-out", hint: "What the customer reported / why we were called out." },
  { key: "diagnosis", title: "2. Diagnosis / fault finding", hint: "What you checked and what you found." },
  { key: "work_done", title: "3. Work carried out", hint: "What was done to fix it, parts used, tests carried out." },
  { key: "recommendations", title: "4. Further action & recommendations", hint: "Anything still to do, advice, or recommended upgrades." },
] as const;

export async function ReportEditor({ id, sp }: { id: string; sp: { error?: string; saved?: string; sent?: string } }) {
  const { supabase, profile } = await requireProfile(["office", "engineer"]);
  const base = profile.role === "office" ? "office" : "engineer";
  const { data: r } = await supabase.from("job_reports")
    .select("*, jobs(id, job_number, title, customers(name, email), sites(name, postcode))").eq("id", id).maybeSingle();
  if (!r) notFound();
  const job = r.jobs as unknown as { id: string; job_number: string; title: string; customers: { name: string; email: string | null } | null; sites: { name: string; postcode: string | null } | null };

  const [{ data: photos }, { data: chosen }] = await Promise.all([
    supabase.from("job_photos").select("id, storage_path, caption, stage, created_at").eq("job_id", job.id).order("created_at"),
    supabase.from("job_report_photos").select("photo_id, section, caption, sort_order").eq("report_id", id),
  ]);
  const { data: signed } = photos?.length
    ? await supabase.storage.from("job-photos").createSignedUrls(photos.map((p) => p.storage_path), 3600)
    : { data: [] };
  const url = (path: string) => signed?.find((s) => s.path === path)?.signedUrl ?? undefined;
  const pick = new Map((chosen ?? []).map((c) => [c.photo_id, c]));
  const ordered = [...(photos ?? [])].sort((a, b) => (pick.get(a.id)?.sort_order ?? 999) - (pick.get(b.id)?.sort_order ?? 999));

  return (
    <>
      <Link href={`/${base}/jobs/${job.id}`} className="mb-2 inline-block text-sm text-brand-green hover:underline">← {job.job_number} {job.title}</Link>
      <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-brand-green-dark">Call-out report {r.report_number}</h1>
          <div className="text-sm text-brand-mute">{[job.customers?.name, job.sites?.name].filter(Boolean).join(" · ")}</div>
        </div>
        <span className={`rounded-full px-3 py-1 text-xs font-semibold ${r.status === "sent" ? "bg-brand-green text-white" : "bg-brand-gold-light text-brand-gold-dark"}`}>
          {r.status === "sent" ? `Sent ${r.sent_at ? formatDateTime(r.sent_at) : ""}` : "Draft"}
        </span>
      </div>
      {sp.error && <Notice tone="error">{sp.error}</Notice>}
      {sp.saved && <Notice tone="success">Saved.</Notice>}
      {sp.sent && <Notice tone="success">Report emailed to {r.sent_to}. A copy went to the office inbox.</Notice>}

      <div className="mb-4">
        <JobPhotoUploader jobId={job.id} userId={profile.id} stages={["request", "in_progress", "completed"]}
          label="1) Add photos (save your text first – the page refreshes after uploading)" />
      </div>

      <form action={saveReport} className="space-y-4">
        <input type="hidden" name="id" value={id} />
        <div className="card grid gap-3 md:grid-cols-2">
          <div><label className="label">Visit date</label><input className="input" type="date" name="visit_date" defaultValue={r.visit_date ?? ""} /></div>
          <div><label className="label">Engineer</label><input className="input" name="engineer_name" defaultValue={r.engineer_name ?? ""} /></div>
        </div>

        {SECTIONS.map((s) => (
          <div key={s.key} className="card">
            <label className="label text-base">{s.title}</label>
            <p className="mb-2 text-xs text-brand-mute">{s.hint}</p>
            <textarea className="input min-h-28" name={s.key} defaultValue={(r as Record<string, unknown>)[s.key] as string ?? ""} />
            {s.key === "recommendations" && (
              <label className="mt-2 flex items-center gap-2 text-sm font-medium">
                <input type="checkbox" name="no_further_action" defaultChecked={r.no_further_action} className="h-5 w-5 accent-brand-green" />
                N/A – no further action needed
              </label>
            )}
          </div>
        ))}

        <div className="card">
          <div className="font-semibold">Photos in the report</div>
          <p className="mb-3 text-xs text-brand-mute">Choose which section each photo goes in (or leave it out). Captions appear under the photo.</p>
          {ordered.length ? (
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {ordered.map((p) => {
                const c = pick.get(p.id);
                return (
                  <div key={p.id} className={`rounded-lg border p-2 ${c ? "border-brand-green bg-brand-bg" : "border-brand-line"}`}>
                    <input type="hidden" name="photo_ids" value={p.id} />
                    {url(p.storage_path) && <img src={url(p.storage_path)} alt="" className="mb-2 h-40 w-full rounded object-cover" />}
                    <select className="input mb-2" name={`section_${p.id}`} defaultValue={c?.section ?? ""}>
                      <option value="">Not in report</option>
                      {SECTIONS.map((s) => <option key={s.key} value={s.key}>{s.title}</option>)}
                    </select>
                    <input className="input" name={`caption_${p.id}`} defaultValue={c?.caption ?? p.caption ?? ""} placeholder="Caption" maxLength={200} />
                  </div>
                );
              })}
            </div>
          ) : <div className="text-sm text-brand-mute">No photos on this job yet – add them above.</div>}
        </div>

        <div className="flex flex-wrap gap-2">
          <SubmitButton name="intent" value="save">Save</SubmitButton>
          <SubmitButton name="intent" value="preview" className="btn-outline" pendingText="Building PDF…">Save &amp; preview PDF</SubmitButton>
        </div>

        <div className="card space-y-3 border-brand-green">
          <div className="font-semibold">Email the report</div>
          <div><label className="label">To (separate several with commas)</label>
            <input className="input" name="send_to" type="text" defaultValue={r.sent_to ?? job.customers?.email ?? ""} placeholder="name@company.co.uk" /></div>
          <div><label className="label">Greeting</label><input className="input" name="greeting" defaultValue="Hi," /></div>
          <div><label className="label">Message (optional)</label><textarea className="input min-h-20" name="message" placeholder="Anything to add in the email" /></div>
          <p className="text-xs text-brand-mute">The PDF is attached, the office gets a copy, and a note is added to the job.</p>
          <SubmitButton name="intent" value="send" className="btn-gold" pendingText="Sending…">{r.status === "sent" ? "Send again" : "Save & send report"}</SubmitButton>
        </div>
      </form>

      {r.status === "draft" && (
        <form action={deleteReport} className="mt-6">
          <input type="hidden" name="id" value={id} /><input type="hidden" name="job_id" value={job.id} />
          <SubmitButton className="text-sm text-red-700 underline" pendingText="Deleting…">Delete this draft</SubmitButton>
        </form>
      )}
    </>
  );
}

/** List of reports on a job with a "new report" button. */
export async function JobReports({ jobId }: { jobId: string }) {
  const { supabase, profile } = await requireProfile(["office", "engineer"]);
  const base = profile.role === "office" ? "office" : "engineer";
  const { data: reports } = await supabase.from("job_reports").select("id, report_number, status, sent_at, sent_to, created_at").eq("job_id", jobId).order("created_at");
  return (
    <div className="space-y-2">
      {(reports ?? []).map((x) => (
        <Link key={x.id} href={`/${base}/reports/${x.id}`} className="card flex items-center justify-between gap-2 text-sm hover:border-brand-green">
          <span><span className="font-semibold">{x.report_number}</span> Call-out report</span>
          <span className="text-xs text-brand-mute">{x.status === "sent" ? `Sent to ${x.sent_to}` : "Draft"}</span>
        </Link>
      ))}
      <form action={createReport}>
        <input type="hidden" name="job_id" value={jobId} />
        <SubmitButton className="btn-gold" pendingText="Creating…">+ New call-out report</SubmitButton>
      </form>
    </div>
  );
}
