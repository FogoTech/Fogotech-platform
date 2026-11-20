import { SiteFooter, SiteHeader } from "@/components/SiteChrome";
import { COMPANY } from "@/lib/company";
import { getSettings } from "@/lib/site";

export const metadata = { title: "Privacy policy | FogoTech" };

const UPDATED = "20 November 2026";

export default async function Privacy() {
  const s = await getSettings();
  const contact = [s.email, s.phone].filter(Boolean).join(" or ");
  const H = ({ children }: { children: React.ReactNode }) => <h2 className="mt-8 text-xl font-bold text-brand-green-dark">{children}</h2>;

  return (
    <div className="bg-white">
      <SiteHeader />
      <article className="mx-auto max-w-3xl px-4 py-12 text-[15px] leading-relaxed text-stone-700">
        <h1 className="text-3xl font-extrabold text-brand-green-dark">Privacy policy</h1>
        <p className="mt-2 text-sm text-brand-mute">Last updated {UPDATED}</p>

        <H>Who we are</H>
        <p className="mt-2">
          This website and client portal are run by {COMPANY.name} (&quot;FogoTech&quot;, &quot;we&quot;), a company registered in{" "}
          {COMPANY.registeredIn} (company number {COMPANY.number}), registered office {COMPANY.registeredOffice}. We are the
          controller of the personal information described here.{contact && <> You can contact us about privacy at {contact}.</>}
        </p>

        <H>What we collect</H>
        <ul className="mt-2 list-disc space-y-1 pl-5">
          <li><strong>Enquiries:</strong> your name, phone number, email, postcode and message when you use our contact form or get in touch by phone, email or WhatsApp.</li>
          <li><strong>Portal accounts:</strong> your name, email address and password (stored securely by our login provider; we can&apos;t see it), and the company you&apos;re linked to.</li>
          <li><strong>Jobs and sites:</strong> site addresses, access notes, job details, updates and photos you or our engineers add.</li>
          <li><strong>System logins:</strong> usernames and passwords for equipment we install or maintain for you. Passwords are encrypted, and every time one is viewed it is logged.</li>
          <li><strong>Quotes, invoices and payments</strong> for work we carry out.</li>
          <li><strong>Technical information:</strong> basic logs (such as IP address and time of access) kept by our hosting providers for security.</li>
        </ul>

        <H>How and why we use it</H>
        <ul className="mt-2 list-disc space-y-1 pl-5">
          <li>To reply to enquiries and give quotes (steps before a contract / our legitimate interests).</li>
          <li>To carry out, schedule and support the work you ask us to do, and to run your portal account (performance of a contract).</li>
          <li>To invoice and keep accounting records (legal obligation).</li>
          <li>To keep our systems and your equipment logins secure (legitimate interests).</li>
        </ul>
        <p className="mt-2">We don&apos;t sell your information or use it for advertising.</p>

        <H>Who we share it with</H>
        <p className="mt-2">We use trusted service providers who process information on our behalf:</p>
        <ul className="mt-2 list-disc space-y-1 pl-5">
          <li>Supabase – database, logins and file storage (hosted in London, UK).</li>
          <li>Vercel – website hosting.</li>
          <li>Resend – sending emails from the website and portal (EU region).</li>
          <li>Microsoft 365 – our email.</li>
          <li>Xero – our accounting software, for invoices and payments.</li>
        </ul>
        <p className="mt-2">
          Some of these providers are based in, or may process data in, the United States. Where that happens, transfers are
          protected by the safeguards UK data protection law requires. We may also share information with engineers or
          sub-contractors working on your job, and where the law requires it.
        </p>

        <H>How long we keep it</H>
        <p className="mt-2">
          Enquiries that don&apos;t lead to work are kept for up to 2 years. Customer, job and site records are kept while you&apos;re
          a customer and for up to 6 years afterwards. Invoices and accounting records are kept for 6 years, as the law requires.
          Equipment logins are deleted when we no longer look after that system or when you ask us to.
        </p>

        <H>Cookies</H>
        <p className="mt-2">
          We only use cookies that are needed to keep you signed in to the portal and keep it secure. We don&apos;t use advertising or
          tracking cookies.
        </p>

        <H>Your rights</H>
        <p className="mt-2">
          You can ask for a copy of your information, ask us to correct or delete it, object to or restrict how we use it, or ask
          for it to be transferred.{contact && <> Contact us at {contact}.</>} If you&apos;re unhappy with how we&apos;ve handled your
          information, you can complain to the Information Commissioner&apos;s Office (ico.org.uk).
        </p>
      </article>
      <SiteFooter />
    </div>
  );
}
