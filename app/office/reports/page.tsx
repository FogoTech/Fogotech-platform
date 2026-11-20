import Link from "next/link";
import { requireProfile } from "@/lib/auth";
import { PageHeader } from "@/components/ui";
import { SubmitButton } from "@/components/SubmitButton";
import { createReport } from "@/app/actions/reports";
import { formatDate, formatDateTime } from "@/lib/labels";

type Row = {
  id: string; report_number: string; status: string; visit_date: string | null; sent_at: string | null; sent_to: string | null;
  jobs: { id: string; job_number: string; title: string; customers: { name: string } | null; sites: { name: string } | null } | null;
};

export default async function ReportsPage({ searchParams }: { searchParams: Promise<{ q?: string; status?: string }> }) {
  const sp = await searchParams;
  const { supabase } = await requireProfile(["office"]);
  let query = supabase.from("job_reports")
    .select("id, report_number, status, visit_date, sent_at, sent_to, jobs(id, job_number, title, customers(name), sites(name))")
    .order("created_at", { ascending: false }).limit(200);
  if (sp.status === "draft" || sp.status === "sent") query = query.eq("status", sp.status);
  const [{ data }, { data: jobs }] = await Promise.all([
    query,
    supabase.from("jobs").select("id, job_number, title, customers(name)").order("created_at", { ascending: false }).limit(100),
  ]);
  const q = (sp.q ?? "").trim().toLowerCase();
  const rows = ((data ?? []) as unknown as Row[]).filter((r) => !q || [r.report_number, r.jobs?.job_number, r.jobs?.title, r.jobs?.customers?.name, r.jobs?.sites?.name, r.sent_to]
    .filter(Boolean).join(" ").toLowerCase().includes(q));

  return (
    <>
      <PageHeader title="Reports & certificates" />

      <div className="mb-6 grid gap-4 md:grid-cols-2">
        <form action={createReport} className="card space-y-3">
          <div className="font-semibold">New call-out report</div>
          <select className="input" name="job_id" required defaultValue="">
            <option value="" disabled>Choose the job…</option>
            {(jobs ?? []).map((j) => (
              <option key={j.id} value={j.id}>{j.job_number} · {(j.customers as unknown as { name: string } | null)?.name} · {j.title}</option>
            ))}
          </select>
          <SubmitButton className="btn-gold" pendingText="Creating…">Start report</SubmitButton>
          <p className="text-xs text-brand-mute">You can also start one from the job page.</p>
        </form>
        <div className="card text-sm">
          <div className="mb-1 font-semibold">Coming next</div>
          <ul className="list-disc space-y-0.5 pl-5 text-brand-mute">
            <li>Job sheets with customer signature</li>
            <li>Service / maintenance reports</li>
            <li>Install certificates to SSAIB standards</li>
          </ul>
        </div>
      </div>

      <form className="mb-3 flex flex-wrap gap-2">
        <input className="input max-w-xs" name="q" defaultValue={sp.q ?? ""} placeholder="Search customer, site, job or RPT number" />
        <select className="input w-36" name="status" defaultValue={sp.status ?? ""}>
          <option value="">All</option><option value="draft">Drafts</option><option value="sent">Sent</option>
        </select>
        <button className="btn-outline" type="submit">Filter</button>
      </form>

      {rows.length ? (
        <div className="overflow-hidden rounded-xl border border-brand-line bg-white shadow-sm">
          <ul className="divide-y divide-brand-line">
            {rows.map((r) => (
              <li key={r.id}>
                <Link href={`/office/reports/${r.id}`} className="flex flex-wrap items-start justify-between gap-2 px-4 py-3 hover:bg-brand-bg">
                  <div className="min-w-0 text-sm">
                    <div className="font-semibold"><span className="text-brand-mute">{r.report_number}</span> Call-out report · {r.jobs?.customers?.name}</div>
                    <div className="mt-0.5 text-xs text-brand-mute">
                      {[r.jobs?.sites?.name, r.jobs ? `${r.jobs.job_number} ${r.jobs.title}` : null, r.visit_date ? `Visit ${formatDate(r.visit_date)}` : null].filter(Boolean).join(" · ")}
                    </div>
                  </div>
                  <span className={`shrink-0 rounded-full px-2.5 py-0.5 text-xs font-semibold ${r.status === "sent" ? "bg-brand-green text-white" : "bg-brand-gold-light text-brand-gold-dark"}`}>
                    {r.status === "sent" ? `Sent ${r.sent_at ? formatDateTime(r.sent_at) : ""}` : "Draft"}
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        </div>
      ) : <div className="card text-sm text-brand-mute">No reports{q || sp.status ? " match" : " yet"}.</div>}
    </>
  );
}
