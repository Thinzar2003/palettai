import pytest

from app.svg import SvgError, sanitize_svg


def test_keeps_shapes_and_colours():
    out = sanitize_svg('<svg viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg">'
                       '<circle cx="50" cy="50" r="40" fill="#C8682C"/></svg>')
    assert "<circle" in out and 'fill="#C8682C"' in out and 'viewBox="0 0 100 100"' in out


def test_strips_dangerous_content():
    evil = ('```svg\n<svg xmlns="http://www.w3.org/2000/svg" width="10" onload="alert(1)">'
            '<script>alert(1)</script><a href="javascript:x"><rect width="5" height="5"/></a>'
            '<rect x="1" y="1" width="9" height="9" fill="url(http://evil)" onclick="x()"/>'
            '<foreignObject><div>hi</div></foreignObject><text>Hi</text>'
            '<path d="M0 0L10 10" style="background:url(x)"/></svg>\n```')
    out = sanitize_svg(evil)
    for bad in ("script", "onload", "onclick", "javascript", "foreignObject", "<text", "style=",
                "http://evil", 'width="10"'):
        assert bad not in out, bad
    assert "<rect" in out and "<path" in out


def test_allows_internal_gradient_refs():
    out = sanitize_svg('<svg viewBox="0 0 100 100"><defs><linearGradient id="g1"><stop offset="0" '
                       'stop-color="#fff"/></linearGradient></defs><rect width="100" height="100" '
                       'fill="url(#g1)"/></svg>')
    assert 'fill="url(#g1)"' in out


@pytest.mark.parametrize("bad", ["", "no svg here", "<svg><circle", '<!DOCTYPE x><svg><rect/></svg>',
                                 "<svg></svg>", "<svg><text>A</text></svg>"])
def test_rejects_invalid(bad):
    with pytest.raises(SvgError):
        sanitize_svg(bad)
