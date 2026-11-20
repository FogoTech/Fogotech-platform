"use client";

import { useFormStatus } from "react-dom";

/** Submit button that disables itself while the form is saving, so a double tap can't save twice. */
export function SubmitButton({ children, className = "btn-primary", pendingText = "Saving…", name, value }: {
  children: React.ReactNode; className?: string; pendingText?: string; name?: string; value?: string;
}) {
  const status = useFormStatus();
  // With several buttons in one form, only the one that was pressed shows its "working" text
  const pressed = !name || status.data?.get(name) === value;
  const pending = status.pending && pressed;
  return (
    <button type="submit" name={name} value={value} className={className} disabled={status.pending} aria-busy={pending}>
      {pending ? pendingText : children}
    </button>
  );
}
