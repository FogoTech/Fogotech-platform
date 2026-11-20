import Link from "next/link";
import { SiteFooter, SiteHeader } from "@/components/SiteChrome";
import { PageHero } from "@/components/Brand";
import { createClient } from "@/lib/supabase/server";
import { GALLERY_CATEGORIES, galleryUrl } from "@/lib/site";

export const metadata = { title: "Our work | FogoTech" };

export default async function OurWork({ searchParams }: { searchParams: Promise<{ c?: string }> }) {
  const { c } = await searchParams;
  const supabase = await createClient();
  let q = supabase.from("gallery_photos").select("id, storage_path, caption, category").eq("visible", true)
    .order("sort_order").order("created_at", { ascending: false });
  if (c) q = q.eq("category", c);
  const { data: photos } = await q;

  const pill = (active: boolean) =>
    `whitespace-nowrap rounded-full px-3 py-1.5 text-sm ${active ? "bg-brand-green text-white" : "border border-brand-line bg-white text-stone-700"}`;

  return (
    <div className="bg-white">
      <SiteHeader />
      <PageHero title="Our work" text="A selection of recent installations across CCTV, alarms, access control, networking, sound and AV." />
      <section className="mx-auto max-w-6xl px-4 py-10">
        <div className="mb-6 flex gap-2 overflow-x-auto">
          <Link href="/our-work" className={pill(!c)}>All</Link>
          {GALLERY_CATEGORIES.map((g) => (
            <Link key={g.value} href={`/our-work?c=${g.value}`} className={pill(c === g.value)}>{g.label}</Link>
          ))}
        </div>
        {photos && photos.length ? (
          <div className="columns-1 gap-4 sm:columns-2 lg:columns-3">
            {photos.map((p) => (
              <figure key={p.id} className="mb-4 break-inside-avoid overflow-hidden rounded-xl border border-brand-line bg-white shadow-sm">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={galleryUrl(p.storage_path)} alt={p.caption ?? "FogoTech installation"} loading="lazy" className="w-full" />
                {p.caption && <figcaption className="px-4 py-3 text-sm text-stone-700">{p.caption}</figcaption>}
              </figure>
            ))}
          </div>
        ) : (
          <div className="card text-sm text-stone-500">Photos coming soon.</div>
        )}
      </section>
      <SiteFooter />
    </div>
  );
}
