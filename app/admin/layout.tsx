"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const NAV = [
  { href: "/admin",                label: "Dashboard" },
  { href: "/admin/leads",          label: "Leads" },
  { href: "/admin/crm",            label: "CRM Intel" },
  { href: "/admin/templates",      label: "Templates" },
  { href: "/admin/warmup",         label: "Warmup" },
  { href: "/admin/whatsapp",       label: "WhatsApp" },
  { href: "/admin/country",        label: "Country" },
  { href: "/admin/lighthouse",     label: "Lighthouse" },
  { href: "/admin/settings",       label: "Settings" },
];

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();

  return (
    <div className="min-h-screen flex flex-col">
      <header className="bg-gray-900 border-b border-gray-800 text-white shadow">
        <div className="max-w-7xl mx-auto px-4 h-14 flex items-center justify-between">
          <div className="flex items-center gap-8">
            <Link href="/admin" className="font-bold text-lg tracking-tight">
              ⚡ LeadManager
            </Link>
            <nav className="flex gap-6 text-sm">
              {NAV.map(({ href, label }) => {
                const isActive =
                  href === "/admin"
                    ? pathname === "/admin"
                    : pathname.startsWith(href);
                return (
                  <Link
                    key={href}
                    href={href}
                    className={
                      isActive
                        ? "text-blue-400 font-semibold border-b-2 border-blue-400 pb-0.5"
                        : "hover:text-blue-200 transition-colors"
                    }
                  >
                    {label}
                  </Link>
                );
              })}
            </nav>
          </div>
          <div className="flex items-center gap-4">
            <Link href="/" className="text-gray-400 hover:text-white text-xs transition-colors">
              ← Public site
            </Link>
            <span className="text-blue-200 text-sm">LevelCoding</span>
          </div>
        </div>
      </header>
      <main className="flex-1 max-w-7xl mx-auto w-full px-4 py-8">
        {children}
      </main>
    </div>
  );
}
