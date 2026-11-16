"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

export type NavItem = { href: string; label: string; icon?: string; soon?: boolean };

export function NavLinks({ items }: { items: NavItem[] }) {
  const path = usePathname();
  const isActive = (href: string) =>
    path === href || (href.split("/").length > 2 && path.startsWith(href + "/"));
  return (
    <>
      {items.map((item) => {
        const on = isActive(item.href);
        return (
          <Link
            key={item.href}
            href={item.href}
            className={`flex items-center gap-2.5 whitespace-nowrap rounded-lg border-l-[3px] px-3 py-2 text-sm transition-colors ${
              on
                ? "border-brand-gold bg-brand-green-light font-semibold text-brand-green-dark"
                : "border-transparent text-brand-green-dark/80 hover:bg-brand-bg"
            }`}
          >
            {item.icon && <span className="w-5 text-center">{item.icon}</span>}
            {item.label}
            {item.soon && <span className="ml-auto text-[10px] font-semibold uppercase text-brand-gold-dark">soon</span>}
          </Link>
        );
      })}
    </>
  );
}
