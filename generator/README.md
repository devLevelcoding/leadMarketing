# Instagram Content Generator

CLI app for your IT company Instagram — no paid AI, no Canvas, pure Python.

## Setup

```bash
cd f:\leadMarketing\generator

# Install dependencies
pip install -r requirements.txt

# Edit your company info
notepad config.py

# Create fonts folder (optional — uses system fonts by default)
mkdir fonts
# Drop Inter-Regular.ttf and Inter-Bold.ttf in /fonts for best results
# Download free from: fonts.google.com/specimen/Inter
```

## Usage

```bash
# See the full 60-day plan
python cli.py plan

# See details for a specific day
python cli.py plan --day 8

# Generate + render day 8 (you type your idea)
python cli.py full 8

# Generate + render using your voice
python cli.py full 8 --voice

# Generate + render from an existing audio file (WAV/MP3)
python cli.py full 8 --file my_note.wav

# Just generate content (no images)
python cli.py generate 8

# Just render images (content already generated)
python cli.py render 8

# Print caption for copy-paste
python cli.py caption 8
```

## Output

Each day creates a folder `output/day_08/` with:
- `slide_01.jpg` ... `slide_06.jpg`  — carousel images (1080×1080)
- `story.jpg`                        — story version (1080×1920)
- `post.jpg`                         — static post (1080×1080)
- `reel_script.txt`                  — reel script with timestamps
- `caption.txt`                      — caption + hashtags ready to copy
- `content.json`                     — raw content data

## Voice Notes

The voice feature uses Google's free Speech Recognition (needs internet, no API key).
- Records up to 60 seconds from your mic
- Press Ctrl+C to stop early
- Transcribes automatically and uses it as your idea

## Brand Colors

Edit `config.py` to change:
- Company name, handle, website
- Brand colors (BG, accent, text)
- Tagline and services

## Content Types

| Type | Output | Best for |
|------|--------|----------|
| carousel | 6 slides + story | Tips, tutorials, case studies |
| static | 1 post + story | Stats, quotes, announcements |
| reel | Script + thumbnail | BTS, demos, tutorials |
| story | 1 frame | Daily engagement, polls |
