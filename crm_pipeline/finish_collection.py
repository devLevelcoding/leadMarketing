"""
Run only the 3 remaining segments that are not yet in the DB.
Avoids re-running LinkedIn enrichment on 1,800+ existing leads.
"""
import asyncio, csv, logging, sys
from pathlib import Path
from typing import Optional

sys.stdout.reconfigure(encoding="utf-8")
sys.stderr.reconfigure(encoding="utf-8")

from rich.console import Console
from database.models import Lead, create_all_tables, get_engine, get_session_factory
from scrapers.maps_finder import stream_places, PlaceRecord, GOOGLE_MAPS_API_KEY
from scrapers.linkedin_finder import find_linkedin
from utils.http_client import AsyncHTTPClient

logging.basicConfig(level=logging.WARNING)
console = Console(highlight=False)

# Only the 3 segments still missing full data
REMAINING = [
    ("NL", "Real Estate",           "A"),
    ("IT", "Real Estate",           "A"),
    ("IT", "Logistics & Transport", "A"),
]
CAP = 300


async def run():
    engine = get_engine()
    create_all_tables(engine)
    Session = get_session_factory(engine)

    console.rule("[bold cyan]Finish Collection — 3 remaining segments")
    console.print(f"Segments: {len(REMAINING)}  |  Cap: {CAP}  |  Source: {'Google Maps' if GOOGLE_MAPS_API_KEY else 'Overpass'}\n")

    async with AsyncHTTPClient(semaphore_limit=5) as client:
        for country, industry, tier in REMAINING:
            console.rule(f"[cyan]{country}[/cyan] / [yellow]{industry}[/yellow]")

            # Check how many we already have
            with Session() as s:
                existing = s.query(Lead).filter_by(
                    country_iso=country, industry=industry
                ).count()
            if existing >= CAP:
                console.print(f"  [dim]Already have {existing} leads — skipping[/dim]")
                continue

            # Discover
            places, seen = [], set()
            async for rec in stream_places(client, country, industry, CAP):
                key = rec.name.lower().strip()
                if key and key not in seen:
                    seen.add(key)
                    places.append(rec)
                    console.print(f"  [{len(places):>3}] {rec.source:<12} {rec.name[:50]}")
                if len(places) >= CAP:
                    break

            console.print(f"\n  [green]Discovered {len(places)} companies[/green]")
            if not places:
                continue

            # LinkedIn — small batches of 30 to avoid event loop overload
            li_urls: dict[str, Optional[str]] = {}
            console.print(f"  Finding LinkedIn (batches of 30)…")
            BATCH = 30
            for i in range(0, len(places), BATCH):
                batch = places[i:i+BATCH]
                sem = asyncio.Semaphore(2)

                async def _li(rec: PlaceRecord):
                    async with sem:
                        try:
                            url = await find_linkedin(client, rec.name, rec.country_iso, rec.website)
                        except Exception:
                            url = None
                        li_urls[rec.name] = url
                        icon = "[green]✓[/green]" if url else "[dim]–[/dim]"
                        console.print(f"    {icon} {rec.name[:45]:<45}  {url or ''}")

                await asyncio.gather(*[_li(r) for r in batch], return_exceptions=True)
                console.print(f"  [dim]Batch {i//BATCH+1}/{(len(places)-1)//BATCH+1} done[/dim]")

            seg_li = sum(1 for v in li_urls.values() if v)
            console.print(f"\n  LinkedIn found: {seg_li}/{len(places)}")

            # Save
            saved = 0
            with Session() as s:
                for rec in places:
                    li_url = li_urls.get(rec.name)
                    existing_row = s.query(Lead).filter_by(
                        name=rec.name, country_iso=rec.country_iso, industry=rec.industry
                    ).first()
                    if existing_row:
                        if li_url and not existing_row.linkedin_url:
                            existing_row.linkedin_url = li_url
                            existing_row.linkedin_found = True
                        continue
                    s.add(Lead(
                        name=rec.name, country_iso=rec.country_iso, industry=rec.industry,
                        website=rec.website, phone=rec.phone, address=rec.address,
                        city=rec.city, linkedin_url=li_url or "", google_maps_url=rec.google_maps_url,
                        source=rec.source, tier=tier, linkedin_found=bool(li_url),
                    ))
                    saved += 1
                s.commit()

            console.print(f"  [bold green]Saved {saved} new leads[/bold green]")

            # Export CSV
            out = Path("leads_export")
            out.mkdir(exist_ok=True)
            fname = out / f"leads_{country}_{industry.replace(' & ','_').replace(' ','_')}.csv"
            with open(fname, "w", newline="", encoding="utf-8") as f:
                w = csv.DictWriter(f, fieldnames=["name","country","industry","website","phone","address","city","linkedin_url","google_maps_url","source"])
                w.writeheader()
                for rec in places:
                    w.writerow({"name": rec.name, "country": rec.country_iso, "industry": rec.industry,
                                "website": rec.website, "phone": rec.phone, "address": rec.address,
                                "city": rec.city, "linkedin_url": li_urls.get(rec.name) or "",
                                "google_maps_url": rec.google_maps_url, "source": rec.source})
            console.print(f"  CSV → [cyan]{fname}[/cyan]")
            console.print()

            await asyncio.sleep(35)

    console.rule("[bold green]All done")

if __name__ == "__main__":
    asyncio.run(run())
