"""
Central configuration. Override via environment variables or a .env file.
"""
from __future__ import annotations
import os
from dataclasses import dataclass, field
from typing import Dict, List

# ---------------------------------------------------------------------------
# API Keys — ALL OPTIONAL.  The pipeline runs 100% free without any of these.
#
# Paid upgrades (add to .env to activate automatically):
#   WAPPALYZER_API_KEY  → improves detection on JS-heavy sites (~$0.001/hit)
#   BUILTWITH_API_KEY   → deepest technographic data (~$0.002/hit)
#   COMPANIES_HOUSE_API_KEY → UK Companies House (free key, just needs registration)
#   KVK_API_KEY         → Dutch KVK (free key at developer.kvk.nl)
#
# Without any keys: uses HTML fingerprinting + free directory scraping only.
# ---------------------------------------------------------------------------
APOLLO_API_KEY: str = os.getenv("APOLLO_API_KEY", "")
WAPPALYZER_API_KEY: str = os.getenv("WAPPALYZER_API_KEY", "")
BUILTWITH_API_KEY: str = os.getenv("BUILTWITH_API_KEY", "")
COMPANIES_HOUSE_API_KEY: str = os.getenv("COMPANIES_HOUSE_API_KEY", "")
KVK_API_KEY: str = os.getenv("KVK_API_KEY", "")
PROXYMESH_USER: str = os.getenv("PROXYMESH_USER", "")
PROXYMESH_PASS: str = os.getenv("PROXYMESH_PASS", "")

# ---------------------------------------------------------------------------
# Database
# ---------------------------------------------------------------------------
DATABASE_URL: str = os.getenv("DATABASE_URL", "sqlite:///crm_pipeline.db")

# ---------------------------------------------------------------------------
# HTTP behaviour
# ---------------------------------------------------------------------------
REQUEST_TIMEOUT: int = 20          # seconds per request
MAX_RETRIES: int = 3
CONCURRENT_REQUESTS: int = 8       # asyncio semaphore ceiling
USER_AGENTS: List[str] = [
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 "
    "(KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36",
    "Mozilla/5.0 (Macintosh; Intel Mac OS X 14_4) AppleWebKit/605.1.15 "
    "(KHTML, like Gecko) Version/17.4 Safari/605.1.15",
    "Mozilla/5.0 (X11; Linux x86_64; rv:125.0) Gecko/20100101 Firefox/125.0",
]

# Proxy list — add Oxylabs / Bright Data / ProxyMesh endpoints here
PROXY_LIST: List[str] = [p for p in os.getenv("PROXY_LIST", "").split(",") if p]

# ---------------------------------------------------------------------------
# Pilot countries (ISO-3166-1 alpha-2) + target industries
# ---------------------------------------------------------------------------
PILOT_COUNTRIES: List[str] = ["IT", "PL", "NL"]

ALL_COUNTRIES: List[str] = [
    "AT", "BE", "BG", "HR", "CY", "CZ", "DK", "EE", "FI", "FR",
    "DE", "GR", "HU", "IE", "IT", "LV", "LT", "LU", "MT", "NL",
    "PL", "PT", "RO", "SK", "SI", "ES", "SE", "GB",
    "NO", "CH", "IS", "LI", "AL", "BA", "MK", "ME", "RS", "XK",
    "MD", "UA", "BY", "AM", "GE", "AZ",
]

INDUSTRIES: List[str] = [
    "Logistics & Transport",
    "Real Estate",
    "Manufacturing",
    "Professional Services",
    "Construction",
    "Healthcare",
    "IT & Software",
    "Retail & Wholesale",
    "Financial Services",
    "Tourism & Hospitality",
]

# Apollo.io industry → internal label mapping
APOLLO_INDUSTRY_MAP: Dict[str, str] = {
    "logistics_and_supply_chain": "Logistics & Transport",
    "real_estate": "Real Estate",
    "manufacturing": "Manufacturing",
    "professional_training_and_coaching": "Professional Services",
    "legal_services": "Professional Services",
    "construction": "Construction",
    "hospital_and_health_care": "Healthcare",
    "information_technology_and_services": "IT & Software",
    "retail": "Retail & Wholesale",
    "financial_services": "Financial Services",
    "hospitality": "Tourism & Hospitality",
}

# Companies to sample per country (3k–5k total, batch via Apollo pagination)
TARGET_COMPANIES_PER_COUNTRY: int = 3000

# ---------------------------------------------------------------------------
# Technographic detection thresholds
# ---------------------------------------------------------------------------
MIN_CONFIDENCE_TO_STORE: float = 0.4   # discard ambiguous hits below this

# ---------------------------------------------------------------------------
# Rate limits (requests / second per domain)
# ---------------------------------------------------------------------------
RATE_LIMITS: Dict[str, float] = {
    "api.apollo.io": 2.0,
    "api.wappalyzer.com": 5.0,
    "api.builtwith.com": 3.0,
    "www.linkedin.com": 0.2,   # be very conservative
    "www.indeed.com": 0.3,
    "default": 1.0,
}
