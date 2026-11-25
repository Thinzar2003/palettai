"""Image generation with FLUX on Cloudflare Workers AI (free daily allowance)."""
from __future__ import annotations

import base64
import os

import httpx

DEFAULT_MODEL = "@cf/black-forest-labs/flux-1-schnell"


class ImageGenError(RuntimeError):
    pass


def _creds() -> tuple[str, str]:
    clean = lambda v: (v or "").strip().strip("\"'").strip()
    return clean(os.getenv("CLOUDFLARE_ACCOUNT_ID")), clean(os.getenv("CLOUDFLARE_API_TOKEN"))


def image_model() -> str:
    return os.getenv("CLOUDFLARE_IMAGE_MODEL") or DEFAULT_MODEL


def image_configured() -> bool:
    account, token = _creds()
    return bool(account and token)


async def generate_image(prompt: str, seed: int, steps: int = 6) -> bytes:
    """Returns the generated image bytes (JPEG/PNG)."""
    account, token = _creds()
    if not (account and token):
        raise ImageGenError("Cloudflare is not configured")
    url = f"https://api.cloudflare.com/client/v4/accounts/{account}/ai/run/{image_model()}"
    try:
        async with httpx.AsyncClient(timeout=httpx.Timeout(60, connect=10)) as client:
            resp = await client.post(url, headers={"Authorization": f"Bearer {token}"},
                                     json={"prompt": prompt[:2000], "steps": steps, "seed": seed})
    except httpx.HTTPError as e:
        raise ImageGenError(f"network error ({type(e).__name__})") from e

    if resp.status_code == 429:
        raise ImageGenError("daily free image quota used up")
    if resp.status_code in (401, 403):
        raise ImageGenError("Cloudflare token rejected — check CLOUDFLARE_API_TOKEN / ACCOUNT_ID")
    if resp.status_code != 200:
        raise ImageGenError(f"Cloudflare {resp.status_code}: {resp.text[:200]}")

    headers = getattr(resp, "headers", None) or {}
    if str(headers.get("content-type", "")).startswith("image/"):
        return resp.content
    try:
        image_b64 = resp.json()["result"]["image"]
        return base64.b64decode(image_b64)
    except (KeyError, TypeError, ValueError) as e:
        raise ImageGenError("unexpected image response") from e
