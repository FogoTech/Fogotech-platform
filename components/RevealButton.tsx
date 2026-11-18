"use client";

import { useEffect, useState, useTransition } from "react";
import { revealCredential, type RevealResult } from "@/app/actions/credentials";

const SHOW_SECONDS = 60;

export function RevealButton({ id, showCount = false }: { id: string; showCount?: boolean }) {
  const [pending, start] = useTransition();
  const [secret, setSecret] = useState<string | null>(null);
  const [left, setLeft] = useState(0);
  const [msg, setMsg] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (!secret) return;
    if (left <= 0) { setSecret(null); return; }
    const t = setTimeout(() => setLeft((s) => s - 1), 1000);
    return () => clearTimeout(t);
  }, [secret, left]);

  function reveal() {
    setMsg(null);
    start(async () => {
      const r: RevealResult = await revealCredential(id);
      if ("secret" in r) {
        setSecret(r.secret || "(no password saved)");
        setLeft(SHOW_SECONDS);
        if (showCount) setMsg(`${Math.max(0, r.limit - r.customer_reveals_today)} of ${r.limit} views left today`);
      } else if (r.error === "limit") {
        setMsg("You've used all 3 views for today. Please try again tomorrow or contact FogoTech.");
      } else if (r.error === "no_access") {
        setMsg("You don't have access to this login.");
      } else {
        setMsg("Couldn't show this login. Please try again.");
      }
    });
  }

  return (
    <div className="mt-2">
      {secret ? (
        <div className="flex flex-wrap items-center gap-2">
          <code className="rounded-md bg-brand-gold-light px-3 py-1.5 font-mono text-sm text-brand-green-dark select-all">{secret}</code>
          <button type="button" className="btn-outline px-3 py-1 text-xs"
            onClick={() => { navigator.clipboard?.writeText(secret); setCopied(true); setTimeout(() => setCopied(false), 1500); }}>
            {copied ? "Copied" : "Copy"}
          </button>
          <button type="button" className="text-xs text-brand-mute underline" onClick={() => setSecret(null)}>Hide</button>
          <span className="text-xs text-brand-mute">Hides in {left}s</span>
        </div>
      ) : (
        <button type="button" onClick={reveal} disabled={pending} className="btn-outline px-3 py-1.5 text-xs">
          {pending ? "Checking…" : "🔒 Reveal password"}
        </button>
      )}
      {msg && <div className="mt-1 text-xs text-brand-mute">{msg}</div>}
    </div>
  );
}
