"""
Leads Collector — Phase 2 of the pipeline.

Reads Tier A segments from pilot_results.json, then for each segment:
  1. Discovers 300 companies via Google Maps / Overpass
  2. Finds each company's LinkedIn URL
  3. Saves everything to the `leads` table in the SQLite DB
  4. Prints a final summary + exports leads_{country}_{industry}.csv

Run: python leads_collector.py
     python leads_collector.py --tier A        (default)
     python leads_collector.py --tier A,B      (include Tier B too)
     python leads_collector.py --cap 50        (quick test with 50 per segment)
"""
from __future__ import annotations
import asyncio
import csv
import json
import logging
import os
import sys
from collections import defaultdict
from datetime import datetime
from pathlib import Path
from typing import List, Optional, Tuple

sys.stdout.reconfigure(encoding="utf-8")
sys.stderr.reconfigure(encoding="utf-8")

import click
from rich.console import Console
from rich.table import Table

from database.models import Lead, create_all_tables, get_engine, get_session_factory
from scrapers.maps_finder import stream_places, PlaceRecord, GOOGLE_MAPS_API_KEY
from scrapers.linkedin_finder import find_linkedin
from utils.http_client import AsyncHTTPClient

logging.basicConfig(level=logging.WARNING)
console = Console(highlight=False)

RESULTS_FILE = Path(__file__).parent / "pilot_results.json"
LEADS_CAP    = 300   # target per (country, industry) segment


# ─────────────────────────────────────────────────────────────────────────────
# Main
# ─────────────────────────────────────────────────────────────────────────────

@click.command()
@click.option("--tier",  default="A",  help="Comma-separated tiers to collect (A,B,C)")
@click.option("--cap",   default=300,  help="Max leads per segment", type=int)
@click.option("--no-linkedin", is_flag=True, default=False, help="Skip LinkedIn enrichment")
def main(tier: str, cap: int, no_linkedin: bool):
    target_tiers = {t.strip().upper() for t in tier.split(",")}
    asyncio.run(_run(target_tiers, cap, not no_linkedin))


async def _run(target_tiers: set, cap: int, enrich_linkedin: bool):
    # Load Tier A segments from pilot
    if not RESULTS_FILE.exists():
        console.print("[red]pilot_results.json not found. Run pilot_run.py first.[/red]")
        return

    with open(RESULTS_FILE, encoding="utf-8") as f:
        pilot = json.load(f)

    segments: List[Tuple[str,str]] = [
        (r["country"], r["industry"])
        for r in pilot["msi"]
        if r["tier"] in target_tiers
    ]

    console.rule("[bold cyan]Lead Collector")
    console.print(f"Segments to collect: {len(segments)}")
    console.print(f"Target per segment:  {cap} leads")
    console.print(f"LinkedIn enrichment: {'yes' if enrich_linkedin else 'no'}")
    if GOOGLE_MAPS_API_KEY:
        console.print("[green]Google Maps API key detected — using Maps as primary source[/green]")
    else:
        console.print("[yellow]No GOOGLE_MAPS_API_KEY — using Overpass (OSM) as primary source[/yellow]")
        console.print("[dim]To use Google Maps: add GOOGLE_MAPS_API_KEY to .env[/dim]")
    console.print()

    # Init DB
    engine = get_engine()
    create_all_tables(engine)
    SessionFactory = get_session_factory(engine)

    grand_total   = 0
    li_found      = 0
    segment_stats = []

    async with AsyncHTTPClient(semaphore_limit=5) as client:
        for country, industry in segments:
            console.rule(f"[cyan]{country}[/cyan] / [yellow]{industry}[/yellow]")

            # ── 1. Discover companies ────────────────────────────────────
            places: List[PlaceRecord] = []
            seen_names: set[str] = set()

            async for rec in stream_places(client, country, industry, cap):
                key = rec.name.lower().strip()
                if key and key not in seen_names:
                    seen_names.add(key)
                    places.append(rec)
                console.print(f"  [{len(places):>3}] {rec.source:<12} {rec.name[:50]}")
                if len(places) >= cap:
                    break

            console.print(f"\n  [green]Discovered {len(places)} companies[/green]")

            # ── 2. LinkedIn enrichment ───────────────────────────────────
            li_urls: dict[str, Optional[str]] = {}
            if enrich_linkedin and places:
                console.print(f"  Finding LinkedIn URLs (this takes ~{len(places)*4//60+1} min)…")
                li_sem = asyncio.Semaphore(2)   # be conservative with LinkedIn/DDG

                async def _li(rec: PlaceRecord):
                    async with li_sem:
                        try:
                            url = await find_linkedin(client, rec.name, rec.country_iso, rec.website)
                        except Exception:
                            url = None
                        li_urls[rec.name] = url
                        icon = "[green]✓[/green]" if url else "[dim]–[/dim]"
                        console.print(f"    {icon} {rec.name[:45]:<45}  {url or ''}")

                await asyncio.gather(*[_li(r) for r in places], return_exceptions=True)

            seg_li = sum(1 for v in li_urls.values() if v)
            li_found += seg_li
            console.print(f"\n  LinkedIn found: {seg_li}/{len(places)}")

            # ── 3. Save to DB ─────────────────────────────────────────────
            saved = 0
            with SessionFactory() as session:
                for rec in places:
                    li_url = li_urls.get(rec.name)
                    # Upsert by name+country+industry
                    existing = (
                        session.query(Lead)
                        .filter_by(name=rec.name, country_iso=rec.country_iso,
                                   industry=rec.industry)
                        .first()
                    )
                    if existing:
                        # Update LinkedIn if we found it
                        if li_url and not existing.linkedin_url:
                            existing.linkedin_url   = li_url
                            existing.linkedin_found = True
                        continue

                    lead = Lead(
                        name=rec.name,
                        country_iso=rec.country_iso,
                        industry=rec.industry,
                        website=rec.website,
                        phone=rec.phone,
                        address=rec.address,
                        city=rec.city,
                        linkedin_url=li_url or "",
                        google_maps_url=rec.google_maps_url,
                        source=rec.source,
                        tier="A",
                        linkedin_found=bool(li_url),
                    )
                    session.add(lead)
                    saved += 1

                session.commit()

            console.print(f"  [bold green]Saved {saved} new leads to DB[/bold green]")
            grand_total += saved
            segment_stats.append((country, industry, len(places), seg_li, saved))

            # ── 4. Export CSV ─────────────────────────────────────────────
            _export_csv(country, industry, places, li_urls)
            console.print()

            # Respect Overpass rate limits between segments
            await asyncio.sleep(35)

    # ── Final summary ─────────────────────────────────────────────────────────
    console.rule("[bold]Summary")
    t = Table(show_lines=True)
    t.add_column("Country",  style="cyan")
    t.add_column("Industry", style="white",  max_width=26)
    t.add_column("Found",    justify="right", style="green")
    t.add_column("LinkedIn", justify="right", style="yellow")
    t.add_column("Saved",    justify="right", style="bold")

    for country, industry, found, li, saved in segment_stats:
        t.add_row(country, industry, str(found), str(li), str(saved))

    console.print(t)
    console.print(f"\n[bold green]Total new leads in DB: {grand_total}[/bold green]")
    console.print(f"[bold yellow]LinkedIn URLs found:  {li_found}[/bold yellow]")
    console.print(f"\nDatabase: [cyan]{os.path.abspath('crm_pipeline.db')}[/cyan]")
    console.print(f"CSVs exported to: [cyan]{os.path.abspath('leads_export/')}[/cyan]")
    console.rule("[bold cyan]Done")


# ─────────────────────────────────────────────────────────────────────────────
# CSV export
# ─────────────────────────────────────────────────────────────────────────────

def _export_csv(
    country: str,
    industry: str,
    places: List[PlaceRecord],
    li_urls: dict,
):
    out_dir = Path("leads_export")
    out_dir.mkdir(exist_ok=True)

    safe_industry = industry.replace(" & ", "_").replace(" ", "_").replace("/", "_")
    filename = out_dir / f"leads_{country}_{safe_industry}.csv"

    with open(filename, "w", newline="", encoding="utf-8") as f:
        writer = csv.DictWriter(f, fieldnames=[
            "name","country","industry","website","phone",
            "address","city","linkedin_url","google_maps_url","source"
        ])
        writer.writeheader()
        for rec in places:
            writer.writerow({
                "name":            rec.name,
                "country":         rec.country_iso,
                "industry":        rec.industry,
                "website":         rec.website,
                "phone":           rec.phone,
                "address":         rec.address,
                "city":            rec.city,
                "linkedin_url":    li_urls.get(rec.name) or "",
                "google_maps_url": rec.google_maps_url,
                "source":          rec.source,
            })

    console.print(f"  CSV → [cyan]{filename}[/cyan]  ({len(places)} rows)")


if __name__ == "__main__":
    main()
