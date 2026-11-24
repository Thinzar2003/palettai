import re
import secrets
import unicodedata


def slugify(text: str) -> str:
    """'Cha Yen House!' -> 'cha-yen-house-x7k2' (random suffix keeps share links unguessable)."""
    ascii_text = unicodedata.normalize("NFKD", text).encode("ascii", "ignore").decode()
    base = re.sub(r"[^a-z0-9]+", "-", ascii_text.lower()).strip("-")[:50] or "brand"
    return f"{base}-{secrets.token_hex(3)}"
