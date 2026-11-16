import { redirect } from "next/navigation";
import { Logo } from "@/components/Logo";
import { Notice } from "@/components/ui";
import { createClient } from "@/lib/supabase/server";
import { SubmitButton } from "@/components/SubmitButton";

async function updatePassword(formData: FormData) {
  "use server";
  const supabase = await createClient();
  const { error } = await supabase.auth.updateUser({ password: String(formData.get("password") ?? "") });
  if (error) redirect(`/account/password?error=${encodeURIComponent(error.message)}`);
  redirect("/dashboard");
}

export default async function PasswordPage({ searchParams }: { searchParams: Promise<{ error?: string }> }) {
  const { error } = await searchParams;
  return (
    <div className="flex min-h-screen items-center justify-center bg-brand-bg p-4">
      <form action={updatePassword} className="w-full max-w-sm space-y-4 rounded-2xl border border-brand-line bg-white p-7 shadow-sm">
        <div className="flex justify-center"><Logo stacked /></div>
        <h1 className="text-center text-xl font-bold text-brand-green-dark">Set a new password</h1>
        {error && <Notice tone="error">{error}</Notice>}
        <input className="input" name="password" type="password" minLength={8} required autoComplete="new-password" placeholder="New password" />
        <SubmitButton className="btn-primary w-full">Save password</SubmitButton>
      </form>
    </div>
  );
}
