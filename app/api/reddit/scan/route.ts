import { NextRequest, NextResponse } from "next/server";

export interface RedditPost {
  id: string;
  title: string;
  sub: string;
  url: string;
  score: number;
  comments: number;
  author: string;
  created: number;
  preview: string;
}

const UA = "LevelCoding-LeadScanner/1.0 (contact: pirvan.marian@gmail.com)";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function mapPost(c: any): RedditPost {
  return {
    id:       c.data.id,
    title:    c.data.title,
    sub:      c.data.subreddit,
    url:      `https://reddit.com${c.data.permalink}`,
    score:    c.data.score,
    comments: c.data.num_comments,
    author:   c.data.author,
    created:  c.data.created_utc,
    preview:  (c.data.selftext as string)?.slice(0, 250) ?? "",
  };
}

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const q     = searchParams.get("q");
  const sub   = searchParams.get("sub") ?? "";
  const t     = searchParams.get("t") ?? "all";
  const sort  = searchParams.get("sort") ?? "relevance";
  const pages = Math.min(parseInt(searchParams.get("pages") ?? "1"), 10); // max 10 pages = 1000

  if (!q) return NextResponse.json({ error: "q required" }, { status: 400 });

  try {
    const all: RedditPost[] = [];
    const seen = new Set<string>();
    let after = "";

    for (let page = 0; page < pages; page++) {
      const base = sub
        ? `https://www.reddit.com/r/${encodeURIComponent(sub)}/search.json`
        : `https://www.reddit.com/search.json`;

      const params = new URLSearchParams({
        q, sort, limit: "100", t,
        ...(sub ? { restrict_sr: "1" } : {}),
        ...(after ? { after } : {}),
      });

      const res = await fetch(`${base}?${params}`, {
        headers: { "User-Agent": UA, "Accept": "application/json" },
        cache: "no-store",
      });

      if (res.status === 429) {
        return NextResponse.json({ posts: all, rateLimited: true });
      }
      if (!res.ok) break;

      const json = await res.json();
      const children: unknown[] = json.data?.children ?? [];
      for (const c of children) {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const d = (c as any);
        if (!seen.has(d.data.id)) {
          seen.add(d.data.id);
          all.push(mapPost(d));
        }
      }

      after = json.data?.after ?? "";
      if (!after || children.length < 100) break; // Reddit has no more pages
    }

    return NextResponse.json({ posts: all });
  } catch (e) {
    console.error("[reddit/scan]", e);
    return NextResponse.json({ error: String(e), posts: [] }, { status: 500 });
  }
}
