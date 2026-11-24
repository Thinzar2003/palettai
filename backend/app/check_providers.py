"""Check your free API keys.

    python -m app.check_providers          # test every configured provider
    python -m app.check_providers --models # also list models you can use

Free-tier model names change over time; use the list to pick a value for
GEMINI_MODEL / GROQ_MODEL / OPENROUTER_MODEL in .env.
"""
import asyncio
import os
import sys

import httpx
from dotenv import load_dotenv

load_dotenv()

from .llm import ANTHROPIC_KEY_ENV, PROVIDERS, LLMError, call_provider, model_for, provider_chain  # noqa: E402

TEST_SYSTEM = 'Reply with a JSON object only: {"ok": true, "hello_th": "<say hello in Thai>"}'


async def list_models(name: str) -> list[str]:
    p = PROVIDERS[name]
    async with httpx.AsyncClient(timeout=20) as client:
        r = await client.get(f"{p.base_url}/models", headers={"Authorization": f"Bearer {p.api_key}"})
    if r.status_code != 200:
        return [f"(could not list models: HTTP {r.status_code})"]
    ids = [m.get("id", "") for m in r.json().get("data", [])]
    if name == "openrouter":
        ids = [i for i in ids if i.endswith(":free") or i == "openrouter/free"]
    return sorted(i.removeprefix("models/") for i in ids)


def describe_key(env_name: str) -> str:
    """Show a masked key plus common copy-paste problems, without printing the secret."""
    raw = os.getenv(env_name) or ""
    issues = []
    if raw != raw.strip():
        issues.append("has spaces/newlines around it")
    if raw.strip()[:1] in "\"'" and raw.strip():
        issues.append("is wrapped in quotes — remove them")
    k = raw.strip()
    masked = f"{k[:4]}…{k[-4:]} ({len(k)} chars)" if len(k) > 8 else f"({len(k)} chars)"
    return masked + ("  ⚠ " + "; ".join(issues) if issues else "")


async def main() -> None:
    chain = provider_chain()
    if not chain:
        print("No keys found. Put at least GEMINI_API_KEY=... in backend/.env")
        print("  Gemini:     https://aistudio.google.com/apikey")
        print("  Groq:       https://console.groq.com/keys")
        print("  OpenRouter: https://openrouter.ai/keys")
        return
    for name in chain:
        key_env = ANTHROPIC_KEY_ENV if name == "anthropic" else PROVIDERS[name].key_env
        print(f"\n== {name}  (model: {model_for(name)})")
        print(f"  key: {describe_key(key_env)}")
        try:
            result, used = await call_provider(name, TEST_SYSTEM, "Test")
            print(f"  OK ({used}) ->", result)
        except LLMError as e:
            print("  FAILED ->", e)
        if "--models" in sys.argv and name in PROVIDERS:
            models = await list_models(name)
            print(f"  {len(models)} models:", ", ".join(models[:40]), "..." if len(models) > 40 else "")


if __name__ == "__main__":
    asyncio.run(main())
