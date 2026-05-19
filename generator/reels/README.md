# Reels Toolkit — Usage Guide

All reel scripts live in `generator/reels/`.
Output goes to `generator/output/` subfolders.
`ffmpeg.exe` and `ffprobe.exe` are in `generator/` (auto-detected).

---

## One-command pipeline (recommended)

```bash
python reels/pipeline.py
```

Interactive wizard that runs all steps in order:
1. Record screen
2. Record audio (optional separate mic)
3. Clean audio (noise canceling)
4. Merge video + audio
5. Burn subtitles
6. Final reel → `output/reels/`

### Skip options
```bash
python reels/pipeline.py --video existing.mp4   # skip recording, use existing
python reels/pipeline.py --skip-clean           # skip noise canceling
python reels/pipeline.py --skip-subtitles       # no subtitles
python reels/pipeline.py --lang ro              # Romanian subtitles
python reels/pipeline.py --name day09           # name your project
```

---

## Individual scripts

### 0. Join clips (do this first)
```bash
python reels/concat.py clip1.mp4 clip2.mp4 clip3.mp4 --out day05
python reels/concat.py clip*.mp4 --trim 4             # 4s from each clip
python reels/concat.py clip*.mp4 --no-audio           # drop audio, add voiceover later
```
Output: `output/concat/`
Format default: `--format reel` (1080×1920 vertical, scaled + cropped automatically)

### 1. Record screen
```bash
python reels/record.py --time 60 --sound --out day09_reel
```
Output: `output/recordings/`

### 2. Record audio (microphone only)
```bash
python reels/record_audio.py --time 60 --out voiceover
python reels/record_audio.py --list-devices
```
Output: `output/recordings/`

### 3. Clean audio (noise canceling)
```bash
python reels/clean_audio.py input.mp4 --preset reel
python reels/clean_audio.py input.wav --strength 0.8
```
Presets: `voice` | `music` | `reel`
Output: `output/audio/`

### 4. Merge video + audio
```bash
python reels/merge_av.py video.mp4 audio.wav
python reels/merge_av.py video.mp4 music.mp3 --mix --volume 0.3
```
Output: `output/merged/`

### 5. Add subtitles (free, offline)
```bash
python reels/subtitle.py reel.mp4 --burn --lang ro
python reels/subtitle.py reel.mp4 --srt-only
python reels/subtitle.py reel.mp4 --model small --style big
```
Models: `tiny` (~74MB) | `base` (~145MB) | `small` (~461MB)
Output: `output/subtitled/`

---

## Output folders

| Folder | Content |
|---|---|
| `output/recordings/` | Raw screen + audio recordings |
| `output/audio/` | Noise-cleaned audio |
| `output/merged/` | Video with replaced/mixed audio |
| `output/subtitled/` | Video with burned subtitles + .srt files |
| `output/reels/` | **Final reels ready to upload** |

---

## First-time subtitle setup

Subtitles use `faster-whisper` installed in `.venv/` on F: drive.
First transcription downloads the model once (~145MB for base).
No API key needed — runs fully offline.

```bash
# If faster-whisper is missing:
F:\leadMarketing\generator\.venv\Scripts\pip.exe install faster-whisper
```
