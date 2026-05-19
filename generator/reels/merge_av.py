#!/usr/bin/env python3
"""
Merge Video + Audio
Usage:
  python merge_av.py video.mp4 audio.mp3           — replace audio
  python merge_av.py video.mp4 audio.mp3 --mix     — overlay on existing audio
  python merge_av.py video.mp4 audio.mp3 --offset 2.5
  python merge_av.py video.mp4 audio.mp3 --out final.mp4
"""

import os, subprocess, shutil, typer
from rich.console import Console
from rich.panel import Panel
from typing import Optional
from pathlib import Path

app     = typer.Typer(help="🎬 Video + Audio Merger")
console = Console()

OUTPUT_DIR = os.path.join(os.path.dirname(__file__), "..", "output", "merged")


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


def _get_duration(path: str) -> Optional[float]:
    probe = _ffprobe()
    if not probe:
        return None
    result = subprocess.run(
        [probe, "-v", "quiet", "-print_format", "compact",
         "-show_entries", "format=duration", path],
        capture_output=True, text=True
    )
    for line in result.stdout.splitlines():
        if "duration=" in line:
            try:
                return float(line.split("duration=")[1])
            except:
                pass
    return None


def _fmt(secs: Optional[float]) -> str:
    if secs is None:
        return "?"
    m, s = divmod(int(secs), 60)
    return f"{m}m{s:02d}s"


def _build_output(video: str, custom: Optional[str]) -> str:
    os.makedirs(OUTPUT_DIR, exist_ok=True)
    if custom:
        return os.path.join(OUTPUT_DIR, custom if custom.endswith(".mp4") else custom + ".mp4")
    return os.path.join(OUTPUT_DIR, f"{Path(video).stem}_merged.mp4")


@app.command()
def merge(
    video:      str           = typer.Argument(...),
    audio:      str           = typer.Argument(...),
    out:        Optional[str] = typer.Option(None,  "--out",    "-o"),
    mix:        bool          = typer.Option(False, "--mix",    "-m", help="Overlay on existing audio"),
    offset:     float         = typer.Option(0.0,   "--offset", "-s", help="Delay audio N seconds"),
    trim:       bool          = typer.Option(True,  "--trim",   "-t", help="Trim to shortest stream"),
    loop_audio: bool          = typer.Option(False, "--loop",   "-l"),
    volume:     float         = typer.Option(1.0,   "--volume", "-v"),
):
    """Merge video with audio."""
    for f in [video, audio]:
        if not os.path.exists(f):
            console.print(f"[red]Not found: {f}[/red]")
            raise typer.Exit(1)

    output_path = _build_output(video, out)
    console.print(Panel(
        f"[bold]Video:[/bold]  {video}  ({_fmt(_get_duration(video))})\n"
        f"[bold]Audio:[/bold]  {audio}  ({_fmt(_get_duration(audio))})\n"
        f"[bold]Output:[/bold] {output_path}\n"
        f"[bold]Mode:[/bold]   {'Mix' if mix else 'Replace'}\n"
        f"[bold]Volume:[/bold] {volume}x",
        title="🎬 Merge", border_style="cyan"
    ))

    ff = _ffmpeg()

    if mix:
        vol_f    = f"volume={volume}" if volume != 1.0 else "anull"
        off_f    = f"adelay={int(offset*1000)}|{int(offset*1000)}" if offset > 0 else "anull"
        fcomplex = (
            f"[1:a]{vol_f},{off_f}[a1];"
            f"[0:a][a1]amix=inputs=2:duration={'shortest' if trim else 'longest'}[aout]"
        )
        cmd = [ff, "-y", "-i", video, "-i", audio,
               "-filter_complex", fcomplex, "-map", "0:v", "-map", "[aout]",
               "-c:v", "copy", "-c:a", "aac", "-b:a", "192k", output_path]
    else:
        cmd = [ff, "-y", "-i", video, "-i", audio]
        if offset > 0:
            cmd += ["-itsoffset", str(offset), "-i", audio, "-map", "0:v", "-map", "2:a"]
        else:
            cmd += ["-map", "0:v", "-map", "1:a"]
        if volume != 1.0:
            cmd += ["-af", f"volume={volume}"]
        if loop_audio:
            cmd += ["-stream_loop", "-1"]
        if trim:
            cmd += ["-shortest"]
        cmd += ["-c:v", "copy", "-c:a", "aac", "-b:a", "192k", output_path]

    console.print("[dim]Merging...[/dim]")
    try:
        subprocess.run(cmd, check=True, capture_output=True)
    except subprocess.CalledProcessError as e:
        console.print(f"[red]Failed:\n{e.stderr.decode(errors='replace')}[/red]")
        raise typer.Exit(1)

    size_mb = os.path.getsize(output_path) / (1024*1024)
    console.print(f"\n[bold green]✅ Done![/bold green]  [cyan]{output_path}[/cyan]  ({size_mb:.1f} MB,  {_fmt(_get_duration(output_path))})")


if __name__ == "__main__":
    app()
