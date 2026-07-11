import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "LevelCoding — Free Website Audit",
  description: "Get a free 5-point website audit from LevelCoding. We check speed, security, SEO, tracking and local visibility.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className="dark">
      <body suppressHydrationWarning className="bg-gray-950 text-gray-100">
        {children}
      </body>
    </html>
  );
}
