import Link from "next/link";
import { formatDateTime, jobTypeLabel, statusClass, statusLabel } from "@/lib/labels";

export function StatusBadge({ status }: { status: string }) {
  return (
    <span className={`inline-block rounded-full px-2.5 py-0.5 text-xs font-medium ${statusClass(status)}`}>
      {statusLabel(status)}
    </span>
  );
}

export function StatCard({ label, value, href }: { label: string; value: number; href?: string }) {
  const body = (
    <div className="card h-full">
      <div className="text-3xl font-bold text-brand-green">{value}</div>
      <div className="mt-1 text-sm text-stone-600">{label}</div>
    </div>
  );
  return href ? <Link href={href}>{body}</Link> : body;
}

export function PageHeader({ title, action }: { title: string; action?: React.ReactNode }) {
  return (
    <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
      <h1 className="text-2xl font-bold text-brand-green-dark">{title}</h1>
      {action}
    </div>
  );
}

export function Notice({ children, tone = "info" }: { children: React.ReactNode; tone?: "info" | "error" | "success" }) {
  const cls =
    tone === "error"
      ? "border-red-200 bg-red-50 text-red-800"
      : tone === "success"
        ? "border-emerald-200 bg-emerald-50 text-emerald-800"
        : "border-brand-gold/40 bg-brand-gold-light text-stone-800";
  return <div className={`mb-4 rounded-lg border px-4 py-3 text-sm ${cls}`}>{children}</div>;
}

export type JobRow = {
  id: string;
  job_number: string;
  title: string;
  job_type: string;
  status: string;
  scheduled_start: string | null;
  created_at: string;
  customers?: { name: string } | null;
  sites?: { name: string; postcode: string | null } | null;
  assignee?: { full_name: string | null } | null;
};

export function JobTable({ jobs, hrefBase, showCustomer = false, showAssignee = false }: {
  jobs: JobRow[];
  hrefBase?: string;
  showCustomer?: boolean;
  showAssignee?: boolean;
}) {
  if (!jobs.length) return <div className="card text-sm text-stone-500">No jobs to show.</div>;
  return (
    <div className="overflow-hidden rounded-xl border border-brand-line bg-white shadow-sm">
      <ul className="divide-y divide-brand-line">
        {jobs.map((j) => {
          const inner = (
            <div className="flex flex-wrap items-start justify-between gap-2 px-4 py-3 hover:bg-brand-bg">
              <div className="min-w-0">
                <div className="text-sm font-semibold">
                  <span className="text-stone-400">{j.job_number}</span> {j.title}
                </div>
                <div className="mt-0.5 text-xs text-stone-500">
                  {jobTypeLabel(j.job_type)}
                  {showCustomer && j.customers ? ` · ${j.customers.name}` : ""}
                  {j.sites ? ` · ${j.sites.name}${j.sites.postcode ? ` (${j.sites.postcode})` : ""}` : ""}
                  {showAssignee ? ` · ${j.assignee?.full_name || "Unassigned"}` : ""}
                </div>
                {j.scheduled_start && <div className="mt-0.5 text-xs text-brand-green">📅 {formatDateTime(j.scheduled_start)}</div>}
              </div>
              <StatusBadge status={j.status} />
            </div>
          );
          return <li key={j.id}>{hrefBase ? <Link href={`${hrefBase}/${j.id}`}>{inner}</Link> : inner}</li>;
        })}
      </ul>
    </div>
  );
}

export const JOB_SELECT =
  "id, job_number, title, job_type, status, scheduled_start, created_at, customers(name), sites(name, postcode), assignee:profiles!jobs_assigned_to_fkey(full_name)";
