"""
Pillow image renderer — no Canvas, no browser.
Generates: carousel slides (1080x1080), static (1080x1080), story (1080x1920).
Reel = script text file only (you record it yourself).
"""

import os
import json
import re
import textwrap
from PIL import Image, ImageDraw, ImageFont
import config as cfg


def _strip_emoji(text: str) -> str:
    """Remove emoji characters that Windows system fonts can't render."""
    return re.sub(
        r'[\U00010000-\U0010ffff'
        r'\U0001F300-\U0001F9FF'
        r'\U00002702-\U000027B0'
        r'\U0000FE00-\U0000FE0F'
        r'\U0001F1E0-\U0001F1FF'
        r'☀-⛿✀-➿]+',
        '', text
    ).strip()


# ── Font loading ──────────────────────────────────────────────────────────────

def _font(size: int, bold: bool = False) -> ImageFont.FreeTypeFont | ImageFont.ImageFont:
    candidates = [
        "generator/fonts/Inter-Bold.ttf"    if bold else "generator/fonts/Inter-Regular.ttf",
        "C:/Windows/Fonts/calibrib.ttf"     if bold else "C:/Windows/Fonts/calibri.ttf",
        "C:/Windows/Fonts/arialbd.ttf"      if bold else "C:/Windows/Fonts/arial.ttf",
        "C:/Windows/Fonts/segoeui.ttf",
    ]
    for path in candidates:
        if os.path.exists(path):
            try:
                return ImageFont.truetype(path, size)
            except OSError:
                continue
    return ImageFont.load_default()


# ── Color helpers ─────────────────────────────────────────────────────────────

def _hex(h: str) -> tuple:
    h = h.lstrip("#")
    return tuple(int(h[i:i+2], 16) for i in (0, 2, 4))


BG      = _hex(cfg.BG_COLOR)
ACCENT  = _hex(cfg.ACCENT_COLOR)
TEXT    = _hex(cfg.TEXT_COLOR)
MUTED   = _hex(cfg.MUTED_COLOR)
CARD    = _hex("#1e293b")


# ── Draw helpers ──────────────────────────────────────────────────────────────

def _wrap_draw_text(draw: ImageDraw.Draw, text: str, x: int, y: int,
                    font: ImageFont.FreeTypeFont, color: tuple,
                    max_width: int, line_spacing: int = 8) -> int:
    """Draw wrapped text. Returns the y position after the last line."""
    lines = textwrap.wrap(text, width=max(10, max_width // (font.size // 2)))
    for line in lines:
        draw.text((x, y), line, font=font, fill=color)
        bbox = draw.textbbox((0, 0), line, font=font)
        y += (bbox[3] - bbox[1]) + line_spacing
    return y


def _footer(draw: ImageDraw.Draw, w: int, h: int, slide_info: str = ""):
    """Draw consistent footer bar."""
    bar_h = 56
    draw.rectangle([(0, h - bar_h), (w, h)], fill=CARD)
    font = _font(20)
    draw.text((32, h - bar_h + 18), cfg.HANDLE, font=font, fill=MUTED)
    if slide_info:
        draw.text((w - 32, h - bar_h + 18), slide_info, font=font, fill=MUTED, anchor="ra")


def _accent_bar(draw: ImageDraw.Draw, x: int, y: int, width: int = 60, height: int = 5):
    draw.rectangle([(x, y), (x + width, y + height)], fill=ACCENT)


# ── Carousel ──────────────────────────────────────────────────────────────────

def render_carousel_slide(slide: dict, total: int, out_path: str):
    W, H = 1080, 1080
    img  = Image.new("RGB", (W, H), BG)
    draw = ImageDraw.Draw(img)

    slide_num  = slide["number"]
    slide_type = slide["type"]
    text       = slide.get("text", "")
    subtext    = slide.get("subtext", "")

    text    = _strip_emoji(text)
    subtext = _strip_emoji(subtext)

    if slide_type == "hook":
        # Large hook slide
        _accent_bar(draw, 60, 140)
        y = _wrap_draw_text(draw, text, 60, 170, _font(64, bold=True), TEXT, W - 120, 12)
        if subtext:
            _wrap_draw_text(draw, subtext, 60, y + 24, _font(32), MUTED, W - 120)
        # Slide counter top-right
        draw.text((W - 60, 60), f"01/{total:02d}", font=_font(24), fill=MUTED, anchor="ra")

    elif slide_type == "cta":
        # CTA slide — vertically centered
        draw.rectangle([(0, 0), (W, H)], fill=CARD)
        draw.rectangle([(60, 60), (W - 60, H - 60)], outline=ACCENT, width=2)
        cy = H // 2 - 120
        _wrap_draw_text(draw, text, 80, cy, _font(52, bold=True), TEXT, W - 160, 14)
        if subtext:
            draw.text((W // 2, H // 2 + 80), subtext, font=_font(28), fill=MUTED, anchor="mm")
        draw.text((W - 60, 60), f"{slide_num:02d}/{total:02d}", font=_font(24), fill=MUTED, anchor="ra")

    else:
        # Content slide
        draw.text((W - 60, 60), f"{slide_num:02d}/{total:02d}", font=_font(24), fill=MUTED, anchor="ra")
        # Point number badge
        draw.ellipse([(60, 120), (120, 180)], fill=ACCENT)
        draw.text((90, 150), str(slide_num - 1), font=_font(28, bold=True), fill=TEXT, anchor="mm")
        y = _wrap_draw_text(draw, text, 60, 220, _font(52, bold=True), TEXT, W - 120, 12)
        if subtext:
            _wrap_draw_text(draw, subtext, 60, y + 20, _font(30), MUTED, W - 120)

    _footer(draw, W, H)
    img.save(out_path, "JPEG", quality=92)


def render_carousel(content: dict, out_dir: str):
    slides = content["slides"]
    total  = len(slides)
    for slide in slides:
        path = os.path.join(out_dir, f"slide_{slide['number']:02d}.jpg")
        render_carousel_slide(slide, total, path)
    print(f"  OK {total} carousel slides -> {out_dir}")


# ── Static ────────────────────────────────────────────────────────────────────

def render_static(content: dict, out_dir: str):
    W, H = 1080, 1080
    img  = Image.new("RGB", (W, H), BG)
    draw = ImageDraw.Draw(img)

    # Top accent stripe
    draw.rectangle([(0, 0), (W, 8)], fill=ACCENT)

    hook    = _strip_emoji(content.get("hook", ""))
    body    = _strip_emoji(content.get("body", ""))
    subtext = _strip_emoji(content.get("subtext", ""))
    cta     = _strip_emoji(content.get("cta", ""))

    y = 80
    y = _wrap_draw_text(draw, hook, 60, y, _font(56, bold=True), TEXT, W - 120, 14)
    y += 40

    # Divider
    draw.rectangle([(60, y), (180, y + 4)], fill=ACCENT)
    y += 40

    if body:
        y = _wrap_draw_text(draw, body, 60, y, _font(36), TEXT, W - 120, 10)
        y += 20

    if subtext:
        y = _wrap_draw_text(draw, subtext, 60, y, _font(30), MUTED, W - 120, 8)
        y += 30

    if cta:
        # CTA box
        box_y = H - 180
        draw.rounded_rectangle([(60, box_y), (W - 60, box_y + 70)], radius=12, fill=ACCENT)
        draw.text((W // 2, box_y + 35), cta, font=_font(28, bold=True), fill=TEXT, anchor="mm")

    _footer(draw, W, H)

    path = os.path.join(out_dir, "post.jpg")
    img.save(path, "JPEG", quality=92)
    print(f"  OK Static post -> {path}")


# ── Story ─────────────────────────────────────────────────────────────────────

def render_story(content: dict, out_dir: str):
    W, H = 1080, 1920
    img  = Image.new("RGB", (W, H), BG)
    draw = ImageDraw.Draw(img)

    # Gradient-like top band
    draw.rectangle([(0, 0), (W, 220)], fill=CARD)
    draw.text((60, 80), cfg.HANDLE, font=_font(36, bold=True), fill=TEXT)

    # Topic badge
    topic = _strip_emoji(content.get("topic", ""))
    badge_y = 260
    tw_box  = draw.textbbox((0, 0), topic, font=_font(28))
    bw      = tw_box[2] - tw_box[0] + 40
    draw.rounded_rectangle([(60, badge_y), (60 + bw, badge_y + 48)], radius=24, fill=ACCENT)
    draw.text((60 + bw // 2, badge_y + 24), topic[:40], font=_font(26, bold=True), fill=TEXT, anchor="mm")

    # Main hook message
    frame2 = _strip_emoji(content.get("frame2", ""))
    y = _wrap_draw_text(draw, frame2, 60, 380, _font(68, bold=True), TEXT, W - 120, 20)
    y += 50

    # Divider
    draw.rectangle([(60, y), (200, y + 5)], fill=ACCENT)
    y += 50

    # Bullet points from carousel (if any)
    points = content.get("points", [])
    if points:
        for i, pt in enumerate(points, start=1):
            pt_clean = _strip_emoji(pt)
            # Number badge
            draw.ellipse([(60, y), (104, y + 44)], fill=ACCENT)
            draw.text((82, y + 22), str(i), font=_font(24, bold=True), fill=TEXT, anchor="mm")
            y = _wrap_draw_text(draw, pt_clean, 124, y + 4, _font(36), TEXT, W - 180, 8)
            y += 28
    else:
        # Fallback: show frame3 as muted supporting text
        frame3 = _strip_emoji(content.get("frame3", ""))
        y = _wrap_draw_text(draw, frame3, 60, y, _font(44), MUTED, W - 120, 14)
        y += 40

    # CTA strip near bottom
    cta_y = max(y + 60, H - 300)
    draw.rectangle([(60, cta_y), (W - 60, cta_y + 5)], fill=ACCENT)
    cta_text = _strip_emoji(content.get("frame3", ""))
    if points and cta_text:
        _wrap_draw_text(draw, cta_text, 60, cta_y + 30, _font(36), MUTED, W - 120, 10)

    # Bottom bar
    draw.rectangle([(0, H - 120), (W, H)], fill=CARD)
    draw.text((W // 2, H - 60), cfg.WEBSITE, font=_font(30), fill=MUTED, anchor="mm")

    path = os.path.join(out_dir, "story.jpg")
    img.save(path, "JPEG", quality=92)
    print(f"  OK Story -> {path}")


# ── Reel script ───────────────────────────────────────────────────────────────

def render_reel_script(content: dict, out_dir: str):
    lines  = content.get("script", [])
    path   = os.path.join(out_dir, "reel_script.txt")
    header = f"REEL SCRIPT — Day {content['day']}: {content['topic']}\n{'='*60}\n\n"
    body   = "\n".join(lines)
    footer = f"\n\n{'='*60}\nCAPTION:\n{content.get('caption','')}\n\nHASHTAGS:\n{content.get('hashtags','')}"
    with open(path, "w", encoding="utf-8") as f:
        f.write(header + body + footer)
    print(f"  OK Reel script -> {path}")


# ── Main render dispatcher ────────────────────────────────────────────────────

def render(content: dict, out_dir: str):
    os.makedirs(out_dir, exist_ok=True)
    t = content.get("type")
    if t == "carousel":
        render_carousel(content, out_dir)
        # Story: hook + up to 3 content points
        slides = content.get("slides", [])
        points = [s["text"] for s in slides if s["type"] == "point"][:3]
        story_content = {
            "type":   "story",
            "topic":  content["topic"],
            "frame2": slides[0]["text"] if slides else "",
            "frame3": slides[-1]["text"] if slides else "",
            "points": points,
        }
        render_story(story_content, out_dir)
    elif t == "static":
        render_static(content, out_dir)
        render_story({
            "type": "story", "topic": content["topic"],
            "frame2": content.get("hook", ""), "frame3": content.get("cta", ""),
        }, out_dir)
    elif t == "story":
        render_story(content, out_dir)
    elif t == "reel":
        render_reel_script(content, out_dir)
        # Cover image for reel thumbnail
        render_static({
            "type": "static", "hook": content["topic"],
            "body": content["script"][0] if content["script"] else "",
            "subtext": "", "cta": content.get("caption", "")[:60],
        }, out_dir)
    # Always save caption
    _save_caption(content, out_dir)


def _save_caption(content: dict, out_dir: str):
    path = os.path.join(out_dir, "caption.txt")
    with open(path, "w", encoding="utf-8") as f:
        f.write(f"CAPTION:\n{content.get('caption','')}\n\nHASHTAGS:\n{content.get('hashtags','')}")
    print(f"  OK Caption -> {path}")
