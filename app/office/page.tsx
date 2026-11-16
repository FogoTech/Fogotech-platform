import Link from "next/link";
import { requireProfile } from "@/lib/auth";
import { JobTable, PageHeader, StatCard, JOB_SELECT, type JobRow } from "@/components/ui";
import { JOB_STATUSES } from "@/lib/labels";

const TABS = [
  { key: "awaiting", label: "Awaiting scheduling", statuses: ["new", "awaiting_schedule"] },
  { key: "scheduled", label: "Scheduled", statuses: ["scheduled"] },
  { key: "progress", label: "In progress / on hold", statuses: ["in_progress", "awaiting_parts", "on_hold"] },
  { key: "completed", label: "Completed", statuses: ["completed"] },
  { key: "all", label: "All", statuses: JOB_STATUSES.map((s) => s.value as string) },
];

export default async function OfficeDashboard({ searchParams }: { searchParams: Promise<{ tab?: string }> }) {
  const { tab = "awaiting" } = await searchParams;
  const { supabase } = await requireProfile(["office"]);
  const { count: newEnquiries } = await supabase.from("enquiries").select("id", { count: "exact", head: true }).eq("status", "new");
  const { data } = await supabase.from("jobs").select(JOB_SELECT).order("created_at", { ascending: false }).limit(500);
  const jobs = (data ?? []) as unknown as JobRow[];
  const count = (statuses: string[]) => jobs.filter((j) => statuses.includes(j.status)).length;
  const current = TABS.find((t) => t.key === tab) ?? TABS[0];
  const list = jobs
    .filter((j) => current.statuses.includes(j.status))
    .sort((a, b) => (current.key === "scheduled" ? (a.scheduled_start ?? "").localeCompare(b.scheduled_start ?? "") : 0));

  return (
    <>
      <PageHeader title="Office dashboard" action={<Link href="/office/jobs/new" className="btn-gold">+ New job</Link>} />
      {!!newEnquiries && (
        <Link href="/office/enquiries" className="mb-4 block rounded-lg border border-brand-gold/50 bg-brand-gold-light px-4 py-3 text-sm font-medium text-brand-green-dark">
          📩 {newEnquiries} new website {newEnquiries === 1 ? "enquiry" : "enquiries"} — view
        </Link>
      )}
      <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
        <StatCard label="Awaiting scheduling" value={count(TABS[0].statuses)} href="/office?tab=awaiting" />
        <StatCard label="Scheduled" value={count(TABS[1].statuses)} href="/office?tab=scheduled" />
        <StatCard label="In progress / on hold" value={count(TABS[2].statuses)} href="/office?tab=progress" />
        <StatCard label="Completed (to invoice)" value={count(TABS[3].statuses)} href="/office?tab=completed" />
      </div>
      <div className="mb-3 mt-8 flex gap-2 overflow-x-auto">
        {TABS.map((t) => (
          <Link key={t.key} href={`/office?tab=${t.key}`}
            className={`whitespace-nowrap rounded-full px-3 py-1.5 text-sm ${t.key === current.key ? "bg-brand-green text-white" : "bg-white border border-stone-200 text-stone-700"}`}>
            {t.label}
          </Link>
        ))}
      </div>
      <JobTable jobs={list} hrefBase="/office/jobs" showCustomer showAssignee />
    </>
  );
}
