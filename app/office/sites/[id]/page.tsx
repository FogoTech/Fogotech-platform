import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { requireProfile } from "@/lib/auth";
import { JobTable, Notice, PageHeader, JOB_SELECT, type JobRow } from "@/components/ui";
import { SubmitButton } from "@/components/SubmitButton";
import { RevealButton } from "@/components/RevealButton";
import { CREDENTIAL_SELECT, type CredentialRow } from "@/components/CredentialList";
import { ACTIVE_STATUSES, formatDate } from "@/lib/labels";
import { money } from "@/lib/money";

async function saveSite(formData: FormData) {
  "use server";
  const { supabase } = await requireProfile(["office"]);
  const id = String(formData.get("id"));
  const get = (k: string) => String(formData.get(k) ?? "").trim() || null;
  const { error } = await supabase.from("sites").update({
    name: get("name") ?? "Site", address_line1: get("address_line1"), address_line2: get("address_line2"),
    town: get("town"), postcode: get("postcode")?.toUpperCase() ?? null, access_notes: get("access_notes"),
  }).eq("id", id);
  if (error) redirect(`/office/sites/${id}?error=${encodeURIComponent(error.message)}`);
  redirect(`/office/sites/${id}?saved=1`);
}

// Words that don't identify a site on their own, so they're ignored when matching old Tradify paperwork.
const GENERIC = new Set(("street st road rd lane ln avenue ave close drive way place court park business commercial " +
  "centre center city house building unit units ltd limited the and car parking estate industrial retail apartments " +
  "flats shopping precinct gate gateway square green hall north south east west upper lower new old").split(" "));

function siteKeywords(name: string) {
  const main = name.split(",")[0];
  return [...new Set(main.toLowerCase().replace(/[^a-z0-9 ]/g, " ").split(/\s+/)
    .filter((w) => w.length >= 4 && !GENERIC.has(w) && !/^\d+$/.test(w)))];
}

type OldDoc = { id: string; number: string; date: string | null; total: number; reference: string | null; text: string };

export default async function SiteDetail({ params, searchParams }: {
  params: Promise<{ id: string }>; searchParams: Promise<{ error?: string; saved?: string }>;
}) {
  const { id } = await params;
  const sp = await searchParams;
  const { supabase } = await requireProfile(["office"]);
  const { data: s } = await supabase.from("sites").select("*, customers(id, name, tradify_customer_id)").eq("id", id).single();
  if (!s) notFound();
  const customer = s.customers as unknown as { id: string; name: string; tradify_customer_id: string | null };

  const [{ data: jobs }, { data: creds }, { data: tsite }] = await Promise.all([
    supabase.from("jobs").select(JOB_SELECT).eq("site_id", id).order("created_at", { ascending: false }),
    supabase.from("site_credentials").select(CREDENTIAL_SELECT).eq("customer_id", customer.id).or(`site_id.eq.${id},site_id.is.null`).order("label"),
    s.tradify_site_id
      ? supabase.from("tradify_sites").select("contact_name, phone, mobile, email").eq("id", s.tradify_site_id).maybeSingle()
      : Promise.resolve({ data: null }),
  ]);
  const credentials = (creds ?? []) as unknown as CredentialRow[];
  const allJobs = (jobs ?? []) as unknown as JobRow[];
  const openJobs = allJobs.filter((j) => ACTIVE_STATUSES.includes(j.status));
  const pastJobs = allJobs.filter((j) => !openJobs.includes(j));

  // Tradify never recorded which site a document was for, so find ones that mention this site by name.
  const words = siteKeywords(s.name);
  const postcode = (s.postcode ?? "").toLowerCase().replace(/\s/g, "");
  let oldDocs: { estimates: OldDoc[]; invoices: OldDoc[] } = { estimates: [], invoices: [] };
  if (customer.tradify_customer_id && (words.length || postcode)) {
    const [{ data: q }, { data: inv }] = await Promise.all([
      supabase.from("tradify_quotes").select("id, quote_number, quote_date, total, reference, description, tradify_quote_lines(description, section)")
        .eq("customer_id", customer.tradify_customer_id),
      supabase.from("tradify_invoices").select("id, invoice_number, invoice_date, total, reference, description, tradify_invoice_lines(description)")
        .eq("customer_id", customer.tradify_customer_id),
    ]);
    const matches = (text: string) => {
      const t = text.toLowerCase();
      return words.some((w) => new RegExp(`\\b${w}`).test(t)) || (!!postcode && t.replace(/\s/g, "").includes(postcode));
    };
    type L = { description: string | null; section?: string | null };
    const text = (r: { reference: string | null; description: string | null }, lines: L[] | null) =>
      [r.reference, r.description, ...(lines ?? []).flatMap((l) => [l.description, l.section])].filter(Boolean).join(" \n ");
    oldDocs = {
      estimates: (q ?? []).map((r) => ({ id: r.id, number: r.quote_number, date: r.quote_date, total: r.total, reference: r.reference,
        text: text(r, r.tradify_quote_lines as L[]) })).filter((d) => matches(d.text)).sort((a, b) => b.number.localeCompare(a.number)),
      invoices: (inv ?? []).map((r) => ({ id: r.id, number: r.invoice_number, date: r.invoice_date, total: r.total, reference: r.reference,
        text: text(r, r.tradify_invoice_lines as L[]) })).filter((d) => matches(d.text)).sort((a, b) => b.number.localeCompare(a.number)),
    };
  }

  const address = [s.address_line1, s.address_line2, s.town, s.postcode].filter(Boolean).join(", ");
  const contact = tsite as { contact_name: string | null; phone: string | null; mobile: string | null; email: string | null } | null;

  return (
    <>
      <Link href={`/office/customers/${customer.id}`} className="mb-2 inline-block text-sm text-brand-green hover:underline">← {customer.name}</Link>
      <PageHeader title={s.name} action={<Link href={`/office/jobs/new?site=${id}`} className="btn-gold">+ New job at this site</Link>} />
      {sp.error && <Notice tone="error">{sp.error}</Notice>}
      {sp.saved && <Notice tone="success">Site details saved.</Notice>}

      <div className="grid gap-4 md:grid-cols-3">
        <div className="card text-sm">
          <div className="mb-1 font-semibold">Address</div>
          {address ? (
            <>
              <div>{address}</div>
              <a className="mt-2 inline-block text-xs font-semibold text-brand-green underline" target="_blank" rel="noreferrer"
                href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(address)}`}>Open in Google Maps</a>
            </>
          ) : <div className="text-brand-mute">No address yet. Add it under Edit site below.</div>}
        </div>
        <div className="card text-sm">
          <div className="mb-1 font-semibold">Access notes</div>
          <div className="whitespace-pre-wrap">{s.access_notes || <span className="text-brand-mute">None.</span>}</div>
        </div>
        <div className="card text-sm">
          <div className="mb-1 font-semibold">Site contact</div>
          {contact && (contact.contact_name || contact.phone || contact.mobile || contact.email) ? (
            <div className="space-y-0.5">
              {contact.contact_name && <div>{contact.contact_name}</div>}
              {contact.phone && <div><a className="text-brand-green" href={`tel:${contact.phone.replace(/\s/g, "")}`}>{contact.phone}</a></div>}
              {contact.mobile && <div><a className="text-brand-green" href={`tel:${contact.mobile.replace(/\s/g, "")}`}>{contact.mobile}</a></div>}
              {contact.email && <div><a className="text-brand-green" href={`mailto:${contact.email}`}>{contact.email}</a></div>}
              <div className="pt-1 text-xs text-brand-mute">From Tradify</div>
            </div>
          ) : <div className="text-brand-mute">None recorded.</div>}
        </div>
      </div>

      <h2 className="mb-3 mt-8 text-lg font-semibold">Open jobs <span className="text-sm font-normal text-brand-mute">({openJobs.length})</span></h2>
      {openJobs.length ? <JobTable jobs={openJobs} hrefBase="/office/jobs" showAssignee />
        : <div className="card text-sm text-brand-mute">No open jobs. <Link className="text-brand-green underline" href={`/office/jobs/new?site=${id}`}>Create one</Link>.</div>}

      {pastJobs.length > 0 && (
        <>
          <h2 className="mb-3 mt-8 text-lg font-semibold">Past jobs <span className="text-sm font-normal text-brand-mute">({pastJobs.length})</span></h2>
          <JobTable jobs={pastJobs} hrefBase="/office/jobs" showAssignee />
        </>
      )}

      <h2 className="mb-3 mt-8 text-lg font-semibold">Site logins</h2>
      {credentials.length ? (
        <div className="grid gap-3 md:grid-cols-2">
          {credentials.map((c) => (
            <div key={c.id} className="card text-sm">
              <div className="font-semibold">{c.label}</div>
              <div className="text-xs text-brand-mute">{[c.credential_categories?.name, c.site_id ? null : "All sites"].filter(Boolean).join(" · ")}</div>
              {c.url && <div className="mt-1 break-all text-brand-mute">{c.url}</div>}
              {c.username && <div className="mt-1">Username: <span className="font-mono">{c.username}</span></div>}
              <RevealButton id={c.id} />
            </div>
          ))}
        </div>
      ) : <div className="card text-sm text-brand-mute">No logins stored for this site.</div>}
      <Link href={`/office/customers/${customer.id}#logins`} className="mt-2 inline-block text-sm text-brand-green underline">Add or edit logins</Link>

      {customer.tradify_customer_id && (
        <>
          <h2 className="mb-1 mt-8 text-lg font-semibold">Tradify history <span className="text-sm font-normal text-brand-mute">(archive, read-only)</span></h2>
          <p className="mb-3 text-xs text-brand-mute">
            Tradify didn&apos;t record which site each document was for, so these are the ones that mention
            {words.length ? <> &ldquo;{words.join("”, “")}&rdquo;</> : " this site"}{postcode ? ` or ${s.postcode}` : ""}.
            See <Link className="underline" href={`/office/customers/${customer.id}`}>{customer.name}</Link> for everything.
          </p>
          <div className="grid gap-4 md:grid-cols-2">
            {[{ title: "Estimates", rows: oldDocs.estimates, kind: "estimates" }, { title: "Invoices", rows: oldDocs.invoices, kind: "invoices" }].map((g) => (
              <div key={g.kind} className="card text-sm">
                <div className="mb-2 font-semibold">{g.title} ({g.rows.length})</div>
                {g.rows.length ? (
                  <ul className="space-y-1">
                    {g.rows.map((r) => (
                      <li key={r.id}>
                        <Link href={`/office/archive/${g.kind}/${r.id}`} className="flex justify-between gap-2 hover:underline">
                          <span><span className="text-brand-mute">{r.number}</span> {formatDate(r.date)}{r.reference ? ` · ${r.reference}` : ""}</span>
                          <span className="font-medium">{money(r.total)}</span>
                        </Link>
                      </li>
                    ))}
                  </ul>
                ) : <div className="text-brand-mute">None found.</div>}
              </div>
            ))}
          </div>
        </>
      )}

      <details className="card mt-8">
        <summary className="cursor-pointer font-semibold text-brand-green">Edit site</summary>
        <form action={saveSite} className="mt-3 grid gap-3 md:grid-cols-2">
          <input type="hidden" name="id" value={id} />
          <div className="md:col-span-2"><label className="label">Site name</label><input className="input" name="name" required defaultValue={s.name} /></div>
          <div className="md:col-span-2"><label className="label">Address line 1</label><input className="input" name="address_line1" defaultValue={s.address_line1 ?? ""} /></div>
          <div className="md:col-span-2"><label className="label">Address line 2</label><input className="input" name="address_line2" defaultValue={s.address_line2 ?? ""} /></div>
          <div><label className="label">Town</label><input className="input" name="town" defaultValue={s.town ?? ""} /></div>
          <div><label className="label">Postcode</label><input className="input" name="postcode" defaultValue={s.postcode ?? ""} /></div>
          <div className="md:col-span-2"><label className="label">Access notes</label><textarea className="input min-h-20" name="access_notes" defaultValue={s.access_notes ?? ""} /></div>
          <div><SubmitButton>Save site</SubmitButton></div>
        </form>
      </details>
    </>
  );
}
