import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { requireProfile } from "@/lib/auth";
import { JobTable, Notice, PageHeader, JOB_SELECT, type JobRow } from "@/components/ui";
import { SubmitButton } from "@/components/SubmitButton";
import { RevealButton } from "@/components/RevealButton";
import { CREDENTIAL_SELECT, type CredentialRow } from "@/components/CredentialList";
import { formatDate, formatDateTime } from "@/lib/labels";
import { money } from "@/lib/money";

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
  const who = get("who"); // "fogotech" | "everyone" | "level:<id>"
  const { error } = await supabase.rpc("save_site_credential", {
    p_id: get("id") || null, p_customer: customerId, p_site: get("site_id") || null, p_category: category,
    p_label: get("label"), p_url: get("url"), p_username: get("username"), p_secret: String(formData.get("secret") ?? ""), p_notes: get("notes"),
    p_visibility: who === "fogotech" ? "fogotech" : "customer",
    p_level: who.startsWith("level:") ? who.slice(6) : null,
    p_assigned: who === "fogotech" ? null : get("assigned_profile_id") || null,
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

async function addLevel(formData: FormData) {
  "use server";
  const { supabase } = await requireProfile(["office"]);
  const customerId = String(formData.get("customer_id"));
  const standard = formData.get("standard");
  const rows = standard
    ? [{ name: "Admin", rank: 1 }, { name: "Supervisor", rank: 2 }, { name: "User", rank: 3 }]
    : [{ name: String(formData.get("name") ?? "").trim(), rank: Number(formData.get("rank") || 3) }];
  const { error } = await supabase.from("customer_access_levels").upsert(
    rows.filter((r) => r.name).map((r) => ({ ...r, customer_id: customerId })), { onConflict: "customer_id,name" });
  if (error) redirect(`/office/customers/${customerId}?error=${encodeURIComponent(error.message)}#levels`);
  redirect(`/office/customers/${customerId}#levels`);
}

async function deleteLevel(formData: FormData) {
  "use server";
  const { supabase } = await requireProfile(["office"]);
  const customerId = String(formData.get("customer_id"));
  await supabase.from("customer_access_levels").delete().eq("id", String(formData.get("id")));
  redirect(`/office/customers/${customerId}#levels`);
}

async function setAccountLevel(formData: FormData) {
  "use server";
  const { supabase } = await requireProfile(["office"]);
  const customerId = String(formData.get("customer_id"));
  await supabase.from("profiles").update({ access_level_id: String(formData.get("access_level_id") || "") || null })
    .eq("id", String(formData.get("profile_id"))).eq("customer_id", customerId);
  redirect(`/office/customers/${customerId}?saved=level#levels`);
}

type Level = { id: string; name: string; rank: number };
type Account = { id: string; full_name: string | null; email: string | null; access_level_id: string | null };

function whoLabel(c: CredentialRow, levels: Level[], accounts: Account[]) {
  if (c.visibility === "fogotech") return "FogoTech only (office & engineers)";
  const person = accounts.find((a) => a.id === c.assigned_profile_id);
  const level = levels.find((l) => l.id === c.access_level_id);
  if (person) return `For ${person.full_name || person.email} (and higher levels)`;
  if (level) return `${level.name} level and above`;
  return "Everyone at the customer";
}

function CredentialForm({ customerId, sites, categories, levels, accounts, c }: {
  customerId: string;
  sites: { id: string; name: string }[];
  categories: { id: string; name: string }[];
  levels: Level[];
  accounts: Account[];
  c?: CredentialRow;
}) {
  const whoDefault = c?.visibility === "fogotech" ? "fogotech" : c?.access_level_id ? `level:${c.access_level_id}` : "everyone";
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
      <div>
        <label className="label">Who can see it?</label>
        <select className="input" name="who" defaultValue={c ? whoDefault : "fogotech"}>
          <option value="fogotech">FogoTech only (admin / installer)</option>
          <option value="everyone">Everyone at the customer</option>
          {levels.map((l) => <option key={l.id} value={`level:${l.id}`}>{l.name} level and above</option>)}
        </select>
      </div>
      <div>
        <label className="label">For a specific person (optional)</label>
        <select className="input" name="assigned_profile_id" defaultValue={c?.assigned_profile_id ?? ""}>
          <option value="">—</option>
          {accounts.map((a) => <option key={a.id} value={a.id}>{a.full_name || a.email}</option>)}
        </select>
        <p className="mt-1 text-xs text-brand-mute">Their own login: they see it, and so do people at a higher level.</p>
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
  const [{ data: levelData }, { data: accountData }] = await Promise.all([
    supabase.from("customer_access_levels").select("id, name, rank").eq("customer_id", id).order("rank"),
    supabase.from("profiles").select("id, full_name, email, access_level_id").eq("customer_id", id).order("full_name"),
  ]);
  const levels = (levelData ?? []) as Level[];
  const tradifyId = (c as { tradify_customer_id?: string | null }).tradify_customer_id;
  const [{ data: oldQuotes }, { data: oldInvoices }] = tradifyId
    ? await Promise.all([
        supabase.from("tradify_quotes").select("id, quote_number, quote_date, total, reference").eq("customer_id", tradifyId).order("quote_number", { ascending: false }),
        supabase.from("tradify_invoices").select("id, invoice_number, invoice_date, total, reference").eq("customer_id", tradifyId).order("invoice_number", { ascending: false }),
      ])
    : [{ data: [] }, { data: [] }];
  const accounts = (accountData ?? []) as Account[];
  const [{ data: sites }, { data: jobs }, { data: logins }] = await Promise.all([
    supabase.from("sites").select("*").eq("customer_id", id).order("name"),
    supabase.from("jobs").select(JOB_SELECT).eq("customer_id", id).order("created_at", { ascending: false }),
    supabase.from("profiles").select("id, full_name, email").eq("customer_id", id),
  ]);
  const siteJobCounts = new Map<string, number>();
  const { data: jobSites } = await supabase.from("jobs").select("site_id").eq("customer_id", id).not("site_id", "is", null);
  for (const j of jobSites ?? []) siteJobCounts.set(j.site_id as string, (siteJobCounts.get(j.site_id as string) ?? 0) + 1);

  return (
    <>
      <PageHeader title={c.name} action={<Link href={`/office/jobs/new?customer=${id}`} className="btn-gold">+ New job</Link>} />
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

      <h2 className="mb-1 mt-8 text-lg font-semibold">Sites</h2>
      <p className="mb-3 text-xs text-brand-mute">Click a site to see its jobs, logins and history.</p>
      <div className="grid gap-3 md:grid-cols-2">
        {(sites ?? []).map((s) => (
          <Link key={s.id} href={`/office/sites/${s.id}`} className="card block text-sm transition hover:border-brand-green hover:shadow-md">
            <div className="flex items-start justify-between gap-2">
              <div className="font-semibold text-brand-green">{s.name}</div>
              {(siteJobCounts.get(s.id) ?? 0) > 0 && (
                <span className="shrink-0 rounded-full bg-brand-gold-light px-2 py-0.5 text-xs text-brand-gold-dark">
                  {siteJobCounts.get(s.id)} job{siteJobCounts.get(s.id) === 1 ? "" : "s"}
                </span>
              )}
            </div>
            <div className="text-stone-600">{[s.address_line1, s.address_line2, s.town, s.postcode].filter(Boolean).join(", ")}</div>
            {s.access_notes && <div className="mt-1 text-xs text-stone-500">Access: {s.access_notes}</div>}
          </Link>
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

      <h2 id="levels" className="mb-3 mt-8 text-lg font-semibold">Access levels &amp; portal accounts</h2>
      {sp.saved === "level" && <Notice tone="success">Access level updated.</Notice>}
      <div className="grid gap-4 md:grid-cols-2">
        <div className="card text-sm">
          <div className="mb-2 font-semibold">Levels (1 = highest)</div>
          {levels.length ? (
            <ul className="space-y-1">
              {levels.map((l) => (
                <li key={l.id} className="flex items-center justify-between">
                  <span><span className="text-brand-mute">{l.rank}.</span> {l.name}</span>
                  <form action={deleteLevel}><input type="hidden" name="id" value={l.id} /><input type="hidden" name="customer_id" value={id} />
                    <SubmitButton className="text-xs text-red-700 underline" pendingText="…">Remove</SubmitButton></form>
                </li>
              ))}
            </ul>
          ) : (
            <form action={addLevel} className="mb-2">
              <input type="hidden" name="customer_id" value={id} /><input type="hidden" name="standard" value="1" />
              <SubmitButton className="btn-gold">Add Admin, Supervisor &amp; User</SubmitButton>
            </form>
          )}
          <form action={addLevel} className="mt-3 flex gap-2">
            <input type="hidden" name="customer_id" value={id} />
            <input className="input" name="name" placeholder="New level name" required />
            <input className="input w-20" name="rank" type="number" min={1} max={20} defaultValue={levels.length + 1} title="Rank (1 = highest)" />
            <SubmitButton className="btn-outline">Add</SubmitButton>
          </form>
        </div>
        <div className="card text-sm">
          <div className="mb-2 font-semibold">Portal accounts</div>
          {accounts.length ? accounts.map((a) => (
            <form key={a.id} action={setAccountLevel} className="mb-2 flex items-center gap-2">
              <input type="hidden" name="customer_id" value={id} /><input type="hidden" name="profile_id" value={a.id} />
              <span className="min-w-0 flex-1 truncate">{a.full_name || a.email}</span>
              <select className="input w-36" name="access_level_id" defaultValue={a.access_level_id ?? ""}>
                <option value="">No level</option>
                {levels.map((l) => <option key={l.id} value={l.id}>{l.name}</option>)}
              </select>
              <SubmitButton className="btn-outline px-3" pendingText="…">Save</SubmitButton>
            </form>
          )) : <div className="text-brand-mute">No portal accounts yet. Link people under Users &amp; portal accounts.</div>}
          <p className="mt-2 text-xs text-brand-mute">People with no level only see logins shared with everyone or assigned to them.</p>
        </div>
      </div>

      <h2 id="logins" className="mb-3 mt-8 text-lg font-semibold">Site logins</h2>
      {sp.saved === "login" && <Notice tone="success">Login saved.</Notice>}
      <p className="mb-3 text-sm text-brand-mute">
        Passwords are stored encrypted. <strong>FogoTech only</strong> logins are for you and engineers. Customer logins are shown
        according to each person&apos;s level. The customer can reveal up to 3 a day in total; every view is logged below.
      </p>
      <div className="space-y-3">
        {credentials.map((c) => (
          <div key={c.id} className="card text-sm">
            <div className="flex flex-wrap items-start justify-between gap-2">
              <div>
                <div className="font-semibold">{c.label}</div>
                <div className="text-xs text-brand-mute">{[c.credential_categories?.name, c.sites?.name ?? "All sites"].filter(Boolean).join(" · ")}</div>
                <div className={`mt-1 inline-block rounded-full px-2 py-0.5 text-xs ${c.visibility === "fogotech" ? "bg-brand-green-dark text-white" : "bg-brand-gold-light text-brand-gold-dark"}`}>
                  👁 {whoLabel(c, levels, accounts)}
                </div>
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
              <div className="mt-3"><CredentialForm customerId={id} sites={sites ?? []} categories={categories ?? []} levels={levels} accounts={accounts} c={c} /></div>
            </details>
          </div>
        ))}
      </div>
      <details className="card mt-3" open={!credentials.length}>
        <summary className="cursor-pointer font-semibold text-brand-green">+ Add a login</summary>
        <div className="mt-3"><CredentialForm customerId={id} sites={sites ?? []} categories={categories ?? []} levels={levels} accounts={accounts} /></div>
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

      {tradifyId && (
        <>
          <h2 className="mb-3 mt-8 text-lg font-semibold">Tradify history <span className="text-sm font-normal text-brand-mute">(archive, read-only)</span></h2>
          <div className="grid gap-4 md:grid-cols-2">
            {[{ title: "Estimates", rows: oldQuotes ?? [], kind: "estimates", num: "quote_number", date: "quote_date" },
              { title: "Invoices", rows: oldInvoices ?? [], kind: "invoices", num: "invoice_number", date: "invoice_date" }].map((g) => (
              <div key={g.kind} className="card text-sm">
                <div className="mb-2 font-semibold">{g.title} ({g.rows.length})</div>
                {g.rows.length ? (
                  <ul className="space-y-1">
                    {(g.rows as Record<string, unknown>[]).map((r) => (
                      <li key={String(r.id)}>
                        <Link href={`/office/archive/${g.kind}/${r.id}`} className="flex justify-between gap-2 hover:underline">
                          <span><span className="text-brand-mute">{String(r[g.num])}</span> {formatDate(r[g.date] as string | null)}{r.reference ? ` · ${r.reference}` : ""}</span>
                          <span className="font-medium">{money(r.total as number)}</span>
                        </Link>
                      </li>
                    ))}
                  </ul>
                ) : <div className="text-brand-mute">None.</div>}
              </div>
            ))}
          </div>
        </>
      )}

      <h2 className="mb-3 mt-8 text-lg font-semibold">Jobs</h2>
      <JobTable jobs={(jobs ?? []) as unknown as JobRow[]} hrefBase="/office/jobs" showAssignee />
    </>
  );
}
