#!/usr/bin/env python3
"""Generate native splash screens (black bg + centered yellow logo)."""
from PIL import Image, ImageDraw
import os

BASE = os.path.dirname(os.path.abspath(__file__))
RES = os.path.join(BASE, "android", "app", "src", "main", "res")

ACCENT = (255, 201, 40, 255)
BLACK = (0, 0, 0, 255)

# Capacitor default splash dimensions per density (portrait + landscape)
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

def draw_splash(w: int, h: int) -> Image.Image:
    img = Image.new("RGB", (w, h), BLACK)
    d = ImageDraw.Draw(img)
    # logo box size relative to smaller dimension
    s = int(min(w, h) * 0.28)
    cx, cy = w // 2, h // 2
    x0, y0 = cx - s // 2, cy - s // 2
    d.rounded_rectangle([x0, y0, x0 + s, y0 + s], radius=int(s * 0.22), fill=BLACK, outline=(40, 40, 40), width=max(2, s // 60))
    # triangle A
    m = s * 0.18
    d.polygon([(x0 + s / 2, y0 + m), (x0 + m, y0 + s - m), (x0 + s - m, y0 + s - m)], fill=ACCENT)
    i = s * 0.30
    d.polygon(
        [(x0 + s / 2, y0 + i + s * 0.14), (x0 + i, y0 + s - i + s * 0.02), (x0 + s - i, y0 + s - i + s * 0.02)],
        fill=BLACK,
    )
    bar_y = y0 + s * 0.66
    d.rectangle([x0 + s * 0.38, bar_y, x0 + s * 0.62, bar_y + s * 0.075], fill=ACCENT)
    return img

def main():
    for folder, (w, h) in SPLASHES.items():
        out = os.path.join(RES, folder)
        os.makedirs(out, exist_ok=True)
        draw_splash(w, h).save(os.path.join(out, "splash.png"))
        print(f"{folder}: {w}x{h}")

if __name__ == "__main__":
    main()
