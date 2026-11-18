import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { requireProfile } from "@/lib/auth";
import { JobTable, Notice, PageHeader, JOB_SELECT, type JobRow } from "@/components/ui";
import { SubmitButton } from "@/components/SubmitButton";
import { RevealButton } from "@/components/RevealButton";
import { CREDENTIAL_SELECT, type CredentialRow } from "@/components/CredentialList";
import { formatDateTime } from "@/lib/labels";

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

async function saveCredential(formData: FormData) {
  "use server";
  const { supabase } = await requireProfile(["office"]);
  const customerId = String(formData.get("customer_id"));
  const get = (k: string) => String(formData.get(k) ?? "").trim();
  let category = get("category_id") || null;
  const newCategory = get("new_category");
  if (newCategory) {
    const { data: cat } = await supabase.from("credential_categories").upsert({ name: newCategory }, { onConflict: "name" }).select("id").single();
    category = cat?.id ?? category;
  }
  const { error } = await supabase.rpc("save_site_credential", {
    p_id: get("id") || null, p_customer: customerId, p_site: get("site_id") || null, p_category: category,
    p_label: get("label"), p_url: get("url"), p_username: get("username"), p_secret: String(formData.get("secret") ?? ""), p_notes: get("notes"),
  });
  if (error) redirect(`/office/customers/${customerId}?error=${encodeURIComponent(error.message)}#logins`);
  redirect(`/office/customers/${customerId}?saved=login#logins`);
}

async function deleteCredential(formData: FormData) {
  "use server";
  const { supabase } = await requireProfile(["office"]);
  const customerId = String(formData.get("customer_id"));
  await supabase.rpc("delete_site_credential", { p_id: String(formData.get("id")) });
  redirect(`/office/customers/${customerId}#logins`);
}

function CredentialForm({ customerId, sites, categories, c }: {
  customerId: string;
  sites: { id: string; name: string }[];
  categories: { id: string; name: string }[];
  c?: CredentialRow;
}) {
  return (
    <form action={saveCredential} className="grid gap-3 md:grid-cols-2">
      <input type="hidden" name="customer_id" value={customerId} />
      {c && <input type="hidden" name="id" value={c.id} />}
      <div className="md:col-span-2"><label className="label">Name</label><input className="input" name="label" required defaultValue={c?.label} placeholder="e.g. Hikvision NVR – admin" /></div>
      <div>
        <label className="label">Category</label>
        <select className="input" name="category_id" defaultValue={c?.category_id ?? ""}>
          <option value="">—</option>
          {categories.map((x) => <option key={x.id} value={x.id}>{x.name}</option>)}
        </select>
        <input className="input mt-2" name="new_category" placeholder="…or type a new category" />
      </div>
      <div>
        <label className="label">Site</label>
        <select className="input" name="site_id" defaultValue={c?.site_id ?? ""}>
          <option value="">All sites</option>
          {sites.map((x) => <option key={x.id} value={x.id}>{x.name}</option>)}
        </select>
      </div>
      <div><label className="label">Web address / IP / app</label><input className="input" name="url" defaultValue={c?.url ?? ""} /></div>
      <div><label className="label">Username</label><input className="input" name="username" defaultValue={c?.username ?? ""} autoComplete="off" /></div>
      <div className="md:col-span-2">
        <label className="label">Password / code</label>
        <input className="input font-mono" name="secret" type="password" autoComplete="new-password" placeholder={c ? "Leave blank to keep the current password" : ""} />
      </div>
      <div className="md:col-span-2"><label className="label">Notes</label><textarea className="input min-h-16" name="notes" defaultValue={c?.notes ?? ""} /></div>
      <div><SubmitButton>{c ? "Save changes" : "Add login"}</SubmitButton></div>
    </form>
  );
}

export default async function CustomerDetail({ params, searchParams }: {
  params: Promise<{ id: string }>; searchParams: Promise<{ error?: string; saved?: string }>;
}) {
  const { id } = await params;
  const sp = await searchParams;
  const { supabase } = await requireProfile(["office"]);
  const { data: c } = await supabase.from("customers").select("*").eq("id", id).single();
  if (!c) notFound();
  const [{ data: creds }, { data: categories }, { data: reveals }] = await Promise.all([
    supabase.from("site_credentials").select(CREDENTIAL_SELECT).eq("customer_id", id).order("label"),
    supabase.from("credential_categories").select("id, name").order("sort_order").order("name"),
    supabase.from("credential_reveals").select("id, outcome, role, created_at, user:profiles(full_name, email), credential:site_credentials(label)")
      .eq("customer_id", id).order("created_at", { ascending: false }).limit(25),
  ]);
  const credentials = (creds ?? []) as unknown as CredentialRow[];
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
        <div><SubmitButton className="btn-outline">Add site</SubmitButton></div>
      </form>

      <h2 id="logins" className="mb-3 mt-8 text-lg font-semibold">Site logins</h2>
      {sp.saved === "login" && <Notice tone="success">Login saved.</Notice>}
      <p className="mb-3 text-sm text-brand-mute">Passwords are stored encrypted. The customer can reveal up to 3 a day; every view is logged below.</p>
      <div className="space-y-3">
        {credentials.map((c) => (
          <div key={c.id} className="card text-sm">
            <div className="flex flex-wrap items-start justify-between gap-2">
              <div>
                <div className="font-semibold">{c.label}</div>
                <div className="text-xs text-brand-mute">{[c.credential_categories?.name, c.sites?.name ?? "All sites"].filter(Boolean).join(" · ")}</div>
              </div>
              <form action={deleteCredential}>
                <input type="hidden" name="id" value={c.id} /><input type="hidden" name="customer_id" value={id} />
                <SubmitButton className="btn px-2 py-1 text-xs text-red-700 hover:bg-red-50">Delete</SubmitButton>
              </form>
            </div>
            {c.url && <div className="mt-1 break-all text-brand-mute">{c.url}</div>}
            {c.username && <div className="mt-1">Username: <span className="font-mono">{c.username}</span></div>}
            <RevealButton id={c.id} />
            <details className="mt-3">
              <summary className="cursor-pointer text-xs font-semibold text-brand-green">Edit</summary>
              <div className="mt-3"><CredentialForm customerId={id} sites={sites ?? []} categories={categories ?? []} c={c} /></div>
            </details>
          </div>
        ))}
      </div>
      <details className="card mt-3" open={!credentials.length}>
        <summary className="cursor-pointer font-semibold text-brand-green">+ Add a login</summary>
        <div className="mt-3"><CredentialForm customerId={id} sites={sites ?? []} categories={categories ?? []} /></div>
      </details>
      {reveals && reveals.length > 0 && (
        <details className="mt-3">
          <summary className="cursor-pointer text-sm font-semibold text-brand-green">View log ({reveals.length} most recent)</summary>
          <ul className="mt-2 space-y-1 text-xs">
            {reveals.map((r) => {
              const u = r.user as unknown as { full_name: string | null; email: string | null } | null;
              const cr = r.credential as unknown as { label: string } | null;
              return (
                <li key={r.id} className={r.outcome === "shown" ? "" : "text-red-700"}>
                  {formatDateTime(r.created_at)} · {u?.full_name || u?.email || "—"} ({r.role}) · {cr?.label ?? "deleted login"} ·{" "}
                  {r.outcome === "shown" ? "viewed" : r.outcome === "limit_reached" ? "blocked: daily limit" : "blocked: no access"}
                </li>
              );
            })}
          </ul>
        </details>
      )}

      <h2 className="mb-3 mt-8 text-lg font-semibold">Jobs</h2>
      <JobTable jobs={(jobs ?? []) as unknown as JobRow[]} hrefBase="/office/jobs" showAssignee />
    </>
  );
}
