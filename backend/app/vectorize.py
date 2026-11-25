"""Turn a generated logo image into a clean, safe, brand-coloured SVG.

    image → remove plain background → crop to the logo → trace to vector (vtracer)
          → drop the background shape → snap every colour to the brand palette → sanitise
"""
from __future__ import annotations

import io

import numpy as np
from PIL import Image

from .colors import hex_to_rgb
from .svg import SvgError, sanitize_svg

TRACE_SIZE = 448
RAW_MAX_LEN = 1_500_000      # tracer output before cleaning
OUT_MAX_LEN = 160_000        # final SVG stored in the database
OUT_MAX_ELEMENTS = 900
KEY_CANDIDATES = [(0, 255, 0), (255, 0, 255), (0, 255, 255), (255, 255, 0), (0, 0, 255), (255, 0, 0)]

# vtracer settings: detailed first, then simpler if the result is too heavy.
TRACE_PRESETS = [
    dict(filter_speckle=10, color_precision=6, layer_difference=24, path_precision=2,
         corner_threshold=70, length_threshold=6.0, splice_threshold=50),
    dict(filter_speckle=18, color_precision=5, layer_difference=40, path_precision=1,
         corner_threshold=80, length_threshold=8.0, splice_threshold=55),
]


class VectorizeError(RuntimeError):
    pass


def load_image(data: bytes) -> np.ndarray:
    try:
        img = Image.open(io.BytesIO(data))
        img.load()
    except Exception as e:  # noqa: BLE001 — any decoding problem is the same error for us
        raise VectorizeError("Could not read the generated image") from e
    img = img.convert("RGB")
    img.thumbnail((TRACE_SIZE, TRACE_SIZE), Image.LANCZOS)
    return np.asarray(img).copy()


def background_mask(rgb: np.ndarray, tolerance: int = 38) -> np.ndarray:
    """True where a pixel is the plain background connected to the image border."""
    h, w, _ = rgb.shape
    border = np.concatenate([rgb[0], rgb[-1], rgb[:, 0], rgb[:, -1]])
    bg = np.median(border, axis=0)
    near = np.abs(rgb.astype(np.int16) - bg.astype(np.int16)).max(axis=2) <= tolerance
    reached = np.zeros_like(near)
    reached[0], reached[-1], reached[:, 0], reached[:, -1] = near[0], near[-1], near[:, 0], near[:, -1]
    for _ in range(4 * (h + w)):  # grow from the edges through background pixels only
        grown = reached.copy()
        grown[1:] |= reached[:-1]
        grown[:-1] |= reached[1:]
        grown[:, 1:] |= reached[:, :-1]
        grown[:, :-1] |= reached[:, 1:]
        grown &= near
        if np.array_equal(grown, reached):
            break
        reached = grown
    return reached


def _pick_key(colours: np.ndarray) -> tuple[int, int, int]:
    """A colour far from every colour in the logo, used to mark 'transparent' for the tracer."""
    sample = colours[:: max(1, len(colours) // 4000)].astype(np.int16)
    best, best_d = KEY_CANDIDATES[0], -1
    for cand in KEY_CANDIDATES:
        d = np.abs(sample - np.array(cand, dtype=np.int16)).max(axis=1).min() if len(sample) else 255
        if d > best_d:
            best, best_d = cand, d
    return best


def prepare(rgb: np.ndarray) -> tuple[Image.Image, tuple[int, int, int]]:
    """Remove the background, crop to the logo with padding, square it. Returns (image, key colour)."""
    bg = background_mask(rgb)
    logo = ~bg
    if logo.mean() < 0.005:
        raise VectorizeError("The image looks empty")
    if logo.mean() > 0.97:
        raise VectorizeError("No plain background found around the logo")
    key = _pick_key(rgb[logo])
    out = rgb.copy()
    out[bg] = key

    ys, xs = np.where(logo)
    top, bottom, left, right = ys.min(), ys.max() + 1, xs.min(), xs.max() + 1
    side = int(max(bottom - top, right - left) * 1.12) + 2   # ~6% padding on each side
    cy, cx = (top + bottom) // 2, (left + right) // 2
    canvas = np.empty((side, side, 3), dtype=np.uint8)
    canvas[:] = key
    y0, x0 = cy - side // 2, cx - side // 2
    sy0, sx0 = max(0, y0), max(0, x0)
    sy1, sx1 = min(rgb.shape[0], y0 + side), min(rgb.shape[1], x0 + side)
    canvas[sy0 - y0:sy1 - y0, sx0 - x0:sx1 - x0] = out[sy0:sy1, sx0:sx1]
    img = Image.fromarray(canvas)
    if side > TRACE_SIZE:
        img = img.resize((TRACE_SIZE, TRACE_SIZE), Image.NEAREST)
    return img, key


def trace(img: Image.Image, preset: dict) -> str:
    import vtracer  # imported lazily: only needed when the image pipeline is used

    buf = io.BytesIO()
    img.save(buf, format="PNG")
    return vtracer.convert_raw_image_to_svg(
        buf.getvalue(), img_format="png", colormode="color", hierarchical="cutout", mode="spline",
        max_iterations=10, **preset,
    )


def _dist(a: tuple[int, int, int], b: tuple[int, int, int]) -> float:
    """'Redmean' colour distance: cheap and much closer to human perception than plain RGB."""
    rm = (a[0] + b[0]) / 2
    dr, dg, db = a[0] - b[0], a[1] - b[1], a[2] - b[2]
    return ((2 + rm / 256) * dr * dr + 4 * dg * dg + (2 + (255 - rm) / 256) * db * db) ** 0.5


def make_recolor(key: tuple[int, int, int], palette: list[str] | None):
    pal = [(h, hex_to_rgb(h)) for h in (palette or [])]

    def recolor(fill: str) -> str | None:
        try:
            rgb = hex_to_rgb(fill)
        except ValueError:
            return fill
        if _dist(rgb, key) < 60:
            return None                      # the background marker: drop the shape
        if not pal:
            return fill
        return min(pal, key=lambda p: _dist(rgb, p[1]))[0]

    return recolor


def image_to_logo_svg(data: bytes, palette: list[str] | None = None) -> str:
    """Full pipeline. `palette` = hex colours to snap to (None keeps the image's own colours)."""
    img, key = prepare(load_image(data))
    last: Exception | None = None
    for preset in TRACE_PRESETS:
        try:
            svg = sanitize_svg(trace(img, preset), max_len=RAW_MAX_LEN, max_elements=OUT_MAX_ELEMENTS,
                               recolor=make_recolor(key, palette))
            if len(svg) <= OUT_MAX_LEN:
                return svg
            last = SvgError("SVG too large")
        except SvgError as e:
            last = e
    raise VectorizeError(f"Tracing failed: {last}")
