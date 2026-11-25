"""Sanitise AI-generated SVG so it is safe to render in the browser.

The model's SVG is rebuilt from scratch using a strict whitelist of shape elements
and presentation attributes. Anything else (scripts, event handlers, external
links, text, images, foreignObject…) is dropped.
"""
from __future__ import annotations

import re
import xml.etree.ElementTree as ET
from collections.abc import Callable

SVG_NS = "http://www.w3.org/2000/svg"

ALLOWED_TAGS = {
    "svg", "g", "path", "circle", "ellipse", "rect", "line", "polyline", "polygon",
    "defs", "linearGradient", "radialGradient", "stop",
}
ALLOWED_ATTRS = {
    "viewBox", "d", "cx", "cy", "r", "rx", "ry", "x", "y", "x1", "y1", "x2", "y2",
    "width", "height", "points", "fill", "stroke", "stroke-width", "stroke-linecap",
    "stroke-linejoin", "stroke-miterlimit", "opacity", "fill-opacity", "stroke-opacity",
    "transform", "id", "offset", "stop-color", "stop-opacity", "gradientUnits",
    "gradientTransform", "fill-rule", "clip-rule", "fx", "fy",
}
MAX_LEN = 20_000
MAX_ELEMENTS = 80
_SAFE_URL = re.compile(r"^url\(#[A-Za-z0-9_-]+\)$")
_BAD = re.compile(r"javascript:|expression\(|<|>|@import", re.I)


class SvgError(ValueError):
    pass


def _local(name: str) -> str:
    return name.rsplit("}", 1)[-1]


def _clean_value(value: str) -> str | None:
    value = value.strip()
    if _BAD.search(value):
        return None
    if "url(" in value.lower() and not _SAFE_URL.match(value):
        return None
    return value[:2000]


def _number(value: str | None) -> float | None:
    m = re.match(r"^\s*([0-9]+(?:\.[0-9]+)?)\s*(px)?\s*$", value or "")
    return float(m.group(1)) if m else None


def sanitize_svg(
    raw: str,
    max_len: int = MAX_LEN,
    max_elements: int = MAX_ELEMENTS,
    recolor: Callable[[str], str | None] | None = None,
) -> str:
    """`recolor(fill_hex)` may return a new colour, or None to drop that shape entirely."""
    if not raw or len(raw) > max_len:
        raise SvgError("SVG missing or too large")
    if "<!DOCTYPE" in raw or "<!ENTITY" in raw:
        raise SvgError("DOCTYPE/ENTITY not allowed")
    start, end = raw.find("<svg"), raw.rfind("</svg>")
    if start == -1 or end == -1:
        raise SvgError("No <svg> element")
    raw = raw[start:end + 6]
    try:
        src = ET.fromstring(raw)
    except ET.ParseError as e:
        raise SvgError(f"Invalid SVG: {e}") from e

    count = 0

    def copy(node: ET.Element) -> ET.Element | None:
        nonlocal count
        tag = _local(node.tag)
        if tag not in ALLOWED_TAGS:
            return None
        out = ET.Element(tag)
        for k, v in node.attrib.items():
            name = _local(k)
            if name in ALLOWED_ATTRS:
                cleaned = _clean_value(v)
                if cleaned is not None:
                    out.set(name, cleaned)
        if recolor and tag != "svg" and out.get("fill", "").startswith("#"):
            new = recolor(out.get("fill", ""))
            if new is None:
                return None
            out.set("fill", new)
        count += 1
        if count > max_elements:
            raise SvgError("SVG too complex")
        for child in node:
            c = copy(child)
            if c is not None:
                out.append(c)
        return out

    root = copy(src)
    if root is None or root.tag != "svg":
        raise SvgError("Root must be <svg>")
    if len(root) == 0:
        raise SvgError("SVG has no shapes")
    if not root.get("viewBox"):
        w, h = _number(root.get("width")), _number(root.get("height"))
        root.set("viewBox", f"0 0 {w:g} {h:g}" if w and h else "0 0 100 100")
    root.attrib.pop("width", None)
    root.attrib.pop("height", None)
    root.set("xmlns", SVG_NS)
    return ET.tostring(root, encoding="unicode")
