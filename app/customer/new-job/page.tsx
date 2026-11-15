import Link from "next/link";
import { redirect } from "next/navigation";
import { requireProfile } from "@/lib/auth";
import { Notice, PageHeader } from "@/components/ui";
import { JOB_TYPES } from "@/lib/labels";

async function logJob(formData: FormData) {
  "use server";
  const { supabase, profile } = await requireProfile(["customer"]);
  const { data, error } = await supabase
    .from("jobs")
    .insert({
      customer_id: profile.customer_id,
      site_id: String(formData.get("site_id") || "") || null,
      job_type: String(formData.get("job_type")),
      title: String(formData.get("title") ?? "").trim(),
      description: String(formData.get("description") ?? "").trim() || null,
      customer_reference: String(formData.get("customer_reference") ?? "").trim() || null,
      created_by: profile.id,
    })
    .select("id")
    .single();
  if (error) redirect(`/customer/new-job?error=${encodeURIComponent(error.message)}`);
  redirect(`/customer/jobs/${data!.id}?logged=1`);
}

export default async function NewJob({ searchParams }: { searchParams: Promise<{ error?: string }> }) {
  const { error } = await searchParams;
  const { supabase } = await requireProfile(["customer"]);
  const { data: sites } = await supabase.from("sites").select("id, name, postcode").order("name");

  return (
    <>
      <PageHeader title="Log a job" />
      {error && <Notice tone="error">{error}</Notice>}
      <form action={logJob} className="card max-w-2xl space-y-4">
        <div>
          <label className="label" htmlFor="site_id">Site</label>
          {sites && sites.length > 0 ? (
            <select className="input" id="site_id" name="site_id" required>
              {sites.map((s) => <option key={s.id} value={s.id}>{s.name}{s.postcode ? ` (${s.postcode})` : ""}</option>)}
            </select>
          ) : (
            <Notice>You haven&apos;t added any sites yet. <Link href="/customer/sites" className="underline">Add a site</Link> first, or log the job without one.</Notice>
          )}
        </div>
        <div>
          <label className="label" htmlFor="job_type">Type of job</label>
          <select className="input" id="job_type" name="job_type" required>
            {JOB_TYPES.map((t) => <option key={t.value} value={t.value}>{t.label}</option>)}
          </select>
        </div>
        <div>
          <label className="label" htmlFor="title">Short summary</label>
          <input className="input" id="title" name="title" required maxLength={120} placeholder="e.g. Camera 3 offline at rear car park" />
        </div>
        <div>
          <label className="label" htmlFor="description">Details</label>
          <textarea className="input min-h-32" id="description" name="description" placeholder="Anything that will help our engineer: what's happening, when it started, access arrangements…" />
        </div>
        <div>
          <label className="label" htmlFor="customer_reference">Your reference / PO number (optional)</label>
          <input className="input" id="customer_reference" name="customer_reference" />
        </div>
        <p className="text-xs text-stone-500">Photo uploads are coming next.</p>
        <button className="btn-primary">Submit job</button>
      </form>
    </>
  );
}
