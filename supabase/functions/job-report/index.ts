// Builds a branded PDF for a job report and (optionally) emails it to the customer.
// Called by signed-in office staff or the job's engineer (checked below), then the service key does the rest.
import { createClient } from "jsr:@supabase/supabase-js@2";
import { PDFDocument, StandardFonts, rgb, type PDFFont, type PDFImage, type PDFPage } from "npm:pdf-lib@1.17.1";

const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY");
const URL_ = Deno.env.get("SUPABASE_URL")!;
const admin = createClient(URL_, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);

const GREEN = rgb(0x29 / 255, 0x75 / 255, 0x42 / 255);
const GOLD = rgb(0xe6 / 255, 0xbe / 255, 0x31 / 255);
const INK = rgb(0x15 / 255, 0x20 / 255, 0x1a / 255);
const MUTE = rgb(0x5f / 255, 0x6b / 255, 0x63 / 255);
const LINE = rgb(0xe4 / 255, 0xe2 / 255, 0xd6 / 255);
const TINT = rgb(0xf3 / 255, 0xf7 / 255, 0xf3 / 255);

const SECTIONS = [
  { key: "reason", title: "1. Reason for call-out" },
  { key: "diagnosis", title: "2. Diagnosis / fault finding" },
  { key: "work_done", title: "3. Work carried out" },
  { key: "recommendations", title: "4. Further action & recommendations" },
] as const;

const esc = (s: unknown) =>
  String(s ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]!));

const ukDate = (d: string | null) => (d ? new Date(d + "T12:00:00Z").toLocaleDateString("en-GB", { day: "numeric", month: "long", year: "numeric" }) : "");

type Photo = { section: string; caption: string | null; sort_order: number; job_photos: { storage_path: string; caption: string | null } | null };

async function buildPdf(r: Record<string, any>, photos: Photo[], settings: Record<string, any> | null) {
  const pdf = await PDFDocument.create();
  pdf.setTitle(`Call-out report ${r.report_number}`);
  pdf.setAuthor("FogoTech Ltd");
  const font = await pdf.embedFont(StandardFonts.Helvetica);
  const bold = await pdf.embedFont(StandardFonts.HelveticaBold);
  const okChars = new Set(font.getCharacterSet());
  const clean = (s: unknown) =>
    [...String(s ?? "").replace(/\r/g, "").replace(/\t/g, "  ")].map((ch) => (ch === "\n" || okChars.has(ch.codePointAt(0)!) ? ch : "")).join("");

  const W = 595.28, H = 841.89, M = 42, CW = W - 2 * M, BOTTOM = 60;
  let page: PDFPage = pdf.addPage([W, H]);
  let y = H - M;

  const newPage = () => { page = pdf.addPage([W, H]); y = H - M; };
  const ensure = (h: number) => { if (y - h < BOTTOM) newPage(); };

  const wrap = (text: string, f: PDFFont, size: number, width: number) => {
    const out: string[] = [];
    for (const para of clean(text).split("\n")) {
      if (!para.trim()) { out.push(""); continue; }
      let line = "";
      for (const word of para.split(/ +/)) {
        const t = line ? `${line} ${word}` : word;
        if (f.widthOfTextAtSize(t, size) <= width) { line = t; continue; }
        if (line) out.push(line);
        // break very long words
        let w = word;
        while (f.widthOfTextAtSize(w, size) > width) {
          let i = w.length;
          while (i > 1 && f.widthOfTextAtSize(w.slice(0, i), size) > width) i--;
          out.push(w.slice(0, i)); w = w.slice(i);
        }
        line = w;
      }
      out.push(line);
    }
    return out;
  };
  const paragraph = (text: string, size = 10.5, f = font, color = INK, lh = 15) => {
    for (const l of wrap(text, f, size, CW)) {
      ensure(lh);
      page.drawText(l, { x: M, y: y - size, size, font: f, color });
      y -= lh;
    }
  };

  // Letterhead: logo on the left, company details on the right, brand wave underneath
  const loadPng = async (name: string) => {
    try {
      const res = await fetch(`https://www.fogotech.co.uk/brand/${name}`);
      return res.ok ? await pdf.embedPng(new Uint8Array(await res.arrayBuffer())) : null;
    } catch { return null; }
  };
  const [emblem, wordmark] = await Promise.all([loadPng("emblem.png"), loadPng("wordmark.png")]);
  const headTop = y;
  let lx = M;
  if (emblem) { const h = 50, w = (emblem.width * h) / emblem.height; page.drawImage(emblem, { x: lx, y: headTop - h, width: w, height: h }); lx += w + 10; }
  if (wordmark) { const h = 21, w = (wordmark.width * h) / wordmark.height; page.drawImage(wordmark, { x: lx, y: headTop - 25 - h / 2, width: w, height: h }); }
  const addr = String(settings?.address ?? "").split(/\n+/).map((x) => x.trim()).filter(Boolean);
  // keep the postcode on the same line as the town
  if (addr.length > 1 && /^[A-Z]{1,2}\d[A-Z\d]?\s*\d[A-Z]{2}$/i.test(addr[addr.length - 1])) addr.splice(-2, 2, `${addr[addr.length - 2]}, ${addr[addr.length - 1]}`);
  const contact = [
    { t: "FogoTech Ltd", f: bold, c: GREEN },
    ...addr.map((t) => ({ t, f: font, c: INK })),
    ...[settings?.phone ? `Tel: ${settings.phone}` : "", [settings?.email, "www.fogotech.co.uk"].filter(Boolean).join("  |  ")]
      .filter(Boolean).map((t) => ({ t, f: font, c: INK })),
  ];
  let ry = headTop - 2;
  for (const l of contact) {
    const t = clean(l.t);
    page.drawText(t, { x: W - M - l.f.widthOfTextAtSize(t, 8.5), y: ry - 8.5, size: 8.5, font: l.f, color: l.c });
    ry -= 11;
  }
  y = Math.min(headTop - 56, ry) - 8;
  // gold and green wave lines across the page
  page.drawSvgPath(`M 0 6 C ${CW * 0.3} 14, ${CW * 0.6} 14, ${CW} 2`, { x: M, y, borderColor: GOLD, borderWidth: 2.2 });
  page.drawSvgPath(`M 0 10 C ${CW * 0.3} 18, ${CW * 0.6} 18, ${CW} 6`, { x: M, y, borderColor: GREEN, borderWidth: 1.4 });
  y -= 34;

  // Title row
  page.drawText("CALL-OUT REPORT", { x: M, y: y - 20, size: 20, font: bold, color: GREEN });
  const num = clean(r.report_number);
  page.drawText(num, { x: W - M - bold.widthOfTextAtSize(num, 12), y: y - 14, size: 12, font: bold, color: INK });
  const dt = clean(ukDate(r.visit_date));
  page.drawText(dt, { x: W - M - font.widthOfTextAtSize(dt, 10), y: y - 28, size: 10, font, color: MUTE });
  y -= 40;

  // Details box
  const job = r.jobs ?? {};
  const site = job.sites;
  const siteText = site ? [site.name, [site.address_line1, site.address_line2, site.town, site.postcode].filter(Boolean).join(", ")].filter(Boolean).join("\n") : "";
  const details: [string, string][] = [
    ["Customer", job.customers?.name ?? ""],
    ["Site", siteText],
    ["Job", [job.job_number, job.title].filter(Boolean).join(" - ")],
    ["Engineer", r.engineer_name ?? ""],
    ["Visit date", ukDate(r.visit_date)],
  ].filter(([, v]) => v) as [string, string][];
  const labelW = 70, valW = CW - labelW - 24;
  const rows = details.map(([k, v]) => ({ k, lines: wrap(v, font, 10, valW) }));
  const boxH = rows.reduce((a, x) => a + x.lines.length * 13 + 5, 0) + 14;
  page.drawRectangle({ x: M, y: y - boxH, width: CW, height: boxH, color: TINT, borderColor: LINE, borderWidth: 1 });
  let by = y - 12;
  for (const row of rows) {
    page.drawText(row.k, { x: M + 12, y: by - 9, size: 9, font: bold, color: MUTE });
    for (const l of row.lines) { page.drawText(l, { x: M + 12 + labelW, y: by - 9, size: 10, font, color: INK }); by -= 13; }
    by -= 5;
  }
  y -= boxH + 18;

  // Photos: download and embed once
  const images = new Map<string, PDFImage>();
  for (const p of photos) {
    const path = p.job_photos?.storage_path;
    if (!path || images.has(path)) continue;
    const { data } = await admin.storage.from("job-photos").download(path);
    if (!data) continue;
    const bytes = new Uint8Array(await data.arrayBuffer());
    try {
      images.set(path, bytes[0] === 0x89 ? await pdf.embedPng(bytes) : await pdf.embedJpg(bytes));
    } catch { /* skip unreadable image */ }
  }

  for (const s of SECTIONS) {
    const text = String(r[s.key] ?? "").trim();
    const pics = photos.filter((p) => p.section === s.key && p.job_photos && images.has(p.job_photos.storage_path))
      .sort((a, b) => a.sort_order - b.sort_order);
    const naBox = s.key === "recommendations" && r.no_further_action;
    if (!text && !pics.length && !naBox) continue;

    ensure(26 + 30);
    page.drawRectangle({ x: M, y: y - 22, width: CW, height: 22, color: GREEN });
    page.drawRectangle({ x: M, y: y - 25, width: CW, height: 3, color: GOLD });
    page.drawText(s.title, { x: M + 10, y: y - 15.5, size: 11.5, font: bold, color: rgb(1, 1, 1) });
    y -= 36;
    if (naBox) {
      // ticked box: "N/A – no further action needed"
      ensure(20);
      page.drawRectangle({ x: M, y: y - 12, width: 12, height: 12, borderColor: GREEN, borderWidth: 1.2 });
      page.drawSvgPath("M 2.5 6.5 L 5 9.5 L 10 2.5", { x: M, y, borderColor: GREEN, borderWidth: 1.8 });
      page.drawText("N/A - no further action needed", { x: M + 19, y: y - 10, size: 10.5, font: bold, color: INK });
      y -= 22;
    }
    if (text) paragraph(text);

    if (pics.length) {
      y -= 6;
      const gap = 14, cellW = (CW - gap) / 2, maxH = 200;
      for (let i = 0; i < pics.length; i += 2) {
        const pair = pics.slice(i, i + 2).map((p) => {
          const img = images.get(p.job_photos!.storage_path)!;
          const scale = Math.min(cellW / img.width, maxH / img.height);
          const cap = wrap((p.caption ?? p.job_photos?.caption ?? "").trim(), font, 8.5, cellW);
          return { img, w: img.width * scale, h: img.height * scale, cap: cap.filter((l) => l || cap.length > 1) };
        });
        const rowH = Math.max(...pair.map((x) => x.h + (x.cap.length ? x.cap.length * 11 + 4 : 0))) + 12;
        ensure(rowH);
        pair.forEach((x, j) => {
          const cx = M + j * (cellW + gap);
          page.drawImage(x.img, { x: cx + (cellW - x.w) / 2, y: y - x.h, width: x.w, height: x.h });
          page.drawRectangle({ x: cx + (cellW - x.w) / 2, y: y - x.h, width: x.w, height: x.h, borderColor: LINE, borderWidth: 0.75 });
          let cy = y - x.h - 4;
          for (const l of x.cap) { page.drawText(l, { x: cx, y: cy - 8.5, size: 8.5, font, color: MUTE }); cy -= 11; }
        });
        y -= rowH;
      }
    }
    y -= 10;
  }

  // Footer on every page
  const pages = pdf.getPages();
  const footer = clean(["FogoTech Ltd", settings?.phone, settings?.email, "www.fogotech.co.uk"].filter(Boolean).join("  |  "));
  const legal = "Registered in England and Wales, company no. 17198313";
  pages.forEach((p, i) => {
    p.drawLine({ start: { x: M, y: 44 }, end: { x: W - M, y: 44 }, thickness: 0.75, color: LINE });
    p.drawText(footer, { x: M, y: 31, size: 8.5, font, color: GREEN });
    p.drawText(legal, { x: M, y: 20, size: 7.5, font, color: MUTE });
    const pn = `Page ${i + 1} of ${pages.length}`;
    p.drawText(pn, { x: W - M - font.widthOfTextAtSize(pn, 8.5), y: 31, size: 8.5, font, color: MUTE });
  });

  return await pdf.save();
}

function b64(bytes: Uint8Array) {
  let s = "";
  for (let i = 0; i < bytes.length; i += 0x8000) s += String.fromCharCode(...bytes.subarray(i, i + 0x8000));
  return btoa(s);
}

function signature(s: Record<string, any> | null) {
  const line = (label: string, v?: string | null) => (v ? `<div>${label}: ${esc(v)}</div>` : "");
  const address = String(s?.address ?? "").split(/\n+/).map((x) => x.trim()).filter(Boolean).join(", ");
  return `<table cellpadding="0" cellspacing="0" style="margin-top:16px"><tr><td style="font-family:Calibri,Arial,sans-serif;font-size:14px;line-height:1.45;color:#18803a">
    <img src="https://www.fogotech.co.uk/brand/email-signature.png" width="160" alt="FogoTech" style="display:block;margin-bottom:8px">
    <div style="font-weight:bold;font-size:16px">FogoTech Ltd</div>
    ${line("Phone", s?.phone)}${line("Email", s?.email)}
    <div>Web: <a href="https://www.fogotech.co.uk" style="color:#18803a;text-decoration:none">www.fogotech.co.uk</a></div>
    ${address ? `<div style="font-weight:bold;color:#15201a">${esc(address)}</div>` : ""}
  </td></tr></table>`;
}

const wrapEmail = (body: string) => `<div style="font-family:Arial,sans-serif;max-width:560px;margin:auto;color:#15201a;background:#ffffff">
  <img src="https://www.fogotech.co.uk/brand/email-header.png" width="560" alt="FogoTech" style="display:block;width:100%;max-width:560px;height:auto;border:0">
  <div style="padding:20px 24px;border:1px solid #e4e2d6;border-top:0">${body}</div></div>`;

Deno.serve(async (req) => {
  try {
    const token = (req.headers.get("Authorization") ?? "").replace(/^Bearer\s+/i, "");
    const { report_id, action, to, message, greeting } = await req.json();
    if (!report_id) return new Response("missing report_id", { status: 400 });

    // Who is calling? Office staff, or the engineer assigned to the job, may use the report.
    const { data: me } = await admin.auth.getUser(token);
    if (!me?.user) return new Response("Please sign in again", { status: 401 });
    const { data: profile } = await admin.from("profiles").select("role, active").eq("id", me.user.id).maybeSingle();
    const { data: r } = await admin.from("job_reports")
      .select("*, jobs(id, job_number, title, assigned_to, customers(name, email), sites(name, address_line1, address_line2, town, postcode))")
      .eq("id", report_id).maybeSingle();
    const allowed = !!r && !!profile?.active &&
      (profile.role === "office" || (profile.role === "engineer" && (r.jobs as any)?.assigned_to === me.user.id));
    if (!allowed) return new Response("not allowed", { status: 403 });
    const { data: photos } = await admin.from("job_report_photos")
      .select("section, caption, sort_order, job_photos(storage_path, caption)").eq("report_id", report_id);
    const { data: settings } = await admin.from("company_settings").select("*").maybeSingle();

    const bytes = await buildPdf(r!, (photos ?? []) as unknown as Photo[], settings);
    const fileName = `${r!.report_number} Call-out report.pdf`;
    const path = `${report_id}/${r!.report_number}.pdf`;
    const up = await admin.storage.from("job-reports").upload(path, bytes, { contentType: "application/pdf", upsert: true });
    if (up.error) throw up.error;
    await admin.from("job_reports").update({ pdf_path: path }).eq("id", report_id);

    if (action !== "send") return Response.json({ ok: true, path });

    const recipients = (Array.isArray(to) ? to : String(to ?? "").split(/[;,\s]+/)).map((x: string) => x.trim()).filter((x: string) => /^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(x));
    if (!recipients.length) return new Response("Please enter a valid email address", { status: 400 });
    if (!RESEND_API_KEY) return new Response("Email isn't set up", { status: 500 });

    const job = r!.jobs as any;
    const officeEmail = settings?.email ?? "office@fogotech.co.uk";
    const html = wrapEmail(`<p>${esc(greeting?.trim() || "Hi,")}</p>
      <p>Please see attached report.</p>
      ${message?.trim() ? `<p style="white-space:pre-wrap">${esc(message.trim())}</p>` : ""}
      <p>Feel free to contact us if you need any further assistance.</p>
      <p>Kind regards,</p>${signature(settings)}`);
    const res = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: { Authorization: `Bearer ${RESEND_API_KEY}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        from: `FogoTech <${officeEmail}>`, to: recipients, bcc: [officeEmail], reply_to: officeEmail,
        subject: `Call-out report ${r!.report_number}${job?.sites?.name ? ` – ${job.sites.name}` : ""}`,
        html, attachments: [{ filename: fileName, content: b64(bytes) }],
      }),
    });
    if (!res.ok) throw new Error(`Email failed (${res.status}): ${await res.text()}`);

    await admin.from("job_reports").update({ status: "sent", sent_at: new Date().toISOString(), sent_to: recipients.join(", ") }).eq("id", report_id);
    await admin.from("job_notes").insert({
      job_id: job.id, author_id: me.user?.id ?? null, visible_to_customer: false,
      body: `Call-out report ${r!.report_number} emailed to ${recipients.join(", ")}.`,
    });
    return Response.json({ ok: true, sent: recipients });
  } catch (err) {
    console.error(err);
    return new Response(err instanceof Error ? err.message : String(err), { status: 500 });
  }
});
