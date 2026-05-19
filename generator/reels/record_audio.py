#!/usr/bin/env python3
"""
Audio Recorder
Usage:
  python record_audio.py              — interactive
  python record_audio.py --time 30    — record 30s
  python record_audio.py --time 60 --mp3
  python record_audio.py --list-devices
"""

import os, subprocess, shutil, typer
from rich.console import Console
from rich.panel import Panel
from rich.prompt import Prompt, Confirm
from typing import Optional
from datetime import datetime

app     = typer.Typer(help="🎤 Audio Recorder")
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


def _get_devices() -> list[str]:
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
        console.print("[red]No microphones found.[/red]")
        raise typer.Exit(1)
    if len(devices) == 1:
        console.print(f"[dim]Using: {devices[0]}[/dim]")
        return devices[0]
    console.print("\n[bold]Available microphones:[/bold]")
    for i, d in enumerate(devices, 1):
        console.print(f"  [{i}] {d}")
    choice = Prompt.ask("Pick device", default="1")
    try:
        return devices[max(0, min(int(choice)-1, len(devices)-1))]
    except ValueError:
        return devices[0]


def _build_output(name: Optional[str], mp3: bool) -> str:
    os.makedirs(OUTPUT_DIR, exist_ok=True)
    ext = ".mp3" if mp3 else ".wav"
    if name:
        return os.path.join(OUTPUT_DIR, name if name.endswith(ext) else name + ext)
    ts = datetime.now().strftime("%Y%m%d_%H%M%S")
    return os.path.join(OUTPUT_DIR, f"audio_{ts}{ext}")


def _record(duration: int, device: str, output_path: str, mp3: bool):
    ff = _ffmpeg()
    codec = ["-c:a", "libmp3lame", "-b:a", "192k"] if mp3 else ["-c:a", "pcm_s16le"]
    cmd = [ff, "-y", "-f", "dshow", "-i", f"audio={device}", "-t", str(duration),
           "-ar", "44100", "-ac", "1", *codec, output_path]

    console.print(Panel(
        f"[bold]Device:[/bold]   {device}\n"
        f"[bold]Duration:[/bold] {duration}s\n"
        f"[bold]Format:[/bold]   {'MP3' if mp3 else 'WAV'}\n"
        f"[bold]Output:[/bold]   {output_path}\n\n[yellow]Ctrl+C to stop early.[/yellow]",
        title="🎤 Recording...", border_style="red"
    ))

    import time
    for i in [3, 2, 1]:
        console.print(f"  [bold red]{i}...[/bold red]")
        time.sleep(1)
    console.print("[bold red]● REC[/bold red]\n")

    try:
        subprocess.run(cmd, check=True)
    except KeyboardInterrupt:
        console.print("\n[yellow]⏹ Stopped.[/yellow]")
    except subprocess.CalledProcessError as e:
        console.print(f"[red]Failed: {e}[/red]")
        raise typer.Exit(1)

    if os.path.exists(output_path):
        console.print(f"\n[bold green]✅ Saved![/bold green]  [cyan]{output_path}[/cyan]  ({os.path.getsize(output_path)//1024} KB)")
    else:
        console.print("[red]No file created.[/red]")


@app.command()
def record_audio(
    time:         Optional[int] = typer.Option(None,  "--time",         "-t"),
    mp3:          bool          = typer.Option(False, "--mp3",           "-m"),
    out:          Optional[str] = typer.Option(None,  "--out",           "-o"),
    list_devices: bool          = typer.Option(False, "--list-devices"),
):
    """Record microphone audio."""
    if list_devices:
        for i, d in enumerate(_get_devices(), 1):
            console.print(f"  {i}. {d}")
        raise typer.Exit(0)

    device = _pick_device(_get_devices())

    if time is None:
        raw  = Prompt.ask("Duration (seconds)", default="30")
        time = int(raw)
        mp3  = Confirm.ask("Save as MP3?", default=False)

    _record(time, device, _build_output(out, mp3), mp3)


if __name__ == "__main__":
    app()
