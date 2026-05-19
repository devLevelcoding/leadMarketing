#!/usr/bin/env python3
"""
Reel Pipeline — one command, full workflow
Guides you step by step: record → clean audio → merge → subtitles → final reel

Usage:
  python pipeline.py                        — interactive wizard
  python pipeline.py --video existing.mp4   — skip recording, use existing video
  python pipeline.py --skip-clean           — skip noise canceling
  python pipeline.py --skip-subtitles       — no subtitles
  python pipeline.py --lang ro              — Romanian audio for subtitles
"""

import os
import sys
import subprocess
import shutil
import typer
from rich.console import Console
from rich.panel import Panel
from rich.prompt import Prompt, Confirm
from rich.table import Table
from typing import Optional
from pathlib import Path
from datetime import datetime

app     = typer.Typer(help="🎬 Reel Pipeline — full workflow")
console = Console()

HERE       = os.path.dirname(os.path.abspath(__file__))
OUTPUT_DIR = os.path.join(HERE, "..", "output", "reels")
VENV_PY    = os.path.join(HERE, "..", ".venv", "Scripts", "python.exe")

# Use venv python if available, else system python
PYTHON = VENV_PY if os.path.exists(VENV_PY) else sys.executable


def _step(n: int, title: str):
    console.print(f"\n[bold cyan]── Step {n}: {title} ──────────────────────────────[/bold cyan]")


def _run(script: str, args: list[str]) -> bool:
    script_path = os.path.join(HERE, script)
    cmd = [PYTHON, script_path] + args
    result = subprocess.run(cmd)
    return result.returncode == 0


def _pick_file(prompt: str, default: Optional[str] = None) -> str:
    while True:
        path = Prompt.ask(prompt, default=default or "")
        if path and os.path.exists(path):
            return path
        console.print("[red]File not found. Try again.[/red]")


def _latest_in(folder: str, ext: str) -> Optional[str]:
    if not os.path.isdir(folder):
        return None
    files = [f for f in os.listdir(folder) if f.endswith(ext)]
    if not files:
        return None
    files.sort(key=lambda f: os.path.getmtime(os.path.join(folder, f)), reverse=True)
    return os.path.join(folder, files[0])


def _summary_table(steps: dict):
    t = Table(show_header=False, box=None, padding=(0, 2))
    t.add_column("step",  style="dim")
    t.add_column("file",  style="cyan")
    t.add_column("status", style="green")
    for name, (path, ok) in steps.items():
        status = "✅" if ok else "⏭ skipped"
        t.add_row(name, path or "-", status)
    console.print(t)


@app.command()
def pipeline(
    video:            Optional[str] = typer.Option(None,  "--video",          "-v", help="Existing video (skip recording)"),
    audio:            Optional[str] = typer.Option(None,  "--audio",          "-a", help="Existing audio (skip recording)"),
    skip_clean:       bool          = typer.Option(False, "--skip-clean",            help="Skip noise canceling"),
    skip_subtitles:   bool          = typer.Option(False, "--skip-subtitles",        help="Skip subtitle generation"),
    lang:             Optional[str] = typer.Option(None,  "--lang",           "-l", help="Subtitle language code"),
    model:            str           = typer.Option("base","--model",                help="Whisper model: tiny|base|small"),
    subtitle_style:   str           = typer.Option("big", "--subtitle-style",       help="big|normal|clean"),
    name:             Optional[str] = typer.Option(None,  "--name",           "-n", help="Project name for output files"),
):
    """Full reel pipeline: record → clean → merge → subtitle → final."""

    os.makedirs(OUTPUT_DIR, exist_ok=True)
    ts      = datetime.now().strftime("%Y%m%d_%H%M%S")
    project = name or ts
    steps   = {}

    console.print(Panel(
        "[bold]Reel Pipeline[/bold]\n\n"
        "Steps: 1. Record screen  2. Record audio  3. Clean audio\n"
        "       4. Merge video+audio  5. Add subtitles  6. Final reel\n\n"
        "[dim]Press Enter to accept defaults. Ctrl+C to quit.[/dim]",
        title="🎬 levelcoding Reel Pipeline", border_style="blue"
    ))

    recordings_dir = os.path.join(HERE, "..", "output", "recordings")

    # ── Step 1: Video ──────────────────────────────────────────────────────────
    _step(1, "Screen Recording")
    if video:
        video_path = video
        console.print(f"[dim]Using existing video: {video_path}[/dim]")
        steps["video"] = (video_path, True)
    else:
        if Confirm.ask("Record screen now?", default=True):
            duration = int(Prompt.ask("Duration (seconds)", default="60"))
            out_name = f"{project}_screen"
            _run("record.py", ["--time", str(duration), "--out", out_name])
            video_path = os.path.join(recordings_dir, f"{out_name}.mp4")
            steps["video"] = (video_path, os.path.exists(video_path))
        else:
            video_path = _pick_file("Path to video file")
            steps["video"] = (video_path, True)

    if not os.path.exists(video_path):
        console.print("[red]No video file. Aborting.[/red]")
        raise typer.Exit(1)

    # ── Step 2: Audio ──────────────────────────────────────────────────────────
    _step(2, "Audio Recording")
    use_separate_audio = False
    audio_path = None

    if audio:
        audio_path = audio
        use_separate_audio = True
        console.print(f"[dim]Using existing audio: {audio_path}[/dim]")
        steps["audio"] = (audio_path, True)
    elif Confirm.ask("Record separate microphone audio?", default=False):
        duration = int(Prompt.ask("Duration (seconds)", default="60"))
        out_name = f"{project}_audio"
        _run("record_audio.py", ["--time", str(duration), "--out", out_name])
        audio_path = os.path.join(recordings_dir, f"{out_name}.wav")
        use_separate_audio = os.path.exists(audio_path)
        steps["audio"] = (audio_path, use_separate_audio)
    else:
        console.print("[dim]Using audio from video.[/dim]")
        steps["audio"] = ("(from video)", True)

    # ── Step 3: Clean Audio ────────────────────────────────────────────────────
    _step(3, "Noise Canceling")
    clean_path = video_path

    if skip_clean:
        console.print("[dim]Skipped.[/dim]")
        steps["clean"] = (clean_path, False)
    elif Confirm.ask("Clean audio (remove background noise)?", default=True):
        audio_dir    = os.path.join(HERE, "..", "output", "audio")
        clean_target = audio_path if use_separate_audio else video_path
        clean_name   = f"{project}_clean"
        _run("clean_audio.py", [clean_target, "--preset", "reel", "--out", clean_name])
        ext          = ".wav" if use_separate_audio else ".mp4"
        clean_result = os.path.join(audio_dir, f"{clean_name}_clean{ext}" if not clean_name.endswith(ext) else clean_name + ext)
        # find the output by stem
        stem_clean   = clean_name
        found        = None
        for f in os.listdir(audio_dir) if os.path.isdir(audio_dir) else []:
            if f.startswith(stem_clean):
                found = os.path.join(audio_dir, f)
                break
        if found and os.path.exists(found):
            if use_separate_audio:
                audio_path = found
            else:
                clean_path = found
            steps["clean"] = (found, True)
        else:
            console.print("[yellow]Clean output not found — using original.[/yellow]")
            steps["clean"] = (clean_target, False)
    else:
        console.print("[dim]Skipped.[/dim]")
        steps["clean"] = (clean_path, False)

    # ── Step 4: Merge Video + Audio ────────────────────────────────────────────
    _step(4, "Merge Video + Audio")
    merged_path = clean_path

    if use_separate_audio and audio_path:
        merge_name = f"{project}_merged"
        ok = _run("merge_av.py", [clean_path, audio_path, "--out", merge_name])
        merged_dir  = os.path.join(HERE, "..", "output", "merged")
        found_merge = os.path.join(merged_dir, f"{merge_name}.mp4")
        if ok and os.path.exists(found_merge):
            merged_path = found_merge
            steps["merge"] = (merged_path, True)
        else:
            console.print("[yellow]Merge output not found — using clean video.[/yellow]")
            steps["merge"] = (merged_path, False)
    else:
        console.print("[dim]No separate audio — skipped merge.[/dim]")
        steps["merge"] = ("(no separate audio)", False)

    # ── Step 5: Subtitles ──────────────────────────────────────────────────────
    _step(5, "Subtitles")
    final_path = merged_path

    if skip_subtitles:
        console.print("[dim]Skipped.[/dim]")
        steps["subtitles"] = (final_path, False)
    elif Confirm.ask("Generate & burn subtitles?", default=True):
        lang_arg  = ["--lang", lang] if lang else []
        sub_name  = f"{project}_final"
        sub_args  = [merged_path, "--burn", "--model", model,
                     "--style", subtitle_style, "--out", sub_name] + lang_arg
        ok = _run("subtitle.py", sub_args)
        sub_dir    = os.path.join(HERE, "..", "output", "subtitled")
        found_sub  = os.path.join(sub_dir, f"{sub_name}.mp4")
        if ok and os.path.exists(found_sub):
            final_path = found_sub
            steps["subtitles"] = (final_path, True)
        else:
            console.print("[yellow]Subtitle output not found — using merged video.[/yellow]")
            steps["subtitles"] = (merged_path, False)
    else:
        console.print("[dim]Skipped.[/dim]")
        steps["subtitles"] = (final_path, False)

    # ── Step 6: Copy to reels output ──────────────────────────────────────────
    _step(6, "Final Reel")
    final_dest = os.path.join(OUTPUT_DIR, f"{project}_reel.mp4")
    shutil.copy2(final_path, final_dest)

    size_mb = os.path.getsize(final_dest) / (1024*1024)
    console.print(Panel(
        f"[bold green]Reel ready![/bold green]\n\n"
        f"[bold]File:[/bold] [cyan]{final_dest}[/cyan]\n"
        f"[bold]Size:[/bold] {size_mb:.1f} MB",
        title="✅ Pipeline Complete", border_style="green"
    ))

    console.print("\n[bold]Pipeline summary:[/bold]")
    _summary_table(steps)
    console.print(f"\n[dim]Upload:[/dim] [cyan]{final_dest}[/cyan]\n")


if __name__ == "__main__":
    app()
