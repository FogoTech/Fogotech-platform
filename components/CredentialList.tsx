import { RevealButton } from "@/components/RevealButton";

export type CredentialRow = {
  id: string; label: string; url: string | null; username: string | null; notes: string | null;
  site_id: string | null; category_id: string | null;
  sites?: { name: string } | null; credential_categories?: { name: string } | null;
};

export const CREDENTIAL_SELECT = "id, label, url, username, notes, site_id, category_id, sites(name), credential_categories(name)";

/** Read-only list of logins with a reveal button. Used by customers and engineers. */
export function CredentialList({ items, showCount = false, emptyText = "No logins stored yet." }: {
  items: CredentialRow[]; showCount?: boolean; emptyText?: string;
}) {
  if (!items.length) return <div className="card text-sm text-brand-mute">{emptyText}</div>;
  const groups = new Map<string, CredentialRow[]>();
  for (const c of items) {
    const key = c.sites?.name ?? "All sites";
    groups.set(key, [...(groups.get(key) ?? []), c]);
  }
  return (
    <div className="space-y-5">
      {[...groups.entries()].map(([site, list]) => (
        <div key={site}>
          <div className="mb-2 text-xs font-semibold uppercase tracking-wide text-brand-mute">📍 {site}</div>
          <div className="grid gap-3 md:grid-cols-2">
            {list.map((c) => (
              <div key={c.id} className="card text-sm">
                <div className="flex flex-wrap items-start justify-between gap-2">
                  <div className="font-semibold">{c.label}</div>
                  {c.credential_categories?.name && (
                    <span className="rounded-full bg-brand-green-light px-2 py-0.5 text-xs text-brand-green-dark">{c.credential_categories.name}</span>
                  )}
                </div>
                {c.url && <div className="mt-1 break-all text-brand-mute">{c.url}</div>}
                {c.username && <div className="mt-1">Username: <span className="font-mono">{c.username}</span></div>}
                {c.notes && <div className="mt-1 whitespace-pre-wrap text-xs text-brand-mute">{c.notes}</div>}
                <RevealButton id={c.id} showCount={showCount} />
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}
