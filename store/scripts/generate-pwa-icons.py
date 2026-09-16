"""Generate PWA icon sizes from the existing Nahla Mall logo (no redesign)."""
from __future__ import annotations

from pathlib import Path

from PIL import Image

SRC = Path(__file__).resolve().parents[1] / "assets" / "images" / "logBeeIcon.png"
OUT = Path(__file__).resolve().parents[1] / "public" / "icons"
BRAND_BG = (240, 240, 240, 255)


def square_crop(img: Image.Image) -> Image.Image:
    w, h = img.size
    side = min(w, h)
    left = (w - side) // 2
    top = (h - side) // 2
    return img.crop((left, top, left + side, top + side))


def main() -> None:
    OUT.mkdir(parents=True, exist_ok=True)
    src = Image.open(SRC).convert("RGBA")
    square = square_crop(src)

    for dim, name in (
        (192, "icon-192.png"),
        (512, "icon-512.png"),
        (180, "apple-touch-icon.png"),
    ):
        square.resize((dim, dim), Image.LANCZOS).save(OUT / name, optimize=True)

    # Maskable: logo ~60% of canvas on brand background (safe zone)
    dim = 512
    canvas = Image.new("RGBA", (dim, dim), BRAND_BG)
    logo_size = int(dim * 0.62)
    logo = square.resize((logo_size, logo_size), Image.LANCZOS)
    offset = (dim - logo_size) // 2
    canvas.paste(logo, (offset, offset), logo)
    canvas.save(OUT / "icon-maskable-512.png", optimize=True)
    print(f"Generated icons in {OUT}")


if __name__ == "__main__":
    main()
