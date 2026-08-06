"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const navItems = [
  { href: "/", label: "Dashboard" },
  { href: "/leads/new", label: "New Lead" },
  { href: "/leads", label: "Leads" },
  { href: "/audit", label: "Audit Trail" },
];

export function SiteHeader() {
  const pathname = usePathname();

  return (
    <header className="border-b border-slate-200 bg-white">
      <div className="mx-auto flex max-w-6xl flex-col gap-4 px-4 py-5 sm:flex-row sm:items-center sm:justify-between">
        <Link href="/" className="space-y-1">
          <p className="text-lg font-semibold text-slate-950">Mortgage Lead Qualification MVP</p>
          <p className="text-sm text-slate-600">Fictional demo workspace for Pooja</p>
        </Link>
        <nav aria-label="Primary navigation" className="flex flex-wrap gap-2">
          {navItems.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              aria-current={isActivePath(pathname, item.href) ? "page" : undefined}
              className={isActivePath(pathname, item.href)
                ? "rounded-full border border-blue-700 bg-blue-700 px-3 py-2 text-sm font-semibold text-white shadow-sm"
                : "rounded-full border border-slate-200 px-3 py-2 text-sm font-medium text-slate-700 transition hover:border-slate-300 hover:bg-slate-50"}
            >
              {item.label}
            </Link>
          ))}
        </nav>
      </div>
    </header>
  );
}

function isActivePath(pathname: string, href: string): boolean {
  if (href === "/") {
    return pathname === "/";
  }
  return pathname === href || pathname.startsWith(`${href}/`);
}
