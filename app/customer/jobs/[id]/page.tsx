import { notFound } from "next/navigation";
import { requireProfile } from "@/lib/auth";
import { JobPhotos } from "@/components/JobPhotos";
import { JobPhotoUploader } from "@/components/JobPhotoUploader";
import { Notice, PageHeader, StatusBadge } from "@/components/ui";
import { formatDate, formatDateTime, jobTypeLabel } from "@/lib/labels";

export default async function CustomerJob({ params, searchParams }: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ logged?: string }>;
}) {
  const { id } = await params;
  const { logged } = await searchParams;
  const { supabase, profile } = await requireProfile(["customer"]);
  const { data: job } = await supabase
    .from("jobs")
    .select("*, sites(name, address_line1, town, postcode)")
    .eq("id", id)
    .single();
  if (!job) notFound();
  const { data: notes } = await supabase.from("job_notes").select("id, body, created_at").eq("job_id", id).order("created_at");

  return (
    <>
      {logged && <Notice tone="success">Thanks, your job has been logged as {job.job_number}. We&apos;ll be in touch to arrange a visit. If you have photos of the problem, add them below.</Notice>}
      <PageHeader title={`${job.job_number} · ${job.title}`} action={<StatusBadge status={job.status} />} />
      <div className="grid gap-4 md:grid-cols-2">
        <div className="card space-y-2 text-sm">
          <div><span className="text-stone-500">Type:</span> {jobTypeLabel(job.job_type)}</div>
          <div><span className="text-stone-500">Site:</span> {job.sites ? `${job.sites.name}, ${[job.sites.address_line1, job.sites.town, job.sites.postcode].filter(Boolean).join(", ")}` : "—"}</div>
          <div><span className="text-stone-500">Logged:</span> {formatDate(job.created_at)}</div>
          <div><span className="text-stone-500">Scheduled visit:</span> {formatDateTime(job.scheduled_start)}</div>
          {job.customer_reference && <div><span className="text-stone-500">Your ref:</span> {job.customer_reference}</div>}
        </div>
        <div className="card text-sm">
          <div className="mb-2 font-semibold">Details</div>
          <p className="whitespace-pre-wrap text-stone-700">{job.description || "—"}</p>
        </div>
      </div>
      <h2 className="mb-3 mt-8 text-lg font-semibold">Photos</h2>
      <JobPhotos jobId={job.id} />
      {!["completed", "invoiced", "cancelled"].includes(job.status) && (
        <div className="mt-3"><JobPhotoUploader jobId={job.id} userId={profile.id} stages={["request"]} label="Add photos of the problem" /></div>
      )}

      <h2 className="mb-3 mt-8 text-lg font-semibold">Updates</h2>
      {notes && notes.length ? (
        <ul className="space-y-2">{notes.map((n) => <li key={n.id} className="card text-sm"><div className="text-xs text-stone-500">{formatDateTime(n.created_at)}</div><p className="mt-1 whitespace-pre-wrap">{n.body}</p></li>)}</ul>
      ) : <div className="card text-sm text-stone-500">No updates yet.</div>}
    </>
  );
}
