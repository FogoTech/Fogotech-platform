import { redirect } from "next/navigation";
import { requireProfile, homeFor } from "@/lib/auth";

export default async function Dashboard() {
  const { profile } = await requireProfile();
  redirect(homeFor(profile));
}
