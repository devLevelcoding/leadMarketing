#!/usr/bin/env python3
"""
Screen Recorder
Usage:
  python record.py                   — interactive mode
  python record.py --time 30         — record 30 seconds, no sound
  python record.py --time 60 --sound — record with microphone
  python record.py --out day09_reel  — custom output filename
  python record.py --list-devices    — show audio devices
"""

import os, sys, subprocess, shutil, typer
from rich.console import Console
from rich.prompt import Prompt, Confirm
from rich.panel import Panel
from datetime import datetime
from typing import Optional

app     = typer.Typer(help="🎥 Screen Recorder")
console = Console()

OUTPUT_DIR = os.path.join(os.path.dirname(__file__), "..", "output", "recordings")


def _ffmpeg() -> str:
    local = os.path.join(os.path.dirname(__file__), "..", "ffmpeg.exe")
    if os.path.exists(local):
        return local
    f = shutil.which("ffmpeg")
    if not f:
        console.print("[red]ffmpeg not found.[/red]")
        raise typer.Exit(1)
    return f


def _get_audio_devices() -> list[str]:
    result = subprocess.run(
        [_ffmpeg(), "-list_devices", "true", "-f", "dshow", "-i", "dummy"],
        capture_output=True, text=True, encoding="utf-8", errors="replace"
    )
    devices, in_audio = [], False
    for line in result.stderr.splitlines():
        if "DirectShow audio devices" in line:
            in_audio = True; continue
        if in_audio and '"' in line:
            s = line.find('"') + 1
            e = line.find('"', s)
            name = line[s:e]
            if name:
                devices.append(name)
    return devices


def _pick_device(devices: list[str]) -> str:
    if not devices:
        console.print("[red]No audio devices found.[/red]")
        raise typer.Exit(1)
    if len(devices) == 1:
        console.print(f"[dim]Using: {devices[0]}[/dim]")
        return devices[0]
    console.print("\n[bold]Available audio devices:[/bold]")
    for i, d in enumerate(devices, 1):
        console.print(f"  [{i}] {d}")
    choice = Prompt.ask("Pick device", default="1")
    try:
        return devices[max(0, min(int(choice)-1, len(devices)-1))]
    except ValueError:
        return devices[0]


def _build_output(name: Optional[str]) -> str:
    os.makedirs(OUTPUT_DIR, exist_ok=True)
    if name:
        if not name.endswith(".mp4"):
            name += ".mp4"
        return os.path.join(OUTPUT_DIR, name)
    ts = datetime.now().strftime("%Y%m%d_%H%M%S")
    return os.path.join(OUTPUT_DIR, f"recording_{ts}.mp4")


def _record(duration: int, with_sound: bool, output_path: str):
    ff = _ffmpeg()
    console.print(Panel(
        f"[bold]Duration:[/bold] {duration} seconds\n"
        f"[bold]Audio:[/bold]    {'Yes 🎤' if with_sound else 'No (silent)'}\n"
        f"[bold]Output:[/bold]   {output_path}\n\n"
        f"[yellow]Press Ctrl+C to stop early.[/yellow]",
        title="🎥 Starting in 3s...", border_style="cyan"
    ))

    import time
    for i in [3, 2, 1]:
        console.print(f"  [bold cyan]{i}...[/bold cyan]")
        time.sleep(1)
    console.print("[bold green]● Recording...[/bold green]")

    if with_sound:
        device = _pick_device(_get_audio_devices())
        cmd = [
            ff, "-y",
            "-f", "gdigrab", "-framerate", "30", "-i", "desktop",
            "-f", "dshow",   "-i", f"audio={device}",
            "-t", str(duration),
            "-c:v", "libx264", "-preset", "ultrafast", "-crf", "23",
            "-c:a", "aac", "-b:a", "128k", "-pix_fmt", "yuv420p",
            output_path
        ]
    else:
        cmd = [
            ff, "-y",
            "-f", "gdigrab", "-framerate", "30", "-i", "desktop",
            "-t", str(duration),
            "-c:v", "libx264", "-preset", "ultrafast", "-crf", "23",
            "-pix_fmt", "yuv420p",
            output_path
        ]

    try:
        subprocess.run(cmd, check=True)
        size_mb = os.path.getsize(output_path) / (1024 * 1024)
        console.print(f"\n[bold green]✅ Done![/bold green]  [cyan]{output_path}[/cyan]  ({size_mb:.1f} MB)")
    except KeyboardInterrupt:
        console.print("\n[yellow]⏹ Stopped early.[/yellow]")
        if os.path.exists(output_path):
            console.print(f"   Saved: [cyan]{output_path}[/cyan]")
    except subprocess.CalledProcessError as e:
        console.print(f"\n[red]Recording failed: {e}[/red]")
        raise typer.Exit(1)


@app.command()
def record(
    time:         Optional[int] = typer.Option(None,  "--time",         "-t"),
    sound:        bool          = typer.Option(False, "--sound",        "-s", help="Record microphone"),
    out:          Optional[str] = typer.Option(None,  "--out",          "-o", help="Output filename"),
    list_devices: bool          = typer.Option(False, "--list-devices",       help="Show audio devices"),
):
    """Record screen."""
    if list_devices:
        for i, d in enumerate(_get_audio_devices(), 1):
            console.print(f"  {i}. {d}")
        raise typer.Exit(0)

    if time is None:
        raw   = Prompt.ask("Duration (seconds)", default="30")
        time  = int(raw)
        sound = Confirm.ask("Record microphone?", default=False)

    _record(time, sound, _build_output(out))


if __name__ == "__main__":
    app()
