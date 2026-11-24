"""LLM client with free-tier providers and automatic fallback.

Gemini, Groq and OpenRouter all expose OpenAI-compatible /chat/completions
endpoints, so one function talks to all of them. If a provider is rate-limited
(common on free tiers) or returns bad JSON, the next configured provider is tried.
"""
from __future__ import annotations

import asyncio
import json
import logging
import os
from dataclasses import dataclass, field

import httpx

log = logging.getLogger("llm")


class LLMError(RuntimeError):
    def __init__(self, message: str, retryable: bool = True, status: int | None = None):
        super().__init__(message)
        self.retryable = retryable
        self.status = status


class NotConfigured(RuntimeError):
    pass


@dataclass
class Provider:
    name: str
    base_url: str
    key_env: str
    model_env: str
    default_model: str
    json_mode: bool = True
    extra_body: dict = field(default_factory=dict)
    extra_headers: dict = field(default_factory=dict)
    free: bool = True

    @property
    def api_key(self) -> str | None:
        # tolerate common copy-paste mistakes: surrounding spaces or quotes
        return (os.getenv(self.key_env) or "").strip().strip("\"'").strip() or None

    @property
    def models(self) -> list[str]:
        """Models to try in order. In .env you can list several: GEMINI_MODEL=a,b"""
        raw = os.getenv(self.model_env) or self.default_model
        return [m.strip() for m in raw.split(",") if m.strip()]

    @property
    def model(self) -> str:
        return self.models[0]


PROVIDERS: dict[str, Provider] = {
    # Free: key from https://aistudio.google.com/apikey — best Thai quality of the free options.
    "gemini": Provider(
        name="gemini",
        base_url="https://generativelanguage.googleapis.com/v1beta/openai",
        key_env="GEMINI_API_KEY", model_env="GEMINI_MODEL",
        default_model="gemini-flash-latest,gemini-flash-lite-latest",  # Flash, then the lighter Flash-Lite if busy
        extra_body={"reasoning_effort": "low"},       # faster replies; branding doesn't need deep thinking
    ),
    # Free: key from https://console.groq.com/keys — very fast.
    "groq": Provider(
        name="groq",
        base_url="https://api.groq.com/openai/v1",
        key_env="GROQ_API_KEY", model_env="GROQ_MODEL",
        default_model="llama-3.3-70b-versatile,openai/gpt-oss-120b",
    ),
    # Free: key from https://openrouter.ai/keys — "openrouter/free" picks any free model.
    "openrouter": Provider(
        name="openrouter",
        base_url="https://openrouter.ai/api/v1",
        key_env="OPENROUTER_API_KEY", model_env="OPENROUTER_MODEL",
        default_model="openrouter/free",
        json_mode=False,  # not every free model supports JSON mode; we parse the text instead
        extra_headers={"X-Title": "Palettai"},
    ),
    # Paid (optional)
    "openai": Provider(
        name="openai", base_url="https://api.openai.com/v1",
        key_env="OPENAI_API_KEY", model_env="OPENAI_MODEL",
        default_model="gpt-4.1-mini", free=False,
    ),
}
ANTHROPIC_KEY_ENV = "ANTHROPIC_API_KEY"
DEFAULT_ORDER = "gemini,groq,openrouter,anthropic,openai"


def provider_chain() -> list[str]:
    """Providers to try, in order, that have an API key set."""
    order = [p.strip().lower() for p in (os.getenv("LLM_PROVIDERS") or DEFAULT_ORDER).split(",") if p.strip()]
    if order == ["mock"]:
        return ["mock"]
    chain = []
    for name in order:
        if name == "anthropic" and os.getenv(ANTHROPIC_KEY_ENV):
            chain.append(name)
        elif name in PROVIDERS and PROVIDERS[name].api_key:
            chain.append(name)
    return chain


def models_for(name: str) -> list[str]:
    if name == "anthropic":
        return [os.getenv("ANTHROPIC_MODEL", "claude-sonnet-5-5")]
    if name == "mock":
        return ["offline"]
    return PROVIDERS[name].models


def model_for(name: str) -> str:
    return ", ".join(models_for(name))


def extract_json(text: str) -> dict:
    """Parse a JSON object even if the model wrapped it in prose or ``` fences."""
    start, end = text.find("{"), text.rfind("}")
    if start == -1 or end <= start:
        raise LLMError("Model did not return JSON")
    try:
        return json.loads(text[start:end + 1])
    except json.JSONDecodeError as e:
        raise LLMError(f"Invalid JSON from model: {e}") from e


def _error_message(resp: httpx.Response) -> str:
    """Pull the human-readable message out of an error body (Gemini wraps it in a list)."""
    try:
        data = resp.json()
        if isinstance(data, list) and data:
            data = data[0]
        err = data.get("error", data) if isinstance(data, dict) else data
        return str(err.get("message", err) if isinstance(err, dict) else err)[:300]
    except Exception:
        return resp.text[:300]


def _raise_for(resp: httpx.Response, name: str, model: str) -> None:
    if resp.status_code == 200:
        return
    body = resp.text[:300]
    if resp.status_code == 429:
        raise LLMError(f"{name}/{model}: free-tier rate limit reached", retryable=True, status=429)
    if resp.status_code == 503:
        raise LLMError(f"{name}/{model}: model busy (high demand)", retryable=True, status=503)
    if resp.status_code == 400 and "api key" in resp.text.lower():
        raise LLMError(f"{name}: API key rejected (400) — provider says: {_error_message(resp)}",
                       retryable=True, status=401)
    if resp.status_code in (401, 403):
        raise LLMError(f"{name}: API key rejected ({resp.status_code}) — provider says: {_error_message(resp)}",
                       retryable=True, status=resp.status_code)
    if resp.status_code == 404:
        raise LLMError(f"{name}: model '{model}' not found — run `python -m app.check_providers --models`",
                       retryable=True, status=404)
    raise LLMError(f"{name}/{model} API {resp.status_code}: {body}", retryable=True, status=resp.status_code)


async def _openai_compatible(p: Provider, model: str, system: str, user: str, client: httpx.AsyncClient) -> str:
    payload = {
        "model": model,
        "temperature": 0.9,
        "messages": [{"role": "system", "content": system}, {"role": "user", "content": user}],
        **p.extra_body,
    }
    if p.json_mode:
        payload["response_format"] = {"type": "json_object"}
    headers = {"Authorization": f"Bearer {p.api_key}", **p.extra_headers}

    resp = await client.post(f"{p.base_url}/chat/completions", headers=headers, json=payload)
    if resp.status_code == 400 and (p.json_mode or p.extra_body) and "api key" not in resp.text.lower():
        # Some models reject response_format / reasoning_effort: retry with a plain request.
        payload.pop("response_format", None)
        for k in p.extra_body:
            payload.pop(k, None)
        resp = await client.post(f"{p.base_url}/chat/completions", headers=headers, json=payload)
    _raise_for(resp, p.name, model)
    try:
        return resp.json()["choices"][0]["message"]["content"] or ""
    except (KeyError, IndexError, ValueError) as e:
        raise LLMError(f"{p.name}: unexpected response shape") from e


async def _anthropic(model: str, system: str, user: str, client: httpx.AsyncClient) -> str:
    resp = await client.post(
        "https://api.anthropic.com/v1/messages",
        headers={"x-api-key": os.environ[ANTHROPIC_KEY_ENV], "anthropic-version": "2023-06-01"},
        json={"model": model, "max_tokens": 2500, "system": system,
              "messages": [{"role": "user", "content": user}]},
    )
    _raise_for(resp, "anthropic", model)
    return "".join(b.get("text", "") for b in resp.json().get("content", []))


# Errors where trying again / trying another model can help.
SWITCH_MODEL = {404, 429, 500, 502, 503, 504}
BUSY_RETRY_DELAY = 2.0  # seconds to wait before retrying a busy (503) model once


async def call_provider(name: str, system: str, user: str) -> tuple[dict, str]:
    """Try each of the provider's models. Returns (parsed_json, model_used)."""
    last: LLMError | None = None
    async with httpx.AsyncClient(timeout=httpx.Timeout(90, connect=10)) as client:
        for model in models_for(name):
            for attempt in range(2):
                try:
                    text = (await _anthropic(model, system, user, client) if name == "anthropic"
                            else await _openai_compatible(PROVIDERS[name], model, system, user, client))
                    return extract_json(text), model
                except httpx.HTTPError as e:
                    last = LLMError(f"{name}/{model}: network error ({type(e).__name__})", status=503)
                except LLMError as e:
                    last = e
                log.warning("%s", last)
                if last.status == 503 and attempt == 0:
                    await asyncio.sleep(BUSY_RETRY_DELAY)  # short spike: wait and retry same model
                    continue
                break
            if last is not None and last.status not in SWITCH_MODEL and last.status is not None:
                raise last  # e.g. bad API key: other models won't help
    raise last or LLMError(f"{name}: no models configured")
