"use client";

import { useFormStatus } from "react-dom";

/** Submit button that disables itself while the form is saving, so a double tap can't save twice. */
export function SubmitButton({ children, className = "btn-primary", pendingText = "Saving…" }: { children: React.ReactNode; className?: string; pendingText?: string }) {
  const { pending } = useFormStatus();
  return (
    <button type="submit" className={className} disabled={pending} aria-busy={pending}>
      {pending ? pendingText : children}
    </button>
  );
}
