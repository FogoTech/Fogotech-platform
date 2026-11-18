"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { shrinkImage } from "@/lib/image";

type Stage = "request" | "in_progress" | "completed";

export function JobPhotoUploader({ jobId, userId, stages, label = "Add photos" }: {
  jobId: string;
  userId: string;
  stages: Stage[];
  label?: string;
}) {
  const router = useRouter();
  const input = useRef<HTMLInputElement>(null);
  const [stage, setStage] = useState<Stage>(stages[0]);
  const [caption, setCaption] = useState("");
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  async function upload(files: File[]) {
    if (!files.length) return;
    setBusy(true);
    setMessage(null);
    const supabase = createClient();
    let done = 0;
    const problems: string[] = [];
    for (const file of files) {
      try {
        const blob = await shrinkImage(file);
        const path = `${jobId}/${crypto.randomUUID()}.jpg`;
        const up = await supabase.storage.from("job-photos").upload(path, blob, { contentType: "image/jpeg" });
        if (up.error) throw up.error;
        const ins = await supabase.from("job_photos").insert({
          job_id: jobId, uploaded_by: userId, storage_path: path, stage, caption: caption.trim() || null,
        });
        if (ins.error) throw ins.error;
        done++;
        setMessage(`Uploading… ${done} of ${files.length}`);
      } catch (e) {
        problems.push(`${file.name}: ${(e as Error).message}`);
      }
    }
    setBusy(false);
    setCaption("");
    if (input.current) input.current.value = "";
    setMessage(problems.length ? `Uploaded ${done}. Problems: ${problems.join("; ")}` : `${done} photo${done === 1 ? "" : "s"} added.`);
    router.refresh();
  }

  return (
    <div className="card space-y-3">
      <div className="font-semibold">{label}</div>
      {stages.length > 1 && (
        <div className="flex flex-wrap gap-2 text-sm">
          {stages.map((s) => (
            <label key={s} className="flex items-center gap-1.5">
              <input type="radio" name={`stage-${jobId}`} checked={stage === s} onChange={() => setStage(s)} />
              {s === "in_progress" ? "During the work" : s === "completed" ? "Finished work" : "The problem"}
            </label>
          ))}
        </div>
      )}
      <input className="input" value={caption} onChange={(e) => setCaption(e.target.value)} placeholder="Caption (optional)" maxLength={200} />
      <input ref={input} type="file" accept="image/*" multiple disabled={busy}
        onChange={(e) => upload(Array.from(e.target.files ?? []))}
        className="block w-full text-sm file:mr-3 file:rounded-lg file:border-0 file:bg-brand-green file:px-4 file:py-2 file:font-semibold file:text-white" />
      <p className="text-xs text-brand-mute">Take a photo or choose from your phone. Photos are resized automatically.</p>
      {(busy || message) && <div className="text-sm">{busy ? message ?? "Uploading…" : message}</div>}
    </div>
  );
}
