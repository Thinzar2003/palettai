import io
import sys
import types

import numpy as np
import pytest
from PIL import Image, ImageDraw

from app.logo_styles import build_flux_prompt, color_word, normalize_styles
from app.vectorize import VectorizeError, background_mask, image_to_logo_svg, load_image, prepare


def logo_png(bg=(250, 250, 248)) -> bytes:
    """A fake 'FLUX' logo: orange circle + dark square + white hole, on an off-white background."""
    img = Image.new("RGB", (1024, 1024), bg)
    d = ImageDraw.Draw(img)
    d.ellipse((300, 300, 700, 700), fill=(214, 110, 40))
    d.ellipse((450, 450, 550, 550), fill=(255, 255, 255))   # white hole inside the logo (negative space)
    d.rectangle((620, 620, 760, 760), fill=(40, 30, 25))
    buf = io.BytesIO()
    img.save(buf, "JPEG", quality=92)
    return buf.getvalue()


def fake_vtracer(monkeypatch):
    """Stand-in for vtracer: emits one path per colour region like the real tracer (key colour included)."""
    def convert(png, **kw):
        arr = np.asarray(Image.open(io.BytesIO(png)).convert("RGB"))
        h, w, _ = arr.shape
        colours = {tuple(int(v) for v in c) for c in arr.reshape(-1, 3)[:: 97]}
        paths = "".join(f'<path d="M0 0 L{w} 0 L{w} {h} Z" fill="#{r:02X}{g:02X}{b:02X}" transform="translate(1,1)"/>'
                        for r, g, b in sorted(colours))
        return f'<?xml version="1.0"?><svg version="1.1" xmlns="http://www.w3.org/2000/svg" width="{w}" height="{h}">{paths}</svg>'
    monkeypatch.setitem(sys.modules, "vtracer", types.SimpleNamespace(convert_raw_image_to_svg=convert))


def test_background_removed_but_inner_white_kept():
    rgb = load_image(logo_png())
    mask = background_mask(rgb)
    h, w, _ = rgb.shape
    assert mask[0, 0] and mask[h - 1, w - 1]           # corners are background
    assert not mask[h // 2, h // 2]                     # centre hole is enclosed: kept as negative space
    img, key = prepare(rgb)
    assert img.size[0] == img.size[1]                   # squared
    assert img.getpixel((0, 0)) == key                  # background replaced by the key colour


def test_pipeline_snaps_to_palette_and_drops_background(monkeypatch):
    fake_vtracer(monkeypatch)
    palette = ["#C8682C", "#F2D9B8", "#4E7A3A", "#FFF8EF", "#3B2418"]
    svg = image_to_logo_svg(logo_png(), palette)
    fills = set(__import__("re").findall(r'fill="(#[0-9A-F]{6})"', svg))
    assert fills and fills <= set(palette)              # every colour is a brand colour
    assert "#00FF00" not in svg and "#FF00FF" not in svg  # key colour removed
    assert 'viewBox="0 0 ' in svg and "width=" not in svg


def test_pipeline_keeps_own_colours_when_asked(monkeypatch):
    fake_vtracer(monkeypatch)
    svg = image_to_logo_svg(logo_png(), None)
    assert "#D66E28" in svg or "#D6" in svg              # original orange (approximately) kept


def test_empty_or_full_images_rejected():
    blank = io.BytesIO(); Image.new("RGB", (256, 256), "white").save(blank, "PNG")
    with pytest.raises(VectorizeError):
        prepare(load_image(blank.getvalue()))
    with pytest.raises(VectorizeError):
        load_image(b"not an image")


def test_styles_and_prompts():
    assert normalize_styles([]) == ["minimal", "geometric", "emblem"]
    assert normalize_styles([], ["Playful", "Warm"])[2] == "mascot"
    assert normalize_styles(["thai"]) == ["thai", "thai", "thai"]
    assert normalize_styles(["mascot", "line", "bogus"]) == ["mascot", "line", "mascot"]
    assert color_word("#C8682C") in ("orange", "brown") and color_word("#111111") == "near-black"
    p = build_flux_prompt("lettermark", "a tea leaf", "C", {"primary": "#C8682C", "text": "#3B2418"})
    assert '"C"' in p and "no other text" in p and "white background" in p
    assert "no letters" in build_flux_prompt("minimal", "a cup", "C", {"primary": "#C8682C"})
