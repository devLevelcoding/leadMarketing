#!/usr/bin/env python3
"""
Subtitle Generator for Instagram Reels (free, offline — faster-whisper)
Usage:
  python subtitle.py reel.mp4                — generate SRT
  python subtitle.py reel.mp4 --burn         — burn subtitles into video
  python subtitle.py reel.mp4 --lang ro      — Romanian audio
  python subtitle.py reel.mp4 --model small  — better accuracy
  python subtitle.py reel.mp4 --style big    — large Instagram captions
  python subtitle.py reel.mp4 --srt-only     — SRT only, no video

Models (downloaded once to .venv/whisper_models):
  tiny  ~74MB   base ~145MB   small ~461MB   medium ~1.5GB
"""

import os, sys, subprocess, shutil, json, tempfile, typer
from rich.console import Console
from rich.panel import Panel
from typing import Optional
from pathlib import Path
from enum import Enum
from datetime import timedelta

app     = typer.Typer(help="📝 Subtitle Generator")
console = Console()

OUTPUT_DIR    = os.path.join(os.path.dirname(__file__), "..", "output", "subtitled")
VENV_PYTHON   = os.path.join(os.path.dirname(__file__), "..", ".venv", "Scripts", "python.exe")
WHISPER_CACHE = os.path.join(os.path.dirname(__file__), "..", ".venv", "whisper_models")


class Style(str, Enum):
    big    = "big"
    normal = "normal"
    clean  = "clean"


class WModel(str, Enum):
    tiny   = "tiny"
    base   = "base"
    small  = "small"
    medium = "medium"


def _ffmpeg() -> str:
    local = os.path.join(os.path.dirname(__file__), "..", "ffmpeg.exe")
    if os.path.exists(local):
        return local
    f = shutil.which("ffmpeg")
    if not f:
        console.print("[red]ffmpeg not found.[/red]")
        raise typer.Exit(1)
    return f


def _extract_audio(video: str, out_wav: str):
    ff = _ffmpeg()
    cmd = [ff, "-y", "-i", video, "-vn", "-ar", "16000", "-ac", "1", "-c:a", "pcm_s16le", out_wav]
    r = subprocess.run(cmd, capture_output=True, text=True, encoding="utf-8", errors="replace")
    if r.returncode != 0:
        console.print(f"[red]Audio extraction failed:\n{r.stderr[-400:]}[/red]")
        raise typer.Exit(1)


def _transcribe(audio_path: str, model_size: str, lang: Optional[str]) -> list[dict]:
    os.makedirs(WHISPER_CACHE, exist_ok=True)
    os.environ["HF_HOME"] = WHISPER_CACHE

    try:
        from faster_whisper import WhisperModel
    except ImportError:
        console.print("[red]faster-whisper not found.[/red]")
        console.print(f"[yellow]Run: {VENV_PYTHON} -m pip install faster-whisper[/yellow]")
        raise typer.Exit(1)

    console.print(f"[dim]Loading {model_size} model...[/dim]")
    model = WhisperModel(model_size, device="cpu", compute_type="int8", download_root=WHISPER_CACHE)

    console.print("[dim]Transcribing...[/dim]")
    segs_iter, info = model.transcribe(
        audio_path, language=lang, beam_size=5,
        vad_filter=True, vad_parameters=dict(min_silence_duration_ms=500),
    )
    console.print(f"[dim]Language: {info.language} ({info.language_probability:.0%})[/dim]")
    return [{"start": s.start, "end": s.end, "text": s.text.strip()} for s in segs_iter]


def _srt_time(seconds: float) -> str:
    ms = int(seconds * 1000)
    h, ms = divmod(ms, 3_600_000)
    m, ms = divmod(ms, 60_000)
    s, ms = divmod(ms, 1_000)
    return f"{h:02d}:{m:02d}:{s:02d},{ms:03d}"


def _to_srt(segments: list[dict]) -> str:
    lines = []
    for i, seg in enumerate(segments, 1):
        lines += [str(i), f"{_srt_time(seg['start'])} --> {_srt_time(seg['end'])}", seg["text"], ""]
    return "\n".join(lines)


def _force_style(style: Style) -> str:
    base = "Alignment=2,"
    if style == Style.big:
        return base + "FontName=Arial,FontSize=24,Bold=1,PrimaryColour=&H00FFFFFF,OutlineColour=&H00000000,Outline=3,Shadow=1,MarginV=80"
    if style == Style.clean:
        return base + "FontName=Arial,FontSize=20,Bold=1,PrimaryColour=&H00FFFFFF,OutlineColour=&H00000000,Outline=2,Shadow=0,MarginV=60"
    return base + "FontName=Arial,FontSize=16,Bold=0,PrimaryColour=&H00FFFFFF,OutlineColour=&H00000000,Outline=1,MarginV=40"


def _burn(video: str, srt: str, out: str, style: Style):
    ff  = _ffmpeg()
    esc = srt.replace("\\", "/").replace(":", "\\:")
    vf  = f"subtitles='{esc}':force_style='{_force_style(style)}'"
    cmd = [ff, "-y", "-i", video, "-vf", vf,
           "-c:v", "libx264", "-crf", "18", "-preset", "fast", "-c:a", "copy", out]
    console.print("[dim]Burning subtitles...[/dim]")
    r = subprocess.run(cmd, capture_output=True, text=True, encoding="utf-8", errors="replace")
    if r.returncode != 0:
        console.print(f"[red]Burn failed:\n{r.stderr[-600:]}[/red]")
        raise typer.Exit(1)


@app.command()
def subtitle(
    video:    str           = typer.Argument(...),
    burn:     bool          = typer.Option(False,        "--burn",     "-b"),
    srt_only: bool          = typer.Option(False,        "--srt-only"),
    lang:     Optional[str] = typer.Option(None,         "--lang",    "-l"),
    model:    WModel        = typer.Option(WModel.base,  "--model",   "-m"),
    style:    Style         = typer.Option(Style.big,    "--style",   "-s"),
    out:      Optional[str] = typer.Option(None,         "--out",     "-o"),
):
    """Generate subtitles (free, offline)."""
    if not os.path.exists(video):
        console.print(f"[red]Not found: {video}[/red]")
        raise typer.Exit(1)

    os.makedirs(OUTPUT_DIR, exist_ok=True)
    stem    = Path(video).stem
    srt_out = os.path.join(OUTPUT_DIR, f"{stem}.srt")
    vid_out = os.path.join(OUTPUT_DIR, f"{(out or stem+'_subtitled')}.mp4")
    if out and not out.endswith(".mp4"):
        vid_out = os.path.join(OUTPUT_DIR, out + ".mp4")

    console.print(Panel(
        f"[bold]Input:[/bold]  {video}\n"
        f"[bold]SRT:[/bold]    {srt_out}\n"
        f"[bold]Output:[/bold] {vid_out if not srt_only else '(skipped)'}\n"
        f"[bold]Lang:[/bold]   {lang or 'auto'}\n"
        f"[bold]Model:[/bold]  {model.value}  |  [bold]Style:[/bold] {style.value}",
        title="📝 Subtitle Generator", border_style="magenta"
    ))

    with tempfile.NamedTemporaryFile(suffix=".wav", delete=False) as tmp:
        tmp_audio = tmp.name

    try:
        console.print("[dim]Extracting audio...[/dim]")
        _extract_audio(video, tmp_audio)

        segs = _transcribe(tmp_audio, model.value, lang)
        if not segs:
            console.print("[yellow]No speech detected.[/yellow]")
            return

        console.print(f"[green]{len(segs)} segments transcribed.[/green]")

        with open(srt_out, "w", encoding="utf-8") as f:
            f.write(_to_srt(segs))
        with open(srt_out.replace(".srt", ".json"), "w", encoding="utf-8") as f:
            json.dump(segs, f, ensure_ascii=False, indent=2)

        if srt_only:
            console.print(f"\n[bold green]✅ SRT:[/bold green] [cyan]{srt_out}[/cyan]")
            return

        if burn:
            _burn(video, srt_out, vid_out, style)
            console.print(f"\n[bold green]✅ Done![/bold green]")
            console.print(f"   Video : [cyan]{vid_out}[/cyan]  ({os.path.getsize(vid_out)//(1024*1024)} MB)")
            console.print(f"   SRT   : [cyan]{srt_out}[/cyan]")
        else:
            console.print(f"\n[bold green]✅ Done![/bold green]")
            console.print(f"   SRT : [cyan]{srt_out}[/cyan]")
            console.print("[dim]   Add --burn to embed into video.[/dim]")
    finally:
        if os.path.exists(tmp_audio):
            os.unlink(tmp_audio)


if __name__ == "__main__":
    app()
