import { PortalShell } from "@/components/PortalShell";
import { requireProfile } from "@/lib/auth";

export default async function EngineerLayout({ children }: { children: React.ReactNode }) {
  const { profile } = await requireProfile(["engineer"]);
  return <PortalShell profile={profile}>{children}</PortalShell>;
}
