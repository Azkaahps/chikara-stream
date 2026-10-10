#!/usr/bin/env python3
"""Generate native splash screens for Chikara Stream (black bg + yellow C tile)."""
import math
import os

from PIL import Image, ImageDraw

BASE = os.path.dirname(os.path.abspath(__file__))
ROOT = os.path.dirname(BASE)
RES = os.path.join(ROOT, "android", "app", "src", "main", "res")

ACCENT = (255, 201, 40, 255)
BLACK = (0, 0, 0, 255)
SS = 2  # supersampling factor for anti-aliased edges

SPLASHES = {
    "drawable": (480, 320),
    "drawable-land-mdpi": (480, 320),
    "drawable-land-hdpi": (800, 480),
    "drawable-land-xhdpi": (1280, 720),
    "drawable-land-xxhdpi": (1600, 960),
    "drawable-land-xxxhdpi": (1920, 1280),
    "drawable-port-mdpi": (320, 480),
    "drawable-port-hdpi": (480, 800),
    "drawable-port-xhdpi": (720, 1280),
    "drawable-port-xxhdpi": (960, 1600),
    "drawable-port-xxxhdpi": (1280, 1920),
}


def draw_c(d, cx, cy, size, color=ACCENT):
    r = size / 2.0
    w = max(2.0, size * 0.165)
    bbox = [cx - r, cy - r, cx + r, cy + r]
    start, end = 38, 322
    d.arc(bbox, start=start, end=end, fill=color, width=int(round(w)))
    rr = w / 2.0
    for ang in (start, end):
        ex = cx + r * math.cos(math.radians(ang))
        ey = cy + r * math.sin(math.radians(ang))
        d.ellipse([ex - rr, ey - rr, ex + rr, ey + rr], fill=color)


def draw_splash(w: int, h: int) -> Image.Image:
    big_w, big_h = w * SS, h * SS
    img = Image.new("RGB", (big_w, big_h), BLACK)
    d = ImageDraw.Draw(img)
    s = int(min(big_w, big_h) * 0.28)
    cx, cy = big_w // 2, big_h // 2
    x0, y0 = cx - s // 2, cy - s // 2
    d.rounded_rectangle(
        [x0, y0, x0 + s, y0 + s],
        radius=int(s * 0.22),
        fill=BLACK,
        outline=(40, 40, 40),
        width=max(2, s // 60),
    )
    draw_c(d, cx, cy, s * 0.56)
    return img.resize((w, h), Image.LANCZOS)


def main() -> None:
    for folder, (w, h) in SPLASHES.items():
        out = os.path.join(RES, folder)
        os.makedirs(out, exist_ok=True)
        draw_splash(w, h).save(os.path.join(out, "splash.png"))
        print(f"{folder}: {w}x{h}")


if __name__ == "__main__":
    main()
