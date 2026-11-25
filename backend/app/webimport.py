"""Read a business's existing website or public Facebook page to pre-fill the brief.

Safety: the server fetches URLs that users type, so every request (and every redirect)
is checked to be plain http(s) on ports 80/443 to a public internet address, with a
size limit and a timeout. Private, loopback and cloud-metadata addresses are refused.
"""
from __future__ import annotations

import asyncio
import colorsys
import ipaddress
import re
from collections import Counter
from html.parser import HTMLParser
from urllib.parse import parse_qs, urljoin, urlparse

import httpx

from .colors import hex_to_rgb, normalize_hex

MAX_PAGE_BYTES = 1_500_000
MAX_CSS_BYTES = 400_000
MAX_CSS_FILES = 2
MAX_REDIRECTS = 4
TIMEOUT = httpx.Timeout(12, connect=6)
BROWSER_UA = ("Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 "
              "(KHTML, like Gecko) Chrome/131.0 Safari/537.36 PalettaiBot/1.0")
# Facebook only shows public page details (og: tags) to link-preview crawlers.
FACEBOOK_UA = "facebookexternalhit/1.1 (+http://www.facebook.com/externalhit_uatext.php)"
GENERIC_FONTS = {
    "sans-serif", "serif", "monospace", "cursive", "fantasy", "system-ui", "-apple-system",
    "blinkmacsystemfont", "segoe ui", "roboto", "helvetica", "helvetica neue", "arial", "inherit",
    "initial", "ui-sans-serif", "ui-serif", "ui-monospace", "apple color emoji", "segoe ui emoji",
    "noto color emoji", "segoe ui symbol", "times new roman", "georgia", "verdana", "tahoma",
    "courier new", "font awesome", "fontawesome", "icomoon", "dashicons", "var", "unset",
}


class WebImportError(RuntimeError):
    pass


# ── URL safety ───────────────────────────────────────────────────────────────
def normalize_url(raw: str) -> str:
    raw = (raw or "").strip()
    if not raw:
        raise WebImportError("Please enter a link")
    if not re.match(r"^[a-zA-Z][a-zA-Z0-9+.-]*://", raw):
        raw = "https://" + raw
    if re.match(r"^(javascript|data|file|vbscript|about|blob):", raw, re.I):
        raise WebImportError("Only http and https links are supported")
    try:
        u = urlparse(raw)
        port = u.port
    except ValueError as e:
        raise WebImportError("That doesn't look like a web address") from e
    if u.scheme not in ("http", "https"):
        raise WebImportError("Only http and https links are supported")
    if not u.hostname or "." not in u.hostname.strip("[]") and ":" not in u.hostname:
        raise WebImportError("That doesn't look like a web address")
    if port not in (None, 80, 443):
        raise WebImportError("Only standard web ports are allowed")
    if u.username or u.password:
        raise WebImportError("Links with a username or password aren't allowed")
    return u._replace(fragment="").geturl()


def _is_public(ip: ipaddress.IPv4Address | ipaddress.IPv6Address) -> bool:
    if isinstance(ip, ipaddress.IPv6Address) and ip.ipv4_mapped:
        ip = ip.ipv4_mapped
    return ip.is_global and not ip.is_multicast


async def check_host(host: str) -> None:
    """Refuse hosts that resolve to private, loopback, link-local or reserved addresses."""
    host = host.strip("[]").lower()
    if host == "localhost" or host.endswith((".localhost", ".local", ".internal")):
        raise WebImportError("That address isn't allowed")
    try:
        ips = [ipaddress.ip_address(host)]
    except ValueError:
        try:
            infos = await asyncio.get_running_loop().getaddrinfo(host, None)
        except OSError as e:
            raise WebImportError("Couldn't find that website. Check the link.") from e
        ips = [ipaddress.ip_address(info[4][0].split("%")[0]) for info in infos]
    if not ips or not all(_is_public(ip) for ip in ips):
        raise WebImportError("That address isn't allowed")


def is_facebook(url: str) -> bool:
    host = (urlparse(url).hostname or "").lower()
    return host in ("fb.com", "fb.me") or host.endswith((".facebook.com", ".fb.com")) or host == "facebook.com"


async def fetch(url: str, user_agent: str = BROWSER_UA, max_bytes: int = MAX_PAGE_BYTES) -> tuple[str, str]:
    """GET a public URL safely. Returns (final_url, text)."""
    url = normalize_url(url)
    headers = {"User-Agent": user_agent, "Accept-Language": "th,en;q=0.8",
               "Accept": "text/html,application/xhtml+xml,text/css;q=0.9,*/*;q=0.5"}
    async with httpx.AsyncClient(timeout=TIMEOUT, follow_redirects=False, headers=headers) as client:
        for _ in range(MAX_REDIRECTS + 1):
            await check_host(urlparse(url).hostname or "")
            try:
                async with client.stream("GET", url) as resp:
                    if resp.status_code in (301, 302, 303, 307, 308):
                        url = normalize_url(urljoin(url, resp.headers.get("location", "")))
                        continue
                    if resp.status_code >= 400:
                        raise WebImportError(f"The website answered with an error ({resp.status_code})")
                    chunks, size = [], 0
                    async for chunk in resp.aiter_bytes():
                        size += len(chunk)
                        if size > max_bytes:
                            break
                        chunks.append(chunk)
                    body = b"".join(chunks)
                    return url, body.decode(resp.encoding or "utf-8", errors="replace")
            except httpx.HTTPError as e:
                raise WebImportError("Couldn't reach that website") from e
    raise WebImportError("Too many redirects")


# ── HTML / CSS reading ───────────────────────────────────────────────────────
class _PageParser(HTMLParser):
    SKIP = {"script", "style", "noscript", "svg", "template", "iframe"}

    def __init__(self):
        super().__init__(convert_charrefs=True)
        self.title, self.lang = "", ""
        self.metas: dict[str, str] = {}
        self.links: list[tuple[str, str]] = []
        self.css: list[str] = []
        self.text: list[str] = []
        self.headings: list[str] = []
        self._skip = 0
        self._in = ""

    def handle_starttag(self, tag, attrs):
        a = {k.lower(): (v or "") for k, v in attrs}
        if "style" in a:
            self.css.append(a["style"])
        if tag == "html":
            self.lang = a.get("lang", "")
        elif tag == "meta":
            key = (a.get("property") or a.get("name") or "").lower()
            if key and a.get("content"):
                self.metas.setdefault(key, a["content"].strip())
        elif tag == "link":
            self.links.append((a.get("rel", "").lower(), a.get("href", "")))
        if tag in self.SKIP:
            self._skip += 1
        if tag in ("title", "style", "h1", "h2", "h3"):
            self._in = tag

    def handle_endtag(self, tag):
        if tag in self.SKIP and self._skip:
            self._skip -= 1
        if tag == self._in:
            self._in = ""

    def handle_data(self, data):
        if self._in == "style":
            self.css.append(data)
            return
        if self._in == "title":
            self.title += data
            return
        if self._skip:
            return
        d = " ".join(data.split())
        if d:
            self.text.append(d)
            if self._in in ("h1", "h2", "h3") and len(self.headings) < 12:
                self.headings.append(d)


_HEX = re.compile(r"#([0-9a-fA-F]{6}|[0-9a-fA-F]{3})(?![0-9a-zA-Z])")
_RGB = re.compile(r"rgba?\(\s*(\d{1,3})[\s,]+(\d{1,3})[\s,]+(\d{1,3})")
_FONT = re.compile(r"font-family\s*:\s*([^;}{]+)", re.I)


def css_colors(css: str) -> Counter:
    counts: Counter = Counter()
    for m in _HEX.finditer(css):
        try:
            counts[normalize_hex(m.group(0))] += 1
        except ValueError:
            pass
    for m in _RGB.finditer(css):
        r, g, b = (min(255, int(x)) for x in m.groups())
        counts[f"#{r:02X}{g:02X}{b:02X}"] += 1
    return counts


def css_fonts(css: str) -> Counter:
    counts: Counter = Counter()
    for m in _FONT.finditer(css):
        first = m.group(1).split(",")[0].strip().strip("'\"").strip()
        if first and first.lower() not in GENERIC_FONTS and not first.startswith(("var(", "--")) and len(first) < 40:
            counts[first] += 1
    return counts


def google_fonts(links: list[tuple[str, str]]) -> list[str]:
    names = []
    for _, href in links:
        if "fonts.googleapis.com" in href:
            for fam in parse_qs(urlparse(href).query).get("family", []):
                for part in fam.split("|"):
                    name = part.split(":")[0].replace("+", " ").strip()
                    if name and name not in names:
                        names.append(name)
    return names


def brand_colors(counts: Counter, boost: list[str] | None = None, limit: int = 5) -> list[str]:
    """Most-used *distinct* colours, saturated ones first (greys/white/black are layout, not brand)."""
    for h in boost or []:
        try:
            counts[normalize_hex(h)] += 25
        except ValueError:
            pass

    def chroma(h: str) -> tuple[float, float]:
        r, g, b = (c / 255 for c in hex_to_rgb(h))
        _, l, s = colorsys.rgb_to_hls(r, g, b)
        return s, l

    saturated = [h for h, _ in counts.most_common() if chroma(h)[0] > 0.18 and 0.1 < chroma(h)[1] < 0.93]
    neutral = [h for h, _ in counts.most_common() if h not in saturated]
    picked: list[str] = []
    for h in saturated + neutral[:2]:
        rgb = hex_to_rgb(h)
        if all(sum(abs(x - y) for x, y in zip(rgb, hex_to_rgb(p))) > 60 for p in picked):
            picked.append(h)
        if len(picked) >= limit:
            break
    return picked


def parse_page(html: str, base_url: str) -> dict:
    p = _PageParser()
    try:
        p.feed(html)
    except Exception:  # noqa: BLE001 — broken HTML: keep what was parsed
        pass
    m = p.metas
    text = " ".join(p.text)
    image = m.get("og:image") or m.get("twitter:image") or ""
    stylesheets = [urljoin(base_url, href) for rel, href in p.links
                   if "stylesheet" in rel and href and "fonts.googleapis.com" not in href]
    return {
        "url": base_url,
        "title": (m.get("og:title") or p.title or "").strip()[:200],
        "site_name": m.get("og:site_name", "")[:100],
        "description": (m.get("og:description") or m.get("description") or "")[:600],
        "headings": p.headings,
        "text": text[:4000],
        "lang": p.lang[:10],
        "image": urljoin(base_url, image) if image else "",
        "theme_color": m.get("theme-color", ""),
        "google_fonts": google_fonts(p.links),
        "inline_css": "\n".join(p.css)[:300_000],
        "stylesheets": stylesheets,
    }


async def read_site(url: str) -> dict:
    """Fetch and analyse a page. Returns page info incl. likely brand colours and fonts."""
    fb = is_facebook(normalize_url(url))
    final_url, html = await fetch(url, FACEBOOK_UA if fb else BROWSER_UA)
    info = parse_page(html, final_url)
    info["from_facebook"] = fb

    css = info.pop("inline_css")
    site_host = urlparse(final_url).hostname
    same_site = [s for s in info.pop("stylesheets") if urlparse(s).hostname == site_host][:MAX_CSS_FILES]
    if same_site and not fb:
        results = await asyncio.gather(*(fetch(s, max_bytes=MAX_CSS_BYTES) for s in same_site), return_exceptions=True)
        css += "\n".join(r[1] for r in results if isinstance(r, tuple))

    info["colors"] = brand_colors(css_colors(css), [info["theme_color"]] if info["theme_color"] else None)
    fonts = info.pop("google_fonts") + [f for f, _ in css_fonts(css).most_common(6)]
    info["fonts"] = list(dict.fromkeys(fonts))[:4]

    if len(info["text"]) < 80 and not info["description"]:
        hint = ("Facebook only shares a little about pages without logging in. "
                if fb else "This page loads its content with JavaScript or needs a login. ")
        raise WebImportError(hint + "Please paste a short description of the business instead.")
    return info
