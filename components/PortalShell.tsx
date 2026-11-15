import Link from "next/link";
import { Logo } from "@/components/Logo";
import type { Profile } from "@/lib/auth";

type NavItem = { href: string; label: string; soon?: boolean };

const NAV: Record<Profile["role"], NavItem[]> = {
  customer: [
    { href: "/customer", label: "Dashboard" },
    { href: "/customer/new-job", label: "Log a job" },
    { href: "/customer/sites", label: "Sites" },
    { href: "/customer/logins", label: "Logins", soon: true },
    { href: "/customer/documents", label: "Forms & certificates", soon: true },
  ],
  office: [
    { href: "/office", label: "Dashboard" },
    { href: "/office/jobs/new", label: "New job" },
    { href: "/office/customers", label: "Customers" },
    { href: "/office/users", label: "Users & logins" },
  ],
  engineer: [{ href: "/engineer", label: "My jobs" }],
};

const ROLE_LABEL = { customer: "Client portal", office: "Office", engineer: "Engineer" };

export function PortalShell({ profile, children }: { profile: Profile; children: React.ReactNode }) {
  const nav = NAV[profile.role];
  return (
    <div className="min-h-screen md:flex">
      <aside className="bg-brand-green-dark text-white md:fixed md:inset-y-0 md:w-60 md:flex md:flex-col">
        <div className="flex items-center justify-between px-5 py-4">
          <Link href="/dashboard">
            <Logo light />
          </Link>
          <span className="rounded bg-brand-gold/20 px-2 py-0.5 text-xs text-brand-gold md:hidden">{ROLE_LABEL[profile.role]}</span>
        </div>
        <nav className="flex gap-1 overflow-x-auto px-3 pb-3 md:flex-1 md:flex-col md:overflow-visible">
          {nav.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className="whitespace-nowrap rounded-lg px-3 py-2 text-sm text-white/85 hover:bg-white/10 hover:text-white"
            >
              {item.label}
              {item.soon && <span className="ml-2 text-[10px] uppercase text-brand-gold">soon</span>}
            </Link>
          ))}
        </nav>
        <div className="hidden border-t border-white/10 px-5 py-4 text-sm md:block">
          <div className="text-xs uppercase tracking-wide text-brand-gold">{ROLE_LABEL[profile.role]}</div>
          <div className="truncate">{profile.full_name || profile.email}</div>
          <form action="/auth/signout" method="post">
            <button className="mt-2 text-white/70 hover:text-white">Sign out</button>
          </form>
        </div>
      </aside>
      <main className="flex-1 px-4 py-6 md:ml-60 md:px-10 md:py-8">
        <div className="mx-auto max-w-5xl">{children}</div>
        <form action="/auth/signout" method="post" className="mt-10 md:hidden">
          <button className="text-sm text-stone-500 underline">Sign out</button>
        </form>
      </main>
    </div>
  );
}
