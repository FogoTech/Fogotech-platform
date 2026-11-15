import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

export type Role = "office" | "engineer" | "customer";

export type Profile = {
  id: string;
  email: string | null;
  full_name: string | null;
  role: Role;
  customer_id: string | null;
  is_subcontractor: boolean;
  active: boolean;
};

/** Returns the signed-in user's profile, or sends them to the login page. */
export async function requireProfile(allowed?: Role[]) {
  const supabase = await createClient();
  const { data: claims } = await supabase.auth.getClaims();
  const userId = claims?.claims?.sub;
  if (!userId) redirect("/login");

  const { data: profile } = await supabase
    .from("profiles")
    .select("id, email, full_name, role, customer_id, is_subcontractor, active")
    .eq("id", userId)
    .single<Profile>();

  if (!profile || !profile.active) redirect("/login?error=inactive");
  if (allowed && !allowed.includes(profile.role)) redirect("/dashboard");

  return { supabase, profile };
}

export function homeFor(profile: Profile) {
  if (profile.role === "office") return "/office";
  if (profile.role === "engineer") return "/engineer";
  if (!profile.customer_id) return "/pending";
  return "/customer";
}
