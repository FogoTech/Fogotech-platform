import Link from "next/link";
import { requireProfile } from "@/lib/auth";
import { JobTable, PageHeader, StatCard, JOB_SELECT, type JobRow } from "@/components/ui";
import { ACTIVE_STATUSES } from "@/lib/labels";

export default async function CustomerDashboard() {
  const { supabase, profile } = await requireProfile(["customer"]);
  const { data: company } = await supabase.from("customers").select("name").eq("id", profile.customer_id!).single();
  const { data } = await supabase.from("jobs").select(JOB_SELECT).order("created_at", { ascending: false });
  const jobs = (data ?? []) as unknown as JobRow[];

  const active = jobs.filter((j) => ACTIVE_STATUSES.includes(j.status));
  const awaiting = jobs.filter((j) => ["new", "awaiting_schedule"].includes(j.status));
  const scheduled = jobs.filter((j) => j.status === "scheduled");
  const completed = jobs.filter((j) => ["completed", "invoiced"].includes(j.status));

  return (
    <>
      <PageHeader title={company?.name ?? "Dashboard"} action={<Link href="/customer/new-job" className="btn-gold">+ Log a job</Link>} />
      <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
        <StatCard label="Active jobs" value={active.length} />
        <StatCard label="Awaiting scheduling" value={awaiting.length} />
        <StatCard label="Scheduled" value={scheduled.length} />
        <StatCard label="Completed" value={completed.length} />
      </div>
      <h2 className="mb-3 mt-8 text-lg font-semibold">Active jobs</h2>
      <JobTable jobs={active} hrefBase="/customer/jobs" />
      {completed.length > 0 && (
        <>
          <h2 className="mb-3 mt-8 text-lg font-semibold">Recently completed</h2>
          <JobTable jobs={completed.slice(0, 10)} hrefBase="/customer/jobs" />
        </>
      )}
    </>
  );
}
