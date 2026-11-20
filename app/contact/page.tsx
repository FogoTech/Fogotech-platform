import Link from "next/link";
import { redirect } from "next/navigation";
import { SiteFooter, SiteHeader } from "@/components/SiteChrome";
import { PageHero } from "@/components/Brand";
import { SubmitButton } from "@/components/SubmitButton";
import { Notice } from "@/components/ui";
import { createClient } from "@/lib/supabase/server";
import { ENQUIRY_SERVICES, getSettings, whatsappLink } from "@/lib/site";

export const metadata = { title: "Contact us | FogoTech" };

async function sendEnquiry(formData: FormData) {
  "use server";
  // Spam traps: hidden field must stay empty, and the form must take more than 3 seconds to fill in
  if (formData.get("website")) redirect("/contact?sent=1");
  const started = Number(formData.get("started") ?? 0);
  if (!started || Date.now() - started < 3000) redirect("/contact?sent=1");

  const get = (k: string, max: number) => String(formData.get(k) ?? "").trim().slice(0, max) || null;
  const phone = get("phone", 40);
  const email = get("email", 200);
  if (!phone && !email) redirect("/contact?error=Please give us a phone number or email so we can reply.");

  const supabase = await createClient();
  const { error } = await supabase.from("enquiries").insert({
    name: get("name", 120), phone, email,
    service: get("service", 60), postcode: get("postcode", 12)?.toUpperCase() ?? null,
    message: get("message", 4000),
  });
  if (error) redirect("/contact?error=Sorry, something went wrong sending your message. Please call or email us instead.");
  const first = (get("name", 120) ?? "").split(" ")[0];
  redirect(`/contact?sent=1${first ? `&n=${encodeURIComponent(first)}` : ""}`);
}

export default async function Contact({ searchParams }: { searchParams: Promise<{ sent?: string; error?: string; n?: string }> }) {
  const sp = await searchParams;
  const s = await getSettings();
  const started = Date.now();

  return (
    <div className="bg-white">
      <SiteHeader />
      <PageHero title="Contact us" text="Tell us about your property and what you need. We&apos;ll get back to you with advice and a quote." />

      <section className="mx-auto grid max-w-6xl gap-8 px-4 py-12 md:grid-cols-5">
        <div className="space-y-4 md:col-span-2">
          {s.phone && (
            <a href={`tel:${s.phone.replace(/\s/g, "")}`} className="card block hover:border-brand-green">
              <div className="text-xs uppercase tracking-wide text-stone-500">Call</div>
              <div className="text-lg font-semibold text-brand-green">{s.phone}</div>
            </a>
          )}
          {s.email && (
            <a href={`mailto:${s.email}`} className="card block hover:border-brand-green">
              <div className="text-xs uppercase tracking-wide text-stone-500">Email</div>
              <div className="break-all text-lg font-semibold text-brand-green">{s.email}</div>
            </a>
          )}
          {s.whatsapp && (
            <a href={whatsappLink(s.whatsapp)} className="card block hover:border-brand-green">
              <div className="text-xs uppercase tracking-wide text-stone-500">WhatsApp</div>
              <div className="text-lg font-semibold text-brand-green">Message us</div>
            </a>
          )}
          {(s.areas_covered || s.opening_hours || s.address) && (
            <div className="card space-y-2 text-sm text-stone-700">
              {s.areas_covered && <div><span className="font-semibold">Areas covered:</span> {s.areas_covered}</div>}
              {s.opening_hours && <div className="whitespace-pre-line"><span className="font-semibold">Hours:</span> {s.opening_hours}</div>}
              {s.address && <div className="whitespace-pre-line"><span className="font-semibold">Address:</span> {s.address}</div>}
            </div>
          )}
          <div className="card text-sm text-stone-700">
            Already a customer? <a href="/login" className="font-semibold text-brand-green underline">Log a job in the client portal</a> and track it from start to finish.
          </div>
        </div>

        <div className="md:col-span-3">
          {sp.sent ? (
            <div className="card border-brand-green/30 p-7">
              <div className="flex items-center gap-3">
                <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-brand-green text-2xl text-white">✓</span>
                <h2 className="text-2xl font-bold text-brand-green-dark">Thank you{sp.n ? `, ${sp.n.slice(0, 40)}` : ""}!</h2>
              </div>
              <p className="mt-5 whitespace-pre-line text-stone-700">
                {(s.autoreply_message?.trim() ||
                  "Thanks for getting in touch with FogoTech. We've received your enquiry and will get back to you as soon as possible.")
                  .replace(/\n*Kind regards,?\s*$/i, "")}
              </p>
              <div className="mt-6 flex flex-wrap gap-3">
                <Link href="/" className="btn-primary">Back to the homepage</Link>
                {s.phone && <a href={`tel:${s.phone.replace(/\s/g, "")}`} className="btn-outline">Call {s.phone}</a>}
              </div>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src="/brand/email-signature.png" alt="FogoTech" className="mt-8 w-40" />
            </div>
          ) : (
            <form action={sendEnquiry} className="card space-y-4">
              <h2 className="text-xl font-bold text-brand-green-dark">Send us a message</h2>
              {sp.error && <Notice tone="error">{sp.error}</Notice>}
              <input type="hidden" name="started" value={started} />
              <div className="hidden" aria-hidden="true">
                <label>Website <input name="website" tabIndex={-1} autoComplete="off" /></label>
              </div>
              <div><label className="label" htmlFor="name">Your name</label><input className="input" id="name" name="name" required maxLength={120} autoComplete="name" /></div>
              <div className="grid gap-4 sm:grid-cols-2">
                <div><label className="label" htmlFor="phone">Phone</label><input className="input" id="phone" name="phone" type="tel" maxLength={40} autoComplete="tel" /></div>
                <div><label className="label" htmlFor="email">Email</label><input className="input" id="email" name="email" type="email" maxLength={200} autoComplete="email" /></div>
              </div>
              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <label className="label" htmlFor="service">What do you need?</label>
                  <select className="input" id="service" name="service" defaultValue="">
                    <option value="">Choose…</option>
                    {ENQUIRY_SERVICES.map((x) => <option key={x}>{x}</option>)}
                  </select>
                </div>
                <div><label className="label" htmlFor="postcode">Postcode</label><input className="input" id="postcode" name="postcode" maxLength={12} autoComplete="postal-code" /></div>
              </div>
              <div><label className="label" htmlFor="message">Message</label><textarea className="input min-h-36" id="message" name="message" required maxLength={4000} placeholder="Tell us a bit about the property and what you're looking for" /></div>
              <p className="text-xs text-stone-500">We only use your details to reply to your enquiry. See our <a href="/privacy" className="underline">privacy policy</a>.</p>
              <SubmitButton className="btn-primary" pendingText="Sending…">Send message</SubmitButton>
            </form>
          )}
        </div>
      </section>
      <SiteFooter />
    </div>
  );
}
