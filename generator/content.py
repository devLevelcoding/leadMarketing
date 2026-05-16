"""
Template-based content generator.
Takes the day plan + user's raw idea (from voice or text) and
structures it into the right Instagram format.
No AI — pure text structuring from your words.
"""

import re
import json
import os
from plan_data import get_day, HASHTAG_SETS
import config as cfg


_ORDINAL_RE = re.compile(
    r'(?:^|[.!?]\s+|:\s*)'
    r'(?:first|second|third|fourth|fifth)[,:\s]+',
    re.IGNORECASE
)
_STRIP_ORDINAL = re.compile(
    r'^(?:first|second|third|fourth|fifth)[,:\s]+',
    re.IGNORECASE
)


def _clean_point(s: str) -> str:
    s = _STRIP_ORDINAL.sub('', s).strip()
    return s[:1].upper() + s[1:] if s else s


def _sentences(text: str) -> list[str]:
    parts = re.split(r'(?<=[.!?])\s+', text.strip())
    return [p.strip() for p in parts if len(p.strip()) > 8]


def _bullet_points(text: str) -> list[str]:
    """Extract bullet-worthy chunks. Handles 'first/second/third' enumeration."""
    # Try splitting on ordinal keywords ("first, ... second, ... third, ...")
    ordinal_parts = re.split(r'(?<=[.!?:,])\s+(?=(?:first|second|third|fourth|fifth)[,:\s])', text, flags=re.IGNORECASE)
    if len(ordinal_parts) < 2:
        # Also try splitting mid-sentence on ordinals
        ordinal_parts = re.split(r'[,;]\s*(?=(?:second|third|fourth|fifth)[,:\s])', text, flags=re.IGNORECASE)
    if len(ordinal_parts) >= 2:
        cleaned = [
            _clean_point(p) for p in ordinal_parts
            if len(p.strip()) > 8 and not p.strip().rstrip().endswith((":", ","))
        ]
        if len(cleaned) >= 2:
            return cleaned

    sents = _sentences(text)
    if len(sents) >= 3:
        return [_clean_point(s) for s in sents]

    parts = [p.strip() for p in text.split(",") if len(p.strip()) > 5]
    cleaned = [_clean_point(p) for p in parts]
    return cleaned if cleaned else [_clean_point(text)]


def _capitalize(s: str) -> str:
    return s[:1].upper() + s[1:] if s else s


def build_carousel(day_data: dict, idea: str) -> dict:
    """Generate carousel slide content from the user's idea."""
    points = _bullet_points(idea)
    hook   = day_data["hook"]
    topic  = day_data["topic"]
    cta    = day_data["cta"]

    # Slide 1 = hook, slides 2..N = points, last = CTA
    slides = [{"number": 1, "type": "hook", "text": hook, "subtext": topic}]

    for i, point in enumerate(points[:6], start=2):
        slides.append({
            "number": i,
            "type":   "point",
            "text":   _capitalize(point),
            "subtext": "",
        })

    slides.append({
        "number": len(slides) + 1,
        "type":   "cta",
        "text":   cta,
        "subtext": f"{cfg.HANDLE}  ·  {cfg.WEBSITE}",
    })

    caption = _build_caption(day_data, idea, "carousel")
    return {"type": "carousel", "slides": slides, "caption": caption,
            "hashtags": _hashtags(day_data), "day": day_data["day"],
            "topic": topic}


def build_static(day_data: dict, idea: str) -> dict:
    """Single image post."""
    sents  = _sentences(idea)
    hook   = day_data["hook"]
    body   = sents[0] if sents else idea[:120]
    sub    = sents[1] if len(sents) > 1 else ""

    caption = _build_caption(day_data, idea, "static")
    return {"type": "static", "hook": hook, "body": _capitalize(body),
            "subtext": _capitalize(sub), "cta": day_data["cta"],
            "caption": caption, "hashtags": _hashtags(day_data),
            "day": day_data["day"], "topic": day_data["topic"]}


def build_story(day_data: dict, idea: str) -> dict:
    """Story frame content."""
    sents = _sentences(idea)
    return {
        "type":    "story",
        "frame1":  day_data["hook"],
        "frame2":  _capitalize(sents[0]) if sents else _capitalize(idea[:100]),
        "frame3":  day_data["cta"],
        "day":     day_data["day"],
        "topic":   day_data["topic"],
    }


def build_reel(day_data: dict, idea: str) -> dict:
    """Reel script with timestamps — no video generated, just the script."""
    sents  = _sentences(idea)
    hook   = day_data["hook"]
    topic  = day_data["topic"]

    script_lines = []
    script_lines.append(f"[0:00–0:03]  HOOK — '{hook}'")
    script_lines.append(f"[0:03–0:08]  Introduce the topic: {topic}")

    for i, s in enumerate(sents[:5], start=1):
        start = 8 + (i - 1) * 8
        end   = start + 8
        script_lines.append(f"[0:{start:02d}–0:{end:02d}]  Point {i}: {_capitalize(s)}")

    script_lines.append(f"[0:50–1:00]  CTA — '{day_data['cta']}'")
    script_lines.append(f"             Caption: {cfg.HANDLE}")

    caption = _build_caption(day_data, idea, "reel")
    return {"type": "reel", "script": script_lines, "caption": caption,
            "hashtags": _hashtags(day_data), "day": day_data["day"],
            "topic": topic}


def _build_caption(day_data: dict, idea: str, fmt: str) -> str:
    hook  = day_data["hook"]
    sents = _sentences(idea)
    body  = "\n\n".join(_capitalize(s) for s in sents[:6]) if sents else _capitalize(idea)
    cta   = day_data["cta"]
    tags  = _hashtags(day_data)
    handle = cfg.HANDLE

    return f"{hook}\n\n{body}\n\n{cta}\n\n{tags}\n\n{handle}"


def _hashtags(day_data: dict) -> str:
    phase  = day_data.get("phase", "foundation")
    base   = HASHTAG_SETS["brand"]
    extra  = HASHTAG_SETS["sell"] if phase == "sell" else HASHTAG_SETS["education"]
    trend  = HASHTAG_SETS["trending"]
    return f"{base} {extra} {trend}"


def generate(day: int, idea: str) -> dict:
    """Main entry: given day number + raw idea text, return structured content."""
    day_data = get_day(day)
    if not day_data:
        raise ValueError(f"Day {day} not found in plan")

    content_type = day_data["type"]
    if content_type == "carousel":
        content = build_carousel(day_data, idea)
    elif content_type == "static":
        content = build_static(day_data, idea)
    elif content_type == "story":
        content = build_story(day_data, idea)
    elif content_type == "reel":
        content = build_reel(day_data, idea)
    else:
        content = build_static(day_data, idea)

    # Save to output/day_XX/content.json
    out_dir = os.path.join(cfg.OUTPUT_DIR, f"day_{day:02d}")
    os.makedirs(out_dir, exist_ok=True)
    json_path = os.path.join(out_dir, "content.json")
    with open(json_path, "w", encoding="utf-8") as f:
        json.dump(content, f, ensure_ascii=False, indent=2)

    return content
