#!/usr/bin/env python3
"""
Instagram Content Generator CLI
Usage:
  python cli.py plan              — show full 60-day plan
  python cli.py plan --day 5      — show day 5 details
  python cli.py generate 5        — type your idea, generate content
  python cli.py generate 5 --voice     — record voice, generate content
  python cli.py generate 5 --file note.wav  — transcribe file, generate
  python cli.py render 5          — render images for day 5
  python cli.py full 5            — generate + render in one shot
  python cli.py full 5 --voice    — voice → generate → render
  python cli.py caption 5         — print caption for day 5 (if already generated)
"""

import os
import sys
import io
import json
import typer
from rich.console import Console

# Force UTF-8 on Windows to handle emojis in terminal
if sys.stdout.encoding and sys.stdout.encoding.lower() != "utf-8":
    sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding="utf-8", errors="replace")
    sys.stderr = io.TextIOWrapper(sys.stderr.buffer, encoding="utf-8", errors="replace")
from rich.table import Table
from rich.panel import Panel
from rich.text import Text
from rich import box
from typing import Optional

# Make sure we can import sibling modules
sys.path.insert(0, os.path.dirname(__file__))

import config as cfg
from plan_data import PLAN, get_day, HASHTAG_SETS
from content import generate
from renderer import render

app     = typer.Typer(help="📸 Instagram Content Generator for IT companies")
console = Console()

TYPE_COLOR = {
    "carousel": "cyan",
    "static":   "green",
    "reel":     "magenta",
    "story":    "yellow",
}
PHASE_COLOR = {"foundation": "blue", "sell": "red"}


# ── plan ─────────────────────────────────────────────────────────────────────

@app.command()
def plan(day: Optional[int] = typer.Option(None, "--day", "-d", help="Show details for one day")):
    """Show the 60-day Instagram plan."""
    if day:
        _show_day(day)
    else:
        _show_full_plan()


def _show_full_plan():
    console.print(f"\n[bold]📸 60-Day Instagram Plan — {cfg.COMPANY}[/bold]\n")
    table = Table(box=box.ROUNDED, show_header=True, header_style="bold dim")
    table.add_column("Day",   width=5)
    table.add_column("Wk",    width=4)
    table.add_column("Phase", width=12)
    table.add_column("Type",  width=10)
    table.add_column("Topic", width=36)
    table.add_column("Hook",  width=50)

    prev_week = 0
    for d in PLAN:
        if d["week"] != prev_week:
            table.add_section()
            prev_week = d["week"]
        tc = TYPE_COLOR.get(d["type"], "white")
        pc = PHASE_COLOR.get(d["phase"], "white")
        table.add_row(
            str(d["day"]),
            str(d["week"]),
            f"[{pc}]{d['phase']}[/{pc}]",
            f"[{tc}]{d['type']}[/{tc}]",
            d["topic"][:36],
            f"[dim]{d['hook'][:50]}[/dim]",
        )
    console.print(table)
    console.print("\n[dim]Run: python cli.py plan --day N   for full day details[/dim]")
    console.print("[dim]Run: python cli.py full N          to generate + render day N[/dim]\n")


def _show_day(day: int):
    d = get_day(day)
    if not d:
        console.print(f"[red]Day {day} not found[/red]")
        raise typer.Exit(1)
    tc = TYPE_COLOR.get(d["type"], "white")
    pc = PHASE_COLOR.get(d["phase"], "white")
    console.print(Panel(
        f"[bold]Day {d['day']}  /  Week {d['week']}[/bold]\n"
        f"Phase     : [{pc}]{d['phase']}[/{pc}]\n"
        f"Type      : [{tc}]{d['type']}[/{tc}]\n"
        f"Topic     : {d['topic']}\n\n"
        f"[bold]Direction:[/bold]\n{d['direction']}\n\n"
        f"[bold cyan]Hook:[/bold cyan]\n{d['hook']}\n\n"
        f"[bold green]CTA:[/bold green]\n{d['cta']}",
        title=f"📅 Day {day} Plan", border_style="blue",
    ))
    console.print(f"\n[dim]Run: python cli.py full {day}[/dim]  to generate + render\n")


# ── generate ─────────────────────────────────────────────────────────────────

@app.command()
def generate_cmd(
    day:   int  = typer.Argument(..., help="Day number 1–60"),
    voice: bool = typer.Option(False, "--voice", "-v", help="Record voice note"),
    file:  Optional[str] = typer.Option(None, "--file", "-f", help="Path to audio file to transcribe"),
):
    """Generate content for a day (type your idea, record voice, or transcribe a file)."""
    day_data = get_day(day)
    if not day_data:
        console.print(f"[red]Day {day} not found in plan[/red]")
        raise typer.Exit(1)

    _show_day(day)

    idea = _get_idea(voice, file, day_data)
    if not idea:
        raise typer.Exit(1)

    console.print(f"\n[dim]Generating {day_data['type']} content for day {day}...[/dim]")
    content = generate(day, idea)
    _print_content(content, day_data)
    console.print(f"\n[green]✓ Saved to output/day_{day:02d}/content.json[/green]")


# ── render ────────────────────────────────────────────────────────────────────

@app.command()
def render_cmd(day: int = typer.Argument(..., help="Day number 1–60")):
    """Render images for a previously generated day."""
    json_path = os.path.join(cfg.OUTPUT_DIR, f"day_{day:02d}", "content.json")
    if not os.path.exists(json_path):
        console.print(f"[red]No content found for day {day}. Run: python cli.py generate {day} first.[/red]")
        raise typer.Exit(1)
    with open(json_path, encoding="utf-8") as f:
        content = json.load(f)
    out_dir = os.path.join(cfg.OUTPUT_DIR, f"day_{day:02d}")
    console.print(f"\n[dim]Rendering {content['type']} for day {day}...[/dim]")
    render(content, out_dir)
    console.print(f"\n[green]✓ Files saved to {out_dir}[/green]\n")


# ── full (generate + render in one shot) ──────────────────────────────────────

@app.command()
def full(
    day:   int  = typer.Argument(..., help="Day number 1–60"),
    voice: bool = typer.Option(False, "--voice", "-v", help="Record voice note"),
    file:  Optional[str] = typer.Option(None, "--file", "-f", help="Path to audio file to transcribe"),
):
    """Generate content + render images in one shot."""
    day_data = get_day(day)
    if not day_data:
        console.print(f"[red]Day {day} not found in plan[/red]")
        raise typer.Exit(1)

    _show_day(day)
    idea = _get_idea(voice, file, day_data)
    if not idea:
        raise typer.Exit(1)

    console.print(f"\n[dim]Generating content...[/dim]")
    content = generate(day, idea)
    _print_content(content, day_data)

    console.print(f"\n[dim]Rendering images...[/dim]")
    out_dir = os.path.join(cfg.OUTPUT_DIR, f"day_{day:02d}")
    render(content, out_dir)

    console.print(f"\n[bold green]✅ Day {day} done![/bold green]")
    console.print(f"   Files → {os.path.abspath(out_dir)}\n")


# ── batch (auto-generate all days) ───────────────────────────────────────────

@app.command()
def batch(
    start: int = typer.Option(1,    "--start", "-s", help="First day to generate"),
    end:   int = typer.Option(60,   "--end",   "-e", help="Last day to generate"),
    force: bool = typer.Option(False, "--force", "-f", help="Overwrite existing days"),
):
    """Auto-generate + render all days using each day's direction as the idea."""
    days = [d for d in PLAN if start <= d["day"] <= end]
    console.print(f"\n[bold]Batch generating days {start}–{end} ({len(days)} days)[/bold]\n")

    ok = skipped = failed = 0
    for d in days:
        day_num = d["day"]
        json_path = os.path.join(cfg.OUTPUT_DIR, f"day_{day_num:02d}", "content.json")
        if os.path.exists(json_path) and not force:
            console.print(f"  [dim]Day {day_num:02d}  SKIP  (already exists — use --force to overwrite)[/dim]")
            skipped += 1
            continue
        try:
            idea = d["direction"]
            content = generate(day_num, idea)
            out_dir = os.path.join(cfg.OUTPUT_DIR, f"day_{day_num:02d}")
            render(content, out_dir)
            console.print(f"  [green]Day {day_num:02d}  OK    {d['type']:10s}  {d['topic'][:40]}[/green]")
            ok += 1
        except Exception as exc:
            console.print(f"  [red]Day {day_num:02d}  FAIL  {exc}[/red]")
            failed += 1

    console.print(f"\n[bold]Done — {ok} generated, {skipped} skipped, {failed} failed[/bold]\n")


# ── caption ───────────────────────────────────────────────────────────────────

@app.command()
def caption(day: int = typer.Argument(..., help="Day number 1–60")):
    """Print the caption for a day (if already generated)."""
    cap_path = os.path.join(cfg.OUTPUT_DIR, f"day_{day:02d}", "caption.txt")
    if not os.path.exists(cap_path):
        console.print(f"[red]No caption found. Run: python cli.py full {day} first.[/red]")
        raise typer.Exit(1)
    console.print(Panel(open(cap_path, encoding="utf-8").read(),
                        title=f"📋 Day {day} Caption", border_style="cyan"))


# ── helpers ───────────────────────────────────────────────────────────────────

def _get_idea(voice: bool, file: Optional[str], day_data: dict) -> str:
    if file:
        from transcribe import transcribe_file
        console.print(f"\n[cyan]Transcribing {file}...[/cyan]")
        idea = transcribe_file(file)
        if idea:
            console.print(f"\n[green]Transcript:[/green] {idea}\n")
        return idea

    if voice:
        from transcribe import record_and_transcribe
        idea = record_and_transcribe(duration=60)
        if idea:
            console.print(f"\n[green]Transcript:[/green] {idea}\n")
        return idea

    # Text input
    console.print(f"\n[bold]Your idea for Day {day_data['day']}: {day_data['topic']}[/bold]")
    console.print(f"[dim]Direction: {day_data['direction']}[/dim]")
    console.print("[yellow]Type or paste your idea below (press Enter twice when done):[/yellow]\n")
    lines = []
    try:
        while True:
            line = input()
            if line == "" and lines and lines[-1] == "":
                break
            lines.append(line)
    except EOFError:
        pass
    return " ".join(l for l in lines if l).strip()


def _print_content(content: dict, day_data: dict):
    t = content.get("type")
    console.print(f"\n[bold]Generated {t} content:[/bold]\n")

    if t == "carousel":
        for s in content.get("slides", []):
            icon = "🎯" if s["type"] == "hook" else "📢" if s["type"] == "cta" else "•"
            console.print(f"  {icon} [bold]Slide {s['number']}:[/bold] {s['text']}")
            if s.get("subtext"):
                console.print(f"       [dim]{s['subtext']}[/dim]")

    elif t == "static":
        console.print(f"  [bold cyan]Hook:[/bold cyan]    {content.get('hook','')}")
        console.print(f"  [bold]Body:[/bold]    {content.get('body','')}")
        console.print(f"  [dim]Subtext: {content.get('subtext','')}[/dim]")
        console.print(f"  [green]CTA:[/green]     {content.get('cta','')}")

    elif t == "story":
        console.print(f"  Frame 1: {content.get('frame1','')}")
        console.print(f"  Frame 2: {content.get('frame2','')}")
        console.print(f"  Frame 3: {content.get('frame3','')}")

    elif t == "reel":
        for line in content.get("script", []):
            console.print(f"  {line}")

    console.print(f"\n  [dim]Caption preview:[/dim]")
    preview = content.get("caption", "")[:200]
    console.print(f"  [dim]{preview}...[/dim]" if len(content.get("caption","")) > 200 else f"  [dim]{preview}[/dim]")


if __name__ == "__main__":
    app()
