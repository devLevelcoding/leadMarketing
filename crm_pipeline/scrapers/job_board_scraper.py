"""
Job board scraper — secondary CRM validation signal.

Strategy:
  1. Indeed (public search, no auth needed — parse HTML)
  2. LinkedIn Jobs (needs careful rate limiting; returns structured JSON-LD)
  3. Local job boards per country (added as extension points)

What we're looking for:
  Job titles/descriptions mentioning a CRM tool by name → validates that the
  company actively uses that CRM. "CRM Administrator Salesforce" in Poland =
  strong signal that Salesforce has penetrated that market segment.

  "CRM implementation" / "new CRM" / "CRM migration" jobs → whitespace signal
  (company knows it needs a CRM but hasn't adopted one yet — hot prospect).
"""
from __future__ import annotations
import json
import logging
import re
from dataclasses import dataclass, field
from datetime import datetime, timedelta
from typing import AsyncIterator, List, Optional
from urllib.parse import quote_plus, urlencode

from bs4 import BeautifulSoup

import config
from utils.http_client import AsyncHTTPClient

logger = logging.getLogger(__name__)

# ---------------------------------------------------------------------------
# CRM keyword groups for job description matching
# ---------------------------------------------------------------------------

CRM_TOOL_KEYWORDS: List[str] = [
    "HubSpot", "Salesforce", "Pipedrive", "Zoho", "ActiveCampaign",
    "Freshsales", "Microsoft Dynamics", "Dynamics 365", "SAP CRM",
    "Oracle CRM", "SugarCRM", "Bitrix24", "SuperOffice", "Lime CRM",
    "Keap", "Infusionsoft", "Zendesk", "Teamleader", "Vtiger",
]

WHITESPACE_KEYWORDS: List[str] = [
    "CRM implementation", "CRM migration", "CRM deployment",
    "new CRM system", "CRM selection", "CRM project",
    "introduce CRM", "no CRM", "CRM rollout",
]

ALL_CRM_PATTERN = re.compile(
    "|".join(re.escape(k) for k in CRM_TOOL_KEYWORDS + WHITESPACE_KEYWORDS),
    re.IGNORECASE,
)

# ---------------------------------------------------------------------------
# Data class
# ---------------------------------------------------------------------------

@dataclass
class JobPosting:
    country_iso: str
    industry: str
    job_title: str
    company_name: str
    crm_keywords: List[str] = field(default_factory=list)
    source_url: str = ""
    board: str = ""
    posted_at: Optional[datetime] = None


# ---------------------------------------------------------------------------
# Indeed scraper
# ---------------------------------------------------------------------------

INDEED_BASE = "https://www.indeed.com/jobs"
INDEED_COUNTRY_DOMAINS: dict[str, str] = {
    "IT": "it.indeed.com",
    "PL": "pl.indeed.com",
    "NL": "nl.indeed.com",
    "DE": "de.indeed.com",
    "FR": "fr.indeed.com",
    "ES": "es.indeed.com",
    "RO": "www.indeed.ro",
    "GB": "uk.indeed.com",
    "SE": "se.indeed.com",
    "GR": "www.indeed.gr",
}


async def scrape_indeed(
    client: AsyncHTTPClient,
    country_iso: str,
    query: str = "CRM",
    max_pages: int = 5,
) -> AsyncIterator[JobPosting]:
    """
    Scrape Indeed job listings for CRM-related postings.
    Each page returns ~15 results.  max_pages=5 → ~75 postings per country.
    """
    domain = INDEED_COUNTRY_DOMAINS.get(country_iso, "www.indeed.com")
    collected = 0

    for page in range(max_pages):
        start = page * 15
        url = f"https://{domain}/jobs?{urlencode({'q': query, 'start': start, 'fromage': 30})}"

        try:
            status, html = await client.get(url, headers={"Accept-Language": "en-US,en;q=0.9"})
            if status != 200:
                logger.warning("Indeed %s page %d → HTTP %s", country_iso, page, status)
                break

            soup = BeautifulSoup(html, "lxml")
            job_cards = soup.select("div.job_seen_beacon, div[data-jk]")

            if not job_cards:
                # Try alternative selector for newer Indeed layout
                job_cards = soup.select("li.css-1ac2h1w")

            if not job_cards:
                logger.info("Indeed %s: no job cards found on page %d", country_iso, page)
                break

            for card in job_cards:
                title_el = card.select_one("h2.jobTitle span, h2 a span[title]")
                company_el = card.select_one("span.companyName, [data-testid='company-name']")
                desc_el = card.select_one("div.job-snippet, div[class*='snippet']")
                link_el = card.select_one("h2 a[href]")

                title = title_el.get_text(strip=True) if title_el else ""
                company = company_el.get_text(strip=True) if company_el else ""
                desc = desc_el.get_text(strip=True) if desc_el else ""
                href = link_el.get("href", "") if link_el else ""

                full_text = f"{title} {desc}"
                matched = ALL_CRM_PATTERN.findall(full_text)

                if matched:
                    yield JobPosting(
                        country_iso=country_iso,
                        industry=_infer_industry_from_text(full_text),
                        job_title=title,
                        company_name=company,
                        crm_keywords=list(set(k.lower() for k in matched)),
                        source_url=f"https://{domain}{href}" if href.startswith("/") else href,
                        board="indeed",
                    )
                    collected += 1

            logger.info("Indeed %s: page %d → %d CRM jobs so far", country_iso, page, collected)

        except Exception as exc:
            logger.warning("Indeed scrape error %s page %d: %s", country_iso, page, exc)
            break


# ---------------------------------------------------------------------------
# LinkedIn Jobs (read-only search — no auth, careful rate limiting)
# ---------------------------------------------------------------------------

LINKEDIN_JOB_SEARCH = "https://www.linkedin.com/jobs-guest/jobs/api/seeMoreJobPostings/search"

async def scrape_linkedin_jobs(
    client: AsyncHTTPClient,
    country_iso: str,
    keyword: str = "CRM",
    max_batches: int = 3,
) -> AsyncIterator[JobPosting]:
    """
    Uses the public LinkedIn jobs guest API (no auth required).
    Returns JSON-LD embedded in HTML.  25 results per batch.

    Rate limit: very conservative (0.2 req/s in config) — LinkedIn blocks fast scrapers.
    """
    geo_map = {
        "IT": "103350119", "PL": "105072130", "NL": "102890719",
        "DE": "101282230", "FR": "105015875", "ES": "105646813",
        "GB": "101165590", "SE": "105117694", "RO": "106670623",
        "GR": "104677530",
    }
    geo_id = geo_map.get(country_iso, "")

    for batch in range(max_batches):
        params = {
            "keywords": keyword,
            "location": country_iso,
            "geoId": geo_id,
            "f_TPR": "r2592000",  # last 30 days
            "start": batch * 25,
        }
        try:
            status, html = await client.get(LINKEDIN_JOB_SEARCH, params=params)
            if status != 200:
                break

            soup = BeautifulSoup(html, "lxml")
            cards = soup.select("div.base-card, li.result-card")

            for card in cards:
                title_el = card.select_one("h3.base-search-card__title, span.screen-reader-text")
                company_el = card.select_one("h4.base-search-card__subtitle, a[data-tracking-control-name*='company']")
                link_el = card.select_one("a.base-card__full-link, a[href*='/jobs/view/']")

                title = title_el.get_text(strip=True) if title_el else ""
                company = company_el.get_text(strip=True) if company_el else ""
                href = link_el.get("href", "") if link_el else ""

                matched = ALL_CRM_PATTERN.findall(title)
                if matched:
                    yield JobPosting(
                        country_iso=country_iso,
                        industry=_infer_industry_from_text(title),
                        job_title=title,
                        company_name=company,
                        crm_keywords=list(set(k.lower() for k in matched)),
                        source_url=href,
                        board="linkedin",
                    )

            if not cards:
                break

            logger.info("LinkedIn %s batch %d → %d cards", country_iso, batch, len(cards))

        except Exception as exc:
            logger.warning("LinkedIn scrape error %s batch %d: %s", country_iso, batch, exc)
            break


# ---------------------------------------------------------------------------
# Convenience wrapper
# ---------------------------------------------------------------------------

async def collect_job_signals(
    client: AsyncHTTPClient,
    country_iso: str,
) -> List[JobPosting]:
    """Aggregate signals from all boards for one country."""
    postings: List[JobPosting] = []

    async for posting in scrape_indeed(client, country_iso):
        postings.append(posting)

    async for posting in scrape_linkedin_jobs(client, country_iso):
        postings.append(posting)

    return postings


# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------

INDUSTRY_KEYWORDS = {
    "Logistics & Transport": ["logistics", "transport", "freight", "supply chain", "warehouse"],
    "Real Estate": ["real estate", "property", "leasing", "brokerage", "mortgage"],
    "Manufacturing": ["manufacturing", "production", "factory", "industrial", "assembly"],
    "Professional Services": ["consulting", "advisory", "accounting", "legal", "audit"],
    "Construction": ["construction", "building", "architecture", "contractor"],
    "Healthcare": ["healthcare", "medical", "clinic", "pharma", "hospital"],
    "IT & Software": ["software", "saas", "tech", "developer", "engineering", "it services"],
    "Financial Services": ["banking", "finance", "insurance", "investment", "fintech"],
    "Tourism & Hospitality": ["hotel", "tourism", "travel", "hospitality", "resort"],
}

def _infer_industry_from_text(text: str) -> str:
    text_lower = text.lower()
    for industry, keywords in INDUSTRY_KEYWORDS.items():
        if any(kw in text_lower for kw in keywords):
            return industry
    return "Professional Services"  # default catch-all
