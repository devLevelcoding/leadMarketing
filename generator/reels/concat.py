#!/usr/bin/env python3
"""
Clip Concatenator — join multiple video clips into one reel
Normalizes resolution and framerate so all clips match.

Usage:
  python concat.py clip1.mp4 clip2.mp4 clip3.mp4
  python concat.py clip*.mp4 --trim 4          — use first 4s from each clip
  python concat.py clip*.mp4 --format reel      — scale to 9:16 (1080x1920)
  python concat.py clip*.mp4 --out day05.mp4
  python concat.py --list clips/               — preview clips in a folder

Order matters — clips are joined in the order you pass them.
"""

import os
import sys
import subprocess
import shutil
import tempfile
import typer
from rich.console import Console
from rich.panel import Panel
from rich.table import Table
from typing import Optional, List
from pathlib import Path
from enum import Enum

app     = typer.Typer(help="✂️  Clip Concatenator")
console = Console()

OUTPUT_DIR = os.path.join(os.path.dirname(__file__), "..", "output", "concat")


class Format(str, Enum):
    reel     = "reel"      # 1080x1920 vertical  (Instagram Reel / Story)
    square   = "square"    # 1080x1080            (Feed post)
    original = "original"  # keep source resolution


def _ffmpeg() -> str:
    local = os.path.join(os.path.dirname(__file__), "..", "ffmpeg.exe")
    if os.path.exists(local):
        return local
    f = shutil.which("ffmpeg")
    if not f:
        console.print("[red]ffmpeg not found.[/red]")
        raise typer.Exit(1)
    return f


def _ffprobe() -> Optional[str]:
    local = os.path.join(os.path.dirname(__file__), "..", "ffprobe.exe")
    if os.path.exists(local):
        return local
    return shutil.which("ffprobe")


def _get_info(path: str) -> dict:
    probe = _ffprobe()
    if not probe:
        return {}
    result = subprocess.run(
        [probe, "-v", "quiet", "-print_format", "json",
         "-show_streams", "-show_format", path],
        capture_output=True, text=True, encoding="utf-8", errors="replace"
    )
    import json
    try:
        data = json.loads(result.stdout)
        fmt  = data.get("format", {})
        vid  = next((s for s in data.get("streams", []) if s.get("codec_type") == "video"), {})
        return {
            "duration": float(fmt.get("duration", 0)),
            "width":    vid.get("width", 0),
            "height":   vid.get("height", 0),
            "fps":      vid.get("r_frame_rate", "30/1"),
        }
    except Exception:
        return {}


def _fmt_dur(secs: float) -> str:
    m, s = divmod(int(secs), 60)
    return f"{m}m{s:02d}s"


def _scale_filter(fmt: Format) -> str:
    if fmt == Format.reel:
        # scale to 1080 wide, pad/crop to 1920 tall — keeps subject centered
        return (
            "scale=1080:1920:force_original_aspect_ratio=increase,"
            "crop=1080:1920"
        )
    elif fmt == Format.square:
        return (
            "scale=1080:1080:force_original_aspect_ratio=increase,"
            "crop=1080:1080"
        )
    else:
        # normalize to even dimensions only (required by libx264)
        return "scale=trunc(iw/2)*2:trunc(ih/2)*2"


@app.command()
def concat(
    clips:    List[str]    = typer.Argument(...,           help="Video files to join in order"),
    out:      Optional[str]= typer.Option(None,  "--out", "-o", help="Output filename"),
    trim:     Optional[float]=typer.Option(None, "--trim","-t", help="Use only first N seconds from each clip"),
    fmt:      Format       = typer.Option(Format.reel,    "--format", "-f", help="Output format: reel|square|original"),
    fps:      int          = typer.Option(30,              "--fps",          help="Output framerate"),
    no_audio: bool         = typer.Option(False,           "--no-audio",     help="Drop audio (add voiceover later)"),
):
    """Join multiple clips into one reel-ready video."""

    # Validate all files exist
    missing = [c for c in clips if not os.path.exists(c)]
    if missing:
        for m in missing:
            console.print(f"[red]Not found: {m}[/red]")
        raise typer.Exit(1)

    if len(clips) < 2:
        console.print("[red]Need at least 2 clips.[/red]")
        raise typer.Exit(1)

    os.makedirs(OUTPUT_DIR, exist_ok=True)
    out_name = out or "concat_output"
    if not out_name.endswith(".mp4"):
        out_name += ".mp4"
    output_path = os.path.join(OUTPUT_DIR, out_name)

    # Show clip table
    t = Table(title="Clips to join", show_header=True)
    t.add_column("#",     style="dim", width=4)
    t.add_column("File",  style="cyan")
    t.add_column("Size",  justify="right")
    t.add_column("Duration", justify="right")
    total_dur = 0
    for i, clip in enumerate(clips, 1):
        info = _get_info(clip)
        dur  = min(info.get("duration", 0), trim) if trim else info.get("duration", 0)
        total_dur += dur
        size_mb = os.path.getsize(clip) / (1024*1024)
        t.add_row(str(i), os.path.basename(clip), f"{size_mb:.1f} MB", _fmt_dur(dur))
    console.print(t)

    console.print(Panel(
        f"[bold]Clips:[/bold]   {len(clips)}\n"
        f"[bold]Format:[/bold]  {fmt.value}  ({_scale_filter(fmt)[:30]}...)\n"
        f"[bold]FPS:[/bold]     {fps}\n"
        f"[bold]Trim:[/bold]    {f'first {trim}s per clip' if trim else 'full clip'}\n"
        f"[bold]Audio:[/bold]   {'dropped (add voiceover later)' if no_audio else 'kept'}\n"
        f"[bold]Total:[/bold]   ~{_fmt_dur(total_dur)}\n"
        f"[bold]Output:[/bold]  {output_path}",
        title="✂️  Concat", border_style="cyan"
    ))

    ff     = _ffmpeg()
    scale  = _scale_filter(fmt)

    # Build filter_complex for concat
    # Each input goes through: trim (optional) → scale → fps → setsar
    filter_parts = []
    input_args   = []

    for i, clip in enumerate(clips):
        input_args += ["-i", clip]

        parts = []
        if trim:
            parts.append(f"trim=duration={trim},setpts=PTS-STARTPTS")
        parts.append(scale)
        parts.append(f"fps={fps}")
        parts.append("setsar=1")
        filter_parts.append(f"[{i}:v]{''.join(p+',' for p in parts[:-1])}{parts[-1]}[v{i}]")

    # audio normalization per clip
    audio_parts = []
    if not no_audio:
        for i in range(len(clips)):
            a_parts = []
            if trim:
                a_parts.append(f"atrim=duration={trim},asetpts=PTS-STARTPTS")
            a_parts.append("aresample=44100")
            filter_parts.append(f"[{i}:a]{''.join(p+',' for p in a_parts[:-1])}{a_parts[-1]}[a{i}]")
            audio_parts.append(f"[a{i}]")

    # concat
    v_inputs = "".join(f"[v{i}]" for i in range(len(clips)))
    n = len(clips)

    if no_audio:
        filter_parts.append(f"{v_inputs}concat=n={n}:v=1:a=0[vout]")
        map_args = ["-map", "[vout]"]
    else:
        a_inputs = "".join(audio_parts)
        filter_parts.append(f"{v_inputs}{a_inputs}concat=n={n}:v=1:a=1[vout][aout]")
        map_args = ["-map", "[vout]", "-map", "[aout]"]

    filter_complex = ";".join(filter_parts)

    cmd = [ff, "-y"] + input_args + [
        "-filter_complex", filter_complex,
    ] + map_args + [
        "-c:v", "libx264", "-crf", "18", "-preset", "fast",
        "-pix_fmt", "yuv420p",
    ]

    if not no_audio:
        cmd += ["-c:a", "aac", "-b:a", "192k"]

    cmd.append(output_path)

    console.print("[dim]Joining clips...[/dim]")
    result = subprocess.run(cmd, capture_output=True, text=True, encoding="utf-8", errors="replace")

    if result.returncode != 0:
        console.print(f"[red]Failed:\n{result.stderr[-1000:]}[/red]")
        raise typer.Exit(1)

    size_mb = os.path.getsize(output_path) / (1024*1024)
    info    = _get_info(output_path)
    console.print(f"\n[bold green]✅ Done![/bold green]")
    console.print(f"   Output   : [cyan]{output_path}[/cyan]")
    console.print(f"   Duration : {_fmt_dur(info.get('duration', 0))}")
    console.print(f"   Size     : {size_mb:.1f} MB")
    console.print(f"   Res      : {info.get('width')}×{info.get('height')}")
    if no_audio:
        console.print(f"\n[dim]Next step — add voiceover:[/dim]")
        console.print(f"   python reels/merge_av.py {output_path} voiceover.wav --trim")


if __name__ == "__main__":
    app()
