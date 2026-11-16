import Link from "next/link";
import { redirect } from "next/navigation";
import { requireProfile } from "@/lib/auth";
import { Notice, PageHeader } from "@/components/ui";
import { SubmitButton } from "@/components/SubmitButton";

async function addCustomer(formData: FormData) {
  "use server";
  const { supabase } = await requireProfile(["office"]);
  const get = (k: string) => String(formData.get(k) ?? "").trim() || null;
  const { data, error } = await supabase.from("customers").insert({
    name: get("name"), email: get("email"), phone: get("phone"),
    billing_address_line1: get("billing_address_line1"), billing_town: get("billing_town"),
    billing_postcode: get("billing_postcode")?.toUpperCase() ?? null,
  }).select("id").single();
  if (error) redirect(`/office/customers?error=${encodeURIComponent(error.message)}`);
  redirect(`/office/customers/${data!.id}`);
}

export default async function Customers({ searchParams }: { searchParams: Promise<{ error?: string; q?: string }> }) {
  const sp = await searchParams;
  const { supabase } = await requireProfile(["office"]);
  let query = supabase.from("customers").select("id, name, email, phone, sites(count), jobs(count)").order("name");
  if (sp.q) query = query.ilike("name", `%${sp.q}%`);
  const { data: customers } = await query;

  return (
    <>
      <PageHeader title="Customers" />
      {sp.error && <Notice tone="error">{sp.error}</Notice>}
      <form className="mb-4"><input className="input max-w-sm" name="q" defaultValue={sp.q} placeholder="Search customers…" /></form>
      <div className="overflow-hidden rounded-xl border border-stone-200 bg-white shadow-sm">
        <ul className="divide-y divide-stone-100">
          {(customers ?? []).map((c) => (
            <li key={c.id}>
              <Link href={`/office/customers/${c.id}`} className="flex flex-wrap justify-between gap-2 px-4 py-3 text-sm hover:bg-stone-50">
                <span className="font-semibold">{c.name}</span>
                <span className="text-stone-500">
                  {(c.sites as unknown as { count: number }[])[0]?.count ?? 0} sites · {(c.jobs as unknown as { count: number }[])[0]?.count ?? 0} jobs
                </span>
              </Link>
            </li>
          ))}
          {!customers?.length && <li className="px-4 py-3 text-sm text-stone-500">No customers yet.</li>}
        </ul>
      </div>

      <h2 className="mb-3 mt-8 text-lg font-semibold">Add customer</h2>
      <form action={addCustomer} className="card grid max-w-2xl gap-4 md:grid-cols-2">
        <div className="md:col-span-2"><label className="label">Customer / company name</label><input className="input" name="name" required /></div>
        <div><label className="label">Email</label><input className="input" name="email" type="email" /></div>
        <div><label className="label">Phone</label><input className="input" name="phone" /></div>
        <div className="md:col-span-2"><label className="label">Billing address</label><input className="input" name="billing_address_line1" /></div>
        <div><label className="label">Town</label><input className="input" name="billing_town" /></div>
        <div><label className="label">Postcode</label><input className="input" name="billing_postcode" /></div>
        <div><SubmitButton className="btn-primary">Add customer</SubmitButton></div>
      </form>
    </>
  );
}
