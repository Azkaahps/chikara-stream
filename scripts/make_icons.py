#!/usr/bin/env python3
"""Generate app icons for Chikara Stream — yellow letter 'C' on black."""
import math
import os

from PIL import Image, ImageDraw

BASE = os.path.dirname(os.path.abspath(__file__))
ROOT = os.path.dirname(BASE)  # project root (scripts/ -> root)
RES = os.path.join(ROOT, "android", "app", "src", "main", "res")

ACCENT = (255, 201, 40, 255)
BLACK = (0, 0, 0, 255)
SS = 4  # supersampling factor — renders big, downscales with LANCZOS (anti-aliased)

SIZES = {
    "mipmap-mdpi": 48,
    "mipmap-hdpi": 72,
    "mipmap-xhdpi": 96,
    "mipmap-xxhdpi": 144,
    "mipmap-xxxhdpi": 192,
}


def draw_c(d: "ImageDraw.ImageDraw", cx: float, cy: float, size: float, color=ACCENT) -> None:
    """Draw a thick letter C (arc with the opening on the right)."""
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


def draw_launcher(size: int, rounded: bool = True) -> Image.Image:
    """Launcher tile rendered at SS scale, downsampled to `size`."""
    big = size * SS
    img = Image.new("RGBA", (big, big), (0, 0, 0, 0))
    d = ImageDraw.Draw(img)
    r = int(big * 0.22) if rounded else 0
    d.rounded_rectangle([0, 0, big - 1, big - 1], radius=r, fill=BLACK)
    draw_c(d, big / 2.0, big / 2.0, big * 0.56)
    return img.resize((size, size), Image.LANCZOS)


def main() -> None:
    for folder, size in SIZES.items():
        out = os.path.join(RES, folder)
        os.makedirs(out, exist_ok=True)

        # legacy launcher icon (rounded black tile + yellow C)
        draw_launcher(size, rounded=True).save(os.path.join(out, "ic_launcher.png"))

        # legacy round icon (black circle + yellow C)
        big = size * SS
        round_big = Image.new("RGBA", (big, big), (0, 0, 0, 0))
        rd = ImageDraw.Draw(round_big)
        rd.ellipse([0, 0, big - 1, big - 1], fill=BLACK)
        logo_big = Image.new("RGBA", (big, big), (0, 0, 0, 0))
        ld = ImageDraw.Draw(logo_big)
        draw_c(ld, big / 2.0, big / 2.0, big * 0.56)
        mask = Image.new("L", (big, big), 0)
        md = ImageDraw.Draw(mask)
        md.ellipse([0, 0, big - 1, big - 1], fill=255)
        round_big.paste(logo_big, (0, 0), mask)
        round_big.resize((size, size), Image.LANCZOS).save(
            os.path.join(out, "ic_launcher_round.png")
        )

        # adaptive foreground: transparent canvas (1.5x) with centered C
        fg_size = int(size * 1.5)
        big_fg = fg_size * SS
        fg = Image.new("RGBA", (big_fg, big_fg), (0, 0, 0, 0))
        fd = ImageDraw.Draw(fg)
        draw_c(fd, big_fg / 2.0, big_fg / 2.0, big_fg * 0.33)
        fg.resize((fg_size, fg_size), Image.LANCZOS).save(
            os.path.join(out, "ic_launcher_foreground.png")
        )

        print(f"{folder}: {size}px done")

    values = os.path.join(RES, "values")
    os.makedirs(values, exist_ok=True)
    with open(os.path.join(values, "ic_launcher_background.xml"), "w") as f:
        f.write(
            '<?xml version="1.0" encoding="utf-8"?>\n'
            "<resources>\n"
            '    <color name="ic_launcher_background">#000000</color>\n'
            "</resources>\n"
        )
    print("adaptive bg color written to", values)


if __name__ == "__main__":
    main()
