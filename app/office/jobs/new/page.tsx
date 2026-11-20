import { redirect } from "next/navigation";
import { requireProfile } from "@/lib/auth";
import { Notice, PageHeader } from "@/components/ui";
import { JOB_TYPES } from "@/lib/labels";
import { SubmitButton } from "@/components/SubmitButton";

async function createJob(formData: FormData) {
  "use server";
  const { supabase, profile } = await requireProfile(["office"]);
  const get = (k: string) => String(formData.get(k) ?? "").trim() || null;
  const siteValue = get("site_id");
  const [customer_id, site_id] = siteValue?.includes(":") ? siteValue.split(":") : [get("customer_id"), null];
  const { data, error } = await supabase.from("jobs").insert({
    customer_id, site_id: site_id || null,
    job_type: get("job_type"),
    title: get("title"),
    description: get("description"),
    customer_reference: get("customer_reference"),
    status: "awaiting_schedule",
    created_by: profile.id,
  }).select("id").single();
  if (error) redirect(`/office/jobs/new?error=${encodeURIComponent(error.message)}`);
  redirect(`/office/jobs/${data!.id}`);
}

export default async function NewOfficeJob({ searchParams }: { searchParams: Promise<{ error?: string; customer?: string; site?: string }> }) {
  const sp = await searchParams;
  const { supabase } = await requireProfile(["office"]);
  const { data: customers } = await supabase.from("customers").select("id, name, sites(id, name, postcode)").order("name");
  const siteOwner = sp.site ? customers?.find((c) => (c.sites ?? []).some((s: { id: string }) => s.id === sp.site)) : undefined;
  const preselect = siteOwner ? `${siteOwner.id}:${sp.site}` : sp.customer && customers?.some((c) => c.id === sp.customer) ? `${sp.customer}:` : "";
  const back = siteOwner ? `/office/sites/${sp.site}` : sp.customer ? `/office/customers/${sp.customer}` : null;

  return (
    <>
      {back && <a href={back} className="mb-2 inline-block text-sm text-brand-green hover:underline">← Back</a>}
      <PageHeader title="New job" />
      {sp.error && <Notice tone="error">{sp.error}</Notice>}
      {!customers?.length ? (
        <Notice>Add a customer first under <a className="underline" href="/office/customers">Customers</a>.</Notice>
      ) : (
        <form action={createJob} className="card max-w-2xl space-y-4">
          <div>
            <label className="label">Customer &amp; site</label>
            <select className="input" name="site_id" required defaultValue={preselect}>
              <option value="" disabled>Choose…</option>
              {customers.map((c) => (
                <optgroup key={c.id} label={c.name}>
                  <option value={`${c.id}:`}>{c.name} (no specific site)</option>
                  {(c.sites ?? []).map((s: { id: string; name: string; postcode: string | null }) => (
                    <option key={s.id} value={`${c.id}:${s.id}`}>{c.name} · {s.name}{s.postcode ? ` (${s.postcode})` : ""}</option>
                  ))}
                </optgroup>
              ))}
            </select>
          </div>
          <div>
            <label className="label">Type of job</label>
            <select className="input" name="job_type" required>
              {JOB_TYPES.map((t) => <option key={t.value} value={t.value}>{t.label}</option>)}
            </select>
          </div>
          <div><label className="label">Short summary</label><input className="input" name="title" required maxLength={120} /></div>
          <div><label className="label">Details</label><textarea className="input min-h-32" name="description" /></div>
          <div><label className="label">Customer reference / PO</label><input className="input" name="customer_reference" /></div>
          <SubmitButton className="btn-primary">Create job</SubmitButton>
        </form>
      )}
    </>
  );
}
