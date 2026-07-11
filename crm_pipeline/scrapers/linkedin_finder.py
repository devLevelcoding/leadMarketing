"""
LinkedIn company URL discovery — 100% free, no API key.

Strategy (in order of reliability):
  1. Slug guess  — build linkedin.com/company/{slug} from company name, check HTTP
  2. DuckDuckGo  — search 'site:linkedin.com/company "Company Name"', parse first hit
  3. Google      — same query via google.com/search (slower, needs delays)

Rate limits applied:
  LinkedIn HEAD check : 0.5 req/s
  DuckDuckGo search   : 1 req per 3s
"""
from __future__ import annotations
import asyncio
import logging
import re
import unicodedata
from typing import Optional

from bs4 import BeautifulSoup

from utils.http_client import AsyncHTTPClient
from utils.rate_limiter import rate_limiter

logger = logging.getLogger(__name__)

LI_BASE     = "https://www.linkedin.com/company/"
DDG_URL     = "https://html.duckduckgo.com/html/"
LI_PATTERN  = re.compile(r"linkedin\.com/company/([\w\-]+)", re.IGNORECASE)


# ─────────────────────────────────────────────────────────────────────────────
# Public entry-point
# ─────────────────────────────────────────────────────────────────────────────

async def find_linkedin(
    client: AsyncHTTPClient,
    company_name: str,
    country_iso: str,
    website: str = "",
) -> Optional[str]:
    """
    Return a LinkedIn company URL or None.
    Tries slug guess first (fast, 0 search credits), then DuckDuckGo.
    """
    # 1 — Try guessed slug
    slug = _name_to_slug(company_name)
    url = await _try_linkedin_slug(client, slug)
    if url:
        return url

    # 2 — Try company domain as slug hint (e.g. acme.it → acme)
    if website:
        domain_slug = _domain_to_slug(website)
        if domain_slug and domain_slug != slug:
            url = await _try_linkedin_slug(client, domain_slug)
            if url:
                return url

    # 3 — DuckDuckGo search
    url = await _duckduckgo_search(client, company_name, country_iso)
    return url


# ─────────────────────────────────────────────────────────────────────────────
# Step 1: Slug guess + HEAD check
# ─────────────────────────────────────────────────────────────────────────────

async def _try_linkedin_slug(client: AsyncHTTPClient, slug: str) -> Optional[str]:
    if not slug or len(slug) < 3:
        return None
    url = f"{LI_BASE}{slug}/"
    try:
        await rate_limiter.wait("www.linkedin.com")
        status, _ = await asyncio.wait_for(client.get(url), timeout=20)
        if status in (200, 301, 302):
            return url
    except Exception:
        pass
    return None


# ─────────────────────────────────────────────────────────────────────────────
# Step 2: DuckDuckGo HTML search
# ─────────────────────────────────────────────────────────────────────────────

async def _duckduckgo_search(
    client: AsyncHTTPClient,
    company_name: str,
    country_iso: str,
) -> Optional[str]:
    query = f'site:linkedin.com/company "{company_name}"'
    try:
        await rate_limiter.wait("html.duckduckgo.com")
        await asyncio.sleep(3)   # DDG needs breathing room

        status, html = await asyncio.wait_for(
            client.get(
                DDG_URL,
                params={"q": query, "kl": _ddg_locale(country_iso)},
                headers={"Accept-Language": "en-US,en;q=0.9"},
            ),
            timeout=25,
        )

        if status != 200:
            return None

        soup = BeautifulSoup(html, "lxml")
        for link in soup.select("a.result__a, a[href*='linkedin.com/company']"):
            href = link.get("href", "")
            m = LI_PATTERN.search(href)
            if m:
                slug = m.group(1)
                return f"{LI_BASE}{slug}/"

        # Also scan raw text for linkedin.com/company/... patterns
        text = soup.get_text()
        m = LI_PATTERN.search(text)
        if m:
            return f"{LI_BASE}{m.group(1)}/"

    except Exception as exc:
        logger.debug("DDG search error for '%s': %s", company_name, exc)

    return None


# ─────────────────────────────────────────────────────────────────────────────
# Batch helper — find LinkedIn for a list of (name, country, website) tuples
# ─────────────────────────────────────────────────────────────────────────────

async def enrich_linkedin_batch(
    client: AsyncHTTPClient,
    companies: list[tuple[str, str, str]],   # [(name, country_iso, website), ...]
    concurrency: int = 3,
) -> dict[str, Optional[str]]:
    """
    Returns {company_name: linkedin_url_or_None}.
    Runs with limited concurrency to avoid LinkedIn/DDG rate limits.
    """
    sem = asyncio.Semaphore(concurrency)
    results: dict[str, Optional[str]] = {}

    async def _one(name, country, website):
        async with sem:
            url = await find_linkedin(client, name, country, website)
            results[name] = url
            status = "✓" if url else "–"
            logger.info("LinkedIn %s  %s  %s", status, name, url or "")

    await asyncio.gather(*[_one(n, c, w) for n, c, w in companies])
    return results


# ─────────────────────────────────────────────────────────────────────────────
# Helpers
# ─────────────────────────────────────────────────────────────────────────────

def _name_to_slug(name: str) -> str:
    """'Acme Real Estate S.r.l.' → 'acme-real-estate'"""
    # Normalize unicode (è → e)
    name = unicodedata.normalize("NFKD", name).encode("ascii", "ignore").decode()
    name = name.lower()
    # Strip legal suffixes
    for suffix in [" s.r.l","srl","s.p.a","spa","s.a.","sa","gmbh","bv","nv",
                   " ltd"," llc"," inc"," co"," group"," holding"," polska",
                   " sp. z o.o","sp z o o","spzoo"," s.c.","sc"]:
        name = name.replace(suffix, "")
    # Replace non-alphanumeric with hyphen
    name = re.sub(r"[^a-z0-9]+", "-", name).strip("-")
    # Trim to 60 chars (LinkedIn slug limit)
    return name[:60]


def _domain_to_slug(website: str) -> str:
    """'https://www.acme-corp.it' → 'acme-corp'"""
    match = re.search(r"(?:www\.)?([^./]+)\.", website)
    return match.group(1) if match else ""


def _ddg_locale(country_iso: str) -> str:
    mapping = {"IT": "it-it", "PL": "pl-pl", "NL": "nl-nl",
               "DE": "de-de", "FR": "fr-fr", "ES": "es-es"}
    return mapping.get(country_iso, "en-us")
