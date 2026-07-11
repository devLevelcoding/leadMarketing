"use client";
import { useState, useEffect, useRef } from "react";

// ─── 30-Day Schedule ──────────────────────────────────────────────────────────

const SCHEDULE: {
  day: number;
  week: number;
  phase: string;
  tasks: string[];
  subs: string[];
}[] = [
  // Week 1 — Karma Build
  { day: 1,  week: 1, phase: "Karma Build", subs: ["r/webdev", "r/learnprogramming", "r/programming"],
    tasks: ["Join r/webdev, r/learnprogramming, r/programming", "Comment on 3 beginner questions with detailed, helpful answers", "Upvote 10 good posts — no spam", "Do NOT post anything promotional"] },
  { day: 2,  week: 1, phase: "Karma Build", subs: ["r/webdev"],
    tasks: ["Comment on 3 posts in r/webdev — answer CSS/JS/HTML questions", "Reply to replies on your Day 1 comments", "Search 'website for business' in r/webdev and comment"] },
  { day: 3,  week: 1, phase: "Karma Build", subs: ["r/programming", "r/learnprogramming"],
    tasks: ["Comment on 3 posts in r/programming or r/learnprogramming", "Post 1 useful resource or tip (no self-promo, no links to your site)", "Goal check: are you above 20 comment karma?"] },
  { day: 4,  week: 1, phase: "Karma Build", subs: ["r/entrepreneur"],
    tasks: ["Join r/entrepreneur — read the rules carefully", "Comment on 2 posts about online presence or tech for business", "Do NOT mention your company yet — just give value"] },
  { day: 5,  week: 1, phase: "Karma Build", subs: ["r/webdev", "r/entrepreneur"],
    tasks: ["Comment on 5 posts across all joined subs — quality over quantity", "Reply to any replies on your previous comments", "Upvote good content in r/entrepreneur"] },
  { day: 6,  week: 1, phase: "Karma Build", subs: ["r/webdev", "r/smallbusiness"],
    tasks: ["Join r/smallbusiness — read pinned posts and rules", "Search r/webdev for 'small business website' — comment on 2 posts", "Look for 'do I need a website?' posts and answer thoughtfully"] },
  { day: 7,  week: 1, phase: "Karma Build", subs: ["r/smallbusiness"],
    tasks: ["Check your total karma — aim for 50+ before Week 2", "Comment on 2 posts in r/smallbusiness", "If karma < 50: repeat Day 5 tasks and push more today"] },

  // Week 2 — Niche Entry
  { day: 8,  week: 2, phase: "Niche Entry", subs: ["r/smallbusiness"],
    tasks: ["Read top 20 posts of all time in r/smallbusiness", "Comment on 2 posts about online presence or marketing", "Note which post topics get most engagement"] },
  { day: 9,  week: 2, phase: "Niche Entry", subs: ["r/startups"],
    tasks: ["Join r/startups — comment on 2 'need a website' or 'landing page' posts", "Search 'web developer' in r/startups — answer questions you find", "Save any post where someone is looking for web help"] },
  { day: 10, week: 2, phase: "Niche Entry", subs: ["r/entrepreneur"],
    tasks: ["Search r/entrepreneur for 'website' posts from the past week", "Answer 3 of them with real advice (tools, costs, what to avoid)", "Engage on any comments you receive"] },
  { day: 11, week: 2, phase: "Niche Entry", subs: ["r/webdev"],
    tasks: ["Post a value article in r/webdev: '5 signs a small business actually needs a website'", "No links, no CTA — pure value. This builds your reputation.", "Monitor comments and reply to all within 2 hours"] },
  { day: 12, week: 2, phase: "Niche Entry", subs: ["r/smallbusiness"],
    tasks: ["Comment on 3 posts in r/smallbusiness about marketing or visibility", "Look for posts asking 'how do I get more customers online?' — answer with web presence advice", "Save 3 promising threads for follow-up"] },
  { day: 13, week: 2, phase: "Niche Entry", subs: ["r/startups"],
    tasks: ["Search r/startups for 'landing page' posts — give detailed feedback on theirs", "Post: 'What conversion rate are you getting on your landing page?' — sparks discussion", "Reply to your Day 11 post comments again"] },
  { day: 14, week: 2, phase: "Niche Entry", subs: ["r/webdev", "r/entrepreneur"],
    tasks: ["Karma check: should be 100+ by now", "Review engagement on Day 11 post — any DMs?", "Comment on 2 posts each in r/webdev and r/entrepreneur", "Collect 5 usernames who seem interested in web services"] },

  // Week 3 — Trust Building
  { day: 15, week: 3, phase: "Trust Building", subs: ["r/SEO"],
    tasks: ["Join r/SEO — comment on a local SEO or small business SEO question", "Post 1 comment sharing a quick local SEO win (no self-promo)", "Search 'Google My Business' in r/SEO — add value to 2 threads"] },
  { day: 16, week: 3, phase: "Trust Building", subs: ["r/entrepreneur"],
    tasks: ["Post a case study in r/entrepreneur: 'How a local business went from 0 to X online orders with a simple website'", "Anonymise client. No CTA. Focus on the story and results.", "Pin this post URL — it's your social proof asset"] },
  { day: 17, week: 3, phase: "Trust Building", subs: ["r/smallbusiness"],
    tasks: ["Search 'should I build a website' in r/smallbusiness", "Comment on 3 posts with personalised, specific advice", "Mention your case study post naturally if relevant — no spam"] },
  { day: 18, week: 3, phase: "Trust Building", subs: ["r/forhire"],
    tasks: ["Join r/forhire — read ALL the rules before posting", "Study 10 existing service posts to understand format", "Draft your r/forhire ad but do NOT post yet — review it first"] },
  { day: 19, week: 3, phase: "Trust Building", subs: ["r/webdev", "r/smallbusiness", "r/startups"],
    tasks: ["Answer 5 questions across all active subs — quality over speed", "Focus on questions with low comment count — your answer stands out more", "Reply to any new comments on your case study post"] },
  { day: 20, week: 3, phase: "Trust Building", subs: ["r/entrepreneur"],
    tasks: ["Cross-post your Day 16 case study to r/startups (check rules)", "Reply to every comment on both posts", "DM 1-2 people who commented positively — thank them, don't pitch"] },
  { day: 21, week: 3, phase: "Trust Building", subs: ["r/digitalnomad", "r/marketing"],
    tasks: ["Join r/digitalnomad and r/marketing", "Comment on 1 post in each — broad IT / web presence topics", "Karma check: should be 200+ to post in r/forhire effectively"] },

  // Week 4 — Soft Promotion
  { day: 22, week: 4, phase: "Soft Promotion", subs: ["r/forhire"],
    tasks: ["Post in r/forhire: '[FOR HIRE] Web Design for Small Businesses | EU-based | Portfolio available'", "Include: what you do, who it's for, price range, portfolio link, contact", "Monitor for DMs and comments — reply within 1 hour"] },
  { day: 23, week: 4, phase: "Soft Promotion", subs: ["r/smallbusiness"],
    tasks: ["Search r/smallbusiness for 'need a website' posts from this week", "Comment with genuine advice + mention you do this if they're interested", "Save the thread URL in the Leads section below"] },
  { day: 24, week: 4, phase: "Soft Promotion", subs: ["r/slavelabour"],
    tasks: ["Join r/slavelabour — read rules (low-cost/budget work for reviews)", "Post a budget offer: '[$5] Simple landing page for your business — building portfolio'", "Goal: get 1-2 reviews/testimonials, not money"] },
  { day: 25, week: 4, phase: "Soft Promotion", subs: ["r/startups"],
    tasks: ["Search r/startups for 'web developer' or 'need website' from past 3 days", "Comment with value first, then offer help at the end if appropriate", "Add any interested usernames to your lead list"] },
  { day: 26, week: 4, phase: "Soft Promotion", subs: ["r/entrepreneur"],
    tasks: ["Search r/entrepreneur for 'web developer', 'website builder', 'need developer' from this week", "Comment on 3 relevant threads — lead with advice, soft-mention your service", "Follow up on Day 22 r/forhire post — bump it if allowed by rules"] },
  { day: 27, week: 4, phase: "Soft Promotion", subs: ["r/forhire", "r/slavelabour"],
    tasks: ["Reply to all comments on Day 22 and Day 24 posts", "DM users who expressed interest — send a short, friendly message with your portfolio", "Save 5 Reddit usernames of potential clients to follow up later"] },
  { day: 28, week: 4, phase: "Soft Promotion", subs: ["r/webdev", "r/smallbusiness"],
    tasks: ["Post a second value post: '3 mistakes small businesses make with their first website'", "No CTA — just value. Build more authority.", "Comment on 3 new posts across active subs"] },

  // Days 29-30 — Review
  { day: 29, week: 5, phase: "Review", subs: [],
    tasks: ["Review analytics: which subs drove most replies / DMs?", "List your top 3 performing subreddits", "Re-post in r/forhire if the post is older than 7 days (check rules)", "Set up Reddit keyword alerts: 'need a website', 'web developer', 'landing page'"] },
  { day: 30, week: 5, phase: "Review", subs: [],
    tasks: ["Month review: how many leads, DMs, enquiries came from Reddit?", "Plan Month 2: double down on what worked", "Save top performing posts to reuse as templates", "Post 1 final value post or case study to close the month strong"] },
];

const PHASE_COLOR: Record<string, string> = {
  "Karma Build":   "bg-orange-100 text-orange-700 border-orange-200",
  "Niche Entry":   "bg-blue-100 text-blue-700 border-blue-200",
  "Trust Building":"bg-purple-100 text-purple-700 border-purple-200",
  "Soft Promotion":"bg-green-100 text-green-700 border-green-200",
  "Review":        "bg-gray-100 text-gray-700 border-gray-200",
};

const WEEK_LABEL: Record<number, string> = {
  1: "Week 1 — Karma Build (Days 1–7)",
  2: "Week 2 — Niche Entry (Days 8–14)",
  3: "Week 3 — Trust Building (Days 15–21)",
  4: "Week 4 — Soft Promotion (Days 22–28)",
  5: "Days 29–30 — Review & Optimise",
};

// ─── Subreddit Collection ─────────────────────────────────────────────────────

type SubStatus = "not_joined" | "joined" | "active" | "posted";

interface SubEntry {
  name: string;
  members: string;
  focus: string;
  phase: "karma" | "niche" | "promo" | "extra";
  postTypes: string;
}

const SUBREDDITS: SubEntry[] = [
  // Karma phase
  { name: "r/webdev",           members: "900k+",  phase: "karma", focus: "Web developers",         postTypes: "Answer CSS/JS/HTML questions, share tools, give feedback on portfolios" },
  { name: "r/learnprogramming", members: "4M+",    phase: "karma", focus: "Coding beginners",       postTypes: "Easy wins for karma — explain concepts, recommend resources" },
  { name: "r/programming",      members: "5M+",    phase: "karma", focus: "Dev community",          postTypes: "Share useful articles, comment on architecture discussions" },
  // Niche phase
  { name: "r/entrepreneur",     members: "3M+",    phase: "niche", focus: "Business owners",        postTypes: "Case studies, 'here's what worked for my client', answer 'should I have a website?'" },
  { name: "r/smallbusiness",    members: "1.5M+",  phase: "niche", focus: "Small biz owners",      postTypes: "Answer 'do I need a website?', share online presence tips, local SEO advice" },
  { name: "r/startups",         members: "1.2M+",  phase: "niche", focus: "Founders & early stage", postTypes: "Landing page feedback, MVP tips, web presence for early-stage" },
  { name: "r/SEO",              members: "250k+",  phase: "niche", focus: "SEO professionals",      postTypes: "Local SEO wins, GMB tips, answer technical SEO questions" },
  // Promo phase
  { name: "r/forhire",          members: "130k+",  phase: "promo", focus: "Freelance marketplace",  postTypes: "[FOR HIRE] posts — read ALL rules first, include price range and portfolio link" },
  { name: "r/slavelabour",      members: "550k+",  phase: "promo", focus: "Budget services",        postTypes: "Low-cost/free work for testimonials only — do NOT expect real money here" },
  // Extra
  { name: "r/marketing",        members: "800k+",  phase: "extra", focus: "Marketing community",    postTypes: "Share campaign results, answer 'how do I get more leads?' questions" },
  { name: "r/digitalnomad",     members: "500k+",  phase: "extra", focus: "Remote workers",         postTypes: "Position as a remote EU agency — answer 'how to hire remote devs?' threads" },
  { name: "r/ecommerce",        members: "250k+",  phase: "extra", focus: "Online store owners",    postTypes: "Answer 'should I build my own site?' or 'Shopify vs custom?' questions" },
  { name: "r/socialmedia",      members: "200k+",  phase: "extra", focus: "Social media managers",  postTypes: "Cross-promote: web + social media packages, answer client management questions" },
];

const PHASE_SUB_COLOR: Record<string, string> = {
  karma: "bg-orange-50 text-orange-700",
  niche: "bg-blue-50 text-blue-700",
  promo: "bg-green-50 text-green-700",
  extra: "bg-gray-50 text-gray-600",
};
const PHASE_SUB_LABEL: Record<string, string> = {
  karma: "Karma", niche: "Niche", promo: "Promo", extra: "Extra",
};

const STATUS_LABEL: Record<SubStatus, string> = {
  not_joined: "Not joined",
  joined:     "Joined",
  active:     "Active",
  posted:     "Posted",
};
const STATUS_COLOR: Record<SubStatus, string> = {
  not_joined: "bg-gray-100 text-gray-500",
  joined:     "bg-blue-100 text-blue-600",
  active:     "bg-yellow-100 text-yellow-700",
  posted:     "bg-green-100 text-green-700",
};
const STATUS_NEXT: Record<SubStatus, SubStatus> = {
  not_joined: "joined",
  joined:     "active",
  active:     "posted",
  posted:     "not_joined",
};

// ─── My Posts ─────────────────────────────────────────────────────────────────

type PostType = "comment" | "post";

interface MyPost {
  id: number;
  url: string;
  sub: string;
  type: PostType;
  notes: string;
  postedAt: string; // ISO date string
}

// Per-sub post count in the last 7 days → warning level
function spamLevel(posts: MyPost[], sub: string): "ok" | "slow" | "stop" {
  const week = Date.now() - 7 * 86400000;
  const count = posts.filter(p => p.sub === sub && new Date(p.postedAt).getTime() > week).length;
  if (count >= 4) return "stop";
  if (count >= 2) return "slow";
  return "ok";
}
const SPAM_COLOR = { ok: "bg-green-100 text-green-700", slow: "bg-yellow-100 text-yellow-700", stop: "bg-red-100 text-red-700" };
const SPAM_LABEL = { ok: "OK", slow: "Slow down", stop: "Stop — spam risk" };

// ─── Lead Collector ────────────────────────────────────────────────────────────

interface RedditLead {
  id: number;
  url: string;
  sub: string;
  notes: string;
  phone?: string;
  addedAt: string;
}

interface DayResource {
  id: number;
  url: string;
  title: string;
  sub: string;
  savedAt: string;
}

// ─── localStorage helpers ─────────────────────────────────────────────────────

const LS_DONE    = "reddit_done_v1";
const LS_SUBS    = "reddit_subs_v1";
const LS_LEADS   = "reddit_leads_v1";
const LS_POSTS   = "reddit_posts_v1";
const LS_START   = "reddit_start_v1";
const LS_HISTORY = "reddit_scan_history_v1";
const LS_DAYRES  = "reddit_day_resources_v1";

function load<T>(key: string, def: T): T {
  try { return JSON.parse(localStorage.getItem(key) ?? "null") ?? def; } catch { return def; }
}
function save(key: string, val: unknown) { localStorage.setItem(key, JSON.stringify(val)); }

// ─── Scanner types & defaults ─────────────────────────────────────────────────

interface ScanQuery { label: string; q: string; sub: string; enabled: boolean; }

interface RedditPost {
  id: string; title: string; sub: string; url: string;
  score: number; comments: number; author: string; created: number; preview: string;
}
interface ScanResult { query: ScanQuery; posts: RedditPost[]; error?: string; rateLimited?: boolean; }

interface ScanRun {
  id: number;          // timestamp used as ID
  runAt: string;       // ISO date
  time: string;
  sort: string;
  depth: number;
  totalPosts: number;
  totalSearches: number;
  results: ScanResult[];
}

const DEFAULT_QUERIES: Omit<ScanQuery, "enabled">[] = [
  // Direct buyer intent
  { label: "Need a website",          q: "need a website",                    sub: "smallbusiness" },
  { label: "Looking for web dev",     q: "looking for web developer",         sub: "" },
  { label: "Hire web developer",      q: "hire web developer",                sub: "forhire" },
  { label: "Build me a website",      q: "build me a website",                sub: "" },
  { label: "Need a developer",        q: "need a developer",                  sub: "entrepreneur" },
  // Pain point
  { label: "No website",              q: "no website",                        sub: "smallbusiness" },
  { label: "Do I need a website",     q: "do I need a website",               sub: "" },
  { label: "Website too expensive",   q: "website too expensive developer",   sub: "" },
  { label: "Cheap website",           q: "cheap website small business",      sub: "" },
  // Platform searches
  { label: "Wix vs custom",           q: "wix vs custom website",             sub: "" },
  { label: "Squarespace alternative", q: "squarespace alternative developer", sub: "" },
  { label: "Landing page help",       q: "landing page help",                 sub: "startups" },
  // Geographic
  { label: "Web design EU",           q: "web design europe",                 sub: "entrepreneur" },
  { label: "Web dev remote",          q: "web developer remote europe",       sub: "forhire" },
  // forhire / slavelabour
  { label: "Website forhire",         q: "website",                           sub: "forhire" },
  { label: "Web design slavelabour",  q: "website web design",                sub: "slavelabour" },
];

function timeAgo(utc: number) {
  const s = Math.floor(Date.now() / 1000 - utc);
  if (s < 3600)  return `${Math.floor(s / 60)}m ago`;
  if (s < 86400) return `${Math.floor(s / 3600)}h ago`;
  return `${Math.floor(s / 86400)}d ago`;
}

// ─── CopyButton ──────────────────────────────────────────────────────────────

function CopyButton({ url, small }: { url: string; small?: boolean }) {
  const [copied, setCopied] = useState(false);
  function copy() {
    navigator.clipboard.writeText(url).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    });
  }
  const cls = small
    ? "text-xs px-2 py-1 rounded-lg border transition font-medium whitespace-nowrap"
    : "text-xs px-3 py-1.5 rounded-lg border transition font-medium whitespace-nowrap";
  return (
    <button onClick={copy} className={`${cls} ${copied ? "border-green-400 bg-green-50 text-green-700" : "border-gray-200 bg-gray-50 text-gray-600 hover:bg-gray-100"}`}>
      {copied ? "✓ Copied" : "Copy link"}
    </button>
  );
}

// ─── Component ────────────────────────────────────────────────────────────────

export function RedditTab() {
  const [activeSection, setActiveSection] = useState<"schedule" | "subs" | "scanner" | "posts" | "leads">("schedule");
  const [startDate,   setStartDate]   = useState<string>("");
  const [doneDays,    setDoneDays]    = useState<number[]>([]);
  const [openWeeks,   setOpenWeeks]   = useState<number[]>([1]);
  const [subStatus,   setSubStatus]   = useState<Record<string, SubStatus>>({});
  const [leads,       setLeads]       = useState<RedditLead[]>([]);
  const [leadUrl,     setLeadUrl]     = useState("");
  const [leadSub,     setLeadSub]     = useState("");
  const [leadNotes,   setLeadNotes]   = useState("");
  const [leadPhone,   setLeadPhone]   = useState("");
  const [leadFilter,  setLeadFilter]  = useState("");
  const [editingPhone, setEditingPhone] = useState<Record<number, string>>({});
  const [myPosts,     setMyPosts]     = useState<MyPost[]>([]);
  const [postUrl,     setPostUrl]     = useState("");
  const [postSub,     setPostSub]     = useState("");
  const [postType,    setPostType]    = useState<PostType>("comment");
  const [postNotes,   setPostNotes]   = useState("");
  const [postFilter,  setPostFilter]  = useState("");

  // Scanner
  const [scanQueries,   setScanQueries]   = useState(DEFAULT_QUERIES.map(q => ({ ...q, enabled: true })));
  const [scanTime,      setScanTime]      = useState<"day"|"week"|"month"|"year"|"all">("all");
  const [scanSort,      setScanSort]      = useState<"relevance"|"new"|"top">("relevance");
  const [scanDepth,     setScanDepth]     = useState(3);
  const [scanResults,   setScanResults]   = useState<ScanResult[]>([]);
  const [scanning,      setScanning]      = useState(false);
  const [scanProgress,  setScanProgress]  = useState({ done: 0, total: 0 });
  const [scanError,     setScanError]     = useState("");
  const [customKeyword, setCustomKeyword] = useState("");
  const [customSub,     setCustomSub]     = useState("");
  const [scanHistory,   setScanHistory]   = useState<ScanRun[]>([]);
  const [expandedRun,   setExpandedRun]   = useState<number | null>(null);
  const [showHistory,   setShowHistory]   = useState(false);
  const [dayResources,  setDayResources]  = useState<Record<number, DayResource[]>>({});
  const [targetDay,     setTargetDay]     = useState(1);
  const todayRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const sd = load<string>(LS_START, "");
    setStartDate(sd);
    setDoneDays(load<number[]>(LS_DONE, []));
    setSubStatus(load<Record<string, SubStatus>>(LS_SUBS, {}));
    setLeads(load<RedditLead[]>(LS_LEADS, []));
    setMyPosts(load<MyPost[]>(LS_POSTS, []));
    setScanHistory(load<ScanRun[]>(LS_HISTORY, []));
    setDayResources(load<Record<number, DayResource[]>>(LS_DAYRES, {}));
    if (sd) {
      const diff = Math.floor((Date.now() - new Date(sd).getTime()) / 86400000) + 1;
      if (diff >= 1 && diff <= 30) {
        const entry = SCHEDULE.find(d => d.day === diff);
        if (entry) { setOpenWeeks([entry.week]); setTargetDay(diff); }
      }
    }
  }, []);

  function toggleDone(day: number) {
    const wasUnchecking = doneDays.includes(day);
    const next = wasUnchecking ? doneDays.filter(d => d !== day) : [...doneDays, day];
    setDoneDays(next); save(LS_DONE, next);
    // When marking a day done, auto-open the next day's week
    if (!wasUnchecking && day < 30) {
      const nextEntry = SCHEDULE.find(d => d.day === day + 1);
      if (nextEntry) {
        setOpenWeeks(p => p.includes(nextEntry.week) ? p : [...p, nextEntry.week]);
      }
    }
  }
  function toggleWeek(w: number) {
    setOpenWeeks(p => p.includes(w) ? p.filter(x => x !== w) : [...p, w]);
  }
  function cycleStatus(name: string) {
    const cur = subStatus[name] ?? "not_joined";
    const next = { ...subStatus, [name]: STATUS_NEXT[cur] };
    setSubStatus(next); save(LS_SUBS, next);
  }
  function saveStartDate(val: string) {
    setStartDate(val); save(LS_START, val);
  }
  function addLead() {
    if (!leadUrl.trim()) return;
    const next = [{ id: Date.now(), url: leadUrl.trim(), sub: leadSub.trim(), notes: leadNotes.trim(), phone: leadPhone.trim() || undefined, addedAt: new Date().toISOString() }, ...leads];
    setLeads(next); save(LS_LEADS, next);
    setLeadUrl(""); setLeadSub(""); setLeadNotes(""); setLeadPhone("");
  }
  function updateLeadPhone(id: number, phone: string) {
    const next = leads.map(l => l.id === id ? { ...l, phone: phone.trim() || undefined } : l);
    setLeads(next); save(LS_LEADS, next);
    setEditingPhone(p => { const n = { ...p }; delete n[id]; return n; });
  }
  function removeLead(id: number) {
    const next = leads.filter(l => l.id !== id);
    setLeads(next); save(LS_LEADS, next);
  }
  async function runScan() {
    const active = scanQueries.filter(q => q.enabled);
    if (!active.length) return;
    setScanning(true); setScanError(""); setScanResults([]);
    setScanProgress({ done: 0, total: active.length });
    const results: ScanResult[] = [];
    for (let i = 0; i < active.length; i++) {
      const query = active[i];
      setScanProgress({ done: i, total: active.length });
      try {
        const params = new URLSearchParams({ q: query.q, t: scanTime, sort: scanSort, pages: String(scanDepth) });
        if (query.sub) params.set("sub", query.sub);
        const res = await fetch(`/api/reddit/scan?${params}`);
        const data = await res.json();
        if (data.error) results.push({ query, posts: [], error: data.error });
        else results.push({ query, posts: data.posts ?? [], rateLimited: data.rateLimited });
      } catch (e) {
        results.push({ query, posts: [], error: String(e) });
      }
      // delay between requests to respect Reddit rate limits
      if (i < active.length - 1) await new Promise(r => setTimeout(r, scanDepth > 1 ? 1200 : 700));
    }
    setScanResults(results);
    setScanProgress({ done: active.length, total: active.length });
    setScanning(false);

    // Save to history (keep last 20 runs)
    const run: ScanRun = {
      id: Date.now(),
      runAt: new Date().toISOString(),
      time: scanTime,
      sort: scanSort,
      depth: scanDepth,
      totalPosts: results.reduce((n, r) => n + r.posts.length, 0),
      totalSearches: results.length,
      results,
    };
    setScanHistory(prev => {
      const next = [run, ...prev].slice(0, 20);
      save(LS_HISTORY, next);
      return next;
    });
  }

  function addCustomQuery() {
    if (!customKeyword.trim()) return;
    setScanQueries(p => [...p, { label: customKeyword.trim(), q: customKeyword.trim(), sub: customSub.trim(), enabled: true }]);
    setCustomKeyword(""); setCustomSub("");
  }

  function savePostAsLead(post: RedditPost) {
    const next = [{ id: Date.now(), url: post.url, sub: `r/${post.sub}`, notes: post.title.slice(0, 80), addedAt: new Date().toISOString() }, ...leads];
    setLeads(next); save(LS_LEADS, next);
  }

  function saveToDay(post: RedditPost, day: number) {
    const entry: DayResource = { id: Date.now(), url: post.url, title: post.title, sub: post.sub, savedAt: new Date().toISOString() };
    setDayResources(prev => {
      const updated = { ...prev, [day]: [entry, ...(prev[day] ?? [])] };
      save(LS_DAYRES, updated);
      return updated;
    });
  }

  function removeDayResource(day: number, id: number) {
    setDayResources(prev => {
      const updated = { ...prev, [day]: (prev[day] ?? []).filter(r => r.id !== id) };
      save(LS_DAYRES, updated);
      return updated;
    });
  }

  function jumpToToday() {
    if (!todayDay) return;
    const entry = SCHEDULE.find(d => d.day === todayDay);
    if (!entry) return;
    setOpenWeeks(p => p.includes(entry.week) ? p : [...p, entry.week]);
    setTimeout(() => todayRef.current?.scrollIntoView({ behavior: "smooth", block: "center" }), 60);
  }

  function addPost() {
    if (!postUrl.trim()) return;
    const next = [{ id: Date.now(), url: postUrl.trim(), sub: postSub.trim(), type: postType, notes: postNotes.trim(), postedAt: new Date().toISOString() }, ...myPosts];
    setMyPosts(next); save(LS_POSTS, next);
    setPostUrl(""); setPostNotes("");
  }
  function removePost(id: number) {
    const next = myPosts.filter(p => p.id !== id);
    setMyPosts(next); save(LS_POSTS, next);
  }

  // Compute today's day number from start date
  const todayDay = (() => {
    if (!startDate) return null;
    const diff = Math.floor((Date.now() - new Date(startDate).getTime()) / 86400000) + 1;
    return diff >= 1 && diff <= 30 ? diff : null;
  })();

  const weeks = [1, 2, 3, 4, 5];

  // URLs already saved to a day — hidden from scanner grid
  const scheduledPostUrls = new Set(
    Object.values(dayResources).flat().map(r => r.url)
  );

  const filteredLeads = leads.filter(l =>
    !leadFilter || l.url.includes(leadFilter) || l.sub.toLowerCase().includes(leadFilter.toLowerCase()) || l.notes.toLowerCase().includes(leadFilter.toLowerCase())
  );

  return (
    <div className="space-y-5">

      {/* Section tabs */}
      <div className="flex gap-1 border-b">
        {(["schedule", "subs", "scanner", "posts", "leads"] as const).map(s => (
          <button key={s} onClick={() => setActiveSection(s)}
            className={`px-4 py-2 text-sm font-medium border-b-2 -mb-px transition ${
              activeSection === s ? "border-orange-500 text-orange-600" : "border-transparent text-gray-500 hover:text-gray-800"
            }`}
          >
            {s === "schedule" ? "30-Day Schedule" : s === "subs" ? "Subreddit Tracker" : s === "scanner" ? "🔍 Lead Scanner" : s === "posts" ? "My Posts" : "Saved Leads"}
            {s === "scanner" && scanResults.length > 0 && (
              <span className="ml-1.5 bg-orange-100 text-orange-700 rounded-full px-1.5 py-0.5 text-xs">
                {scanResults.reduce((n, r) => n + r.posts.length, 0)}
              </span>
            )}
            {s === "posts" && myPosts.length > 0 && (
              <span className="ml-1.5 bg-orange-100 text-orange-700 rounded-full px-1.5 py-0.5 text-xs">{myPosts.length}</span>
            )}
            {s === "leads" && leads.length > 0 && (
              <span className="ml-1.5 bg-orange-100 text-orange-700 rounded-full px-1.5 py-0.5 text-xs">{leads.length}</span>
            )}
          </button>
        ))}
      </div>

      {/* ── SCHEDULE ── */}
      {activeSection === "schedule" && (
        <div className="space-y-4">
          <div className="flex flex-wrap items-center gap-3">
            <div className="flex items-center gap-2">
              <label className="text-sm text-gray-600">Start date:</label>
              <input type="date" value={startDate} onChange={e => saveStartDate(e.target.value)}
                className="border rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-orange-300" />
            </div>
            <button
              onClick={() => {
                const today = new Date().toISOString().slice(0, 10);
                saveStartDate(today);
                setOpenWeeks([1]);
              }}
              className="bg-orange-600 text-white px-3 py-1.5 rounded-lg text-sm font-medium hover:bg-orange-700 transition"
            >
              Start Today
            </button>
            {todayDay && (
              <>
                <span className="text-sm text-orange-600 font-medium">Today = Day {todayDay}</span>
                <button
                  onClick={jumpToToday}
                  className="text-xs bg-orange-100 text-orange-700 px-3 py-1.5 rounded-lg font-medium hover:bg-orange-200 transition"
                >
                  ↓ Jump to today
                </button>
              </>
            )}
            <span className="text-sm text-gray-400">{doneDays.length}/30 days done</span>
            {doneDays.length > 0 && (
              <button onClick={() => { setDoneDays([]); save(LS_DONE, []); }} className="text-xs text-red-400 hover:text-red-600">Reset progress</button>
            )}
          </div>

          {weeks.map(week => {
            const days = SCHEDULE.filter(d => d.week === week);
            const open = openWeeks.includes(week);
            const weekDone = days.filter(d => doneDays.includes(d.day)).length;
            return (
              <div key={week} className="border rounded-xl overflow-hidden">
                <button
                  onClick={() => toggleWeek(week)}
                  className="w-full flex items-center justify-between px-4 py-3 bg-gray-50 hover:bg-gray-100 transition text-left"
                >
                  <span className="font-medium text-sm">{WEEK_LABEL[week]}</span>
                  <div className="flex items-center gap-3">
                    <span className="text-xs text-gray-500">{weekDone}/{days.length} done</span>
                    <span className="text-gray-400 text-xs">{open ? "▲" : "▼"}</span>
                  </div>
                </button>
                {open && (
                  <div className="divide-y">
                    {days.map(d => {
                      const done = doneDays.includes(d.day);
                      const isToday = todayDay === d.day;
                      return (
                        <div key={d.day} ref={isToday ? todayRef : undefined} className={`flex gap-3 px-4 py-3 ${isToday ? "bg-orange-50" : done ? "bg-gray-50" : "bg-white"}`}>
                          <button
                            onClick={() => toggleDone(d.day)}
                            className={`mt-0.5 w-5 h-5 rounded border-2 shrink-0 flex items-center justify-center transition ${
                              done ? "bg-green-500 border-green-500 text-white" : "border-gray-300 hover:border-orange-400"
                            }`}
                          >
                            {done && <span className="text-xs leading-none">✓</span>}
                          </button>
                          <div className="flex-1 min-w-0 flex gap-4">
                            {/* Subreddit links — vertical column */}
                            {d.subs.length > 0 && (
                              <div className="flex flex-col gap-1 shrink-0 pt-0.5">
                                {d.subs.map(s => (
                                  <a key={s} href={`https://reddit.com/${s}`} target="_blank" rel="noopener noreferrer"
                                    className="inline-flex items-center gap-1 text-xs bg-orange-100 text-orange-700 hover:bg-orange-200 px-2 py-1 rounded-lg font-medium transition whitespace-nowrap">
                                    {s} ↗
                                  </a>
                                ))}
                              </div>
                            )}
                            {/* Tasks */}
                            <div className="flex-1 min-w-0">
                              <div className="flex flex-wrap items-center gap-2 mb-1.5">
                                <span className={`font-semibold text-sm ${done ? "text-gray-400 line-through" : "text-gray-800"}`}>
                                  Day {d.day}
                                </span>
                                {isToday && <span className="bg-orange-500 text-white text-xs px-2 py-0.5 rounded-full font-medium">TODAY</span>}
                                <span className={`text-xs px-2 py-0.5 rounded-full border ${PHASE_COLOR[d.phase]}`}>{d.phase}</span>
                              </div>
                              <ul className="space-y-0.5">
                                {d.tasks.map(t => (
                                  <li key={t} className={`text-xs flex gap-1.5 ${done ? "text-gray-400" : "text-gray-600"}`}>
                                    <span className="mt-0.5 shrink-0 text-gray-300">•</span>{t}
                                  </li>
                                ))}
                              </ul>
                              {(dayResources[d.day] ?? []).length > 0 && (
                                <div className="mt-2 pt-2 border-t border-blue-100 flex flex-wrap gap-1.5">
                                  {(dayResources[d.day] ?? []).map(r => (
                                    <div key={r.id} className="flex items-center gap-1 max-w-[260px] bg-blue-50 border border-blue-200 rounded-lg px-2 py-1 group">
                                      <a href={r.url} target="_blank" rel="noopener noreferrer"
                                        className="text-xs text-blue-700 hover:text-blue-900 hover:underline truncate">
                                        {r.title.slice(0, 50)}{r.title.length > 50 ? "…" : ""} ↗
                                      </a>
                                      <button
                                        onClick={() => removeDayResource(d.day, r.id)}
                                        className="shrink-0 text-blue-300 hover:text-red-400 transition text-xs ml-1 leading-none">
                                        ✕
                                      </button>
                                    </div>
                                  ))}
                                </div>
                              )}
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* ── SUBREDDIT TRACKER ── */}
      {activeSection === "subs" && (
        <div className="space-y-4">
          <p className="text-sm text-gray-500">Click the status badge to cycle: Not joined → Joined → Active → Posted</p>
          {(["karma", "niche", "promo", "extra"] as const).map(phase => {
            const subs = SUBREDDITS.filter(s => s.phase === phase);
            const doneCount = subs.filter(s => (subStatus[s.name] ?? "not_joined") !== "not_joined").length;
            return (
              <div key={phase}>
                <div className="flex items-center gap-2 mb-2">
                  <span className={`text-xs font-semibold px-2 py-0.5 rounded-full uppercase tracking-wide ${PHASE_SUB_COLOR[phase]}`}>
                    {PHASE_SUB_LABEL[phase]}
                  </span>
                  <span className="text-xs text-gray-400">{doneCount}/{subs.length} joined+</span>
                </div>
                <div className="bg-white border rounded-xl overflow-hidden">
                  <table className="w-full text-sm">
                    <thead className="bg-gray-50 border-b">
                      <tr>
                        <th className="text-left px-4 py-2 font-medium text-gray-500 text-xs">Subreddit</th>
                        <th className="text-left px-4 py-2 font-medium text-gray-500 text-xs hidden sm:table-cell">Members</th>
                        <th className="text-left px-4 py-2 font-medium text-gray-500 text-xs">What to post</th>
                        <th className="px-4 py-2 font-medium text-gray-500 text-xs text-right">Status</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y">
                      {subs.map(s => {
                        const status = subStatus[s.name] ?? "not_joined";
                        return (
                          <tr key={s.name} className="hover:bg-gray-50">
                            <td className="px-4 py-2.5">
                              <a href={`https://reddit.com/${s.name}`} target="_blank" rel="noopener noreferrer"
                                className="inline-flex items-center gap-1 font-medium text-orange-600 hover:text-orange-800 hover:underline text-sm">
                                {s.name} ↗
                              </a>
                              <div className="text-xs text-gray-400">{s.focus}</div>
                            </td>
                            <td className="px-4 py-2.5 text-gray-500 text-xs hidden sm:table-cell">{s.members}</td>
                            <td className="px-4 py-2.5 text-gray-600 text-xs max-w-xs">{s.postTypes}</td>
                            <td className="px-4 py-2.5 text-right">
                              <button
                                onClick={() => cycleStatus(s.name)}
                                className={`text-xs px-2.5 py-1 rounded-full font-medium transition hover:opacity-80 ${STATUS_COLOR[status]}`}
                              >
                                {STATUS_LABEL[status]}
                              </button>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* ── SCANNER ── */}
      {activeSection === "scanner" && (
        <div className="space-y-5">

          {/* Controls */}
          <div className="bg-white border rounded-xl p-4 space-y-4">
            <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
              {/* Time */}
              <div className="flex items-center gap-1.5">
                <span className="text-xs text-gray-500 font-medium">Time:</span>
                {(["day","week","month","year","all"] as const).map(t => (
                  <button key={t} onClick={() => setScanTime(t)}
                    className={`px-2.5 py-1 rounded-full text-xs font-medium transition ${scanTime === t ? "bg-orange-600 text-white" : "bg-gray-100 text-gray-600 hover:bg-gray-200"}`}>
                    {t === "day" ? "Today" : t === "week" ? "Week" : t === "month" ? "Month" : t === "year" ? "Year" : "All time"}
                  </button>
                ))}
              </div>
              {/* Sort */}
              <div className="flex items-center gap-1.5">
                <span className="text-xs text-gray-500 font-medium">Sort:</span>
                {(["relevance","new","top"] as const).map(s => (
                  <button key={s} onClick={() => setScanSort(s)}
                    className={`px-2.5 py-1 rounded-full text-xs font-medium transition capitalize ${scanSort === s ? "bg-blue-600 text-white" : "bg-gray-100 text-gray-600 hover:bg-gray-200"}`}>
                    {s}
                  </button>
                ))}
              </div>
              {/* Depth */}
              <div className="flex items-center gap-1.5">
                <span className="text-xs text-gray-500 font-medium">Depth:</span>
                {[1,3,5,10].map(d => (
                  <button key={d} onClick={() => setScanDepth(d)}
                    className={`px-2.5 py-1 rounded-full text-xs font-medium transition ${scanDepth === d ? "bg-green-600 text-white" : "bg-gray-100 text-gray-600 hover:bg-gray-200"}`}>
                    {d * 100}
                  </button>
                ))}
                <span className="text-xs text-gray-400">per search</span>
              </div>
            </div>
            <div className="flex flex-wrap items-center justify-between gap-2 pt-1">
              <div className="flex flex-wrap items-center gap-3">
                <p className="text-xs text-gray-400">
                  {scanQueries.filter(q => q.enabled).length} searches × up to {scanDepth * 100} posts = up to <strong>{scanQueries.filter(q => q.enabled).length * scanDepth * 100}</strong> posts
                </p>
                <div className="flex items-center gap-1.5">
                  <span className="text-xs text-gray-500 font-medium">Pin posts to:</span>
                  <select
                    value={targetDay}
                    onChange={e => setTargetDay(Number(e.target.value))}
                    className="border rounded-lg px-2 py-1 text-xs text-gray-700 focus:outline-none focus:ring-2 focus:ring-orange-300 bg-white"
                  >
                    {Array.from({ length: 30 }, (_, i) => i + 1).map(d => (
                      <option key={d} value={d}>Day {d}{d === todayDay ? " (Today)" : ""}</option>
                    ))}
                  </select>
                </div>
              </div>
              <button
                onClick={runScan}
                disabled={scanning || scanQueries.filter(q => q.enabled).length === 0}
                className="bg-orange-600 text-white px-5 py-1.5 rounded-lg text-sm font-semibold hover:bg-orange-700 disabled:opacity-50 transition flex items-center gap-2"
              >
                {scanning ? (
                  <><span className="animate-spin inline-block w-3 h-3 border-2 border-white border-t-transparent rounded-full" />
                  {scanProgress.done}/{scanProgress.total} done</>
                ) : "Scan Reddit"}
              </button>
            </div>

            {/* Keyword chips */}
            <div>
              <p className="text-xs text-gray-500 mb-2">Keywords to search (click to toggle):</p>
              <div className="flex flex-wrap gap-2">
                {scanQueries.map((q, i) => (
                  <button key={i}
                    onClick={() => setScanQueries(p => p.map((x, j) => j === i ? { ...x, enabled: !x.enabled } : x))}
                    className={`flex items-center gap-1 text-xs px-2.5 py-1 rounded-full border font-medium transition ${
                      q.enabled ? "bg-orange-100 border-orange-300 text-orange-700" : "bg-gray-100 border-gray-200 text-gray-400"
                    }`}
                  >
                    {q.enabled ? "✓" : "○"} {q.label}
                    {q.sub && <span className="opacity-60">· r/{q.sub}</span>}
                    <span onClick={e => { e.stopPropagation(); setScanQueries(p => p.filter((_, j) => j !== i)); }}
                      className="ml-1 text-gray-400 hover:text-red-500">×</span>
                  </button>
                ))}
              </div>
            </div>

            {/* Add custom keyword */}
            <div className="flex gap-2 items-end pt-1 border-t">
              <div className="flex-1">
                <label className="block text-xs text-gray-500 mb-1">Add keyword</label>
                <input value={customKeyword} onChange={e => setCustomKeyword(e.target.value)}
                  placeholder="e.g. need web developer EU"
                  className="w-full border rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-orange-300"
                  onKeyDown={e => e.key === "Enter" && addCustomQuery()} />
              </div>
              <div className="w-40">
                <label className="block text-xs text-gray-500 mb-1">Limit to subreddit (optional)</label>
                <input value={customSub} onChange={e => setCustomSub(e.target.value)}
                  placeholder="e.g. smallbusiness"
                  className="w-full border rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-orange-300" />
              </div>
              <button onClick={addCustomQuery} disabled={!customKeyword.trim()}
                className="px-3 py-1.5 rounded-lg border text-sm text-gray-600 hover:bg-gray-50 disabled:opacity-40 transition">
                + Add
              </button>
            </div>
          </div>

          {/* Error */}
          {scanError && <p className="text-sm text-red-500">{scanError}</p>}

          {/* Results */}
          {scanning && (
            <div className="space-y-2 py-6">
              <div className="flex justify-between text-sm text-gray-500">
                <span>Scanning Reddit… {scanProgress.done} / {scanProgress.total} searches done</span>
                <span>{scanDepth * 100} posts max per search</span>
              </div>
              <div className="w-full bg-gray-100 rounded-full h-2 overflow-hidden">
                <div className="h-2 bg-orange-500 rounded-full transition-all"
                  style={{ width: `${scanProgress.total ? (scanProgress.done / scanProgress.total) * 100 : 0}%` }} />
              </div>
            </div>
          )}

          {!scanning && scanResults.length > 0 && (() => {
            // Deduplicate posts across searches by ID, and exclude already-scheduled posts
            const seenIds = new Set<string>();
            const deduped: ScanResult[] = scanResults.map(r => ({
              ...r,
              posts: r.posts.filter(p => {
                if (seenIds.has(p.id) || scheduledPostUrls.has(p.url)) return false;
                seenIds.add(p.id);
                return true;
              }),
            }));
            const total = deduped.reduce((n, r) => n + r.posts.length, 0);
            const rawTotal = scanResults.reduce((n, r) => n + r.posts.length, 0);
            const scheduledCount = Array.from(scheduledPostUrls).filter(u =>
              scanResults.flatMap(r => r.posts).some(p => p.url === u)
            ).length;
            const savedUrls = new Set(leads.map(l => l.url));

            // All post IDs from previous runs for "NEW" badge
            const previousIds = new Set(
              scanHistory.slice(1).flatMap(run => run.results.flatMap(r => r.posts.map(p => p.id)))
            );
            const newCount = deduped.flatMap(r => r.posts).filter(p => !previousIds.has(p.id)).length;

            return (
              <div className="space-y-6">
                <div className="flex flex-wrap items-center gap-3">
                  <p className="text-sm text-gray-600 font-medium">
                    {total.toLocaleString()} posts found across {deduped.length} searches
                    {rawTotal !== total && <span className="text-gray-400 font-normal"> ({rawTotal - total} duplicates removed)</span>}
                    {scheduledCount > 0 && <span className="text-blue-500 font-normal"> · {scheduledCount} pinned to schedule</span>}
                  </p>
                  {newCount > 0 && previousIds.size > 0 && (
                    <span className="text-xs bg-green-100 text-green-700 px-2 py-0.5 rounded-full font-medium">
                      {newCount} new since last scan
                    </span>
                  )}
                  {scanHistory.length > 1 && (
                    <button onClick={() => setShowHistory(h => !h)}
                      className="ml-auto text-xs text-gray-500 hover:text-gray-800 border rounded-lg px-3 py-1 transition">
                      {showHistory ? "Hide" : "Show"} history ({scanHistory.length} scans)
                    </button>
                  )}
                </div>
                {deduped.map((result, ri) => (
                  <div key={ri}>
                    <div className="flex items-center gap-2 mb-2">
                      <span className="font-semibold text-sm text-gray-800">{result.query.label}</span>
                      {result.query.sub && <span className="text-xs text-orange-600">r/{result.query.sub}</span>}
                      <span className="text-xs text-gray-400">({result.posts.length} results)</span>
                      {result.error && <span className="text-xs text-red-500">{result.error}</span>}
                      {result.rateLimited && <span className="text-xs text-yellow-600">⚠ Rate limited — partial results</span>}
                    </div>
                    {result.posts.length === 0 && !result.error && (
                      <p className="text-xs text-gray-400 pl-2">No posts found for this period.</p>
                    )}
                    <div className="space-y-2">
                      {result.posts.map(post => {
                        const saved = savedUrls.has(post.url);
                        const isNew = previousIds.size > 0 && !previousIds.has(post.id);
                        return (
                          <div key={post.id} className={`bg-white border rounded-xl px-4 py-3 flex gap-3 transition ${isNew ? "border-green-300 hover:border-green-400" : "hover:border-orange-200"}`}>
                            <div className="flex-1 min-w-0">
                              <div className="flex flex-wrap items-center gap-2 mb-1">
                                <a href={`https://reddit.com/r/${post.sub}`} target="_blank" rel="noopener noreferrer"
                                  className="text-xs bg-orange-100 text-orange-700 px-2 py-0.5 rounded-full font-medium hover:bg-orange-200 transition">
                                  r/{post.sub}
                                </a>
                                {isNew && <span className="text-xs bg-green-500 text-white px-2 py-0.5 rounded-full font-semibold">NEW</span>}
                                <span className="text-xs text-gray-400">{timeAgo(post.created)}</span>
                                <span className="text-xs text-gray-400">↑ {post.score}</span>
                                <span className="text-xs text-gray-400">💬 {post.comments}</span>
                                <span className="text-xs text-gray-400">u/{post.author}</span>
                              </div>
                              <a href={post.url} target="_blank" rel="noopener noreferrer"
                                className="text-sm font-medium text-gray-800 hover:text-orange-600 transition line-clamp-2 block">
                                {post.title} ↗
                              </a>
                              {post.preview && (
                                <p className="text-xs text-gray-400 mt-1 line-clamp-2">{post.preview}</p>
                              )}
                            </div>
                            <div className="shrink-0 flex flex-col justify-center gap-1.5">
                              <button
                                onClick={() => saveToDay(post, targetDay)}
                                className="text-xs bg-blue-600 text-white px-3 py-1.5 rounded-lg hover:bg-blue-700 transition font-medium whitespace-nowrap">
                                → Day {targetDay}
                              </button>
                              {saved ? (
                                <span className="text-xs text-green-600 font-medium text-center">✓ Saved</span>
                              ) : (
                                <button
                                  onClick={() => { savePostAsLead(post); savedUrls.add(post.url); }}
                                  className="text-xs bg-orange-600 text-white px-3 py-1.5 rounded-lg hover:bg-orange-700 transition font-medium whitespace-nowrap">
                                  Save Lead
                                </button>
                              )}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                ))}
              </div>
            );
          })()}

          {!scanning && scanResults.length === 0 && scanHistory.length === 0 && (
            <div className="text-center py-12 text-gray-400">
              <p className="text-4xl mb-3">🔍</p>
              <p className="text-sm">Select keywords above and click <strong>Scan Reddit</strong> to find potential clients.</p>
            </div>
          )}

          {/* ── Scan History ── */}
          {(showHistory || (scanResults.length === 0 && scanHistory.length > 0)) && scanHistory.length > 0 && (
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <h3 className="font-semibold text-sm text-gray-700">Scan History ({scanHistory.length} runs)</h3>
                <button
                  onClick={() => { if (confirm("Delete all scan history?")) { setScanHistory([]); save(LS_HISTORY, []); } }}
                  className="text-xs text-red-400 hover:text-red-600"
                >
                  Clear all
                </button>
              </div>
              <div className="space-y-2">
                {scanHistory.map((run, ri) => {
                  const isOpen = expandedRun === run.id;
                  const savedUrls = new Set(leads.map(l => l.url));
                  const prevIds = new Set(scanHistory.slice(ri + 1).flatMap(r => r.results.flatMap(res => res.posts.map(p => p.id))));
                  const runNewCount = run.results.flatMap(r => r.posts).filter(p => !prevIds.has(p.id)).length;
                  const visibleCount = run.results.flatMap(r => r.posts).filter(p => !savedUrls.has(p.url)).length;
                  return (
                    <div key={run.id} className="border rounded-xl overflow-hidden">
                      <button onClick={() => setExpandedRun(isOpen ? null : run.id)}
                        className="w-full flex items-center gap-3 px-4 py-3 bg-gray-50 hover:bg-gray-100 transition text-left">
                        <span className="text-xs text-gray-400 shrink-0 w-28">
                          {new Date(run.runAt).toLocaleDateString("en-GB", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" })}
                        </span>
                        <span className="font-semibold text-sm text-gray-800">{visibleCount.toLocaleString()} posts</span>
                        <span className="text-xs text-gray-400">{run.totalSearches} searches</span>
                        <span className="text-xs bg-gray-200 text-gray-600 px-2 py-0.5 rounded-full">{run.time} · {run.sort} · ×{run.depth * 100}</span>
                        {ri > 0 && runNewCount > 0 && (
                          <span className="text-xs bg-green-100 text-green-700 px-2 py-0.5 rounded-full font-medium">{runNewCount} new</span>
                        )}
                        {ri === 0 && <span className="text-xs bg-blue-100 text-blue-700 px-2 py-0.5 rounded-full">Latest</span>}
                        <span className="ml-auto text-gray-400 text-xs">{isOpen ? "▲" : "▼"}</span>
                      </button>
                      {isOpen && (
                        <div className="divide-y max-h-[600px] overflow-y-auto">
                          {run.results.flatMap(r => r.posts).filter(post => !savedUrls.has(post.url)).sort((a, b) => b.created - a.created).map(post => {
                            const isNew = ri > 0 && !prevIds.has(post.id);
                            return (
                              <div key={post.id} className={`flex items-start gap-3 px-4 py-3 text-sm ${isNew ? "bg-green-50" : "bg-white"}`}>
                                <div className="flex-1 min-w-0">
                                  <div className="flex flex-wrap items-center gap-2 mb-0.5">
                                    <span className="text-xs bg-orange-100 text-orange-700 px-2 py-0.5 rounded-full">r/{post.sub}</span>
                                    {isNew && <span className="text-xs bg-green-500 text-white px-1.5 py-0.5 rounded-full font-semibold text-[10px]">NEW</span>}
                                    <span className="text-xs text-gray-400">{timeAgo(post.created)}</span>
                                    <span className="text-xs text-gray-400">↑{post.score}</span>
                                  </div>
                                  <a href={post.url} target="_blank" rel="noopener noreferrer"
                                    className="text-sm text-gray-800 hover:text-orange-600 line-clamp-1 block">{post.title} ↗</a>
                                </div>
                                <div className="flex items-center gap-1.5 shrink-0">
                                  <CopyButton url={post.url} small />
                                  <button onClick={() => savePostAsLead(post)}
                                    className="text-xs bg-orange-600 text-white px-2.5 py-1 rounded-lg hover:bg-orange-700 transition">
                                    Save
                                  </button>
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      )}

      {/* ── MY POSTS ── */}
      {activeSection === "posts" && (
        <div className="space-y-5">

          {/* Per-sub summary cards */}
          {myPosts.length > 0 && (() => {
            const subCounts: Record<string, { total: number; comments: number; posts: number }> = {};
            for (const p of myPosts) {
              if (!subCounts[p.sub]) subCounts[p.sub] = { total: 0, comments: 0, posts: 0 };
              subCounts[p.sub].total++;
              if (p.type === "comment") subCounts[p.sub].comments++;
              else subCounts[p.sub].posts++;
            }
            const sorted = Object.entries(subCounts).sort((a, b) => b[1].total - a[1].total);
            return (
              <div>
                <h3 className="text-sm font-semibold text-gray-700 mb-2">Activity per subreddit</h3>
                <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-2">
                  {sorted.map(([sub, counts]) => {
                    const level = spamLevel(myPosts, sub);
                    const weekCount = myPosts.filter(p => p.sub === sub && new Date(p.postedAt).getTime() > Date.now() - 7 * 86400000).length;
                    return (
                      <div key={sub} className={`border rounded-xl p-3 ${level === "stop" ? "border-red-200 bg-red-50" : level === "slow" ? "border-yellow-200 bg-yellow-50" : "border-gray-200 bg-white"}`}>
                        <a href={`https://reddit.com/${sub}`} target="_blank" rel="noopener noreferrer"
                          className="font-semibold text-sm text-orange-600 hover:underline">{sub} ↗</a>
                        <div className="mt-1.5 flex flex-col gap-0.5 text-xs text-gray-500">
                          <span>{counts.total} total · {counts.comments} comments · {counts.posts} posts</span>
                          <span className="text-gray-400">This week: {weekCount}</span>
                        </div>
                        <span className={`mt-2 inline-block text-xs px-2 py-0.5 rounded-full font-medium ${SPAM_COLOR[level]}`}>
                          {SPAM_LABEL[level]}
                        </span>
                      </div>
                    );
                  })}
                </div>
              </div>
            );
          })()}

          {/* Add post form */}
          <div className="bg-white border rounded-xl p-4 space-y-3">
            <p className="text-sm font-medium text-gray-700">Log a post or comment</p>
            <div className="grid grid-cols-1 sm:grid-cols-[1fr_160px_110px_1fr_auto] gap-2 items-end">
              <div>
                <label className="block text-xs text-gray-500 mb-1">URL</label>
                <input value={postUrl} onChange={e => setPostUrl(e.target.value)}
                  placeholder="https://reddit.com/r/.../comments/..."
                  className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-orange-300"
                  onKeyDown={e => e.key === "Enter" && addPost()} />
              </div>
              <div>
                <label className="block text-xs text-gray-500 mb-1">Subreddit</label>
                <select value={postSub} onChange={e => setPostSub(e.target.value)}
                  className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-orange-300 bg-white">
                  <option value="">Pick sub…</option>
                  {SUBREDDITS.map(s => (
                    <option key={s.name} value={s.name}>{s.name}</option>
                  ))}
                  <option value="other">other…</option>
                </select>
              </div>
              <div>
                <label className="block text-xs text-gray-500 mb-1">Type</label>
                <select value={postType} onChange={e => setPostType(e.target.value as PostType)}
                  className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-orange-300 bg-white">
                  <option value="comment">Comment</option>
                  <option value="post">Post</option>
                </select>
              </div>
              <div>
                <label className="block text-xs text-gray-500 mb-1">Notes</label>
                <input value={postNotes} onChange={e => setPostNotes(e.target.value)}
                  placeholder="What you wrote about…"
                  className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-orange-300" />
              </div>
              <button onClick={addPost} disabled={!postUrl.trim()}
                className="bg-orange-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-orange-700 disabled:opacity-40 transition">
                Log
              </button>
            </div>
          </div>

          {/* Post list */}
          {myPosts.length > 0 && (
            <div className="space-y-2">
              <div className="flex items-center gap-3">
                <input value={postFilter} onChange={e => setPostFilter(e.target.value)}
                  placeholder="Filter by sub or notes…"
                  className="border rounded-lg px-3 py-1.5 text-sm w-full max-w-xs focus:outline-none focus:ring-2 focus:ring-gray-200" />
                <span className="text-xs text-gray-400">{myPosts.length} logged</span>
              </div>
              <div className="bg-white border rounded-xl overflow-hidden divide-y">
                {myPosts
                  .filter(p => !postFilter || p.sub.includes(postFilter) || p.notes.toLowerCase().includes(postFilter.toLowerCase()))
                  .map(p => {
                    const level = spamLevel(myPosts, p.sub);
                    return (
                      <div key={p.id} className="flex items-start gap-3 px-4 py-3 hover:bg-gray-50 text-sm">
                        <span className={`shrink-0 mt-0.5 text-xs px-2 py-0.5 rounded-full font-medium ${p.type === "post" ? "bg-blue-100 text-blue-700" : "bg-gray-100 text-gray-600"}`}>
                          {p.type}
                        </span>
                        <div className="flex-1 min-w-0">
                          <a href={p.url} target="_blank" rel="noopener noreferrer"
                            className="text-orange-600 hover:underline truncate block text-sm">{p.url}</a>
                          <div className="flex flex-wrap gap-2 mt-0.5 text-xs text-gray-400">
                            <span className={`font-medium ${level === "stop" ? "text-red-600" : level === "slow" ? "text-yellow-600" : "text-gray-600"}`}>{p.sub}</span>
                            {p.notes && <span>{p.notes}</span>}
                            <span>{new Date(p.postedAt).toLocaleDateString("en-GB", { day: "numeric", month: "short" })}</span>
                          </div>
                        </div>
                        <button onClick={() => removePost(p.id)} className="text-xs text-red-400 hover:text-red-600 shrink-0">✕</button>
                      </div>
                    );
                  })}
              </div>
            </div>
          )}
          {myPosts.length === 0 && (
            <p className="text-sm text-gray-400 text-center py-8">No posts logged yet. Every time you comment or post on Reddit, log it here.</p>
          )}
        </div>
      )}

      {/* ── LEADS ── */}
      {activeSection === "leads" && (
        <div className="space-y-4">
          <div className="bg-white border rounded-xl p-4 space-y-3">
            <p className="text-xs text-gray-500">Save Reddit threads, usernames, or posts where someone might need web services.</p>
            <div className="grid grid-cols-1 sm:grid-cols-[1fr_140px_1fr_140px_auto] gap-2 items-end">
              <div>
                <label className="block text-xs text-gray-500 mb-1">Thread / Post URL</label>
                <input value={leadUrl} onChange={e => setLeadUrl(e.target.value)}
                  placeholder="https://reddit.com/r/.../comments/..."
                  className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-orange-300"
                  onKeyDown={e => e.key === "Enter" && addLead()} />
              </div>
              <div>
                <label className="block text-xs text-gray-500 mb-1">Subreddit</label>
                <input value={leadSub} onChange={e => setLeadSub(e.target.value)}
                  placeholder="r/smallbusiness"
                  className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-orange-300" />
              </div>
              <div>
                <label className="block text-xs text-gray-500 mb-1">Notes</label>
                <input value={leadNotes} onChange={e => setLeadNotes(e.target.value)}
                  placeholder="'looking for web dev EU, budget ~€500'"
                  className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-orange-300" />
              </div>
              <div>
                <label className="block text-xs text-gray-500 mb-1">WhatsApp number</label>
                <input value={leadPhone} onChange={e => setLeadPhone(e.target.value)}
                  placeholder="+1 234 567 8900"
                  className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-300" />
              </div>
              <button onClick={addLead} disabled={!leadUrl.trim()}
                className="bg-orange-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-orange-700 disabled:opacity-40 transition">
                Save
              </button>
            </div>
          </div>

          {leads.length > 0 && (
            <div className="space-y-2">
              <input value={leadFilter} onChange={e => setLeadFilter(e.target.value)}
                placeholder="Filter leads…"
                className="border rounded-lg px-3 py-1.5 text-sm w-full max-w-xs focus:outline-none focus:ring-2 focus:ring-gray-200" />
              <div className="bg-white border rounded-xl overflow-hidden divide-y">
                {filteredLeads.map(l => (
                  <div key={l.id} className="flex items-start gap-3 px-4 py-3 hover:bg-gray-50 text-sm">
                    <div className="flex-1 min-w-0">
                      <a href={l.url} target="_blank" rel="noopener noreferrer"
                        className="text-orange-600 hover:underline truncate block text-sm">{l.url}</a>
                      <div className="flex flex-wrap gap-2 mt-0.5 text-xs text-gray-400">
                        {l.sub && <span className="font-medium text-gray-600">{l.sub}</span>}
                        {l.notes && <span>{l.notes}</span>}
                        <span>{new Date(l.addedAt).toLocaleDateString("en-GB", { day: "numeric", month: "short" })}</span>
                      </div>
                      <div className="mt-1.5">
                        {editingPhone[l.id] !== undefined ? (
                          <div className="flex items-center gap-1.5">
                            <input
                              autoFocus
                              value={editingPhone[l.id]}
                              onChange={e => setEditingPhone(p => ({ ...p, [l.id]: e.target.value }))}
                              placeholder="+1 234 567 8900"
                              className="border rounded-lg px-2 py-0.5 text-xs w-40 focus:outline-none focus:ring-1 focus:ring-green-300"
                              onKeyDown={e => {
                                if (e.key === "Enter") updateLeadPhone(l.id, editingPhone[l.id]);
                                if (e.key === "Escape") setEditingPhone(p => { const n = { ...p }; delete n[l.id]; return n; });
                              }}
                            />
                            <button onClick={() => updateLeadPhone(l.id, editingPhone[l.id])}
                              className="text-xs bg-green-600 text-white px-2 py-0.5 rounded-lg">Save</button>
                            <button onClick={() => setEditingPhone(p => { const n = { ...p }; delete n[l.id]; return n; })}
                              className="text-xs text-gray-400 hover:text-gray-600">Cancel</button>
                          </div>
                        ) : l.phone ? (
                          <div className="flex items-center gap-2">
                            <a
                              href={`https://wa.me/${l.phone.replace(/\D/g, "")}`}
                              target="_blank" rel="noopener noreferrer"
                              className="inline-flex items-center gap-1.5 text-xs bg-green-100 text-green-700 px-2.5 py-1 rounded-full font-medium hover:bg-green-200 transition"
                            >
                              <svg viewBox="0 0 24 24" fill="currentColor" className="w-3 h-3"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347z"/><path d="M12 0C5.373 0 0 5.373 0 12c0 2.124.554 4.122 1.523 5.854L.057 23.527a.75.75 0 0 0 .916.916l5.673-1.466A11.943 11.943 0 0 0 12 24c6.627 0 12-5.373 12-12S18.627 0 12 0zm0 21.75a9.695 9.695 0 0 1-4.945-1.355l-.355-.21-3.668.948.968-3.558-.23-.368A9.699 9.699 0 0 1 2.25 12C2.25 6.615 6.615 2.25 12 2.25S21.75 6.615 21.75 12 17.385 21.75 12 21.75z"/></svg>
                              {l.phone}
                            </a>
                            <button onClick={() => setEditingPhone(p => ({ ...p, [l.id]: l.phone ?? "" }))}
                              className="text-xs text-gray-400 hover:text-gray-600 transition">✎</button>
                          </div>
                        ) : (
                          <button
                            onClick={() => setEditingPhone(p => ({ ...p, [l.id]: "" }))}
                            className="text-xs text-gray-400 hover:text-green-600 border border-dashed border-gray-200 hover:border-green-300 px-2 py-0.5 rounded-lg transition"
                          >
                            + Add WA number
                          </button>
                        )}
                      </div>
                    </div>
                    <button onClick={() => removeLead(l.id)} className="text-xs text-red-400 hover:text-red-600 shrink-0 mt-0.5">✕</button>
                  </div>
                ))}
                {filteredLeads.length === 0 && <p className="px-4 py-3 text-sm text-gray-400">No leads match the filter.</p>}
              </div>
              <p className="text-xs text-gray-400">{leads.length} saved · stored in browser localStorage</p>
            </div>
          )}
          {leads.length === 0 && (
            <p className="text-sm text-gray-400 text-center py-8">No leads saved yet. Paste a Reddit thread URL above to track it.</p>
          )}
        </div>
      )}
    </div>
  );
}
