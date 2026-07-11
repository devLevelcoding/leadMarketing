#!/usr/bin/env python3
"""
Instagram Reel Builder
======================
Enforces Instagram Reels specs automatically:
  • 9:16 aspect ratio  (1080 × 1920 px)
  • 1080 × 1920 resolution  (Full HD vertical — NOT 4K)
  • 30 fps  (default) or 60 fps  (--fps 60)
  • MP4 container / H.264 (libx264) codec
  • AAC audio @ 192 kbps

Workflow:
  1. [Optional] Concat intro.mp4 + main clip
  2. [Optional] Mix voiceover + background music
  3. Re-encode to Instagram-safe spec → output MP4

Usage:
  python build_reel.py                           — full build with defaults
  python build_reel.py --fps 60                  — 60 fps (UI/screen content)
  python build_reel.py --no-intro                — skip intro clip
  python build_reel.py --no-audio                — video only, no voice/bg
  python build_reel.py --bg-vol 0.08             — quieter background
  python build_reel.py --out my_reel             — custom output filename
  python build_reel.py --main clip.mp4 --no-intro --no-audio  — single clip convert
"""

import os, subprocess, shutil, typer, tempfile
from rich.console import Console
from rich.panel import Panel
from rich.progress import Progress, SpinnerColumn, TextColumn
from typing import Optional
from pathlib import Path

app     = typer.Typer(help="🎬 Instagram Reel Builder — enforces IG specs automatically")
console = Console()

HERE       = os.path.dirname(os.path.abspath(__file__))
OUTPUT_DIR = os.path.join(HERE, "..", "output", "reels")

DEFAULT_INTRO  = os.path.join(HERE, "intro.mp4")
DEFAULT_MAIN   = os.path.join(HERE, "insta.mp4")
DEFAULT_VOICE  = os.path.join(HERE, "audio_script.m4a")
DEFAULT_BG     = os.path.join(HERE, "background.mp3")

# ── Instagram Reels spec constants ─────────────────────────────────────────────
IG_WIDTH  = 1080
IG_HEIGHT = 1920
IG_CRF    = 18       # Constant Rate Factor — lower = better quality (18 is near-lossless)
IG_PRESET = "slow"   # slow = better compression at same quality (worth the extra seconds)
IG_AUDIO  = "192k"   # Instagram accepts up to 320k; 192k is the sweet spot


def _ffmpeg() -> str:
    for candidate in [
        os.path.join(HERE, "..", "ffmpeg.exe"),
        os.path.join(HERE, "ffmpeg.exe"),
    ]:
        if os.path.exists(candidate):
            return candidate
    f = shutil.which("ffmpeg")
    if not f:
        console.print("[red]ffmpeg not found.\n"
                      "Download from https://ffmpeg.org/download.html and put ffmpeg.exe in generator/[/red]")
        raise typer.Exit(1)
    return f


def _ffprobe() -> Optional[str]:
    for candidate in [
        os.path.join(HERE, "..", "ffprobe.exe"),
        os.path.join(HERE, "ffprobe.exe"),
    ]:
        if os.path.exists(candidate):
            return candidate
    return shutil.which("ffprobe")


def _duration(path: str) -> float:
    probe = _ffprobe()
    if not probe or not os.path.exists(path):
        return 0.0
    r = subprocess.run(
        [probe, "-v", "quiet", "-print_format", "compact",
         "-show_entries", "format=duration", path],
        capture_output=True, text=True
    )
    for line in r.stdout.splitlines():
        if "duration=" in line:
            try:
                return float(line.split("duration=")[1])
            except Exception:
                pass
    return 0.0


def _fmt(s: float) -> str:
    if s <= 0:
        return "?"
    m, sec = divmod(int(s), 60)
    return f"{m}m{sec:02d}s"


def _run(cmd: list, label: str):
    with Progress(SpinnerColumn(), TextColumn(f"[cyan]{label}...[/cyan]"), transient=True) as p:
        p.add_task("")
        result = subprocess.run(cmd, capture_output=True, text=True, encoding="utf-8", errors="replace")
    if result.returncode != 0:
        console.print(f"[red]✗ {label} failed:\n{result.stderr[-1200:]}[/red]")
        raise typer.Exit(1)


def _ig_scale_filter(fps: int) -> str:
    """Build ffmpeg filter that forces 1080×1920, correct SAR, and target fps."""
    return (
        f"scale={IG_WIDTH}:{IG_HEIGHT}:force_original_aspect_ratio=increase,"
        f"crop={IG_WIDTH}:{IG_HEIGHT},"
        f"setsar=1,"
        f"fps={fps}"
    )


@app.command()
def build(
    intro:    str           = typer.Option(DEFAULT_INTRO,  "--intro",    "-i",   help="Intro clip (MP4)"),
    main:     str           = typer.Option(DEFAULT_MAIN,   "--main",     "-m",   help="Main clip (MP4)"),
    voice:    str           = typer.Option(DEFAULT_VOICE,  "--voice",    "-v",   help="Voiceover file (.m4a/.mp3/.wav)"),
    bg:       str           = typer.Option(DEFAULT_BG,     "--bg",       "-b",   help="Background music (.mp3/.m4a)"),
    bg_vol:   float         = typer.Option(0.15,           "--bg-vol",           help="Background volume 0.0–1.0"),
    fps:      int           = typer.Option(30,             "--fps",              help="Frame rate: 30 (talking head) or 60 (screen/UI)"),
    no_intro: bool          = typer.Option(False,          "--no-intro",         help="Skip intro clip — use main clip only"),
    no_audio: bool          = typer.Option(False,          "--no-audio",         help="Output video only — no voice or background"),
    out:      Optional[str] = typer.Option(None,           "--out",      "-o",   help="Output filename (without .mp4)"),
):
    """
    Build an Instagram-ready Reel.

    Automatically enforces:  1080×1920 · 9:16 · H.264 · AAC 192k · 30 or 60 fps
    """

    if fps not in (30, 60):
        console.print("[red]--fps must be 30 or 60[/red]")
        raise typer.Exit(1)

    # ── Validate required inputs ──────────────────────────────────────────────
    required = [("main", main)]
    if not no_intro:
        required.append(("intro", intro))
    if not no_audio:
        required += [("voice", voice), ("bg", bg)]

    missing = [(label, path) for label, path in required if not os.path.exists(path)]
    if missing:
        for label, path in missing:
            console.print(f"[red]Not found ({label}): {path}[/red]")
        console.print("\n[yellow]Tip:[/yellow] Use [bold]--no-intro[/bold] to skip intro, "
                      "[bold]--no-audio[/bold] to skip voice/bg mix.")
        raise typer.Exit(1)

    os.makedirs(OUTPUT_DIR, exist_ok=True)
    out_name    = (out or "reel_final")
    if not out_name.endswith(".mp4"):
        out_name += ".mp4"
    output_path = os.path.join(OUTPUT_DIR, out_name)

    ff      = _ffmpeg()
    scale_f = _ig_scale_filter(fps)

    # ── Print build plan ──────────────────────────────────────────────────────
    lines = []
    if not no_intro:
        lines.append(f"[bold]Intro:[/bold]      {os.path.basename(intro)}  ({_fmt(_duration(intro))})")
    lines.append(    f"[bold]Main:[/bold]       {os.path.basename(main)}   ({_fmt(_duration(main))})")
    if not no_audio:
        lines.append(f"[bold]Voiceover:[/bold]  {os.path.basename(voice)}  ({_fmt(_duration(voice))})")
        lines.append(f"[bold]Background:[/bold] {os.path.basename(bg)}     vol={int(bg_vol*100)}%")
    lines.append(    f"[bold]Output spec:[/bold] {IG_WIDTH}×{IG_HEIGHT} · {fps}fps · H.264 CRF{IG_CRF} · AAC {IG_AUDIO}")
    lines.append(    f"[bold]Output:[/bold]     {output_path}")
    console.print(Panel("\n".join(lines), title="🎬 Reel Builder — Instagram Spec", border_style="cyan"))

    with tempfile.TemporaryDirectory() as tmp:

        # ── Step 1: Scale + (optionally) concat ──────────────────────────────
        if no_intro:
            # Single clip — just re-encode to IG spec
            console.print("\n[bold]Step 1/2[/bold] — Scaling to 1080×1920...")
            scaled_path = os.path.join(tmp, "scaled.mp4")
            _run([
                ff, "-y", "-i", main,
                "-vf", scale_f,
                "-c:v", "libx264", "-crf", str(IG_CRF), "-preset", IG_PRESET,
                "-pix_fmt", "yuv420p",
                "-an",  # strip audio — will be added in step 2 (or skipped)
                scaled_path,
            ], f"Scaling to {IG_WIDTH}×{IG_HEIGHT} @ {fps}fps")
            console.print(f"   [green]✓[/green] Scaled  ({_fmt(_duration(scaled_path))})")
            video_path = scaled_path
        else:
            # Concat intro + main, both scaled to IG spec
            console.print("\n[bold]Step 1/2[/bold] — Concatenating intro + main → 1080×1920...")
            concat_path = os.path.join(tmp, "concat.mp4")
            fc = (
                f"[0:v]{scale_f}[v0];"
                f"[1:v]{scale_f}[v1];"
                f"[v0][v1]concat=n=2:v=1:a=0[vout]"
            )
            _run([
                ff, "-y", "-i", intro, "-i", main,
                "-filter_complex", fc,
                "-map", "[vout]",
                "-c:v", "libx264", "-crf", str(IG_CRF), "-preset", IG_PRESET,
                "-pix_fmt", "yuv420p",
                concat_path,
            ], f"Joining clips → {IG_WIDTH}×{IG_HEIGHT} @ {fps}fps")
            console.print(f"   [green]✓[/green] Concat done  ({_fmt(_duration(concat_path))})")
            video_path = concat_path

        # ── Step 2: Audio mix (or copy video-only) ────────────────────────────
        console.print(f"\n[bold]Step 2/2[/bold] — {'Mixing audio' if not no_audio else 'Finalising (video only)'}...")

        if no_audio:
            # Video only — copy stream, add silent audio track so IG is happy
            _run([
                ff, "-y", "-i", video_path,
                "-f", "lavfi", "-i", "anullsrc=channel_layout=stereo:sample_rate=44100",
                "-c:v", "copy",
                "-c:a", "aac", "-b:a", IG_AUDIO,
                "-shortest",
                output_path,
            ], "Finalising (silent audio track)")
        else:
            fc_audio = (
                f"[1:a]volume=1.0[voice];"
                f"[2:a]volume={bg_vol}[bgm];"
                f"[voice][bgm]amix=inputs=2:duration=first:dropout_transition=2[aout]"
            )
            _run([
                ff, "-y",
                "-i", video_path,
                "-i", voice,
                "-i", bg,
                "-filter_complex", fc_audio,
                "-map", "0:v",
                "-map", "[aout]",
                "-c:v", "copy",
                "-c:a", "aac", "-b:a", IG_AUDIO,
                "-shortest",
                output_path,
            ], f"Mixing voice (100%) + background ({int(bg_vol*100)}%)")

    # ── Done ──────────────────────────────────────────────────────────────────
    size_mb  = os.path.getsize(output_path) / (1024 * 1024)
    duration = _duration(output_path)

    console.print(Panel(
        f"[bold green]Reel ready![/bold green]\n\n"
        f"[bold]File:[/bold]      [cyan]{output_path}[/cyan]\n"
        f"[bold]Duration:[/bold]  {_fmt(duration)}\n"
        f"[bold]Size:[/bold]      {size_mb:.1f} MB\n"
        f"[bold]Spec:[/bold]      {IG_WIDTH}×{IG_HEIGHT} · {fps}fps · H.264 CRF{IG_CRF} · AAC {IG_AUDIO}\n\n"
        f"[dim]Upload directly to Instagram Reels — no further conversion needed.[/dim]",
        title="✅ Done!", border_style="green"
    ))


if __name__ == "__main__":
    app()
