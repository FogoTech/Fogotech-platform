import { redirect } from "next/navigation";
import { requireProfile } from "@/lib/auth";
import { GalleryUploader } from "@/components/GalleryUploader";
import { SubmitButton } from "@/components/SubmitButton";
import { PageHeader } from "@/components/ui";
import { GALLERY_CATEGORIES, galleryUrl } from "@/lib/site";

async function updatePhoto(formData: FormData) {
  "use server";
  const { supabase } = await requireProfile(["office"]);
  await supabase.from("gallery_photos").update({
    caption: String(formData.get("caption") ?? "").trim() || null,
    category: String(formData.get("category")),
    visible: formData.get("visible") === "on",
    featured: formData.get("featured") === "on",
  }).eq("id", String(formData.get("id")));
  redirect("/office/gallery");
}

async function deletePhoto(formData: FormData) {
  "use server";
  const { supabase } = await requireProfile(["office"]);
  const id = String(formData.get("id"));
  const { data: p } = await supabase.from("gallery_photos").select("storage_path").eq("id", id).single();
  if (p) await supabase.storage.from("gallery").remove([p.storage_path]);
  await supabase.from("gallery_photos").delete().eq("id", id);
  redirect("/office/gallery");
}

export default async function OfficeGallery() {
  const { supabase, profile } = await requireProfile(["office"]);
  const { data: photos } = await supabase.from("gallery_photos").select("*").order("created_at", { ascending: false });

  return (
    <>
      <PageHeader title="Website gallery" action={<a href="/our-work" target="_blank" className="btn-outline">View on website</a>} />
      <p className="mb-4 text-sm text-stone-600">
        Photos uploaded here appear on the <strong>Our work</strong> page. Tick &quot;homepage&quot; to also show a photo in the Recent work section. Photos are resized automatically.
      </p>
      <GalleryUploader userId={profile.id} />
      <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {(photos ?? []).map((p) => (
          <div key={p.id} className={`overflow-hidden rounded-xl border bg-white shadow-sm ${p.visible ? "border-stone-200" : "border-dashed border-stone-300 opacity-60"}`}>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={galleryUrl(p.storage_path)} alt={p.caption ?? ""} className="aspect-[4/3] w-full object-cover" />
            <form action={updatePhoto} className="space-y-2 p-3 text-sm">
              <input type="hidden" name="id" value={p.id} />
              <input className="input" name="caption" defaultValue={p.caption ?? ""} placeholder="Caption" />
              <select className="input" name="category" defaultValue={p.category}>
                {GALLERY_CATEGORIES.map((g) => <option key={g.value} value={g.value}>{g.label}</option>)}
              </select>
              <div className="flex gap-4">
                <label className="flex items-center gap-1"><input type="checkbox" name="visible" defaultChecked={p.visible} /> On website</label>
                <label className="flex items-center gap-1"><input type="checkbox" name="featured" defaultChecked={p.featured} /> Homepage</label>
              </div>
              <SubmitButton className="btn-outline w-full">Save</SubmitButton>
            </form>
            <form action={deletePhoto} className="px-3 pb-3">
              <input type="hidden" name="id" value={p.id} />
              <SubmitButton className="btn w-full text-red-700 hover:bg-red-50">Delete photo</SubmitButton>
            </form>
          </div>
        ))}
      </div>
    </>
  );
}
