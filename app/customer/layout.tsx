import { redirect } from "next/navigation";
import { PortalShell } from "@/components/PortalShell";
import { requireProfile } from "@/lib/auth";

export default async function CustomerLayout({ children }: { children: React.ReactNode }) {
  const { profile } = await requireProfile(["customer"]);
  if (!profile.customer_id) redirect("/pending");
  return <PortalShell profile={profile}>{children}</PortalShell>;
}
