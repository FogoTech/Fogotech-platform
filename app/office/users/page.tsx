import { redirect } from "next/navigation";
import { requireProfile } from "@/lib/auth";
import { Notice, PageHeader } from "@/components/ui";

async function updateUser(formData: FormData) {
  "use server";
  const { supabase, profile } = await requireProfile(["office"]);
  const id = String(formData.get("id"));
  const role = String(formData.get("role"));
  if (id === profile.id && role !== "office") redirect("/office/users?error=You can't remove your own office access.");
  const { error } = await supabase.from("profiles").update({
    full_name: String(formData.get("full_name") ?? "").trim() || null,
    role,
    customer_id: role === "customer" ? String(formData.get("customer_id") || "") || null : null,
    is_subcontractor: role === "engineer" && formData.get("is_subcontractor") === "on",
    company_name: String(formData.get("company_name") ?? "").trim() || null,
    active: formData.get("active") === "on",
  }).eq("id", id);
  if (error) redirect(`/office/users?error=${encodeURIComponent(error.message)}`);
  redirect("/office/users?saved=1");
}

export default async function Users({ searchParams }: { searchParams: Promise<{ error?: string; saved?: string }> }) {
  const sp = await searchParams;
  const { supabase } = await requireProfile(["office"]);
  const [{ data: users }, { data: customers }] = await Promise.all([
    supabase.from("profiles").select("*").order("created_at", { ascending: false }),
    supabase.from("customers").select("id, name").order("name"),
  ]);
  const pending = (users ?? []).filter((u) => u.role === "customer" && !u.customer_id);

  return (
    <>
      <PageHeader title="Users & logins" />
      {sp.error && <Notice tone="error">{sp.error}</Notice>}
      {sp.saved && <Notice tone="success">Saved.</Notice>}
      {pending.length > 0 && <Notice>{pending.length} new sign-up{pending.length > 1 ? "s" : ""} waiting to be linked to a customer or given a role.</Notice>}
      <p className="mb-4 text-sm text-stone-600">
        People create their own login on the sign-in page. Then set them here as office, engineer (including
        sub-contractors) or link them to a customer.
      </p>
      <div className="space-y-3">
        {(users ?? []).map((u) => (
          <form key={u.id} action={updateUser} className="card grid gap-3 text-sm md:grid-cols-6 md:items-end">
            <input type="hidden" name="id" value={u.id} />
            <div className="md:col-span-2">
              <label className="label">Name</label>
              <input className="input" name="full_name" defaultValue={u.full_name ?? ""} />
              <div className="mt-1 truncate text-xs text-stone-500">{u.email}</div>
            </div>
            <div>
              <label className="label">Role</label>
              <select className="input" name="role" defaultValue={u.role}>
                <option value="customer">Customer</option><option value="engineer">Engineer</option><option value="office">Office</option>
              </select>
            </div>
            <div className="md:col-span-2">
              <label className="label">Customer (if customer)</label>
              <select className="input" name="customer_id" defaultValue={u.customer_id ?? ""}>
                <option value="">—</option>
                {(customers ?? []).map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
              </select>
              <input className="input mt-2" name="company_name" defaultValue={u.company_name ?? ""} placeholder="Sub-contractor company (if any)" />
            </div>
            <div className="space-y-1">
              <label className="flex items-center gap-2"><input type="checkbox" name="is_subcontractor" defaultChecked={u.is_subcontractor} /> Sub-contractor</label>
              <label className="flex items-center gap-2"><input type="checkbox" name="active" defaultChecked={u.active} /> Active</label>
              <button className="btn-outline w-full">Save</button>
            </div>
          </form>
        ))}
      </div>
    </>
  );
}
