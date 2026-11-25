"""Image generation with FLUX on Cloudflare Workers AI (free daily allowance)."""
from __future__ import annotations

import base64
import os
import re

import httpx

DEFAULT_MODEL = "@cf/black-forest-labs/flux-1-schnell"


class ImageGenError(RuntimeError):
    def __init__(self, message: str, blocked: bool = False):
        super().__init__(message)
        self.blocked = blocked  # the provider's safety filter refused this prompt


def _clean(value: str | None) -> str:
    """IDs and tokens never contain whitespace: drop any spaces/tabs/line breaks and quotes
    picked up while copy-pasting (they make the HTTP request invalid before it's even sent)."""
    v = re.sub(r"\s+", "", value or "").strip("\"'")
    return re.sub(r"^bearer", "", v, flags=re.I)  # in case "Bearer xxx" was pasted


def _creds() -> tuple[str, str]:
    return _clean(os.getenv("CLOUDFLARE_ACCOUNT_ID")), _clean(os.getenv("CLOUDFLARE_API_TOKEN"))


def credentials_problem() -> str | None:
    """A human-readable problem with the Cloudflare settings (never includes the secret itself)."""
    account, token = _creds()
    if not account or not token:
        return "add CLOUDFLARE_ACCOUNT_ID + CLOUDFLARE_API_TOKEN"
    if not re.fullmatch(r"[0-9a-fA-F]{32}", account):
        return f"CLOUDFLARE_ACCOUNT_ID looks wrong ({len(account)} characters; it should be 32 letters/numbers)"
    if not re.fullmatch(r"[A-Za-z0-9_.\-]{20,}", token):
        bad = sorted({c for c in token if not re.match(r"[A-Za-z0-9_.\-]", c)})
        return (f"CLOUDFLARE_API_TOKEN looks wrong ({len(token)} characters"
                + (f", unexpected characters: {' '.join(repr(c) for c in bad[:5])}" if bad else "") + ")")
    return None


def image_model() -> str:
    return os.getenv("CLOUDFLARE_IMAGE_MODEL") or DEFAULT_MODEL


def image_configured() -> bool:
    account, token = _creds()
    return bool(account and token)


def image_status() -> str:
    problem = credentials_problem()
    return f"off ({problem})" if problem else image_model()


def _rejected_property(resp) -> str | None:
    """'Additional or unevaluated properties '/seed' at '/' not allowed' -> 'seed'."""
    m = re.search(r"properties '/([A-Za-z_]+)'", resp.text or "")
    return m.group(1) if m else None


async def generate_image(prompt: str, seed: int | None = None, steps: int = 6) -> bytes:
    """Returns the generated image bytes (JPEG/PNG)."""
    problem = credentials_problem()
    if problem:
        raise ImageGenError(problem)
    account, token = _creds()
    url = f"https://api.cloudflare.com/client/v4/accounts/{account}/ai/run/{image_model()}"
    # Optional settings: if the model's schema rejects one (Cloudflare changes these over time),
    # drop it and retry, so a removed parameter never breaks logo generation.
    payload: dict = {"prompt": prompt[:2000], "steps": steps}
    if seed is not None:
        payload["seed"] = seed
    try:
        async with httpx.AsyncClient(timeout=httpx.Timeout(60, connect=10)) as client:
            for _ in range(3):
                resp = await client.post(url, headers={"Authorization": f"Bearer {token}"}, json=payload)
                rejected = _rejected_property(resp) if resp.status_code == 400 else None
                if not rejected or rejected not in payload or rejected == "prompt":
                    break
                payload.pop(rejected)
    except httpx.HTTPError as e:
        raise ImageGenError(f"network error ({type(e).__name__})") from e

    if resp.status_code == 429:
        raise ImageGenError("daily free image quota used up")
    if resp.status_code in (401, 403):
        raise ImageGenError("Cloudflare token rejected — check CLOUDFLARE_API_TOKEN / ACCOUNT_ID")
    if resp.status_code != 200:
        text = resp.text or ""
        if "NSFW" in text or '"code":8007' in text.replace(" ", ""):
            raise ImageGenError("prompt blocked by the safety filter", blocked=True)
        raise ImageGenError(f"Cloudflare {resp.status_code}: {text[:200]}")

    headers = getattr(resp, "headers", None) or {}
    if str(headers.get("content-type", "")).startswith("image/"):
        return resp.content
    try:
        image_b64 = resp.json()["result"]["image"]
        return base64.b64decode(image_b64)
    except (KeyError, TypeError, ValueError) as e:
        raise ImageGenError("unexpected image response") from e
