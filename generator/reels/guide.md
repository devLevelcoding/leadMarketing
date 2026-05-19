# Reel Production Guide — Full Workflow

Quick cuts between different angles = more movement = Instagram loves it.
Follow these steps in order.

---

## Full Workflow

```
1. Record clips (phone, screen recorder — any source)
         ↓
2. python reels/concat.py clip1.mp4 clip2.mp4 clip3.mp4 --trim 4 --no-audio
         ↓  (all clips joined, scaled to 1080×1920)
3. python reels/record_audio.py --time 35 --out voiceover
         ↓
4. python reels/clean_audio.py output/recordings/voiceover.wav --preset voice
         ↓
5. python reels/merge_av.py output/concat/concat_output.mp4 output/audio/voiceover_clean.wav --trim
         ↓
6. python reels/subtitle.py output/merged/concat_output_merged.mp4 --burn --lang ro
         ↓
       ✅ Upload
```

---

## Step by Step

### Step 1 — Record your clips

Use your phone, screen recorder, or any camera.
Aim for **6–8 short clips, 5–10 seconds each** — different angles, different corners.

Examples for a BTS reel:
- Hands typing close-up
- Full desk wide shot
- Screen with code or dashboard
- Coffee / notebook / sticky notes
- Face looking at screen (optional)
- Before/after side by side

---

### Step 2 — Join all clips

```bash
python reels/concat.py clip1.mp4 clip2.mp4 clip3.mp4 --trim 4 --no-audio --out day05
```

| Flag | What it does |
|---|---|
| `--trim 4` | Use only first 4s from each clip (quick cuts) |
| `--no-audio` | Drop original audio — voiceover will replace it |
| `--format reel` | Scale + crop to 1080×1920 vertical (default) |
| `--out name` | Output filename |

Output: `output/concat/day05.mp4`

---

### Step 3 — Record voiceover

```bash
python reels/record_audio.py --time 35 --out voiceover
```

Read your script from `output/day_XX/voiceover.txt`.
Tips:
- Speak slower than feels natural
- Pause at the `...` marks
- Do 2–3 takes, keep the best one

Output: `output/recordings/voiceover.wav`

---

### Step 4 — Clean the audio

```bash
python reels/clean_audio.py output/recordings/voiceover.wav --preset voice
```

Removes background hiss, hum, keyboard noise.
Output: `output/audio/voiceover_clean.wav`

---

### Step 5 — Merge video + voiceover

```bash
python reels/merge_av.py output/concat/day05.mp4 output/audio/voiceover_clean.wav --trim
```

`--trim` cuts the video to match the audio length.
Output: `output/merged/day05_merged.mp4`

---

### Step 6 — Add subtitles

```bash
python reels/subtitle.py output/merged/day05_merged.mp4 --burn --lang ro
```

| Flag | What it does |
|---|---|
| `--burn` | Embed subtitles into the video |
| `--lang ro` | Romanian audio (or `en`, `es`, etc.) |
| `--model small` | Better accuracy for noisy audio |
| `--style big` | Large Instagram-style captions (default) |
| `--srt-only` | Just generate the .srt file, no video |

First run downloads the Whisper model once (~145MB). Free, no API key.
Output: `output/subtitled/day05_merged_subtitled.mp4`

---

### Step 7 — Upload

File is ready at: `output/subtitled/day05_merged_subtitled.mp4`

---

## One-command pipeline (alternative)

If you want the wizard to guide you through all steps interactively:

```bash
python reels/pipeline.py --name day05 --lang ro
```

---

## Output folders reference

| Folder | What's in it |
|---|---|
| `output/recordings/` | Raw screen + audio recordings |
| `output/concat/` | Joined clips (before audio) |
| `output/audio/` | Noise-cleaned audio |
| `output/merged/` | Video + voiceover merged |
| `output/subtitled/` | Final video with burned subtitles |
| `output/reels/` | Pipeline final output |
