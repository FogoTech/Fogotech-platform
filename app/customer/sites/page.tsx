import { redirect } from "next/navigation";
import { requireProfile } from "@/lib/auth";
import { Notice, PageHeader } from "@/components/ui";

async function addSite(formData: FormData) {
  "use server";
  const { supabase, profile } = await requireProfile(["customer"]);
  const get = (k: string) => String(formData.get(k) ?? "").trim() || null;
  const { error } = await supabase.from("sites").insert({
    customer_id: profile.customer_id,
    name: get("name"),
    address_line1: get("address_line1"),
    address_line2: get("address_line2"),
    town: get("town"),
    postcode: get("postcode")?.toUpperCase() ?? null,
    access_notes: get("access_notes"),
  });
  if (error) redirect(`/customer/sites?error=${encodeURIComponent(error.message)}`);
  redirect("/customer/sites?added=1");
}

export default async function Sites({ searchParams }: { searchParams: Promise<{ error?: string; added?: string }> }) {
  const sp = await searchParams;
  const { supabase } = await requireProfile(["customer"]);
  const { data: sites } = await supabase.from("sites").select("*").order("name");

  return (
    <>
      <PageHeader title="Your sites" />
      {sp.error && <Notice tone="error">{sp.error}</Notice>}
      {sp.added && <Notice tone="success">Site added.</Notice>}
      <div className="grid gap-3 md:grid-cols-2">
        {(sites ?? []).map((s) => (
          <div key={s.id} className="card text-sm">
            <div className="font-semibold text-brand-green">{s.name}</div>
            <div className="mt-1 text-stone-600">{[s.address_line1, s.address_line2, s.town, s.postcode].filter(Boolean).join(", ")}</div>
            {s.access_notes && <div className="mt-2 text-xs text-stone-500">Access: {s.access_notes}</div>}
          </div>
        ))}
      </div>
      <h2 className="mb-3 mt-8 text-lg font-semibold">Add a site</h2>
      <form action={addSite} className="card grid max-w-2xl gap-4 md:grid-cols-2">
        <div className="md:col-span-2"><label className="label">Site name</label><input className="input" name="name" required placeholder="e.g. Head office" /></div>
        <div className="md:col-span-2"><label className="label">Address line 1</label><input className="input" name="address_line1" /></div>
        <div className="md:col-span-2"><label className="label">Address line 2</label><input className="input" name="address_line2" /></div>
        <div><label className="label">Town / city</label><input className="input" name="town" /></div>
        <div><label className="label">Postcode</label><input className="input" name="postcode" /></div>
        <div className="md:col-span-2"><label className="label">Access notes</label><input className="input" name="access_notes" placeholder="Parking, key holder, opening hours…" /></div>
        <div><button className="btn-primary">Add site</button></div>
      </form>
    </>
  );
}
