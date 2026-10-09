#!/usr/bin/env python3
"""Generate app icons for AZKAHPS Play — yellow 'A' triangle on black."""
from PIL import Image, ImageDraw
import os

BASE = os.path.dirname(os.path.abspath(__file__))
RES = os.path.join(BASE, "android", "app", "src", "main", "res")

ACCENT = (255, 201, 40, 255)
BLACK = (0, 0, 0, 255)

SIZES = {
    "mipmap-mdpi": 48,
    "mipmap-hdpi": 72,
    "mipmap-xhdpi": 96,
    "mipmap-xxhdpi": 144,
    "mipmap-xxxhdpi": 192,
}

def draw_logo(size: int, rounded: bool = True) -> Image.Image:
    img = Image.new("RGBA", (size, size), (0, 0, 0, 0))
    d = ImageDraw.Draw(img)
    r = int(size * 0.22) if rounded else 0
    d.rounded_rectangle([0, 0, size - 1, size - 1], radius=r, fill=BLACK)
    # triangle "A" mark
    m = size * 0.18
    cx = size / 2
    top = (cx, m)
    bl = (m, size - m)
    br = (size - m, size - m)
    d.polygon([top, bl, br], fill=ACCENT)
    # inner cutout (letter A shape)
    i = size * 0.30
    d.polygon(
        [
            (cx, i + size * 0.14),
            (i, size - i + size * 0.02),
            (size - i, size - i + size * 0.02),
        ],
        fill=BLACK,
    )
    # crossbar
    bar_y = size * 0.66
    d.rectangle([size * 0.38, bar_y, size * 0.62, bar_y + size * 0.075], fill=ACCENT)
    return img

def main():
    for folder, size in SIZES.items():
        out = os.path.join(RES, folder)
        os.makedirs(out, exist_ok=True)
        # launcher icon (rounded)
        icon = draw_logo(size, rounded=True)
        icon.save(os.path.join(out, "ic_launcher.png"))
        # round variant
        round_img = Image.new("RGBA", (size, size), (0, 0, 0, 0))
        rd = ImageDraw.Draw(round_img)
        rd.ellipse([0, 0, size - 1, size - 1], fill=BLACK)
        logo = draw_logo(size, rounded=False)
        mask = Image.new("L", (size, size), 0)
        md = ImageDraw.Draw(mask)
        md.ellipse([0, 0, size - 1, size - 1], fill=255)
        round_img.paste(logo, (0, 0), mask)
        round_img.save(os.path.join(out, "ic_launcher_round.png"))
        # foreground for adaptive icon (logo centered on transparent, 108dp safe zone)
        fg_size = int(size * 1.5)
        fg = Image.new("RGBA", (fg_size, fg_size), (0, 0, 0, 0))
        logo_small = draw_logo(int(size * 0.72), rounded=True)
        off = (fg_size - logo_small.width) // 2
        fg.paste(logo_small, (off, off), logo_small)
        fg.save(os.path.join(out, "ic_launcher_foreground.png"))
        print(f"{folder}: {size}px done")

    # adaptive icon background color
    values = os.path.join(RES, "values")
    os.makedirs(values, exist_ok=True)
    with open(os.path.join(values, "ic_launcher_background.xml"), "w") as f:
        f.write('<?xml version="1.0" encoding="utf-8"?>\n<resources>\n    <color name="ic_launcher_background">#000000</color>\n</resources>\n')
    print("adaptive bg color written")

if __name__ == "__main__":
    main()
