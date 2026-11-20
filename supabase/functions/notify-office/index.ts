// Office alerts for site logins:
//  - "credential_limit": a customer tried to view logins more than 3 times today
//  - "access_request":   an engineer asked for access to a site's logins
// Called from the database. Looks everything up itself, so a caller can't change what is sent.
import { createClient } from "jsr:@supabase/supabase-js@2";

const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY");
const EMAIL_FROM = Deno.env.get("EMAIL_FROM") ?? "FogoTech <enquiries@fogotech.co.uk>";
const SITE_URL = Deno.env.get("SITE_URL") ?? "https://portal.fogotech.co.uk";
const db = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);

const esc = (s: unknown) =>
  String(s ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]!));

const wrap = (body: string) => `<div style="font-family:Arial,sans-serif;max-width:560px;margin:auto;color:#15201a">
  <div style="background:#297542;color:#e6be31;padding:14px 20px;font-weight:800;letter-spacing:2px;border-bottom:5px solid #e6be31">FOGO<span style="color:#fff">TECH</span></div>
  <div style="padding:20px;border:1px solid #e4e2d6;border-top:0">${body}</div></div>`;
const button = (href: string, text: string) =>
  `<p><a href="${href}" style="background:#18803a;color:#fff;padding:10px 16px;border-radius:8px;text-decoration:none">${text}</a></p>`;

async function officeEmails() {
  const { data } = await db.from("profiles").select("email").eq("role", "office").eq("active", true);
  return (data ?? []).map((p) => p.email as string).filter(Boolean);
}

async function send(subject: string, html: string) {
  const to = await officeEmails();
  if (!RESEND_API_KEY || !to.length) return;
  const res = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: { Authorization: `Bearer ${RESEND_API_KEY}`, "Content-Type": "application/json" },
    body: JSON.stringify({ from: EMAIL_FROM, to, subject, html }),
  });
  if (!res.ok) throw new Error(`Resend ${res.status}: ${await res.text()}`);
}

Deno.serve(async (req) => {
  try {
    const body = await req.json();

    if (body.type === "credential_limit" && body.customer_id) {
      // Only alert if the database really recorded a limit hit today for this customer
      const since = new Date(Date.now() - 24 * 3600_000).toISOString();
      const { data: hits } = await db.from("credential_reveals").select("id")
        .eq("customer_id", body.customer_id).eq("outcome", "limit_reached").gte("created_at", since).limit(1);
      if (!hits?.length) return Response.json({ skipped: true });
      const { data: c } = await db.from("customers").select("name").eq("id", body.customer_id).single();
      const { data: u } = await db.from("profiles").select("full_name, email").eq("id", body.user_id ?? "").maybeSingle();
      await send(`Login limit reached: ${c?.name ?? "a customer"}`,
        wrap(`<h2 style="margin-top:0">Site login limit reached</h2>
          <p><strong>${esc(c?.name)}</strong> has used all 3 login views for today and tried again${u ? ` (${esc(u.full_name || u.email)})` : ""}.</p>
          <p>Further views are blocked until midnight. If this wasn't expected, you may want to check in with them.</p>
          ${button(`${SITE_URL}/office/customers/${body.customer_id}#logins`, "View their logins and log")}`));
      return Response.json({ ok: true });
    }

    if (body.type === "access_request" && body.request_id) {
      const { data: r } = await db.from("credential_access_requests")
        .select("id, status, reason, engineer:profiles!credential_access_requests_engineer_id_fkey(full_name, email), job:jobs(job_number, title, customers(name), sites(name, postcode))")
        .eq("id", body.request_id).single();
      if (!r || r.status !== "pending") return Response.json({ skipped: true });
      // deno-lint-ignore no-explicit-any
      const x = r as any;
      await send(`Login access request: ${x.engineer?.full_name ?? "engineer"} – ${x.job?.job_number ?? ""}`,
        wrap(`<h2 style="margin-top:0">Engineer asking for site login access</h2>
          <p><strong>${esc(x.engineer?.full_name || x.engineer?.email)}</strong> has asked to see the site logins for
          <strong>${esc(x.job?.job_number)} ${esc(x.job?.title)}</strong> – ${esc(x.job?.customers?.name)}${x.job?.sites ? `, ${esc(x.job.sites.name)}` : ""}.</p>
          ${x.reason ? `<p style="background:#f5f5f4;padding:10px;border-radius:8px">${esc(x.reason)}</p>` : ""}
          <p>If you approve, they can view them until midnight.</p>
          ${button(`${SITE_URL}/office/login-requests`, "Approve or decline")}`));
      return Response.json({ ok: true });
    }

    return Response.json({ skipped: true });
  } catch (err) {
    console.error(err);
    return new Response(String(err), { status: 500 });
  }
});
