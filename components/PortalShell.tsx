import Link from "next/link";
import { Logo } from "@/components/Logo";
import { NavLinks, type NavItem } from "@/components/NavLinks";
import type { Profile } from "@/lib/auth";

const NAV: Record<Profile["role"], NavItem[]> = {
  customer: [
    { href: "/customer", label: "Dashboard", icon: "🏠" },
    { href: "/customer/new-job", label: "Log a job", icon: "➕" },
    { href: "/customer/sites", label: "Sites", icon: "📍" },
    { href: "/customer/logins", label: "Logins", icon: "🔑", soon: true },
    { href: "/customer/documents", label: "Forms & certificates", icon: "📄", soon: true },
  ],
  office: [
    { href: "/office", label: "Dashboard", icon: "🏠" },
    { href: "/office/jobs/new", label: "New job", icon: "➕" },
    { href: "/office/enquiries", label: "Enquiries", icon: "📩" },
    { href: "/office/customers", label: "Customers", icon: "👥" },
    { href: "/office/users", label: "Users & logins", icon: "🔑" },
    { href: "/office/gallery", label: "Website gallery", icon: "🖼️" },
    { href: "/office/settings", label: "Website & email settings", icon: "⚙️" },
  ],
  engineer: [{ href: "/engineer", label: "My jobs", icon: "🛠️" }],
};

const ROLE_LABEL = { customer: "Client portal", office: "Office", engineer: "Engineer" };

export function PortalShell({ profile, children }: { profile: Profile; children: React.ReactNode }) {
  return (
    <div className="min-h-screen md:flex">
      <aside className="border-b border-brand-line bg-white md:fixed md:inset-y-0 md:flex md:w-64 md:flex-col md:border-b-0 md:border-r">
        <div className="flex items-center justify-between px-4 py-3 md:px-5 md:py-5">
          <Link href="/dashboard"><Logo size="sm" /></Link>
          <span className="rounded-full bg-brand-gold-light px-2.5 py-0.5 text-xs font-semibold text-brand-gold-dark md:hidden">{ROLE_LABEL[profile.role]}</span>
        </div>
        <nav className="flex gap-1 overflow-x-auto px-3 pb-3 md:flex-1 md:flex-col md:overflow-visible">
          <NavLinks items={NAV[profile.role]} />
        </nav>
        <div className="hidden border-t border-brand-line px-5 py-4 text-sm md:block">
          <div className="text-xs font-semibold uppercase tracking-wide text-brand-gold-dark">{ROLE_LABEL[profile.role]}</div>
          <div className="truncate">{profile.full_name || profile.email}</div>
          <form action="/auth/signout" method="post">
            <button className="mt-2 text-brand-mute hover:text-brand-green-dark">Sign out</button>
          </form>
        </div>
      </aside>
      <main className="flex-1 px-4 py-6 md:ml-64 md:px-10 md:py-8">
        <div className="mx-auto max-w-5xl">{children}</div>
        <form action="/auth/signout" method="post" className="mt-10 md:hidden">
          <button className="text-sm text-brand-mute underline">Sign out</button>
        </form>
      </main>
    </div>
  );
}
