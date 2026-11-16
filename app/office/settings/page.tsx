import { redirect } from "next/navigation";
import { requireProfile } from "@/lib/auth";
import { SubmitButton } from "@/components/SubmitButton";
import { Notice, PageHeader } from "@/components/ui";

async function save(formData: FormData) {
  "use server";
  const { supabase } = await requireProfile(["office"]);
  const get = (k: string) => String(formData.get(k) ?? "").trim() || null;
  const { error } = await supabase.from("company_settings").update({
    phone: get("phone"), email: get("email"), whatsapp: get("whatsapp"),
    address: get("address"), areas_covered: get("areas_covered"), opening_hours: get("opening_hours"),
  }).eq("id", true);
  if (error) redirect(`/office/settings?error=${encodeURIComponent(error.message)}`);
  redirect("/office/settings?saved=1");
}

export default async function Settings({ searchParams }: { searchParams: Promise<{ saved?: string; error?: string }> }) {
  const sp = await searchParams;
  const { supabase } = await requireProfile(["office"]);
  const { data: s } = await supabase.from("company_settings").select("*").single();

  return (
    <>
      <PageHeader title="Website contact details" />
      {sp.saved && <Notice tone="success">Saved. The website shows the new details straight away.</Notice>}
      {sp.error && <Notice tone="error">{sp.error}</Notice>}
      <p className="mb-4 text-sm text-stone-600">These appear on the Contact page and in the website footer. Leave anything blank to hide it.</p>
      <form action={save} className="card grid max-w-2xl gap-4 md:grid-cols-2">
        <div><label className="label">Phone</label><input className="input" name="phone" defaultValue={s?.phone ?? ""} /></div>
        <div><label className="label">Email</label><input className="input" name="email" type="email" defaultValue={s?.email ?? ""} /></div>
        <div><label className="label">WhatsApp number</label><input className="input" name="whatsapp" defaultValue={s?.whatsapp ?? ""} placeholder="e.g. 07700 900000" /></div>
        <div><label className="label">Areas covered</label><input className="input" name="areas_covered" defaultValue={s?.areas_covered ?? ""} /></div>
        <div className="md:col-span-2"><label className="label">Opening hours</label><textarea className="input min-h-20" name="opening_hours" defaultValue={s?.opening_hours ?? ""} placeholder={"Mon–Thu 8am–6pm\nFri 8am–1pm"} /></div>
        <div className="md:col-span-2"><label className="label">Address (optional)</label><textarea className="input min-h-20" name="address" defaultValue={s?.address ?? ""} /></div>
        <div><SubmitButton>Save details</SubmitButton></div>
      </form>
    </>
  );
}
