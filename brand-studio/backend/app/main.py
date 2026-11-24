import logging
import os
from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from . import config  # noqa: F401  (loads .env first)
from .db import init_db
from .llm import model_for, provider_chain
from .routers import auth, brands

logging.basicConfig(level=logging.INFO, format="%(levelname)s %(name)s: %(message)s")


@asynccontextmanager
async def lifespan(app: FastAPI):
    init_db()  # creates tables on first run
    yield


app = FastAPI(title="AI Brand Studio API", version="0.3.0", lifespan=lifespan)

# The Next.js app proxies /api to this server, so browsers normally talk same-origin.
# CORS is only needed if you call the API directly from another origin.
app.add_middleware(
    CORSMiddleware,
    allow_origins=[o.strip() for o in os.getenv("FRONTEND_ORIGIN", "http://localhost:3000").split(",")],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(auth.router)
app.include_router(brands.router)


@app.get("/health")
def health():
    chain = provider_chain()
    return {
        "ok": bool(chain),
        "providers": [{"name": n, "model": model_for(n)} for n in chain],
        "hint": None if chain else "Add GEMINI_API_KEY to backend/.env",
    }
