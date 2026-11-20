// Sends enquiry emails via Resend.
// Called by a database trigger when a website enquiry arrives (type "new")
// or when an enquiry is assigned to someone (type "assigned").
// Safe to call repeatedly: it only sends once per event, tracked on the enquiry row.
import { createClient } from "jsr:@supabase/supabase-js@2";

const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY");
const EMAIL_FROM = Deno.env.get("EMAIL_FROM") ?? "FogoTech <enquiries@fogotech.co.uk>";
const SITE_URL = Deno.env.get("SITE_URL") ?? "https://portal.fogotech.co.uk";

const db = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);

const esc = (s: unknown) =>
  String(s ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]!));

async function send(to: string[], subject: string, html: string, replyTo?: string) {
  if (!RESEND_API_KEY || !to.length) return { skipped: true };
  const res = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: { Authorization: `Bearer ${RESEND_API_KEY}`, "Content-Type": "application/json" },
    body: JSON.stringify({ from: EMAIL_FROM, to, subject, html, ...(replyTo ? { reply_to: replyTo } : {}) }),
  });
  if (!res.ok) throw new Error(`Resend ${res.status}: ${await res.text()}`);
  return res.json();
}

function wrap(body: string) {
  return `<div style="font-family:Arial,sans-serif;max-width:560px;margin:auto;color:#15201a">
    <div style="background:#297542;color:#e6be31;padding:14px 20px;font-weight:800;letter-spacing:2px;border-bottom:5px solid #e6be31">FOGO<span style="color:#fff">TECH</span></div>
    <div style="padding:20px;border:1px solid #e4e2d6;border-top:0">${body}</div></div>`;
}

/** Company email signature (logo, phone, email, office address) – no personal names or mobiles. */
function signature(s: { phone?: string | null; email?: string | null; address?: string | null }) {
  const line = (label: string, v?: string | null) => (v ? `<div>${label}: ${esc(v)}</div>` : "");
  const address = (s.address ?? "").split(/\n+/).map((x) => x.trim()).filter(Boolean).join(", ");
  return `<table cellpadding="0" cellspacing="0" style="margin-top:16px"><tr><td style="font-family:Calibri,Arial,sans-serif;font-size:14px;line-height:1.45;color:#18803a">
    <img src="https://www.fogotech.co.uk/brand/email-signature.png" width="160" alt="FogoTech" style="display:block;margin-bottom:8px">
    <div style="font-weight:bold;font-size:16px">FogoTech Ltd</div>
    ${line("Phone", s.phone)}${line("Email", s.email)}
    ${address ? `<div style="font-weight:bold;color:#15201a">${esc(address)}</div>` : ""}
  </td></tr></table>`;
}

function enquiryTable(e: Record<string, unknown>) {
  const row = (k: string, v: unknown) => (v ? `<tr><td style="padding:4px 12px 4px 0;color:#78716c">${k}</td><td style="padding:4px 0">${esc(v)}</td></tr>` : "");
  return `<table style="font-size:14px">${row("Name", e.name)}${row("Phone", e.phone)}${row("Email", e.email)}${row("Service", e.service)}${row("Postcode", e.postcode)}</table>
    <p style="white-space:pre-wrap;background:#f5f5f4;padding:12px;border-radius:8px">${esc(e.message)}</p>`;
}

async function officeEmails(assignedTo: string | null) {
  if (assignedTo) {
    const { data } = await db.from("profiles").select("email").eq("id", assignedTo).eq("active", true);
    if (data?.length && data[0].email) return [data[0].email as string];
  }
  const { data } = await db.from("profiles").select("email").eq("role", "office").eq("active", true);
  return (data ?? []).map((p) => p.email as string).filter(Boolean);
}

Deno.serve(async (req) => {
  try {
    const { enquiry_id, type } = await req.json();
    if (!enquiry_id) return new Response("missing enquiry_id", { status: 400 });
    const { data: e } = await db.from("enquiries").select("*").eq("id", enquiry_id).single();
    if (!e) return new Response("not found", { status: 404 });
    if (!RESEND_API_KEY) return Response.json({ skipped: "no RESEND_API_KEY" });

    const link = `${SITE_URL}/office/enquiries#e-${e.id}`;

    if (type === "new" && !e.notified_at && e.source === "website") {
      // Claim the notification first so it can't be sent twice
      const { data: claimed } = await db.from("enquiries").update({ notified_at: new Date().toISOString() })
        .eq("id", e.id).is("notified_at", null).select("id");
      if (!claimed?.length) return Response.json({ skipped: "already sent" });

      const to = await officeEmails(e.assigned_to);
      try {
      await send(to, `New website enquiry: ${e.name}${e.service ? ` (${e.service})` : ""}`,
        wrap(`<h2 style="margin-top:0">New website enquiry</h2>${enquiryTable(e)}
          <p><a href="${link}" style="background:#18803a;color:#fff;padding:10px 16px;border-radius:8px;text-decoration:none">Open in the portal</a></p>`),
        e.email ?? undefined);
      } catch (err) {
        // Release the claim so the alert can be retried
        await db.from("enquiries").update({ notified_at: null }).eq("id", e.id);
        throw err;
      }

      const { data: settings } = await db.from("company_settings").select("*").single();
      if (settings?.autoreply_enabled && e.email) {
        const msg = settings.autoreply_message?.trim() ||
          "Thanks for getting in touch with FogoTech. We've received your enquiry and one of the team will be in touch shortly.";
        await send([e.email], "Thanks for your enquiry \u2013 FogoTech",
          wrap(`<p>Hi ${esc(String(e.name).split(" ")[0])},</p><p style="white-space:pre-wrap">${esc(msg)}</p>${signature(settings)}`),
          settings.email ?? undefined);
      }
      return Response.json({ ok: true, sent: "new" });
    }

    if (type === "assigned" && e.assigned_to && e.assigned_to !== e.assigned_notified_to) {
      const { data: claimed } = await db.from("enquiries").update({ assigned_notified_to: e.assigned_to })
        .eq("id", e.id).or(`assigned_notified_to.is.null,assigned_notified_to.neq.${e.assigned_to}`).select("id");
      if (!claimed?.length) return Response.json({ skipped: "already sent" });
      const to = await officeEmails(e.assigned_to);
      await send(to, `Enquiry assigned to you: ${e.name}`,
        wrap(`<h2 style="margin-top:0">An enquiry has been assigned to you</h2>${enquiryTable(e)}
          ${e.follow_up_on ? `<p><strong>Follow up by:</strong> ${esc(e.follow_up_on)}</p>` : ""}
          <p><a href="${link}" style="background:#18803a;color:#fff;padding:10px 16px;border-radius:8px;text-decoration:none">Open in the portal</a></p>`));
      return Response.json({ ok: true, sent: "assigned" });
    }

    return Response.json({ skipped: true });
  } catch (err) {
    console.error(err);
    return new Response(String(err), { status: 500 });
  }
});
