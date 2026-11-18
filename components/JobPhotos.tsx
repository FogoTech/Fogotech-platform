/* eslint-disable @next/next/no-img-element */
import { createClient } from "@/lib/supabase/server";
import { formatDateTime } from "@/lib/labels";

const STAGE_LABEL: Record<string, string> = { request: "The problem", in_progress: "During the work", completed: "Finished work" };

/** Shows a job's photos (private storage, short-lived links), grouped by stage. */
export async function JobPhotos({ jobId }: { jobId: string }) {
  const supabase = await createClient();
  const { data: photos } = await supabase
    .from("job_photos")
    .select("id, storage_path, caption, stage, created_at, uploader:profiles(full_name)")
    .eq("job_id", jobId)
    .order("created_at");
  if (!photos?.length) return <div className="card text-sm text-brand-mute">No photos yet.</div>;

  const { data: signed } = await supabase.storage.from("job-photos").createSignedUrls(photos.map((p) => p.storage_path), 3600);
  const url = (path: string) => signed?.find((s) => s.path === path)?.signedUrl ?? undefined;

  return (
    <div className="space-y-5">
      {(["request", "in_progress", "completed"] as const).map((stage) => {
        const list = photos.filter((p) => p.stage === stage);
        if (!list.length) return null;
        return (
          <div key={stage}>
            <div className="mb-2 text-xs font-semibold uppercase tracking-wide text-brand-mute">{STAGE_LABEL[stage]}</div>
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
              {list.map((p) => {
                const u = url(p.storage_path);
                return (
                  <a key={p.id} href={u} target="_blank" className="overflow-hidden rounded-lg border border-brand-line bg-white">
                    {u ? <img src={u} alt={p.caption ?? ""} className="aspect-square w-full object-cover" /> : <div className="aspect-square" />}
                    <div className="px-2 py-1.5 text-xs">
                      {p.caption && <div className="font-medium">{p.caption}</div>}
                      <div className="text-brand-mute">
                        {formatDateTime(p.created_at)}
                        {(p.uploader as unknown as { full_name: string | null } | null)?.full_name ? ` · ${(p.uploader as unknown as { full_name: string }).full_name}` : ""}
                      </div>
                    </div>
                  </a>
                );
              })}
            </div>
          </div>
        );
      })}
    </div>
  );
}
