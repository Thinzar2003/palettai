from app.colors import (AA_LARGE, AA_NORMAL, adjust_for_contrast, best_text_on,
                        contrast_ratio, fix_palette, normalize_hex)


def test_normalize():
    assert normalize_hex("abc") == "#AABBCC"
    assert normalize_hex("#c8682c") == "#C8682C"


def test_black_white_ratio():
    assert contrast_ratio("#000000", "#FFFFFF") == 21.0


def test_best_text():
    assert best_text_on("#FFF8EF") == "#111111"
    assert best_text_on("#0F4C44") == "#FFFFFF"


def test_adjust_reaches_target():
    fixed = adjust_for_contrast("#F2D9B8", "#FFF8EF")
    assert contrast_ratio(fixed, "#FFF8EF") >= AA_NORMAL


def test_fix_palette_repairs_bad_text():
    palette = {"primary": "#FFE08A", "secondary": "#F2D9B8", "accent": "#4E7A3A",
               "background": "#FFFFFF", "text": "#CCCCCC"}
    fixed, on_primary, report = fix_palette(palette)
    assert contrast_ratio(fixed["text"], fixed["background"]) >= AA_NORMAL
    assert contrast_ratio(fixed["primary"], fixed["background"]) >= AA_LARGE
    assert all(r["passes"] for r in report)
