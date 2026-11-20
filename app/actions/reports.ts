"use server";

import { redirect } from "next/navigation";
import { requireProfile } from "@/lib/auth";

const SECTIONS = ["reason", "diagnosis", "work_done", "recommendations"];

/** Reads the error text an edge function sent back. */
async function functionError(error: unknown) {
  const ctx = (error as { context?: Response })?.context;
  if (ctx && typeof ctx.text === "function") {
    try { return (await ctx.text()) || (error as Error).message; } catch { /* fall through */ }
  }
  return (error as Error)?.message ?? "Something went wrong";
}

export async function createReport(formData: FormData) {
  const { supabase, profile } = await requireProfile(["office", "engineer"]);
  const jobId = String(formData.get("job_id"));
  const base = profile.role === "office" ? "office" : "engineer";
  const { data: job } = await supabase.from("jobs").select("assignee:profiles!jobs_assigned_to_fkey(full_name)").eq("id", jobId).single();
  const assignee = (job?.assignee as unknown as { full_name: string | null } | null)?.full_name;
  const { data, error } = await supabase.from("job_reports").insert({
    job_id: jobId, kind: "callout", created_by: profile.id,
    engineer_name: (profile.role === "engineer" ? profile.full_name : assignee ?? profile.full_name) ?? null,
  }).select("id").single();
  if (error) redirect(`/${base}/jobs/${jobId}?error=${encodeURIComponent(error.message)}`);
  redirect(`/${base}/reports/${data!.id}`);
}

export async function saveReport(formData: FormData) {
  const { supabase, profile } = await requireProfile(["office", "engineer"]);
  const id = String(formData.get("id"));
  const base = profile.role === "office" ? "office" : "engineer";
  const back = `/${base}/reports/${id}`;
  const get = (k: string) => String(formData.get(k) ?? "").trim() || null;
  const intent = String(formData.get("intent") ?? "save");

  const { error } = await supabase.from("job_reports").update({
    visit_date: get("visit_date") ?? undefined, engineer_name: get("engineer_name"),
    reason: get("reason"), diagnosis: get("diagnosis"), work_done: get("work_done"), recommendations: get("recommendations"),
    no_further_action: formData.get("no_further_action") === "on",
  }).eq("id", id);
  if (error) redirect(`${back}?error=${encodeURIComponent(error.message)}`);

  // Photos: each job photo has a "section" choice (blank = not in the report)
  const photoIds = formData.getAll("photo_ids").map(String);
  const rows = photoIds
    .map((pid, i) => ({ report_id: id, photo_id: pid, section: String(formData.get(`section_${pid}`) ?? ""), caption: String(formData.get(`caption_${pid}`) ?? "").trim() || null, sort_order: i }))
    .filter((r) => SECTIONS.includes(r.section));
  await supabase.from("job_report_photos").delete().eq("report_id", id);
  if (rows.length) {
    const ins = await supabase.from("job_report_photos").insert(rows);
    if (ins.error) redirect(`${back}?error=${encodeURIComponent(ins.error.message)}`);
  }

  if (intent === "preview") redirect(`/reports/${id}/pdf`);
  if (intent === "send") {
    const { error: fnError } = await supabase.functions.invoke("job-report", {
      body: { report_id: id, action: "send", to: get("send_to"), greeting: get("greeting"), message: get("message") },
    });
    if (fnError) redirect(`${back}?error=${encodeURIComponent(await functionError(fnError))}`);
    redirect(`${back}?sent=1`);
  }
  redirect(`${back}?saved=1`);
}

export async function deleteReport(formData: FormData) {
  const { supabase, profile } = await requireProfile(["office", "engineer"]);
  const id = String(formData.get("id"));
  const jobId = String(formData.get("job_id"));
  await supabase.from("job_reports").delete().eq("id", id).eq("status", "draft");
  redirect(`/${profile.role === "office" ? "office" : "engineer"}/jobs/${jobId}`);
}
