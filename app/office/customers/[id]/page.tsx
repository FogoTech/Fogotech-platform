import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { requireProfile } from "@/lib/auth";
import { JobTable, Notice, PageHeader, JOB_SELECT, type JobRow } from "@/components/ui";

async function addSite(formData: FormData) {
  "use server";
  const { supabase } = await requireProfile(["office"]);
  const id = String(formData.get("customer_id"));
  const get = (k: string) => String(formData.get(k) ?? "").trim() || null;
  const { error } = await supabase.from("sites").insert({
    customer_id: id, name: get("name"), address_line1: get("address_line1"), address_line2: get("address_line2"),
    town: get("town"), postcode: get("postcode")?.toUpperCase() ?? null, access_notes: get("access_notes"),
  });
  if (error) redirect(`/office/customers/${id}?error=${encodeURIComponent(error.message)}`);
  redirect(`/office/customers/${id}`);
}

export default async function CustomerDetail({ params, searchParams }: {
  params: Promise<{ id: string }>; searchParams: Promise<{ error?: string }>;
}) {
  const { id } = await params;
  const sp = await searchParams;
  const { supabase } = await requireProfile(["office"]);
  const { data: c } = await supabase.from("customers").select("*").eq("id", id).single();
  if (!c) notFound();
  const [{ data: sites }, { data: jobs }, { data: logins }] = await Promise.all([
    supabase.from("sites").select("*").eq("customer_id", id).order("name"),
    supabase.from("jobs").select(JOB_SELECT).eq("customer_id", id).order("created_at", { ascending: false }),
    supabase.from("profiles").select("id, full_name, email").eq("customer_id", id),
  ]);

  return (
    <>
      <PageHeader title={c.name} action={<Link href="/office/jobs/new" className="btn-gold">+ New job</Link>} />
      {sp.error && <Notice tone="error">{sp.error}</Notice>}
      <div className="grid gap-4 md:grid-cols-2">
        <div className="card text-sm">
          <div>{c.email || "No email"} · {c.phone || "No phone"}</div>
          <div className="mt-1 text-stone-600">{[c.billing_address_line1, c.billing_town, c.billing_postcode].filter(Boolean).join(", ")}</div>
        </div>
        <div className="card text-sm">
          <div className="mb-1 font-semibold">Portal logins</div>
          {logins?.length ? logins.map((l) => <div key={l.id}>{l.full_name || l.email} <span className="text-stone-500">{l.email}</span></div>)
            : <div className="text-stone-500">None yet. Link a login under <Link className="underline" href="/office/users">Users &amp; logins</Link>.</div>}
        </div>
      </div>

      <h2 className="mb-3 mt-8 text-lg font-semibold">Sites</h2>
      <div className="grid gap-3 md:grid-cols-2">
        {(sites ?? []).map((s) => (
          <div key={s.id} className="card text-sm">
            <div className="font-semibold text-brand-green">{s.name}</div>
            <div className="text-stone-600">{[s.address_line1, s.address_line2, s.town, s.postcode].filter(Boolean).join(", ")}</div>
            {s.access_notes && <div className="mt-1 text-xs text-stone-500">Access: {s.access_notes}</div>}
          </div>
        ))}
      </div>
      <form action={addSite} className="card mt-3 grid gap-3 md:grid-cols-2">
        <input type="hidden" name="customer_id" value={id} />
        <div className="md:col-span-2"><label className="label">New site name</label><input className="input" name="name" required /></div>
        <div className="md:col-span-2"><input className="input" name="address_line1" placeholder="Address line 1" /></div>
        <div className="md:col-span-2"><input className="input" name="address_line2" placeholder="Address line 2" /></div>
        <div><input className="input" name="town" placeholder="Town" /></div>
        <div><input className="input" name="postcode" placeholder="Postcode" /></div>
        <div className="md:col-span-2"><input className="input" name="access_notes" placeholder="Access notes" /></div>
        <div><button className="btn-outline">Add site</button></div>
      </form>

      <h2 className="mb-3 mt-8 text-lg font-semibold">Jobs</h2>
      <JobTable jobs={(jobs ?? []) as unknown as JobRow[]} hrefBase="/office/jobs" showAssignee />
    </>
  );
}
