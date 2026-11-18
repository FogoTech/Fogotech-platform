import Link from "next/link";
import { redirect } from "next/navigation";
import { requireProfile } from "@/lib/auth";
import { SubmitButton } from "@/components/SubmitButton";
import { PageHeader } from "@/components/ui";
import { formatDateTime } from "@/lib/labels";

async function decide(formData: FormData) {
  "use server";
  const { supabase } = await requireProfile(["office"]);
  await supabase.rpc("decide_access_request", { p_id: String(formData.get("id")), p_approve: formData.get("approve") === "1" });
  redirect("/office/login-requests");
}

type Req = {
  id: string; status: string; reason: string | null; created_at: string; decided_at: string | null; valid_until: string | null;
  engineer: { full_name: string | null; email: string | null } | null;
  job: { id: string; job_number: string; title: string; customers: { name: string } | null; sites: { name: string } | null } | null;
};

export default async function LoginRequests() {
  const { supabase } = await requireProfile(["office"]);
  const { data } = await supabase.from("credential_access_requests")
    .select("id, status, reason, created_at, decided_at, valid_until, engineer:profiles!credential_access_requests_engineer_id_fkey(full_name, email), job:jobs(id, job_number, title, customers(name), sites(name))")
    .order("created_at", { ascending: false }).limit(50);
  const reqs = (data ?? []) as unknown as Req[];
  const pending = reqs.filter((r) => r.status === "pending");
  const done = reqs.filter((r) => r.status !== "pending");

  const Row = ({ r }: { r: Req }) => (
    <div className="card text-sm">
      <div className="font-semibold">{r.engineer?.full_name || r.engineer?.email}</div>
      <div className="text-brand-mute">
        <Link href={`/office/jobs/${r.job?.id}`} className="underline">{r.job?.job_number} {r.job?.title}</Link>
        {" · "}{r.job?.customers?.name}{r.job?.sites ? `, ${r.job.sites.name}` : ""}
      </div>
      <div className="text-xs text-brand-mute">Asked {formatDateTime(r.created_at)}</div>
      {r.reason && <p className="mt-2 rounded-lg bg-brand-bg p-2">{r.reason}</p>}
      {r.status === "pending" ? (
        <div className="mt-3 flex gap-2">
          <form action={decide}><input type="hidden" name="id" value={r.id} /><input type="hidden" name="approve" value="1" />
            <SubmitButton className="btn-primary">Approve for today</SubmitButton></form>
          <form action={decide}><input type="hidden" name="id" value={r.id} /><input type="hidden" name="approve" value="0" />
            <SubmitButton className="btn-outline">Decline</SubmitButton></form>
        </div>
      ) : (
        <div className={`mt-2 text-xs font-semibold ${r.status === "approved" ? "text-emerald-700" : "text-red-700"}`}>
          {r.status === "approved" ? `Approved · access until ${formatDateTime(r.valid_until)}` : "Declined"} ({formatDateTime(r.decided_at)})
        </div>
      )}
    </div>
  );

  return (
    <>
      <PageHeader title="Login access requests" />
      <p className="mb-4 text-sm text-brand-mute">
        Engineers ask here when they need site logins for a job you didn&apos;t give them access to. Approving gives access until midnight.
        To give access up front, tick &quot;Engineer can view site logins&quot; when assigning the job.
      </p>
      <h2 className="mb-2 font-semibold">Waiting ({pending.length})</h2>
      <div className="space-y-3">{pending.length ? pending.map((r) => <Row key={r.id} r={r} />) : <div className="card text-sm text-brand-mute">Nothing waiting.</div>}</div>
      {done.length > 0 && (<><h2 className="mb-2 mt-8 font-semibold">Recent</h2><div className="space-y-3">{done.map((r) => <Row key={r.id} r={r} />)}</div></>)}
    </>
  );
}
