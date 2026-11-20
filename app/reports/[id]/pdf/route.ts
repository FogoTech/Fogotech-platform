import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

/** Builds the latest PDF for a report and opens it. */
export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = await createClient();
  const { data: claims } = await supabase.auth.getClaims();
  if (!claims?.claims?.sub) return NextResponse.redirect(new URL("/login", _req.url));

  const { data, error } = await supabase.functions.invoke("job-report", { body: { report_id: id, action: "pdf" } });
  if (error || !data?.path) {
    let msg = error?.message ?? "Could not build the PDF";
    const ctx = (error as { context?: Response } | null)?.context;
    if (ctx && typeof ctx.text === "function") msg = (await ctx.text().catch(() => "")) || msg;
    return new NextResponse(`Could not build the PDF: ${msg}`, { status: 500 });
  }
  // The report bucket is private; office/engineers read through a short-lived link made with their own login
  const { data: signed, error: signError } = await supabase.storage.from("job-reports").createSignedUrl(data.path, 300);
  if (signError || !signed) return new NextResponse(`Could not open the PDF: ${signError?.message}`, { status: 500 });
  return NextResponse.redirect(signed.signedUrl);
}
