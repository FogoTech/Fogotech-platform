import { requireProfile } from "@/lib/auth";
import { JobTable, PageHeader, JOB_SELECT, type JobRow } from "@/components/ui";
import { ACTIVE_STATUSES } from "@/lib/labels";

export default async function EngineerHome() {
  const { supabase, profile } = await requireProfile(["engineer"]);
  const { data } = await supabase.from("jobs").select(JOB_SELECT).eq("assigned_to", profile.id).order("scheduled_start", { ascending: true, nullsFirst: false });
  const jobs = (data ?? []) as unknown as JobRow[];
  const active = jobs.filter((j) => ACTIVE_STATUSES.includes(j.status));
  const done = jobs.filter((j) => !ACTIVE_STATUSES.includes(j.status));
  return (
    <>
      <PageHeader title="My jobs" />
      <JobTable jobs={active} hrefBase="/engineer/jobs" showCustomer />
      {done.length > 0 && (<><h2 className="mb-3 mt-8 text-lg font-semibold">Finished</h2><JobTable jobs={done.slice(0, 20)} hrefBase="/engineer/jobs" showCustomer /></>)}
    </>
  );
}
