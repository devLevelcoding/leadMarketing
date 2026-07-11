"""
CLI entry-point.

Usage examples:
  python main.py run --countries IT,PL,NL
  python main.py run --countries IT --industries "Logistics & Transport,Real Estate"
  python main.py report
  python main.py report --top 30
  python main.py detect --url https://example.com
"""
from __future__ import annotations
import asyncio
import logging
import sys
from typing import Optional

import click
from rich.console import Console
from rich.table import Table
from dotenv import load_dotenv

load_dotenv()

import config
from pipeline.orchestrator import Pipeline
from database.models import create_all_tables, get_engine, get_session_factory
from analysis.scoring import top_opportunities

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(name)s — %(message)s",
    handlers=[logging.StreamHandler(sys.stdout)],
)

console = Console()


@click.group()
def cli():
    """CRM Market Saturation Pipeline"""


@cli.command()
@click.option("--countries", default=",".join(config.PILOT_COUNTRIES),
              help="Comma-separated ISO-2 country codes (default: IT,PL,NL)")
@click.option("--industries", default=None,
              help="Comma-separated industry names. Default: all configured industries.")
def run(countries: str, industries: Optional[str]):
    """Discover companies, detect CRMs, scrape job boards, compute MSI."""
    country_list = [c.strip().upper() for c in countries.split(",")]
    industry_list = [i.strip() for i in industries.split(",")] if industries else None

    console.rule("[bold green]CRM Pipeline starting")
    console.print(f"Countries: {country_list}")
    console.print(f"Industries: {industry_list or 'all'}")

    pipeline = Pipeline(countries=country_list, industries=industry_list)
    asyncio.run(pipeline.run())

    console.rule("[bold green]Done")


@cli.command()
@click.option("--top", default=20, show_default=True, help="Number of top opportunities to display")
def report(top: int):
    """Print the Market Saturation Index report."""
    engine = get_engine()
    create_all_tables(engine)
    SessionFactory = get_session_factory(engine)

    with SessionFactory() as session:
        df = top_opportunities(session, top_n=top)

    if df.empty:
        console.print("[red]No data found. Run `python main.py run` first.")
        return

    table = Table(title=f"Top {top} CRM Market Opportunities", show_lines=True)
    for col in df.columns:
        table.add_column(col, style="cyan" if col == "tier" else "white")

    for _, row in df.iterrows():
        tier_color = {"A": "bold green", "B": "yellow", "C": "red"}.get(str(row.get("tier", "")), "white")
        values = []
        for col in df.columns:
            v = row[col]
            if col == "tier":
                values.append(f"[{tier_color}]{v}[/{tier_color}]")
            elif isinstance(v, float):
                values.append(f"{v:.1f}")
            else:
                values.append(str(v))
        table.add_row(*values)

    console.print(table)


@cli.command()
@click.argument("url")
def detect(url: str):
    """Run CRM detection on a single URL and print results."""
    from utils.http_client import AsyncHTTPClient
    from scrapers.technographic_detector import detect_crm

    async def _run():
        async with AsyncHTTPClient() as client:
            result = await detect_crm(client, url)
        console.print(f"\n[bold]URL:[/bold] {url}")
        console.print(f"[bold]CRM:[/bold]        {result.crm_name}")
        console.print(f"[bold]Category:[/bold]   {result.category}")
        console.print(f"[bold]Confidence:[/bold] {result.confidence:.0%}")
        console.print(f"[bold]Method:[/bold]     {result.method}")
        console.print(f"[bold]Signals:[/bold]    {result.signals}")

    asyncio.run(_run())


if __name__ == "__main__":
    cli()
