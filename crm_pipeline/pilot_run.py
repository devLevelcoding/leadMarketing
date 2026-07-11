"""
Pilot run — real European SME companies, live CRM detection, MSI report.
Sources: OpenCorporates API (free, no key) + curated seed list fallback.
Run: python pilot_run.py
"""
import asyncio
import json
import sys
import logging
from collections import defaultdict
from datetime import datetime

# Fix Windows cp1252 encoding before importing Rich
sys.stdout.reconfigure(encoding="utf-8")
sys.stderr.reconfigure(encoding="utf-8")

from rich.console import Console
from rich.table import Table
from scrapers.technographic_detector import detect_crm
from analysis.scoring import _tier
from utils.http_client import AsyncHTTPClient

logging.basicConfig(level=logging.WARNING)
console = Console(highlight=False)

# ─────────────────────────────────────────────────────────────────────────────
# Seed companies — real verified European mid-market websites
# Used when OpenCorporates doesn't return a usable website URL
# ─────────────────────────────────────────────────────────────────────────────

SEED_COMPANIES = [
    # (name, country, industry, website)

    # ITALY — Real Estate
    ("Tecnocasa",        "IT", "Real Estate",            "https://www.tecnocasa.it"),
    ("RE/MAX Italy",     "IT", "Real Estate",            "https://www.remax.it"),
    ("Gabetti",          "IT", "Real Estate",            "https://www.gabetti.it"),
    ("Idealista IT",     "IT", "Real Estate",            "https://www.idealista.it"),
    # ITALY — Logistics
    ("BRT Bartolini",    "IT", "Logistics & Transport",  "https://www.brt.it"),
    ("FERCAM",           "IT", "Logistics & Transport",  "https://www.fercam.com"),
    ("Arcese",           "IT", "Logistics & Transport",  "https://www.arcese.com"),
    # ITALY — IT
    ("AlmavivA",         "IT", "IT & Software",          "https://www.almaviva.it"),
    ("Engineering",      "IT", "IT & Software",          "https://www.eng.it"),
    ("Var Group",        "IT", "IT & Software",          "https://www.var.it"),
    ("Softlab",          "IT", "IT & Software",          "https://www.softlab.it"),
    # ITALY — Construction
    ("Salcef Group",     "IT", "Construction",           "https://www.salcef.it"),
    ("Webuild",          "IT", "Construction",           "https://www.webuildgroup.com"),
    ("CMC Cooperativa",  "IT", "Construction",           "https://www.cmc.coop"),

    # POLAND — Real Estate
    ("Morizon",          "PL", "Real Estate",            "https://www.morizon.pl"),
    ("Emmerson Realty",  "PL", "Real Estate",            "https://www.emmerson.pl"),
    ("Home Broker",      "PL", "Real Estate",            "https://www.homebroker.pl"),
    # POLAND — Logistics
    ("Raben Group",      "PL", "Logistics & Transport",  "https://www.raben-group.com"),
    ("Rohlig Suus",      "PL", "Logistics & Transport",  "https://www.rohlig.com"),
    ("ID Logistics PL",  "PL", "Logistics & Transport",  "https://www.id-logistics.com"),
    # POLAND — IT
    ("Comarch",          "PL", "IT & Software",          "https://www.comarch.pl"),
    ("Sygnity",          "PL", "IT & Software",          "https://www.sygnity.pl"),
    ("Asseco Poland",    "PL", "IT & Software",          "https://pl.asseco.com"),
    ("Intive",           "PL", "IT & Software",          "https://www.intive.com"),
    # POLAND — Construction
    ("Polimex-Mostostal","PL", "Construction",           "https://www.polimex.pl"),
    ("Erbud",            "PL", "Construction",           "https://www.erbud.pl"),
    ("Unibep",           "PL", "Construction",           "https://www.unibep.pl"),

    # NETHERLANDS — Real Estate
    ("ERA Netherlands",  "NL", "Real Estate",            "https://www.era.nl"),
    ("MVGM",             "NL", "Real Estate",            "https://www.mvgm.com"),
    ("Vastned",          "NL", "Real Estate",            "https://www.vastned.com"),
    ("Savills NL",       "NL", "Real Estate",            "https://www.savills.nl"),
    # NETHERLANDS — Logistics
    ("VOS Logistics",    "NL", "Logistics & Transport",  "https://www.vos-logistics.com"),
    ("Ewals Cargo",      "NL", "Logistics & Transport",  "https://www.ewals.com"),
    ("Bolk Transport",   "NL", "Logistics & Transport",  "https://www.bolk.nl"),
    # NETHERLANDS — IT
    ("Sogeti NL",        "NL", "IT & Software",          "https://www.sogeti.nl"),
    ("Cegeka NL",        "NL", "IT & Software",          "https://www.cegeka.com"),
    ("Atos NL",          "NL", "IT & Software",          "https://atos.net/nl"),
    ("Ctac",             "NL", "IT & Software",          "https://www.ctac.nl"),
    # NETHERLANDS — Construction
    ("BAM Group",        "NL", "Construction",           "https://www.bam.nl"),
    ("Heijmans",         "NL", "Construction",           "https://www.heijmans.nl"),
    ("VolkerWessels",    "NL", "Construction",           "https://www.volkerwessels.com"),
]


# ─────────────────────────────────────────────────────────────────────────────
# OpenCorporates — free API, no key, adds extra companies
# ─────────────────────────────────────────────────────────────────────────────

OC_SEARCH = "https://api.opencorporates.com/v0.4/companies/search"
OC_JURISDICTION = {"IT": "it", "PL": "pl", "NL": "nl"}
OC_KEYWORDS = {
    "Real Estate":           {"IT": "immobiliare", "PL": "nieruchomosci", "NL": "vastgoed"},
    "Logistics & Transport": {"IT": "trasporti",   "PL": "transport",     "NL": "transport"},
    "IT & Software":         {"IT": "informatica", "PL": "informatyka",   "NL": "software"},
    "Construction":          {"IT": "costruzioni", "PL": "budowlana",     "NL": "bouw"},
}

async def fetch_opencorporates(client, country, industry, per_page=20):
    """Returns list of (name, website_or_none) tuples."""
    jurisdiction = OC_JURISDICTION.get(country, country.lower())
    keyword = OC_KEYWORDS.get(industry, {}).get(country, industry)
    results = []
    try:
        status, body = await client.get(
            OC_SEARCH,
            params={
                "q": keyword,
                "jurisdiction_code": jurisdiction,
                "per_page": per_page,
                "current_status": "Active",
            },
            as_json=True,
        )
        if status == 200:
            for item in body.get("results", {}).get("companies", []):
                co = item.get("company", {})
                name = co.get("name", "")
                website = co.get("website_url") or ""
                if name:
                    results.append((name, website))
    except Exception as e:
        pass  # silently fall back to seed list
    return results


# ─────────────────────────────────────────────────────────────────────────────
# Main
# ─────────────────────────────────────────────────────────────────────────────

async def main():
    console.rule("[bold cyan]CRM Pilot Run — IT / PL / NL")

    all_to_scan = list(SEED_COMPANIES)  # start with seeds

    # Try to augment with OpenCorporates discoveries
    console.print("\n[bold]Fetching extra companies from OpenCorporates...[/bold]")
    async with AsyncHTTPClient(semaphore_limit=4) as client:
        for country in ["IT", "PL", "NL"]:
            for industry in ["Real Estate", "Logistics & Transport", "IT & Software", "Construction"]:
                extras = await fetch_opencorporates(client, country, industry)
                added = 0
                for name, website in extras:
                    if website and website.startswith("http"):
                        all_to_scan.append((name, country, industry, website))
                        added += 1
                if added:
                    console.print(f"  OpenCorporates +{added} for {country}/{industry}")
                await asyncio.sleep(0.5)

    # Deduplicate by website
    seen = set()
    unique = []
    for row in all_to_scan:
        url = row[3]
        if url not in seen:
            seen.add(url)
            unique.append(row)
    all_to_scan = unique

    console.print(f"\n[bold green]Total to scan: {len(all_to_scan)} companies[/bold green]\n")

    # ── CRM Detection ───────────────────────────────────────────────────
    console.rule("[bold]CRM Detection — scanning websites")
    results = []

    async with AsyncHTTPClient(semaphore_limit=6) as client:
        sem = asyncio.Semaphore(6)

        async def scan(name, country, industry, url):
            async with sem:
                det = await detect_crm(client, url)
                return name, country, industry, url, det

        tasks = [scan(*row) for row in all_to_scan]
        total = len(tasks)
        done = 0

        for coro in asyncio.as_completed(tasks):
            try:
                name, country, industry, url, det = await coro
                results.append((name, country, industry, url,
                                 det.crm_name, det.category, det.confidence))
                done += 1
                status_icon = {"Modern": "[green]✓[/green]", "Legacy": "[red]![/red]",
                                "Local": "[yellow]~[/yellow]", "None": "[blue]-[/blue]",
                                "Unknown": "[dim]?[/dim]"}.get(det.category, " ")
                console.print(f"  [{done:02d}/{total}] {status_icon} {name[:30]:<30} "
                               f"{det.crm_name:<22} {det.category} ({det.confidence:.0%})")
            except Exception as e:
                done += 1

    # ── Detection Table ─────────────────────────────────────────────────
    console.rule("[bold]Results")
    t1 = Table(title=f"CRM Detection — {len(results)} European SME Companies",
               show_lines=False, box=None)
    t1.add_column("Company",  style="white",   max_width=26, no_wrap=True)
    t1.add_column("Country",  style="cyan",    width=4)
    t1.add_column("Industry", style="white",   max_width=20, no_wrap=True)
    t1.add_column("CRM Detected",  style="yellow", max_width=24, no_wrap=True)
    t1.add_column("Category",      width=10)
    t1.add_column("Conf", justify="right", width=5)

    cat_colors = {"Modern": "bold green", "Legacy": "bold red",
                  "Local": "bold yellow", "None": "blue", "Unknown": "dim"}
    for name, country, industry, url, crm, cat, conf in sorted(results, key=lambda x: (x[1], x[2])):
        c = cat_colors.get(cat, "white")
        t1.add_row(name[:26], country, industry[:20], crm[:24],
                   f"[{c}]{cat}[/{c}]", f"{conf:.0%}")
    console.print(t1)

    # ── MSI Table ───────────────────────────────────────────────────────
    console.rule("[bold]Market Saturation Index")
    buckets = defaultdict(lambda: {"Modern":0,"Legacy":0,"Local":0,"None":0,"Unknown":0,"total":0})
    for _, country, industry, _, _, cat, _ in results:
        buckets[(country, industry)][cat] += 1
        buckets[(country, industry)]["total"] += 1

    rows = []
    for (country, industry), b in buckets.items():
        n = b["total"]
        if n == 0:
            continue
        p = lambda k: b[k] / n
        msi = round(100 * (1.0*p("Modern") + 0.5*p("Legacy") + 0.5*p("Local")), 1)
        rows.append((msi, country, industry, n, b, p))
    rows.sort(key=lambda x: x[0])

    t2 = Table(title="Market Saturation Index by Country / Industry",
               show_lines=True)
    t2.add_column("Country",  style="cyan",          width=8)
    t2.add_column("Industry", style="white",  max_width=24)
    t2.add_column("n",        justify="right", width=4)
    t2.add_column("Modern",   justify="right", style="green",  width=8)
    t2.add_column("Legacy",   justify="right", style="red",    width=8)
    t2.add_column("Local",    justify="right", style="yellow", width=8)
    t2.add_column("No CRM",   justify="right", style="blue",   width=8)
    t2.add_column("Unknown",  justify="right", style="dim",    width=8)
    t2.add_column("MSI",      justify="right", style="bold",   width=6)
    t2.add_column("Tier",     justify="center",                width=5)

    tier_colors = {"A": "bold green", "B": "bold yellow", "C": "bold red"}
    for msi, country, industry, n, b, p in rows:
        tier = _tier(msi)
        tc = tier_colors.get(tier, "white")
        t2.add_row(
            country, industry[:24], str(n),
            f"{p('Modern'):.0%}", f"{p('Legacy'):.0%}",
            f"{p('Local'):.0%}",  f"{p('None'):.0%}",
            f"{p('Unknown'):.0%}", str(msi),
            f"[{tc}]{tier}[/{tc}]",
        )
    console.print(t2)

    # ── Top Opportunities ────────────────────────────────────────────────
    console.rule("[bold]Top Opportunities (Tier A = whitespace)")
    tier_a = [(c, i, msi, round(p("None")*100)) for msi, c, i, n, b, p in rows if msi < 25]
    tier_b = [(c, i, msi, round(p("None")*100)) for msi, c, i, n, b, p in rows if 25 <= msi < 55]
    tier_c = [(c, i, msi, round(p("None")*100)) for msi, c, i, n, b, p in rows if msi >= 55]

    if tier_a:
        console.print(f"\n[bold green]TIER A — Enter now:[/bold green]")
        for c, i, msi, no_crm in tier_a:
            console.print(f"   {c} / {i:<28} MSI={msi:5.1f}   No-CRM={no_crm}%")
    if tier_b:
        console.print(f"\n[bold yellow]TIER B — Attack Legacy/Local segment:[/bold yellow]")
        for c, i, msi, no_crm in tier_b:
            console.print(f"   {c} / {i:<28} MSI={msi:5.1f}   No-CRM={no_crm}%")
    if tier_c:
        console.print(f"\n[bold red]TIER C — Saturated, avoid:[/bold red]")
        for c, i, msi, no_crm in tier_c:
            console.print(f"   {c} / {i:<28} MSI={msi:5.1f}   No-CRM={no_crm}%")

    # ── Save JSON ────────────────────────────────────────────────────────
    output = {
        "run_at": datetime.utcnow().isoformat(),
        "companies_scanned": len(results),
        "msi": [
            {"country": c, "industry": i, "n": n, "msi": msi, "tier": _tier(msi),
             "pct_modern": round(p("Modern")*100,1), "pct_legacy": round(p("Legacy")*100,1),
             "pct_local":  round(p("Local")*100,1),  "pct_no_crm": round(p("None")*100,1),
             "pct_unknown": round(p("Unknown")*100,1)}
            for msi, c, i, n, b, p in rows
        ],
        "detections": [
            {"company": name, "country": co, "industry": ind,
             "website": url, "crm": crm, "category": cat, "confidence": round(conf, 2)}
            for name, co, ind, url, crm, cat, conf in results
        ]
    }
    with open("pilot_results.json", "w", encoding="utf-8") as f:
        json.dump(output, f, indent=2, ensure_ascii=False)

    console.print(f"\n[bold]Full results saved to pilot_results.json[/bold]")
    console.rule("[bold cyan]Done")


asyncio.run(main())
