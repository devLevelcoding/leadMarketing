#!/usr/bin/env python3
"""
Audio Noise Canceler
Usage:
  python clean_audio.py input.mp4              — clean audio from video
  python clean_audio.py input.wav              — clean audio file
  python clean_audio.py input.mp4 --preset reel
  python clean_audio.py input.mp4 --strength 0.8
  python clean_audio.py input.mp4 --preview
"""

import os, subprocess, shutil, typer
from rich.console import Console
from rich.panel import Panel
from typing import Optional
from pathlib import Path
from enum import Enum

app     = typer.Typer(help="🎙️ Audio Noise Canceler")
console = Console()

OUTPUT_DIR = os.path.join(os.path.dirname(__file__), "..", "output", "audio")


class Preset(str, Enum):
    voice = "voice"
    music = "music"
    reel  = "reel"


def _ffmpeg() -> str:
    local = os.path.join(os.path.dirname(__file__), "..", "ffmpeg.exe")
    if os.path.exists(local):
        return local
    f = shutil.which("ffmpeg")
    if not f:
        console.print("[red]ffmpeg not found.[/red]")
        raise typer.Exit(1)
    return f


def _is_video(path: str) -> bool:
    return Path(path).suffix.lower() in {".mp4", ".mov", ".avi", ".mkv", ".webm"}


def _build_output(input_path: str, custom: Optional[str], is_video: bool) -> str:
    os.makedirs(OUTPUT_DIR, exist_ok=True)
    if custom:
        if not os.path.splitext(custom)[1]:
            custom += ".mp4" if is_video else ".wav"
        return os.path.join(OUTPUT_DIR, os.path.basename(custom))
    stem = Path(input_path).stem
    ext  = Path(input_path).suffix
    return os.path.join(OUTPUT_DIR, f"{stem}_clean{ext}")


def _build_filter(preset: Preset, strength: float) -> str:
    nr = round(strength * 97, 1)
    if preset == Preset.voice:
        return (
            f"highpass=f=80,lowpass=f=8000,"
            f"afftdn=nf=-{nr},"
            f"anlmdn=s=0.{int(strength*9)+1}:p=0.{int(strength*9)+1},"
            f"dynaudnorm=f=150:g=15,"
            f"loudnorm=I=-16:TP=-1.5:LRA=11"
        )
    elif preset == Preset.music:
        return (
            f"highpass=f=40,afftdn=nf=-{nr},"
            f"dynaudnorm=f=500:g=31,"
            f"loudnorm=I=-14:TP=-1.5:LRA=11"
        )
    else:  # reel
        return (
            f"highpass=f=100,lowpass=f=10000,"
            f"afftdn=nf=-{nr}:nt=w,"
            f"anlmdn=s=0.{int(strength*9)+1},"
            f"volume=2.0,"
            f"dynaudnorm=f=100:g=9:p=0.95,"
            f"loudnorm=I=-16:TP=-1.5:LRA=7"
        )


@app.command()
def clean(
    input_file: str           = typer.Argument(...),
    strength:   float         = typer.Option(0.5,          "--strength", "-s"),
    preset:     Preset        = typer.Option(Preset.voice, "--preset",   "-p"),
    out:        Optional[str] = typer.Option(None,         "--out",      "-o"),
    preview:    bool          = typer.Option(False,        "--preview"),
):
    """Remove background noise from audio or video."""
    if not os.path.exists(input_file):
        console.print(f"[red]Not found: {input_file}[/red]")
        raise typer.Exit(1)

    strength    = max(0.1, min(1.0, strength))
    is_video    = _is_video(input_file)
    output_path = _build_output(input_file, out, is_video)
    af_chain    = _build_filter(preset, strength)

    console.print(Panel(
        f"[bold]Input:[/bold]    {input_file}\n"
        f"[bold]Output:[/bold]   {output_path}\n"
        f"[bold]Preset:[/bold]   {preset.value}\n"
        f"[bold]Strength:[/bold] {strength}",
        title="🎙️ Audio Cleaner", border_style="cyan"
    ))

    ff  = _ffmpeg()
    cmd = [ff, "-y", "-i", input_file]
    if is_video:
        cmd += ["-c:v", "copy", "-af", af_chain, "-c:a", "aac", "-b:a", "192k"]
    else:
        cmd += ["-af", af_chain, "-c:a", "aac", "-b:a", "192k"]
    cmd.append(output_path)

    console.print("[dim]Processing...[/dim]")
    result = subprocess.run(cmd, capture_output=True, text=True, encoding="utf-8", errors="replace")
    if result.returncode != 0:
        console.print(f"[red]Error:\n{result.stderr[-800:]}[/red]")
        raise typer.Exit(1)

    size_mb = os.path.getsize(output_path) / (1024*1024)
    console.print(f"\n[bold green]✅ Done![/bold green]  [cyan]{output_path}[/cyan]  ({size_mb:.1f} MB)")

    if preview:
        os.startfile(output_path)


if __name__ == "__main__":
    app()
