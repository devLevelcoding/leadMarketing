"""
100% FREE company discovery — no API keys required for the pilot.

Source priority per country:
  1. National business registry API  (official, structured, free)
  2. Europages scraping              (pan-European B2B directory)
  3. Country yellow-pages scraping   (local fallback)

Free registry coverage:
  NL  → KVK (kvk.nl)           — free dev account, 500 req/day
  FR  → INSEE SIRENE             — completely free, no key
  GB  → Companies House          — free API key
  DK  → CVR API                  — completely free
  CZ  → ARES API                 — completely free
  PL  → Panoramafirm scraping    — no key
  IT  → Pagine Gialle scraping   — no key
  *   → Europages                — universal fallback
"""
from __future__ import annotations
import asyncio
import json
import logging
import re
from dataclasses import dataclass, field
from typing import AsyncIterator, Dict, List, Optional
from urllib.parse import quote, urlencode

from bs4 import BeautifulSoup

import config
from utils.http_client import AsyncHTTPClient

logger = logging.getLogger(__name__)


@dataclass
class CompanyRecord:
    name: str
    website: str
    country_iso: str
    industry: str
    employee_min: int = 50
    employee_max: int = 250
    linkedin_url: str = ""
    source: str = ""


# ─────────────────────────────────────────────────────────────────────────────
# ROUTER — picks the best free source per country
# ─────────────────────────────────────────────────────────────────────────────

async def stream_companies(
    client: AsyncHTTPClient,
    country_iso: str,
    industry: str,
    max_results: int = config.TARGET_COMPANIES_PER_COUNTRY,
) -> AsyncIterator[CompanyRecord]:
    """
    Yield CompanyRecord objects from the best free source for `country_iso`.
    Falls back to Europages for any country not explicitly handled.
    """
    router = {
        "NL": _stream_kvk,
        "FR": _stream_sirene,
        "DK": _stream_cvr,
        "CZ": _stream_ares,
        "PL": _stream_panoramafirm,
        "IT": _stream_paginegialle,
        "GB": _stream_companies_house,
    }

    handler = router.get(country_iso, _stream_europages)
    count = 0
    async for rec in handler(client, country_iso, industry):
        if count >= max_results:
            return
        yield rec
        count += 1


# ─────────────────────────────────────────────────────────────────────────────
# 1. KVK — Netherlands  (free developer account at developer.kvk.nl)
#    Returns official Dutch Chamber of Commerce data.
#    Employee count, SBI-code (Dutch industry), website URL included.
# ─────────────────────────────────────────────────────────────────────────────

KVK_SEARCH   = "https://api.kvk.nl/api/v2/zoeken"
KVK_PROFILE  = "https://api.kvk.nl/api/v2/basisprofielen/{kvk_number}"

# SBI-code → internal industry label
KVK_SBI_MAP: Dict[str, str] = {
    "49": "Logistics & Transport",
    "50": "Logistics & Transport",
    "52": "Logistics & Transport",
    "68": "Real Estate",
    "28": "Manufacturing",
    "25": "Manufacturing",
    "41": "Construction",
    "42": "Construction",
    "86": "Healthcare",
    "62": "IT & Software",
    "63": "IT & Software",
    "69": "Professional Services",
    "70": "Professional Services",
    "46": "Retail & Wholesale",
    "64": "Financial Services",
    "55": "Tourism & Hospitality",
}

async def _stream_kvk(
    client: AsyncHTTPClient,
    country_iso: str,
    industry: str,
    pages: int = 40,
) -> AsyncIterator[CompanyRecord]:
    """
    KVK Search API — paginated, 10 results per page.
    Filter by SBI-code ranges matching `industry`.
    Docs: https://developers.kvk.nl/documentation/zoeken-api
    """
    # Map internal industry label back to KVK SBI prefix
    sbi_prefixes = [k for k, v in KVK_SBI_MAP.items() if v == industry]
    keyword = _industry_to_keyword(industry, "nl")

    for page in range(1, pages + 1):
        params = {
            "q": keyword,
            "pagina": page,
            "resultatenPerPagina": 10,
            "type": "HOOFDVESTIGING",  # main branch only
        }
        try:
            status, body = await client.get(KVK_SEARCH, params=params, as_json=True)
            if status != 200:
                logger.warning("KVK page %d → HTTP %s", page, status)
                break

            results = body.get("resultaten", [])
            if not results:
                break

            for item in results:
                employees = item.get("aantalMedewerkers", "")
                if not _employee_filter(employees):
                    continue

                website = item.get("websites", [None])[0] if item.get("websites") else ""
                if not website:
                    continue
                if not website.startswith("http"):
                    website = "https://" + website

                yield CompanyRecord(
                    name=item.get("naam", ""),
                    website=website.rstrip("/"),
                    country_iso="NL",
                    industry=industry,
                    employee_min=50,
                    employee_max=250,
                    source="kvk",
                )

            await asyncio.sleep(0.5)

        except Exception as exc:
            logger.warning("KVK error page %d: %s", page, exc)
            break


# ─────────────────────────────────────────────────────────────────────────────
# 2. INSEE SIRENE — France  (completely free, no account needed)
#    10M+ companies with NAF codes, workforce band, legal status.
#    Docs: https://api.insee.fr/catalogue/site/themes/wso2/subthemes/insee/pages/item-info.jag?name=Sirene&version=V3.11
# ─────────────────────────────────────────────────────────────────────────────

SIRENE_URL = "https://api.insee.fr/entreprises/sirene/V3.11/siret"

# NAF code prefix → industry
NAF_MAP: Dict[str, str] = {
    "49": "Logistics & Transport",
    "52": "Logistics & Transport",
    "68": "Real Estate",
    "28": "Manufacturing",
    "41": "Construction",
    "86": "Healthcare",
    "62": "IT & Software",
    "69": "Professional Services",
    "70": "Professional Services",
    "46": "Retail & Wholesale",
    "64": "Financial Services",
    "55": "Tourism & Hospitality",
}

async def _stream_sirene(
    client: AsyncHTTPClient,
    country_iso: str,
    industry: str,
    pages: int = 60,
) -> AsyncIterator[CompanyRecord]:
    """
    INSEE SIRENE API — free, requires no API key for basic access.
    Returns SIRET records filterable by NAF code and tranche effectif.
    Tranche 11 = 50–99 employees, 12 = 100–199, 21 = 200–249.
    """
    naf_prefixes = [k for k, v in NAF_MAP.items() if v == industry]
    if not naf_prefixes:
        naf_prefixes = ["62"]  # default: IT

    naf_filter = " OR ".join(f'activitePrincipaleEtablissement:"{p}*"' for p in naf_prefixes)
    size = 20

    for page in range(pages):
        q = f'({naf_filter}) AND (trancheEffectifsEtablissement:11 OR trancheEffectifsEtablissement:12 OR trancheEffectifsEtablissement:21)'
        params = {
            "q": q,
            "nombre": size,
            "debut": page * size,
            "champs": "denominationUniteLegale,activitePrincipaleEtablissement,trancheEffectifsEtablissement",
        }
        try:
            status, body = await client.get(
                SIRENE_URL,
                params=params,
                headers={"Accept": "application/json"},
                as_json=True,
            )
            if status == 404 or not body.get("etablissements"):
                break

            for etab in body.get("etablissements", []):
                ul = etab.get("uniteLegale", {})
                name = ul.get("denominationUniteLegale", "")
                if not name:
                    continue

                # SIRENE doesn't return website directly; build a Google query
                # target and skip — we enrich website in a second pass if needed.
                # For now we yield a placeholder and let the scraper pick it up.
                domain_guess = _name_to_domain_guess(name, "fr")
                yield CompanyRecord(
                    name=name,
                    website=domain_guess,
                    country_iso="FR",
                    industry=industry,
                    employee_min=50,
                    employee_max=250,
                    source="sirene",
                )

            await asyncio.sleep(0.3)

        except Exception as exc:
            logger.warning("SIRENE error page %d: %s", page, exc)
            break


# ─────────────────────────────────────────────────────────────────────────────
# 3. CVR — Denmark  (completely free, no key needed)
#    Danish Central Business Register — covers all 700k+ Danish companies.
#    Docs: https://cvrapi.dk
# ─────────────────────────────────────────────────────────────────────────────

CVR_SEARCH = "https://cvrapi.dk/api"

async def _stream_cvr(
    client: AsyncHTTPClient,
    country_iso: str,
    industry: str,
    names_to_try: int = 200,
) -> AsyncIterator[CompanyRecord]:
    """
    CVR is a single-lookup API (by CVR number or name).
    We search by common industry-related Danish company name keywords.
    For bulk: use the full CVR Elasticsearch export at distribution.virk.dk (free).
    """
    keywords = _industry_to_keyword(industry, "dk").split()

    for keyword in keywords[:5]:
        params = {"search": keyword, "country": "DK"}
        try:
            status, body = await client.get(CVR_SEARCH, params=params, as_json=True)
            if status != 200 or not body:
                continue

            companies = body if isinstance(body, list) else [body]
            for co in companies:
                emp = co.get("employees", 0) or 0
                if not (50 <= emp <= 250):
                    continue
                website = co.get("startdate", "")   # CVR doesn't provide URLs
                name = co.get("name", "")
                if not name:
                    continue
                yield CompanyRecord(
                    name=name,
                    website=_name_to_domain_guess(name, "dk"),
                    country_iso="DK",
                    industry=industry,
                    employee_min=emp,
                    employee_max=emp,
                    source="cvr",
                )
        except Exception as exc:
            logger.warning("CVR error for %s: %s", keyword, exc)


# ─────────────────────────────────────────────────────────────────────────────
# 4. ARES — Czech Republic  (completely free, no key)
#    ARES = Administrative Register of Economic Subjects
#    Docs: https://ares.gov.cz/ekonomicke-subjekty-v-be/rest/
# ─────────────────────────────────────────────────────────────────────────────

ARES_URL = "https://ares.gov.cz/ekonomicke-subjekty-v-be/rest/ekonomicke-subjekty/vyhledat"

async def _stream_ares(
    client: AsyncHTTPClient,
    country_iso: str,
    industry: str,
    max_pages: int = 30,
) -> AsyncIterator[CompanyRecord]:
    keyword = _industry_to_keyword(industry, "cz")

    for page in range(max_pages):
        payload = {
            "obchodniJmeno": keyword,
            "start": page * 20,
            "pocet": 20,
            "razeni": [{"sloucenyNazev": "asc"}],
        }
        try:
            status, body = await client.post(ARES_URL, json_body=payload)
            if not isinstance(body, dict):
                body = json.loads(body) if isinstance(body, str) else {}

            items = body.get("ekonomickeSubjekty", [])
            if not items:
                break

            for item in items:
                name = item.get("obchodniJmeno", "")
                ico = item.get("ico", "")
                if not name:
                    continue
                yield CompanyRecord(
                    name=name,
                    website=_name_to_domain_guess(name, "cz"),
                    country_iso="CZ",
                    industry=industry,
                    employee_min=50,
                    employee_max=250,
                    source="ares",
                )
            await asyncio.sleep(0.5)

        except Exception as exc:
            logger.warning("ARES error page %d: %s", page, exc)
            break


# ─────────────────────────────────────────────────────────────────────────────
# 5. Panoramafirm.pl — Poland  (free scraping, no key)
#    Poland's largest B2B directory with industry categories and employee ranges.
#    URL pattern: https://panoramafirm.pl/{industry}/firmy,{page}.html
# ─────────────────────────────────────────────────────────────────────────────

PANORAMA_BASE = "https://panoramafirm.pl"

PANORAMA_INDUSTRY_SLUGS: Dict[str, str] = {
    "Logistics & Transport":  "transport-i-logistyka",
    "Real Estate":            "nieruchomosci",
    "Manufacturing":          "produkcja-i-przemysl",
    "Professional Services":  "uslugi-profesjonalne",
    "Construction":           "budownictwo",
    "Healthcare":             "ochrona-zdrowia",
    "IT & Software":          "informatyka-i-telekomunikacja",
    "Retail & Wholesale":     "handel",
    "Financial Services":     "finanse-i-ubezpieczenia",
    "Tourism & Hospitality":  "turystyka-i-hotelarstwo",
}

async def _stream_panoramafirm(
    client: AsyncHTTPClient,
    country_iso: str,
    industry: str,
    max_pages: int = 80,
) -> AsyncIterator[CompanyRecord]:
    slug = PANORAMA_INDUSTRY_SLUGS.get(industry, "uslugi")

    for page in range(1, max_pages + 1):
        url = f"{PANORAMA_BASE}/{slug}/firmy,{page}.html"
        try:
            status, html = await client.get(url, headers={"Accept-Language": "pl-PL,pl;q=0.9"})
            if status != 200:
                break

            soup = BeautifulSoup(html, "lxml")
            cards = soup.select("div.company-item, li.company-result, div[class*='company']")

            if not cards:
                break

            for card in cards:
                name_el = card.select_one("h2, h3, .company-name, a[href*='/firmy/']")
                link_el = card.select_one("a.company-url, a[href^='http']:not([href*='panoramafirm'])")
                emp_el  = card.select_one("span.employees, div[class*='employee']")

                name = name_el.get_text(strip=True) if name_el else ""
                website = link_el.get("href", "") if link_el else _name_to_domain_guess(name, "pl")
                employees_text = emp_el.get_text(strip=True) if emp_el else ""

                if not name or not website:
                    continue
                if not website.startswith("http"):
                    website = "https://" + website

                yield CompanyRecord(
                    name=name,
                    website=website.rstrip("/"),
                    country_iso="PL",
                    industry=industry,
                    source="panoramafirm",
                )

            logger.info("Panoramafirm PL/%s page %d → %d cards", industry, page, len(cards))
            await asyncio.sleep(1.5)  # be respectful

        except Exception as exc:
            logger.warning("Panoramafirm error page %d: %s", page, exc)
            break


# ─────────────────────────────────────────────────────────────────────────────
# 6. Pagine Gialle — Italy  (free scraping, no key)
#    Italy's largest business directory.
#    URL: https://www.paginegialle.it/ricerca/{category}/{city}?pg={page}
# ─────────────────────────────────────────────────────────────────────────────

PG_BASE = "https://www.paginegialle.it"

PG_INDUSTRY_SLUGS: Dict[str, str] = {
    "Logistics & Transport":  "trasporti-e-spedizioni",
    "Real Estate":            "agenzie-immobiliari",
    "Manufacturing":          "industria-e-produzione",
    "Professional Services":  "servizi-alle-imprese",
    "Construction":           "costruzioni-edilizia",
    "Healthcare":             "medici-ospedali",
    "IT & Software":          "informatica-software",
    "Retail & Wholesale":     "commercio-ingrosso",
    "Financial Services":     "banche-finanza",
    "Tourism & Hospitality":  "hotel-alberghi",
}

ITALIAN_CITIES = [
    "milano", "roma", "torino", "napoli", "bologna",
    "firenze", "venezia", "bari", "palermo", "genova",
]

async def _stream_paginegialle(
    client: AsyncHTTPClient,
    country_iso: str,
    industry: str,
    pages_per_city: int = 8,
) -> AsyncIterator[CompanyRecord]:
    slug = PG_INDUSTRY_SLUGS.get(industry, "servizi-alle-imprese")

    for city in ITALIAN_CITIES:
        for page in range(1, pages_per_city + 1):
            url = f"{PG_BASE}/ricerca/{slug}/{city}?pg={page}"
            try:
                status, html = await client.get(url, headers={"Accept-Language": "it-IT,it;q=0.9"})
                if status != 200:
                    break

                soup = BeautifulSoup(html, "lxml")
                # Pagine Gialle renders results in structured list items
                cards = soup.select("li.item-risultato, div[class*='results-item'], article")
                if not cards:
                    break

                for card in cards:
                    name_el = card.select_one("h2, h3, .item-title, [class*='business-name']")
                    link_el = card.select_one("a.website-url, a[href^='http']:not([href*='paginegialle'])")

                    name = name_el.get_text(strip=True) if name_el else ""
                    website = link_el.get("href", "") if link_el else ""

                    if not name:
                        continue
                    if not website:
                        website = _name_to_domain_guess(name, "it")
                    if not website.startswith("http"):
                        website = "https://" + website

                    yield CompanyRecord(
                        name=name,
                        website=website.rstrip("/"),
                        country_iso="IT",
                        industry=industry,
                        source="paginegialle",
                    )

                logger.info("PagineGialle IT/%s/%s page %d → %d cards", industry, city, page, len(cards))
                await asyncio.sleep(2.0)

            except Exception as exc:
                logger.warning("PagineGialle error %s page %d: %s", city, page, exc)
                break


# ─────────────────────────────────────────────────────────────────────────────
# 7. Companies House — UK  (free API key at developer.company-information.service.gov.uk)
#    Returns SIC codes, registered address, and company status.
# ─────────────────────────────────────────────────────────────────────────────

CH_SEARCH = "https://api.company-information.service.gov.uk/search/companies"

async def _stream_companies_house(
    client: AsyncHTTPClient,
    country_iso: str,
    industry: str,
    max_pages: int = 40,
) -> AsyncIterator[CompanyRecord]:
    import os
    api_key = os.getenv("COMPANIES_HOUSE_API_KEY", "")
    keyword = _industry_to_keyword(industry, "gb")

    for page in range(max_pages):
        params = {
            "q": keyword,
            "items_per_page": 20,
            "start_index": page * 20,
        }
        try:
            auth = aiohttp_basic_auth(api_key, "")
            status, body = await client.get(CH_SEARCH, params=params, headers=auth, as_json=True)
            if status != 200:
                break

            for item in body.get("items", []):
                name = item.get("title", "")
                if not name:
                    continue
                yield CompanyRecord(
                    name=name,
                    website=_name_to_domain_guess(name, "gb"),
                    country_iso="GB",
                    industry=industry,
                    source="companies_house",
                )
            await asyncio.sleep(0.5)

        except Exception as exc:
            logger.warning("CompaniesHouse error page %d: %s", page, exc)
            break

def aiohttp_basic_auth(user: str, password: str) -> Dict[str, str]:
    import base64
    token = base64.b64encode(f"{user}:{password}".encode()).decode()
    return {"Authorization": f"Basic {token}"}


# ─────────────────────────────────────────────────────────────────────────────
# 8. Europages — universal fallback  (free scraping, pan-European)
#    Covers all 44 countries.  Use this for any country without a registry handler.
# ─────────────────────────────────────────────────────────────────────────────

EUROPAGES_COUNTRY_SLUGS: Dict[str, str] = {
    "IT": "italy",       "PL": "poland",       "NL": "netherlands",
    "DE": "germany",     "FR": "france",       "ES": "spain",
    "RO": "romania",     "CZ": "czechia",      "GR": "greece",
    "GB": "united-kingdom", "SE": "sweden",   "NO": "norway",
    "CH": "switzerland", "AT": "austria",     "BE": "belgium",
    "PT": "portugal",    "HU": "hungary",     "SK": "slovakia",
    "HR": "croatia",     "BG": "bulgaria",    "FI": "finland",
    "EE": "estonia",     "LV": "latvia",      "LT": "lithuania",
    "SI": "slovenia",    "LU": "luxembourg",  "MT": "malta",
    "CY": "cyprus",      "IE": "ireland",     "DK": "denmark",
    "RS": "serbia",      "AL": "albania",     "BA": "bosnia-and-herzegovina",
    "MK": "north-macedonia", "ME": "montenegro", "UA": "ukraine",
    "MD": "moldova",     "GE": "georgia",     "AM": "armenia",
    "AZ": "azerbaijan",  "BY": "belarus",
}

EUROPAGES_INDUSTRY_SLUGS: Dict[str, str] = {
    "Logistics & Transport":  "transport-freight",
    "Real Estate":            "real-estate",
    "Manufacturing":          "manufacturing",
    "Professional Services":  "consulting-services",
    "Construction":           "construction",
    "Healthcare":             "medical-health",
    "IT & Software":          "computer-software",
    "Retail & Wholesale":     "wholesale-trade",
    "Financial Services":     "financial-services",
    "Tourism & Hospitality":  "hotels-accommodation",
}

async def _stream_europages(
    client: AsyncHTTPClient,
    country_iso: str,
    industry: str,
    max_pages: int = 30,
) -> AsyncIterator[CompanyRecord]:
    country_slug   = EUROPAGES_COUNTRY_SLUGS.get(country_iso, country_iso.lower())
    industry_slug  = EUROPAGES_INDUSTRY_SLUGS.get(industry, "business-services")

    for page in range(1, max_pages + 1):
        url = f"https://www.europages.co.uk/companies/{country_slug}/{industry_slug}/pg-{page}.html"
        try:
            status, html = await client.get(url)
            if status != 200:
                break

            soup = BeautifulSoup(html, "lxml")
            cards = soup.select("article.company-card, div[class*='company-item']")
            if not cards:
                break

            for card in cards:
                name_el = card.select_one("h2, .company-name, [class*='company-title']")
                link_el = card.select_one("a[href^='http']:not([href*='europages'])")

                name = name_el.get_text(strip=True) if name_el else ""
                website = link_el.get("href", "") if link_el else ""

                if not name:
                    continue
                if not website:
                    website = _name_to_domain_guess(name, country_iso.lower())

                yield CompanyRecord(
                    name=name,
                    website=website.rstrip("/"),
                    country_iso=country_iso,
                    industry=industry,
                    source="europages",
                )

            logger.info("Europages %s/%s page %d → %d cards", country_iso, industry, page, len(cards))
            await asyncio.sleep(2.0)

        except Exception as exc:
            logger.warning("Europages error %s page %d: %s", country_iso, page, exc)
            break


# ─────────────────────────────────────────────────────────────────────────────
# Helpers
# ─────────────────────────────────────────────────────────────────────────────

INDUSTRY_KEYWORDS: Dict[str, Dict[str, str]] = {
    "Logistics & Transport":  {"nl": "transport logistiek", "pl": "transport logistyka", "fr": "transport logistique", "dk": "transport", "cz": "doprava logistika", "gb": "logistics freight", "it": "trasporti logistica"},
    "Real Estate":            {"nl": "vastgoed makelaardij", "pl": "nieruchomości", "fr": "immobilier", "dk": "ejendom", "cz": "nemovitosti", "gb": "real estate property", "it": "immobiliare"},
    "Manufacturing":          {"nl": "productie fabricage", "pl": "produkcja przemysł", "fr": "fabrication production", "dk": "produktion", "cz": "výroba", "gb": "manufacturing production", "it": "produzione manifattura"},
    "Professional Services":  {"nl": "zakelijke dienstverlening", "pl": "usługi profesjonalne", "fr": "conseil services", "dk": "konsulentydelser", "cz": "konzultace poradenství", "gb": "consulting advisory", "it": "consulenza servizi"},
    "Construction":           {"nl": "bouw constructie", "pl": "budownictwo", "fr": "construction bâtiment", "dk": "byggeri", "cz": "stavebnictví", "gb": "construction building", "it": "edilizia costruzione"},
    "Healthcare":             {"nl": "zorg gezondheidszorg", "pl": "ochrona zdrowia", "fr": "santé médical", "dk": "sundhed", "cz": "zdravotnictví", "gb": "healthcare medical", "it": "sanità salute"},
    "IT & Software":          {"nl": "software IT technologie", "pl": "oprogramowanie informatyka", "fr": "logiciel informatique", "dk": "software IT", "cz": "software IT", "gb": "software technology", "it": "software informatica"},
    "Retail & Wholesale":     {"nl": "groothandel detailhandel", "pl": "handel hurtowy", "fr": "commerce gros", "dk": "engroshandel", "cz": "velkoobchod", "gb": "wholesale retail", "it": "commercio ingrosso"},
    "Financial Services":     {"nl": "financiële diensten", "pl": "finanse ubezpieczenia", "fr": "finance banque", "dk": "finans", "cz": "finance pojištění", "gb": "financial services", "it": "finanza banca"},
    "Tourism & Hospitality":  {"nl": "hotel toerisme", "pl": "turystyka hotelarstwo", "fr": "hôtel tourisme", "dk": "hotel turisme", "cz": "hotel cestovní ruch", "gb": "hotel tourism", "it": "hotel turismo"},
}

def _industry_to_keyword(industry: str, lang: str) -> str:
    return INDUSTRY_KEYWORDS.get(industry, {}).get(lang, industry)

COUNTRY_TLDS: Dict[str, str] = {
    "nl": ".nl", "pl": ".pl", "fr": ".fr", "it": ".it",
    "de": ".de", "es": ".es", "gb": ".co.uk", "dk": ".dk",
    "cz": ".cz", "se": ".se", "ro": ".ro",
}

def _name_to_domain_guess(name: str, country_code: str) -> str:
    """
    Build a best-guess website URL from a company name.
    This is intentionally rough — the technographic scanner will resolve it
    and we store HTTP status 404/301 for failed guesses.
    """
    slug = re.sub(r"[^a-z0-9]+", "", name.lower().split()[0] if name.split() else "unknown")
    tld = COUNTRY_TLDS.get(country_code, ".com")
    return f"https://www.{slug}{tld}"

def _employee_filter(emp_value) -> bool:
    """Return True if the value is consistent with 50–250 employees."""
    if emp_value is None:
        return True  # unknown — include and let technographic scan filter
    try:
        n = int(str(emp_value).split("-")[0].replace("+", "").strip())
        return 50 <= n <= 300
    except (ValueError, AttributeError):
        return True
