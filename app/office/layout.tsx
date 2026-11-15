import { PortalShell } from "@/components/PortalShell";
import { requireProfile } from "@/lib/auth";

export default async function OfficeLayout({ children }: { children: React.ReactNode }) {
  const { profile } = await requireProfile(["office"]);
  return <PortalShell profile={profile}>{children}</PortalShell>;
}
