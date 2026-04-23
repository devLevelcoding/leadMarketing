import type { Metadata } from "next";
import "./globals.css";
import Link from "next/link";

export const metadata: Metadata = {
  title: "LeadManager — LevelCoding",
  description: "Lead management platform for LevelCoding outreach",
};

const NAV = [
  { href: "/",           label: "Dashboard" },
  { href: "/leads",      label: "Leads" },
  { href: "/templates",  label: "Email Templates" },
  { href: "/warmup",     label: "Warmup" },
];

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className="dark">
      <body>
        <div className="min-h-screen flex flex-col">
          {/* Top nav */}
          <header className="bg-gray-900 border-b border-gray-800 text-white shadow">
            <div className="max-w-7xl mx-auto px-4 h-14 flex items-center justify-between">
              <div className="flex items-center gap-8">
                <span className="font-bold text-lg tracking-tight">
                  ⚡ LeadManager
                </span>
                <nav className="flex gap-6 text-sm">
                  {NAV.map(({ href, label }) => (
                    <Link
                      key={href}
                      href={href}
                      className="hover:text-blue-200 transition-colors"
                    >
                      {label}
                    </Link>
                  ))}
                </nav>
              </div>
              <span className="text-blue-200 text-sm">LevelCoding · marian@levelcoding.com</span>
            </div>
          </header>

          {/* Page content */}
          <main className="flex-1 max-w-7xl mx-auto w-full px-4 py-8">
            {children}
          </main>
        </div>
      </body>
    </html>
  );
}
