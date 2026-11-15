import Link from "next/link";
import { Logo } from "@/components/Logo";
import { Notice } from "@/components/ui";
import { signIn, signUp, resetPassword } from "./actions";

const MESSAGES: Record<string, string> = {
  "check-email": "Check your email to confirm your account, then sign in.",
  "reset-sent": "If that email has an account, a password reset link is on its way.",
  "password-updated": "Password updated. You can sign in now.",
};

export default async function LoginPage({ searchParams }: { searchParams: Promise<Record<string, string | undefined>> }) {
  const sp = await searchParams;
  const mode = sp.mode ?? "signin";
  const error = sp.error === "inactive" ? "This account has been disabled. Please contact FogoTech." : sp.error;
  const message = sp.message ? MESSAGES[sp.message] : undefined;

  return (
    <div className="flex min-h-screen items-center justify-center bg-brand-green-dark p-4">
      <div className="w-full max-w-sm rounded-2xl bg-white p-7 shadow-xl">
        <Link href="/" className="flex justify-center"><Logo /></Link>
        <h1 className="mt-6 text-center text-xl font-bold text-brand-green-dark">
          {mode === "signup" ? "Create your account" : mode === "forgot" ? "Reset your password" : "Client portal sign in"}
        </h1>
        <div className="mt-5">
          {error && <Notice tone="error">{error}</Notice>}
          {message && <Notice tone="success">{message}</Notice>}
        </div>

        {mode === "signin" && (
          <form action={signIn} className="space-y-4">
            <div><label className="label" htmlFor="email">Email</label><input className="input" id="email" name="email" type="email" required autoComplete="email" /></div>
            <div><label className="label" htmlFor="password">Password</label><input className="input" id="password" name="password" type="password" required autoComplete="current-password" /></div>
            <button className="btn-primary w-full">Sign in</button>
            <div className="flex justify-between text-sm">
              <Link href="/login?mode=forgot" className="text-brand-green underline">Forgot password?</Link>
              <Link href="/login?mode=signup" className="text-brand-green underline">Create account</Link>
            </div>
          </form>
        )}

        {mode === "signup" && (
          <form action={signUp} className="space-y-4">
            <div><label className="label" htmlFor="full_name">Your name</label><input className="input" id="full_name" name="full_name" required autoComplete="name" /></div>
            <div><label className="label" htmlFor="email">Email</label><input className="input" id="email" name="email" type="email" required autoComplete="email" /></div>
            <div><label className="label" htmlFor="password">Password</label><input className="input" id="password" name="password" type="password" required minLength={8} autoComplete="new-password" /></div>
            <button className="btn-primary w-full">Create account</button>
            <p className="text-center text-sm"><Link href="/login" className="text-brand-green underline">Back to sign in</Link></p>
          </form>
        )}

        {mode === "forgot" && (
          <form action={resetPassword} className="space-y-4">
            <div><label className="label" htmlFor="email">Email</label><input className="input" id="email" name="email" type="email" required autoComplete="email" /></div>
            <button className="btn-primary w-full">Send reset link</button>
            <p className="text-center text-sm"><Link href="/login" className="text-brand-green underline">Back to sign in</Link></p>
          </form>
        )}
      </div>
    </div>
  );
}
