import { Logo } from "@/components/Logo";
import { requireProfile } from "@/lib/auth";
import { redirect } from "next/navigation";
import { SubmitButton } from "@/components/SubmitButton";

export default async function Pending() {
  const { profile } = await requireProfile();
  if (profile.role !== "customer" || profile.customer_id) redirect("/dashboard");
  return (
    <div className="flex min-h-screen items-center justify-center p-4">
      <div className="card max-w-md text-center">
        <Logo className="justify-center" />
        <h1 className="mt-6 text-xl font-bold text-brand-green-dark">Account awaiting approval</h1>
        <p className="mt-3 text-sm text-stone-600">
          Thanks for signing up, {profile.full_name || profile.email}. The FogoTech office will link your login to your
          company shortly, and you&apos;ll then see your sites and jobs here.
        </p>
        <form action="/auth/signout" method="post" className="mt-6">
          <SubmitButton className="btn-outline">Sign out</SubmitButton>
        </form>
      </div>
    </div>
  );
}
