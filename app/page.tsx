import Link from "next/link";
import { SiteFooter, SiteHeader } from "@/components/SiteChrome";
import { createClient } from "@/lib/supabase/server";
import { galleryUrl } from "@/lib/site";
import { Wave, circuitBg } from "@/components/Brand";

const SERVICES = [
  { title: "CCTV", icon: "/icons/cctv.png",
    text: "HD and IP camera systems with remote viewing on your phone, designed around your site and installed neatly." },
  { title: "Intruder Alarms", icon: "/icons/alarms.png",
    text: "Wired and wireless alarm systems for homes and businesses, with app control and alerts." },
  { title: "Access Control", icon: "/icons/access-control.png",
    text: "Fobs, cards, keypads and door entry, so you control who comes in, and when, from anywhere." },
  { title: "Network Infrastructure", icon: "/icons/networking.png",
    text: "Structured cabling, cabinets and switching: the reliable backbone every other system depends on." },
  { title: "Wireless AP", icon: "/icons/wifi.png",
    text: "Professional wireless access points for strong, seamless WiFi coverage across the whole building." },
  { title: "Audio", icon: "/icons/audio.png",
    text: "Background music and public address for shops, offices, halls and venues." },
  { title: "Visual", icon: "/icons/tv-av.png",
    text: "Screens, TV installation, meeting-room AV and digital signage." },
];

export default async function Home() {
  const supabase = await createClient();
  const { data: photos } = await supabase.from("gallery_photos").select("id, storage_path, caption")
    .eq("visible", true).eq("featured", true).order("sort_order").order("created_at", { ascending: false }).limit(6);

  return (
    <div className="bg-white">
      <SiteHeader />

      {/* Hero */}
      <section className="relative bg-[#297542] text-white">
        <div className="mx-auto grid max-w-6xl items-center gap-8 px-4 pb-10 pt-14 md:grid-cols-[1fr_auto] md:pb-14 md:pt-20">
          <div>
            <p className="text-sm font-semibold uppercase tracking-widest text-[#e6be31]">Security &amp; network systems</p>
            <h1 className="mt-3 max-w-3xl text-4xl font-extrabold leading-tight md:text-5xl">
              Security and connectivity, designed, installed and looked after properly.
            </h1>
            <p className="mt-5 max-w-2xl text-lg text-white/85">
              CCTV, intruder alarms, access control, networks, WiFi, audio and visual systems for homes and businesses, with a
              client portal so you can log jobs and follow their progress at any time.
            </p>
            <div className="mt-8 flex flex-wrap gap-3">
              <Link href="/contact" className="btn bg-[#e6be31] text-brand-green-dark hover:brightness-95">Get a quote</Link>
              <Link href="/login" className="btn border border-white/40 text-white hover:bg-white/10">Log a job</Link>
            </div>
          </div>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/brand/emblem.png" alt="" className="hidden h-40 w-auto rounded-full bg-[#faf9f4]/95 p-3 shadow-lg md:block lg:h-48" />
        </div>
        <Wave />
      </section>

      {/* Services */}
      <section id="services" style={circuitBg}>
        <div className="mx-auto max-w-6xl px-4 py-14 md:py-20">
          <h2 className="text-center text-3xl font-bold text-brand-green-dark">What we do</h2>
          <div className="mt-10 flex flex-wrap justify-center gap-5">
            {SERVICES.map((s) => (
              <div key={s.title} className="card w-full text-center sm:w-[calc(50%-0.625rem)] lg:w-[calc(25%-0.94rem)]">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={s.icon} alt="" className="mx-auto h-20 w-20" />
                <h3 className="mt-3 text-sm font-bold uppercase tracking-widest text-brand-gold-dark">{s.title}</h3>
                <p className="mt-2 text-sm text-brand-mute">{s.text}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Portal promo */}
      <section className="bg-brand-green-light">
        <div className="mx-auto grid max-w-6xl gap-8 px-4 py-16 md:grid-cols-2 md:items-center">
          <div>
            <h2 className="text-3xl font-bold text-brand-green-dark">Your own client portal</h2>
            <p className="mt-4 text-stone-700">
              Log a fault or request in seconds, attach photos, and see exactly where every job stands: logged, scheduled,
              in progress or complete. Every site and every job in one place.
            </p>
            <Link href="/login" className="btn-primary mt-6">Sign in to the portal</Link>
          </div>
          <ul className="space-y-3 text-stone-800">
            {["Log jobs for any of your sites", "Track status and scheduled visits", "Photos from our engineers on completion", "Quotes and invoices in one place"].map((t) => (
              <li key={t} className="card flex items-center gap-3 py-3">
                <span className="text-brand-gold">✔</span> {t}
              </li>
            ))}
          </ul>
        </div>
      </section>

      {/* Recent work */}
      {photos && photos.length > 0 && (
        <section className="mx-auto max-w-6xl px-4 py-16">
          <div className="flex flex-wrap items-end justify-between gap-3">
            <h2 className="text-3xl font-bold text-brand-green-dark">Recent work</h2>
            <Link href="/our-work" className="text-sm font-semibold text-brand-green underline">See all our work</Link>
          </div>
          <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {photos.map((p) => (
              <figure key={p.id} className="overflow-hidden rounded-xl border border-brand-line shadow-sm">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={galleryUrl(p.storage_path)} alt={p.caption ?? "FogoTech installation"} loading="lazy" className="aspect-[4/3] w-full object-cover" />
                {p.caption && <figcaption className="px-4 py-3 text-sm text-stone-700">{p.caption}</figcaption>}
              </figure>
            ))}
          </div>
        </section>
      )}

      {/* Contact CTA */}
      <section id="contact" className="bg-brand-gold-light">
        <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-6 px-4 py-14">
          <div>
            <h2 className="text-3xl font-bold text-brand-green-dark">Planning a new system or need a repair?</h2>
            <p className="mt-2 text-stone-700">Tell us what you need and we&apos;ll come back to you with advice and a quote.</p>
          </div>
          <Link href="/contact" className="btn-primary">Contact us</Link>
        </div>
      </section>

      <SiteFooter />
    </div>
  );
}
