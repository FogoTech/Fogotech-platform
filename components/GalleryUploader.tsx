"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { GALLERY_CATEGORIES } from "@/lib/site-shared";

/** Shrinks a photo to max 2000px wide/high JPEG so pages load fast and uploads stay small. */
async function shrink(file: File): Promise<Blob> {
  const bitmap = await createImageBitmap(file);
  const scale = Math.min(1, 2000 / Math.max(bitmap.width, bitmap.height));
  const canvas = document.createElement("canvas");
  canvas.width = Math.round(bitmap.width * scale);
  canvas.height = Math.round(bitmap.height * scale);
  canvas.getContext("2d")!.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
  return new Promise((resolve, reject) =>
    canvas.toBlob((b) => (b ? resolve(b) : reject(new Error("Could not process image"))), "image/jpeg", 0.85)
  );
}

export function GalleryUploader({ userId }: { userId: string }) {
  const router = useRouter();
  const [files, setFiles] = useState<File[]>([]);
  const [category, setCategory] = useState("cctv");
  const [caption, setCaption] = useState("");
  const [featured, setFeatured] = useState(false);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  async function upload() {
    if (!files.length) return;
    setBusy(true);
    setMessage(null);
    const supabase = createClient();
    let done = 0;
    const errors: string[] = [];
    for (const file of files) {
      try {
        const blob = await shrink(file);
        const path = `${new Date().toISOString().slice(0, 10)}/${crypto.randomUUID()}.jpg`;
        const up = await supabase.storage.from("gallery").upload(path, blob, { contentType: "image/jpeg" });
        if (up.error) throw up.error;
        const ins = await supabase.from("gallery_photos").insert({
          storage_path: path, category, caption: caption.trim() || null, featured, uploaded_by: userId,
        });
        if (ins.error) throw ins.error;
        done++;
        setMessage(`Uploaded ${done} of ${files.length}…`);
      } catch (e) {
        errors.push(`${file.name}: ${(e as Error).message}`);
      }
    }
    setBusy(false);
    setFiles([]);
    setCaption("");
    setMessage(errors.length ? `Uploaded ${done}. Problems: ${errors.join("; ")}` : `Uploaded ${done} photo${done === 1 ? "" : "s"}.`);
    router.refresh();
  }

  return (
    <div className="card space-y-4">
      <div>
        <label className="label">Photos</label>
        <input type="file" accept="image/jpeg,image/png,image/webp" multiple
          onChange={(e) => setFiles(Array.from(e.target.files ?? []))}
          className="block w-full text-sm file:mr-3 file:rounded-lg file:border-0 file:bg-brand-green file:px-4 file:py-2 file:text-white" />
        {files.length > 0 && <div className="mt-1 text-xs text-stone-500">{files.length} selected</div>}
      </div>
      <div className="grid gap-4 md:grid-cols-2">
        <div>
          <label className="label">Category</label>
          <select className="input" value={category} onChange={(e) => setCategory(e.target.value)}>
            {GALLERY_CATEGORIES.map((g) => <option key={g.value} value={g.value}>{g.label}</option>)}
          </select>
        </div>
        <div>
          <label className="label">Caption (optional, applies to all selected)</label>
          <input className="input" value={caption} onChange={(e) => setCaption(e.target.value)} placeholder="e.g. 8-camera IP system, Salford warehouse" />
        </div>
      </div>
      <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={featured} onChange={(e) => setFeatured(e.target.checked)} /> Also show on the homepage</label>
      <button className="btn-primary" onClick={upload} disabled={busy || !files.length}>{busy ? "Uploading…" : "Upload"}</button>
      {message && <div className="text-sm text-stone-700">{message}</div>}
    </div>
  );
}
