"""
Company discovery:
  Primary  — Google Maps Places API  (if GOOGLE_MAPS_API_KEY set in .env)
  Fallback — OpenStreetMap Overpass  (completely free, no key, fixed POST)
"""
from __future__ import annotations
import asyncio
import json as _json
import logging
import os
from dataclasses import dataclass
from typing import AsyncIterator, Optional

import aiohttp

logger = logging.getLogger(__name__)

GOOGLE_MAPS_API_KEY: str = os.getenv("GOOGLE_MAPS_API_KEY", "")
GMAPS_SEARCH_URL = "https://places.googleapis.com/v1/places:searchText"
OVERPASS_URL     = "https://overpass-api.de/api/interpreter"


@dataclass
class PlaceRecord:
    name: str
    country_iso: str
    industry: str
    website: str = ""
    phone: str   = ""
    address: str = ""
    city: str    = ""
    google_maps_url: str = ""
    source: str  = "overpass"


# ─────────────────────────────────────────────────────────────────────────────
# Config tables
# ─────────────────────────────────────────────────────────────────────────────

CITIES: dict[str, list[str]] = {
    "IT": ["Milano","Roma","Torino","Napoli","Bologna","Firenze",
           "Venezia","Genova","Bari","Verona","Padova","Brescia","Catania","Trieste"],
    "PL": ["Warszawa","Kraków","Wrocław","Poznań","Gdańsk","Łódź",
           "Katowice","Szczecin","Lublin","Białystok","Bydgoszcz","Rzeszów"],
    "NL": ["Amsterdam","Rotterdam","Den Haag","Utrecht","Eindhoven",
           "Tilburg","Groningen","Almere","Breda","Nijmegen","Enschede"],
}

GMAPS_QUERIES: dict[tuple, list[str]] = {
    ("IT","Real Estate"):           ["agenzia immobiliare","studio immobiliare","gestione immobiliare"],
    ("IT","Construction"):          ["impresa edile","impresa costruzioni","azienda edile"],
    ("IT","IT & Software"):         ["azienda informatica","software house","consulenza IT"],
    ("IT","Logistics & Transport"): ["azienda trasporti","logistica","spedizioni"],
    ("PL","Real Estate"):           ["agencja nieruchomości","biuro nieruchomości","pośrednik nieruchomości"],
    ("PL","Construction"):          ["firma budowlana","przedsiębiorstwo budowlane","roboty budowlane"],
    ("PL","IT & Software"):         ["firma informatyczna","software house","usługi IT"],
    ("PL","Logistics & Transport"): ["firma transportowa","logistyka","spedycja"],
    ("NL","Real Estate"):           ["makelaardij","vastgoedbedrijf","woningmakelaardij"],
    ("NL","Construction"):          ["bouwbedrijf","aannemersbedrijf","bouwonderneming"],
    ("NL","IT & Software"):         ["softwarebedrijf","IT bedrijf","automatisering"],
    ("NL","Logistics & Transport"): ["transportbedrijf","logistiek","expediteur"],
}

# OSM tag pairs per industry
OSM_TAGS: dict[str, list[tuple[str,str]]] = {
    "Real Estate":           [("office","estate_agent"),("shop","real_estate"),("office","real_estate")],
    "Construction":          [("craft","construction"),("office","construction_company"),("office","engineer")],
    "IT & Software":         [("office","it"),("office","software"),("office","computer"),("office","telecommunications")],
    "Logistics & Transport": [("office","logistics"),("office","transport"),("amenity","freight_transportation")],
}


# ─────────────────────────────────────────────────────────────────────────────
# Google Maps Places API
# ─────────────────────────────────────────────────────────────────────────────

async def stream_google_maps(
    country_iso: str,
    industry: str,
    max_results: int = 300,
) -> AsyncIterator[PlaceRecord]:
    if not GOOGLE_MAPS_API_KEY:
        return

    queries = GMAPS_QUERIES.get((country_iso, industry), [industry])
    cities  = CITIES.get(country_iso, [""])
    seen: set[str] = set()
    total = 0

    timeout = aiohttp.ClientTimeout(total=30)
    headers = {
        "X-Goog-Api-Key": GOOGLE_MAPS_API_KEY,
        "X-Goog-FieldMask": (
            "places.displayName,places.formattedAddress,"
            "places.websiteUri,places.nationalPhoneNumber,"
            "places.googleMapsUri,places.addressComponents"
        ),
        "Content-Type": "application/json",
    }

    async with aiohttp.ClientSession(timeout=timeout) as sess:
        for query in queries:
            for city in cities:
                if total >= max_results:
                    return
                page_token: Optional[str] = None

                while total < max_results:
                    body: dict = {"textQuery": f"{query} {city}".strip(), "pageSize": 20}
                    if page_token:
                        body["pageToken"] = page_token

                    try:
                        async with sess.post(GMAPS_SEARCH_URL, json=body, headers=headers) as resp:
                            if resp.status != 200:
                                break
                            data = await resp.json(content_type=None)

                        for place in data.get("places", []):
                            name = place.get("displayName", {}).get("text", "")
                            if not name or name in seen:
                                continue
                            seen.add(name)
                            city_name = next(
                                (c.get("longText","") for c in place.get("addressComponents",[])
                                 if "locality" in c.get("types",[])), city
                            )
                            total += 1
                            yield PlaceRecord(
                                name=name,
                                country_iso=country_iso,
                                industry=industry,
                                website=place.get("websiteUri","").rstrip("/"),
                                phone=place.get("nationalPhoneNumber",""),
                                address=place.get("formattedAddress",""),
                                city=city_name,
                                google_maps_url=place.get("googleMapsUri",""),
                                source="google_maps",
                            )

                        page_token = data.get("nextPageToken")
                        if not page_token:
                            break
                        await asyncio.sleep(2)

                    except Exception as exc:
                        logger.warning("GMaps %s/%s %s: %s", country_iso, industry, city, exc)
                        break

                await asyncio.sleep(0.3)


# ─────────────────────────────────────────────────────────────────────────────
# Overpass (OpenStreetMap) — fixed: uses proper form-encoded POST
# ─────────────────────────────────────────────────────────────────────────────

async def stream_overpass(
    country_iso: str,
    industry: str,
    max_results: int = 300,
) -> AsyncIterator[PlaceRecord]:
    tag_pairs = OSM_TAGS.get(industry, [("office", "company")])
    union_parts = "\n  ".join(
        f'nwr["{k}"="{v}"](area.country);' for k, v in tag_pairs
    )
    query = (
        f'[out:json][timeout:120];\n'
        f'area["ISO3166-1"="{country_iso}"][admin_level=2]->.country;\n'
        f'(\n  {union_parts}\n);\n'
        f'out body {min(max_results * 4, 2000)};\n'
    )

    data: dict = {}
    timeout = aiohttp.ClientTimeout(total=130)

    for attempt in range(4):
        try:
            async with aiohttp.ClientSession(timeout=timeout) as sess:
                async with sess.post(
                    OVERPASS_URL,
                    data={"data": query},
                    headers={"User-Agent": "CRMLeadPipeline/1.0"},
                ) as resp:
                    text = await resp.text()

            if resp.status == 429:
                wait = 45 * (attempt + 1)
                logger.warning("Overpass 429 %s/%s — wait %ds", country_iso, industry, wait)
                await asyncio.sleep(wait)
                continue

            if resp.status != 200:
                logger.warning("Overpass %s/%s → HTTP %s", country_iso, industry, resp.status)
                return

            data = _json.loads(text)
            break   # success

        except _json.JSONDecodeError:
            logger.warning("Overpass non-JSON %s/%s", country_iso, industry)
            return
        except Exception as exc:
            logger.warning("Overpass error %s/%s attempt %d: %s", country_iso, industry, attempt, exc)
            await asyncio.sleep(20)
    else:
        logger.warning("Overpass gave up after retries: %s/%s", country_iso, industry)
        return

    seen: set[str] = set()
    count = 0

    for el in data.get("elements", []):
        tags = el.get("tags", {})
        name = tags.get("name") or tags.get("name:en") or ""
        if not name or name in seen:
            continue
        seen.add(name)

        website = tags.get("website") or tags.get("contact:website") or tags.get("url") or ""
        if website and not website.startswith("http"):
            website = "https://" + website

        count += 1
        yield PlaceRecord(
            name=name,
            country_iso=country_iso,
            industry=industry,
            website=website.rstrip("/"),
            phone=tags.get("phone") or tags.get("contact:phone") or "",
            address=_build_address(tags),
            city=tags.get("addr:city") or "",
            source="overpass",
        )
        if count >= max_results:
            break

    logger.info("Overpass %s/%s → %d yielded", country_iso, industry, count)


# ─────────────────────────────────────────────────────────────────────────────
# Router
# ─────────────────────────────────────────────────────────────────────────────

async def stream_places(
    client,    # kept for API compatibility — not used (we open our own sessions)
    country_iso: str,
    industry: str,
    max_results: int = 300,
) -> AsyncIterator[PlaceRecord]:
    seen: set[str] = set()
    collected = 0

    source = stream_google_maps if GOOGLE_MAPS_API_KEY else stream_overpass

    async for rec in source(country_iso, industry, max_results):
        key = rec.name.lower().strip()
        if key and key not in seen:
            seen.add(key)
            yield rec
            collected += 1
            if collected >= max_results:
                return

    # Fill remaining gap with Overpass if Google Maps was primary
    if GOOGLE_MAPS_API_KEY and collected < max_results:
        async for rec in stream_overpass(country_iso, industry, max_results - collected):
            key = rec.name.lower().strip()
            if key and key not in seen:
                seen.add(key)
                yield rec
                collected += 1
                if collected >= max_results:
                    return


def _build_address(tags: dict) -> str:
    parts = [tags.get("addr:street",""), tags.get("addr:housenumber",""),
             tags.get("addr:postcode",""), tags.get("addr:city","")]
    return ", ".join(p for p in parts if p)
