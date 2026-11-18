import { requireProfile } from "@/lib/auth";
import { PageHeader } from "@/components/ui";
import { CredentialList, CREDENTIAL_SELECT, type CredentialRow } from "@/components/CredentialList";

export default async function CustomerLogins() {
  const { supabase } = await requireProfile(["customer"]);
  const [{ data }, { data: left }] = await Promise.all([
    supabase.from("site_credentials").select(CREDENTIAL_SELECT).order("label"),
    supabase.rpc("my_reveals_left_today"),
  ]);
  return (
    <>
      <PageHeader title="Logins" />
      <div className="card mb-5 text-sm text-brand-mute">
        For security, passwords are hidden. Tap <strong>Reveal password</strong> to see one for 1 minute.
        Your company can view up to <strong>3 passwords a day</strong> (<strong>{left ?? 0}</strong> left today) and every view is recorded.
      </div>
      <CredentialList items={(data ?? []) as unknown as CredentialRow[]} showCount emptyText="FogoTech hasn't stored any logins for you yet." />
    </>
  );
}
