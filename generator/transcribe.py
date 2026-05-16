"""
Voice recording + transcription — free, no API key.
Uses sounddevice to record + SpeechRecognition with Google free tier.
"""

import os
import sys
import tempfile
import speech_recognition as sr
from rich.console import Console

console = Console()


def record_voice(duration: int = 30, samplerate: int = 16000) -> str:
    """Record from mic for up to `duration` seconds. Returns path to WAV file."""
    try:
        import sounddevice as sd
        import scipy.io.wavfile as wav
        import numpy as np
    except ImportError:
        console.print("[red]Install sounddevice and scipy: pip install sounddevice scipy[/red]")
        sys.exit(1)

    console.print(f"[yellow]🎙  Recording for up to {duration}s — press Ctrl+C to stop early[/yellow]")
    console.print("[dim]Speak now...[/dim]")

    try:
        audio = sd.rec(int(duration * samplerate), samplerate=samplerate, channels=1, dtype="int16")
        sd.wait()
    except KeyboardInterrupt:
        sd.stop()

    tmp = tempfile.mktemp(suffix=".wav", prefix="ig_voice_")
    wav.write(tmp, samplerate, audio)
    console.print(f"[green]✓ Saved recording to {tmp}[/green]")
    return tmp


def transcribe(audio_path: str) -> str:
    """Transcribe an audio file using Google free speech recognition."""
    r = sr.Recognizer()
    with sr.AudioFile(audio_path) as source:
        r.adjust_for_ambient_noise(source, duration=0.5)
        audio = r.record(source)

    console.print("[dim]Transcribing...[/dim]")
    try:
        text = r.recognize_google(audio)
        return text
    except sr.UnknownValueError:
        console.print("[red]Could not understand audio. Try again in a quieter environment.[/red]")
        return ""
    except sr.RequestError as e:
        console.print(f"[red]Speech recognition failed: {e}[/red]")
        console.print("[yellow]Tip: Make sure you have internet access for the free Google API.[/yellow]")
        return ""


def record_and_transcribe(duration: int = 30) -> str:
    """One-shot: record then immediately transcribe."""
    path = record_voice(duration)
    text = transcribe(path)
    try:
        os.remove(path)
    except OSError:
        pass
    return text


def transcribe_file(path: str) -> str:
    """Transcribe an existing audio file (WAV, MP3 etc.)."""
    if not os.path.exists(path):
        console.print(f"[red]File not found: {path}[/red]")
        return ""
    return transcribe(path)
