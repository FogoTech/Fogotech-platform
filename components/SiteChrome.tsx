import Link from "next/link";
import { Logo } from "@/components/Logo";
import { getSettings, whatsappLink } from "@/lib/site";

export function SiteHeader() {
  return (
    <header className="sticky top-0 z-20 border-b border-brand-line bg-white/95 backdrop-blur">
      <div className="mx-auto flex max-w-6xl items-center justify-between gap-2 px-4 py-3">
        <Link href="/"><Logo /></Link>
        <nav className="flex items-center gap-1 text-sm">
          <Link href="/#services" className="hidden px-3 py-2 text-stone-700 hover:text-brand-green md:inline">Services</Link>
          <Link href="/our-work" className="hidden px-3 py-2 text-stone-700 hover:text-brand-green sm:inline">Our work</Link>
          <Link href="/contact" className="hidden px-3 py-2 text-stone-700 hover:text-brand-green sm:inline">Contact</Link>
          <Link href="/login" className="btn-gold whitespace-nowrap">Client portal</Link>
        </nav>
      </div>
      <nav className="flex justify-center gap-6 border-t border-brand-line py-2 text-sm sm:hidden">
        <Link href="/#services" className="text-stone-700">Services</Link>
        <Link href="/our-work" className="text-stone-700">Our work</Link>
        <Link href="/contact" className="text-stone-700">Contact</Link>
      </nav>
    </header>
  );
}

export async function SiteFooter() {
  const s = await getSettings();
  return (
    <footer className="bg-brand-green-dark py-10 text-sm text-white/75">
      <div className="mx-auto grid max-w-6xl gap-6 px-4 md:grid-cols-3">
        <div>
          <Logo light />
          {s.areas_covered && <p className="mt-3">{s.areas_covered}</p>}
        </div>
        <div className="space-y-1">
          {s.phone && <div>📞 <a href={`tel:${s.phone.replace(/\s/g, "")}`} className="hover:text-white">{s.phone}</a></div>}
          {s.email && <div>✉️ <a href={`mailto:${s.email}`} className="hover:text-white">{s.email}</a></div>}
          {s.whatsapp && <div>💬 <a href={whatsappLink(s.whatsapp)} className="hover:text-white">WhatsApp us</a></div>}
          {s.opening_hours && <div className="whitespace-pre-line">🕘 {s.opening_hours}</div>}
        </div>
        <div className="space-y-1 md:text-right">
          <div><Link href="/contact" className="hover:text-white">Contact us</Link></div>
          <div><Link href="/our-work" className="hover:text-white">Our work</Link></div>
          <div><Link href="/login" className="hover:text-white">Client portal</Link></div>
          <div className="pt-3 text-white/50">© {new Date().getFullYear()} FogoTech</div>
        </div>
      </div>
    </footer>
  );
}
