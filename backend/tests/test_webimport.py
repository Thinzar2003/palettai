import asyncio

import pytest

import app.webimport as wi
from app.webimport import (WebImportError, brand_colors, check_host, css_colors, css_fonts, is_facebook,
                           normalize_url, parse_page)

HTML = """<!doctype html><html lang="th"><head>
<title>Shal Pal Teahouse | ร้านชาพม่า</title>
<meta name="description" content="Burmese tea and food near Rangsit University">
<meta property="og:image" content="/img/cover.jpg"><meta name="theme-color" content="#2F5D3A">
<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Kanit:wght@400;700&family=Playfair+Display">
<link rel="stylesheet" href="/css/site.css">
<style>body{background:#FFF8EF;color:#222;font-family:'Kanit',sans-serif} .btn{background:#C8682C}
.btn:hover{background:#c8682c} h1{font-family: "Playfair Display", serif; color:rgb(47, 93, 58)}</style>
<script>var x = "#123456"; document.write("hidden")</script></head>
<body><nav>Home Menu</nav><h1>Real Burmese Milk Tea</h1><p style="color:#C8682C">Lahpet salad, mohinga &amp; laphet yay.</p>
<noscript>enable js</noscript></body></html>"""


def test_parse_page():
    info = parse_page(HTML, "https://shalpal.example/")
    assert info["title"].startswith("Shal Pal Teahouse") and info["lang"] == "th"
    assert "Burmese tea" in info["description"] and "Real Burmese Milk Tea" in info["headings"]
    assert "hidden" not in info["text"] and "enable js" not in info["text"] and "&" in info["text"]
    assert info["image"] == "https://shalpal.example/img/cover.jpg"
    assert info["google_fonts"] == ["Kanit", "Playfair Display"]
    assert "https://shalpal.example/css/site.css" in info["stylesheets"]
    colors = brand_colors(css_colors(info["inline_css"]), [info["theme_color"]])
    assert colors[0] == "#2F5D3A" and "#C8682C" in colors and "#123456" not in colors  # script colours ignored
    assert list(css_fonts(info["inline_css"])) == ["Kanit", "Playfair Display"]


@pytest.mark.parametrize("url,ok", [
    ("shalpal.co.th", True), ("https://www.facebook.com/shalpal", True),
    ("ftp://x.com", False), ("javascript:alert(1)", False), ("file:///etc/passwd", False),
    ("http://x.com:8080/", False), ("https://user:pw@x.com", False), ("", False),
])
def test_normalize_url(url, ok):
    if ok:
        assert normalize_url(url).startswith("https://")
    else:
        with pytest.raises(WebImportError):
            normalize_url(url)


@pytest.mark.parametrize("host", ["localhost", "127.0.0.1", "10.0.0.5", "192.168.1.1", "169.254.169.254",
                                  "[::1]", "0.0.0.0", "100.64.0.1", "metadata.google.internal", "::ffff:127.0.0.1"])
def test_private_hosts_blocked(host):
    with pytest.raises(WebImportError):
        asyncio.run(check_host(host))


def test_public_ip_allowed():
    asyncio.run(check_host("1.1.1.1"))


def test_redirect_to_private_address_blocked(monkeypatch):
    class Resp:
        def __init__(self, status, location=""):
            self.status_code, self.headers, self.encoding = status, {"location": location}, "utf-8"
        async def __aenter__(self): return self
        async def __aexit__(self, *a): pass
        async def aiter_bytes(self):
            yield b"<html>ok</html>"

    class Client:
        def __init__(self, *a, **k): pass
        async def __aenter__(self): return self
        async def __aexit__(self, *a): pass
        def stream(self, method, url):
            return Resp(302, "http://169.254.169.254/latest/meta-data") if "1.1.1.1" in url else Resp(200)

    monkeypatch.setattr(wi.httpx, "AsyncClient", Client)
    with pytest.raises(WebImportError, match="isn't allowed"):
        asyncio.run(wi.fetch("https://1.1.1.1/"))


def test_is_facebook():
    assert is_facebook("https://www.facebook.com/x") and is_facebook("https://m.facebook.com/x")
    assert is_facebook("https://fb.me/x") and not is_facebook("https://notfacebook.com/x")
