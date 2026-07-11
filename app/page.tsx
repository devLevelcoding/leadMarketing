"use client";
import { useState } from "react";

const CHECKS = [
  {
    icon: "⚡",
    title: "Page Speed",
    desc: "Is your site loading in under 3 seconds? Slow sites lose 40% of visitors before they even read your first line.",
  },
  {
    icon: "🔒",
    title: "SSL & Security",
    desc: "Missing HTTPS or expired certificate? Google marks you as 'Not Secure' and visitors leave immediately.",
  },
  {
    icon: "📊",
    title: "Analytics & Tracking",
    desc: "Do you know how many people visit your site? Without tracking you're flying blind on your own business.",
  },
  {
    icon: "📣",
    title: "Clear Call to Action",
    desc: "Can a visitor figure out in 5 seconds what to do next? Most business sites bury the contact button.",
  },
  {
    icon: "📍",
    title: "Local & Google Visibility",
    desc: "Is your business showing up on Google Maps? 46% of all searches are local — if you're not there, competitors are.",
  },
];

const INPUT = "w-full bg-gray-800 border border-gray-700 text-gray-100 placeholder-gray-500 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent";

export default function LandingPage() {
  const [url,     setUrl]     = useState("");
  const [name,    setName]    = useState("");
  const [email,   setEmail]   = useState("");
  const [company, setCompany] = useState("");
  const [status,  setStatus]  = useState<"idle" | "loading" | "done" | "error">("idle");

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!url || !email) return;
    setStatus("loading");
    try {
      const res = await fetch("/api/audit", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url, name, email, company }),
      });
      if (res.ok) setStatus("done");
      else setStatus("error");
    } catch {
      setStatus("error");
    }
  }

  return (
    <div className="min-h-screen bg-gray-950 text-gray-100 flex flex-col">

      {/* Nav */}
      <header className="border-b border-gray-800 px-6 py-4 flex items-center justify-between max-w-6xl mx-auto w-full">
        <span className="font-bold text-xl tracking-tight text-blue-400">levelcoding</span>
        <a
          href="mailto:marian@levelcoding.com"
          className="text-sm text-gray-500 hover:text-blue-400 transition-colors"
        >
          marian@levelcoding.com
        </a>
      </header>

      {/* Hero */}
      <section className="flex-1 flex flex-col items-center justify-center px-6 py-20 text-center max-w-3xl mx-auto w-full">
        <span className="text-sm font-semibold text-blue-400 bg-blue-950 border border-blue-800 px-3 py-1 rounded-full mb-6">
          Free · No commitment · 24h turnaround
        </span>
        <h1 className="text-4xl md:text-5xl font-bold leading-tight mb-6 text-white">
          Is your website <span className="text-blue-400">hurting</span> your business?
        </h1>
        <p className="text-xl text-gray-400 mb-10 max-w-xl leading-relaxed">
          We do a free 5-point audit of your website and send you a personal report —
          what's broken, what's costing you customers, and how to fix it.
        </p>

        {/* Form */}
        {status === "done" ? (
          <div className="bg-green-950 border border-green-800 rounded-2xl p-8 w-full max-w-md">
            <div className="text-4xl mb-3">✅</div>
            <h3 className="text-xl font-bold text-green-400 mb-2">Got it — we're on it!</h3>
            <p className="text-green-500 text-sm leading-relaxed">
              You'll receive your free audit within 24 hours at <strong className="text-green-300">{email}</strong>.
              <br />
              Check your inbox (and spam just in case).
            </p>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="w-full max-w-md space-y-3">
            <input
              type="url"
              placeholder="Your website URL  (e.g. https://mybusiness.com)"
              value={url}
              onChange={e => setUrl(e.target.value)}
              required
              className={INPUT}
            />
            <div className="flex gap-3">
              <input
                type="text"
                placeholder="Your name"
                value={name}
                onChange={e => setName(e.target.value)}
                className={INPUT}
              />
              <input
                type="text"
                placeholder="Company (optional)"
                value={company}
                onChange={e => setCompany(e.target.value)}
                className={INPUT}
              />
            </div>
            <input
              type="email"
              placeholder="Your email — we'll send the report here"
              value={email}
              onChange={e => setEmail(e.target.value)}
              required
              className={INPUT}
            />
            <button
              type="submit"
              disabled={status === "loading"}
              className="w-full bg-blue-600 hover:bg-blue-500 text-white font-semibold rounded-xl px-6 py-3 text-sm transition-colors disabled:opacity-50"
            >
              {status === "loading" ? "Sending..." : "Get My Free Audit →"}
            </button>
            {status === "error" && (
              <p className="text-red-400 text-xs text-center">
                Something went wrong. Email us at marian@levelcoding.com
              </p>
            )}
            <p className="text-xs text-gray-600 text-center">
              No spam. No sales calls. Just an honest report.
            </p>
          </form>
        )}
      </section>

      {/* 5 checks */}
      <section className="bg-gray-900 border-t border-gray-800 py-20 px-6">
        <div className="max-w-4xl mx-auto">
          <h2 className="text-2xl font-bold text-center text-white mb-3">What we check</h2>
          <p className="text-center text-gray-500 mb-12 text-sm">
            5 areas that directly affect how many customers your website brings in.
          </p>
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-5">
            {CHECKS.map((c, i) => (
              <div key={i} className="bg-gray-800 rounded-2xl p-6 border border-gray-700 hover:border-gray-600 transition-colors">
                <div className="text-3xl mb-3">{c.icon}</div>
                <h3 className="font-bold mb-2 text-white">{c.title}</h3>
                <p className="text-sm text-gray-400 leading-relaxed">{c.desc}</p>
              </div>
            ))}
            {/* 6th card — CTA */}
            <div className="bg-blue-600 rounded-2xl p-6 text-white flex flex-col justify-between hover:bg-blue-500 transition-colors">
              <div>
                <div className="text-3xl mb-3">📋</div>
                <h3 className="font-bold mb-2">Personal Report</h3>
                <p className="text-sm text-blue-100 leading-relaxed">
                  Not a robot scan. A real person reviews your site and writes you a plain-English report.
                </p>
              </div>
              <a
                href="#"
                onClick={e => { e.preventDefault(); window.scrollTo({ top: 0, behavior: "smooth" }); }}
                className="mt-4 text-sm font-semibold text-white underline underline-offset-2"
              >
                Get yours free →
              </a>
            </div>
          </div>
        </div>
      </section>

      {/* Country strip */}
      <section className="py-12 px-6 text-center border-t border-gray-800 bg-gray-950">
        <div className="max-w-3xl mx-auto">
          <p className="text-gray-600 text-sm mb-6">Trusted by businesses in</p>
          <div className="flex flex-wrap justify-center gap-3 text-sm font-medium">
            {["🇩🇪 Germany", "🇬🇧 UK", "🇳🇱 Netherlands", "🇦🇹 Austria", "🇧🇪 Belgium", "🇷🇴 Romania"].map(c => (
              <span key={c} className="bg-gray-800 border border-gray-700 text-gray-300 px-3 py-1 rounded-full">
                {c}
              </span>
            ))}
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-gray-800 py-8 px-6 text-center text-xs text-gray-600">
        <p className="text-gray-500">levelcoding · Software development & web solutions</p>
        <p className="mt-1">
          <a href="mailto:marian@levelcoding.com" className="hover:text-blue-400 transition-colors">
            marian@levelcoding.com
          </a>
        </p>
      </footer>

    </div>
  );
}
