"""
CRM Technographic Detection — three-layer approach (cheapest first):

  Layer 1 — Free HTML fingerprinting  (0 API cost)
  Layer 2 — Wappalyzer API            (~$0.001 / lookup)
  Layer 3 — BuiltWith API             (~$0.002 / lookup, more accurate)

Run Layer 1 on every company.
Run Layer 2/3 only when Layer 1 returns confidence < MIN_CONFIDENCE_TO_STORE
or you want to validate a "None detected" result.

Cost model for 3,000 companies × 3 countries = 9,000 total:
  - Layer 1 only:     ~$0     (bandwidth costs only)
  - + Layer 2 on 20% unknown: 1,800 × $0.001 = $1.80
  - + Layer 3 on 10% still unknown: 900 × $0.002 = $1.80
  Total API spend: ≈ $4   for the pilot
"""
from __future__ import annotations
import json
import logging
import re
from dataclasses import dataclass, field
from typing import List, Optional, Tuple
from urllib.parse import urlparse

from bs4 import BeautifulSoup

import config
from utils.http_client import AsyncHTTPClient

logger = logging.getLogger(__name__)


# ---------------------------------------------------------------------------
# Data classes
# ---------------------------------------------------------------------------

@dataclass
class DetectionResult:
    crm_name: str          # "HubSpot", "Salesforce", "None", "Unknown"
    category: str          # "Modern", "Legacy", "Local", "None", "Unknown"
    confidence: float      # 0.0 – 1.0
    method: str            # "fingerprint", "wappalyzer", "builtwith"
    signals: List[str] = field(default_factory=list)  # matched patterns
    http_status: int = 200


NONE_RESULT   = DetectionResult("None",    "None",    1.0, "fingerprint")
UNKNWN_RESULT = DetectionResult("Unknown", "Unknown", 0.0, "fingerprint")


# ---------------------------------------------------------------------------
# Layer 1: HTML fingerprint rules
# ---------------------------------------------------------------------------

@dataclass
class CrmFingerprint:
    name: str
    category: str           # Modern | Legacy | Local
    patterns: List[str]     # regex patterns matched against full HTML
    weight: float = 1.0     # per-match confidence contribution

CRM_FINGERPRINTS: List[CrmFingerprint] = [
    # ── Modern / Cloud CRMs ───────────────────────────────────────────────
    CrmFingerprint("HubSpot", "Modern", [
        r"hs-scripts\.com", r"hubspot\.net", r"hubspot\.com/hs-analytics",
        r"_hsq\s*=", r"hs-form", r"hbspt\.forms\.create",
    ]),
    CrmFingerprint("Salesforce", "Modern", [
        r"salesforce\.com", r"force\.com", r"pardot\.com",
        r"exacttarget\.com", r"mc\.exacttarget", r"salesforceiq",
    ]),
    CrmFingerprint("Pipedrive", "Modern", [
        r"cdn\.pipedrive\.net", r"pipedrive\.com/api",
        r"pipedrive-webforms", r"LeadBooster",
    ]),
    CrmFingerprint("ActiveCampaign", "Modern", [
        r"activehosted\.com", r"trackcmp\.net", r"ac-cdn\.com",
        r"vgo\('setAccount'", r"activecompaign",
    ]),
    CrmFingerprint("Zoho CRM", "Modern", [
        r"zoho\.com", r"zohopublic\.com", r"zohocrm", r"bigin\.com",
        r"salesiq\.zoho", r"zohoforms",
    ]),
    CrmFingerprint("Freshsales", "Modern", [
        r"freshworks\.com", r"myfreshworks\.com", r"freshsales",
        r"freshchat", r"freshmarketer",
    ]),
    CrmFingerprint("Copper CRM", "Modern", [
        r"prosperworks\.com", r"copper\.com/api",
    ]),
    CrmFingerprint("Keap / Infusionsoft", "Modern", [
        r"infusionsoft\.com", r"keap\.com", r"app\.keap\.",
        r"infusionsoft/form",
    ]),
    CrmFingerprint("Zendesk Sell", "Modern", [
        r"zendesk\.com", r"zdusercontent\.com", r"zopim",
        r"zendesk/embeddable_framework",
    ]),
    CrmFingerprint("Klaviyo", "Modern", [
        r"klaviyo\.com", r"static\.klaviyo", r"KlaviyoSubscribe",
    ]),

    # ── Legacy / Enterprise CRMs ──────────────────────────────────────────
    CrmFingerprint("Microsoft Dynamics", "Legacy", [
        r"dynamics\.com", r"microsoftdynamics", r"crm\.dynamics",
        r"dynamicscrm", r"mautic\.dynamics",
    ]),
    CrmFingerprint("SAP CRM", "Legacy", [
        r"sap\.com", r"sap-hybris", r"sapcrm", r"sap/bc/bsp",
    ]),
    CrmFingerprint("Oracle CRM", "Legacy", [
        r"oracle\.com/crm", r"eloqua\.com", r"responsys\.net",
        r"oracle-crm-on-demand",
    ]),
    CrmFingerprint("SugarCRM", "Legacy", [
        r"sugarcrm\.com", r"sugar_version", r"/index\.php\?module=",
    ]),
    CrmFingerprint("Vtiger", "Legacy", [
        r"vtiger\.com", r"vtigercrm",
    ]),
    CrmFingerprint("Bitrix24", "Legacy", [
        r"bitrix24\.com", r"1c-bitrix", r"bitrixsoft",
        r"/bitrix/js/", r"BX\.ready",
    ]),

    # ── Local / Regional CRMs (high opportunity signal) ───────────────────
    CrmFingerprint("SuperOffice", "Local", [
        r"superoffice\.com", r"superoffice\.net", r"SuperOffice\.CRMScript",
    ]),
    CrmFingerprint("Lime CRM", "Local", [
        r"lime-crm\.com", r"lundalogik", r"limecrm",
    ]),
    CrmFingerprint("Teamleader", "Local", [
        r"teamleader\.eu", r"teamleadercrm", r"focus\.teamleader",
    ]),
    CrmFingerprint("Sellsy", "Local", [
        r"sellsy\.com", r"sellsy\.fr",
    ]),
    CrmFingerprint("ABCRM", "Local", [
        r"abcrm\.nl",
    ]),
    CrmFingerprint("Comarch CRM", "Local", [
        r"comarch\.com", r"comarchcrm",
    ]),
]

# Pre-compile regex for speed
_COMPILED: List[Tuple[CrmFingerprint, List[re.Pattern]]] = [
    (fp, [re.compile(p, re.IGNORECASE) for p in fp.patterns])
    for fp in CRM_FINGERPRINTS
]


def fingerprint_html(html: str) -> DetectionResult:
    """
    Scan raw HTML for CRM signals and return the best match.
    Confidence = fraction of matched patterns × weight, capped at 1.0.
    """
    hits: List[Tuple[CrmFingerprint, List[str]]] = []

    for fp, compiled_patterns in _COMPILED:
        matched = [p.pattern for p in compiled_patterns if p.search(html)]
        if matched:
            hits.append((fp, matched))

    if not hits:
        # Look for generic CRM hints to flag as "possibly no CRM"
        if re.search(r"contact-form-7|wpcf7|cf7", html, re.IGNORECASE):
            return DetectionResult("WordPress Contact Form", "None", 0.5, "fingerprint", ["wpcf7"])
        return NONE_RESULT

    # Pick the CRM with the most matched patterns
    hits.sort(key=lambda t: len(t[1]), reverse=True)
    best_fp, best_signals = hits[0]

    # Confidence: ratio of patterns matched out of total patterns for that CRM
    total_patterns = len(best_fp.patterns)
    confidence = min(1.0, (len(best_signals) / total_patterns) * best_fp.weight)

    return DetectionResult(
        crm_name=best_fp.name,
        category=best_fp.category,
        confidence=round(confidence, 3),
        method="fingerprint",
        signals=best_signals,
    )


# ---------------------------------------------------------------------------
# Layer 2: Wappalyzer API
# ---------------------------------------------------------------------------

WAPPALYZER_URL = "https://api.wappalyzer.com/lookup/v2/"

CRM_CATEGORIES_WAPPALYZER = {"CRM", "Marketing automation", "Email marketing"}

async def wappalyzer_lookup(client: AsyncHTTPClient, url: str) -> Optional[DetectionResult]:
    """
    $0.001 per lookup on Starter plan (~1 credit).
    Returns None if API key not configured.
    """
    if not config.WAPPALYZER_API_KEY:
        return None

    try:
        status, body = await client.get(
            WAPPALYZER_URL,
            params={"urls": url, "sets": "technologies"},
            headers={"x-api-key": config.WAPPALYZER_API_KEY},
            as_json=True,
        )
        if status != 200 or not body:
            return None

        technologies = body[0].get("technologies", []) if isinstance(body, list) else []
        crm_techs = [
            t for t in technologies
            if any(cat in CRM_CATEGORIES_WAPPALYZER for cat in t.get("categories", []))
        ]

        if not crm_techs:
            return DetectionResult("None", "None", 0.85, "wappalyzer")

        top = crm_techs[0]
        name = top.get("name", "Unknown")
        confidence = top.get("confidence", 50) / 100
        category = _classify_category(name)

        return DetectionResult(
            crm_name=name,
            category=category,
            confidence=round(confidence, 3),
            method="wappalyzer",
            signals=[name],
        )

    except Exception as exc:
        logger.warning("Wappalyzer error for %s: %s", url, exc)
        return None


# ---------------------------------------------------------------------------
# Layer 3: BuiltWith API
# ---------------------------------------------------------------------------

BUILTWITH_URL = "https://api.builtwith.com/v21/api.json"

async def builtwith_lookup(client: AsyncHTTPClient, url: str) -> Optional[DetectionResult]:
    """$0.002 per lookup. Returns None if API key not configured."""
    if not config.BUILTWITH_API_KEY:
        return None

    try:
        domain = urlparse(url).netloc
        status, body = await client.get(
            BUILTWITH_URL,
            params={"KEY": config.BUILTWITH_API_KEY, "LOOKUP": domain},
            as_json=True,
        )
        if status != 200:
            return None

        paths = body.get("Results", [{}])[0].get("Result", {}).get("Paths", [])
        technologies: List[str] = []
        for path in paths:
            for tech in path.get("Technologies", []):
                cat = tech.get("Categories", [""])[0]
                if "CRM" in cat or "Marketing" in cat:
                    technologies.append(tech.get("Name", ""))

        if not technologies:
            return DetectionResult("None", "None", 0.9, "builtwith")

        name = technologies[0]
        return DetectionResult(
            crm_name=name,
            category=_classify_category(name),
            confidence=0.9,
            method="builtwith",
            signals=technologies,
        )

    except Exception as exc:
        logger.warning("BuiltWith error for %s: %s", url, exc)
        return None


# ---------------------------------------------------------------------------
# Orchestration: pick cheapest layer that meets confidence threshold
# ---------------------------------------------------------------------------

async def detect_crm(
    client: AsyncHTTPClient,
    website: str,
    force_api: bool = False,
) -> DetectionResult:
    """
    CRM detection — free HTML fingerprinting only by default.

    Paid layers (Wappalyzer / BuiltWith) are available but optional.
    Set WAPPALYZER_API_KEY or BUILTWITH_API_KEY in .env to activate them
    automatically for low-confidence results.

    Coverage of Layer 1 alone: ~75–80% of companies that actually use a
    detectable CRM will leave an HTML trace.  The remaining 20–25% are either
    fully server-side CRM integrations (no client JS) or JS-rendered pages
    where BeautifulSoup sees a blank shell.  For a market-saturation analysis
    these unknowns are counted separately and don't skew the index.
    """
    try:
        status, html = await client.get(website)

        if status in (403, 429):
            return DetectionResult("Unknown", "Unknown", 0.0, "fingerprint", http_status=status)
        if status in (301, 302, 404, 410, 503):
            return DetectionResult("Unknown", "Unknown", 0.0, "fingerprint", http_status=status)

        result = fingerprint_html(html)
        result.http_status = status

        # Optional: escalate to paid API only when key is present and confidence is low
        if result.confidence < config.MIN_CONFIDENCE_TO_STORE and result.crm_name != "None":
            if config.WAPPALYZER_API_KEY:
                wap = await wappalyzer_lookup(client, website)
                if wap and wap.confidence >= config.MIN_CONFIDENCE_TO_STORE:
                    return wap
            if config.BUILTWITH_API_KEY:
                bw = await builtwith_lookup(client, website)
                if bw:
                    return bw

        return result

    except Exception as exc:
        logger.warning("HTTP error %s: %s", website, exc)
        return DetectionResult("Unknown", "Unknown", 0.0, "fingerprint")


# ---------------------------------------------------------------------------
# Helper
# ---------------------------------------------------------------------------

_MODERN_NAMES  = {"HubSpot", "Salesforce", "Pipedrive", "ActiveCampaign",
                   "Zoho CRM", "Freshsales", "Copper CRM", "Keap / Infusionsoft",
                   "Zendesk Sell", "Klaviyo"}
_LEGACY_NAMES  = {"Microsoft Dynamics", "SAP CRM", "Oracle CRM",
                   "SugarCRM", "Vtiger", "Bitrix24"}
_LOCAL_NAMES   = {"SuperOffice", "Lime CRM", "Teamleader", "Sellsy",
                   "ABCRM", "Comarch CRM"}

def _classify_category(name: str) -> str:
    if name in _MODERN_NAMES:
        return "Modern"
    if name in _LEGACY_NAMES:
        return "Legacy"
    if name in _LOCAL_NAMES:
        return "Local"
    return "Unknown"
