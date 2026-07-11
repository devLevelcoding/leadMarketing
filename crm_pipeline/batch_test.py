"""
Quick batch test — scans 15 real European mid-market company websites
and prints a Market Saturation Index table without touching the full pipeline.
Run: python batch_test.py
"""
import asyncio
from rich.console import Console
from rich.table import Table
from scrapers.technographic_detector import detect_crm
from utils.http_client import AsyncHTTPClient
from analysis.scoring import _tier

console = Console()

COMPANIES = [
    # (name, country, industry, url)
    ("Coolblue",          "NL", "Retail & Wholesale",     "https://www.coolblue.nl"),
    ("Tele2 NL",          "NL", "IT & Software",          "https://www.tele2.nl"),
    ("Heijmans",          "NL", "Construction",           "https://www.heijmans.nl"),
    ("Randstad NL",       "NL", "Professional Services",  "https://www.randstad.nl"),
    ("CD Projekt",        "PL", "IT & Software",          "https://www.cdprojekt.com"),
    ("Asseco Poland",     "PL", "IT & Software",          "https://pl.asseco.com"),
    ("PKP Cargo",         "PL", "Logistics & Transport",  "https://www.pkpcargo.com"),
    ("Dom Development",   "PL", "Real Estate",            "https://www.domdev.com.pl"),
    ("Gabetti",           "IT", "Real Estate",            "https://www.gabetti.it"),
    ("Webuild",           "IT", "Construction",           "https://www.webuildgroup.com"),
    ("Esselunga",         "IT", "Retail & Wholesale",     "https://www.esselunga.it"),
    ("Maire Tecnimont",   "IT", "Manufacturing",          "https://www.mairetecnimont.com"),
    ("Esprinet",          "IT", "IT & Software",          "https://www.esprinet.com"),
    ("Dachser",           "DE", "Logistics & Transport",  "https://www.dachser.com"),
    ("Nemetschek",        "DE", "IT & Software",          "https://www.nemetschek.com"),
]

async def run():
    results = []
    async with AsyncHTTPClient(semaphore_limit=5) as client:
        tasks = [detect_crm(client, url) for _, _, _, url in COMPANIES]
        detections = await asyncio.gather(*tasks, return_exceptions=True)

    for (name, country, industry, url), det in zip(COMPANIES, detections):
        if isinstance(det, Exception):
            crm, cat, conf = "Error", "Unknown", 0.0
        else:
            crm, cat, conf = det.crm_name, det.category, det.confidence
        results.append((name, country, industry, crm, cat, conf))

    # Print detection table
    t1 = Table(title="Live CRM Detection — 15 European Companies", show_lines=True)
    t1.add_column("Company",  style="white")
    t1.add_column("Country",  style="cyan")
    t1.add_column("Industry", style="white")
    t1.add_column("CRM Found", style="yellow")
    t1.add_column("Category", style="magenta")
    t1.add_column("Confidence", justify="right")

    cat_colors = {"Modern": "green", "Legacy": "red", "Local": "yellow",
                  "None": "blue", "Unknown": "dim"}
    for name, country, industry, crm, cat, conf in results:
        color = cat_colors.get(cat, "white")
        t1.add_row(name, country, industry, crm,
                   f"[{color}]{cat}[/{color}]", f"{conf:.0%}")

    console.print(t1)

    # Mini MSI per country
    from collections import defaultdict
    buckets = defaultdict(lambda: {"Modern":0,"Legacy":0,"Local":0,"None":0,"Unknown":0,"total":0})
    for _, country, _, _, cat, _ in results:
        buckets[country][cat] += 1
        buckets[country]["total"] += 1

    t2 = Table(title="Mini Market Saturation Index", show_lines=True)
    t2.add_column("Country", style="cyan")
    t2.add_column("Sampled", justify="right")
    t2.add_column("% Modern",  justify="right", style="green")
    t2.add_column("% Legacy",  justify="right", style="red")
    t2.add_column("% Local",   justify="right", style="yellow")
    t2.add_column("% No CRM",  justify="right", style="blue")
    t2.add_column("% Unknown", justify="right", style="dim")
    t2.add_column("MSI Score", justify="right", style="bold")
    t2.add_column("Tier",      justify="center", style="bold")

    for country, b in sorted(buckets.items()):
        n = b["total"]
        pct = lambda k: b[k]/n
        msi = round(100 * (1.0*pct("Modern") + 0.5*pct("Legacy") + 0.5*pct("Local")), 1)
        tier = _tier(msi)
        tier_color = {"A": "bold green", "B": "yellow", "C": "bold red"}.get(tier, "white")
        t2.add_row(
            country, str(n),
            f"{pct('Modern'):.0%}", f"{pct('Legacy'):.0%}",
            f"{pct('Local'):.0%}",  f"{pct('None'):.0%}",
            f"{pct('Unknown'):.0%}",
            str(msi),
            f"[{tier_color}]{tier}[/{tier_color}]",
        )

    console.print(t2)
    console.print("\n[bold]Tier A[/bold] = whitespace opportunity   "
                  "[bold]Tier B[/bold] = mixed   [bold]Tier C[/bold] = saturated\n")

asyncio.run(run())
