"""App settings read from environment / .env."""
import os
import secrets
from pathlib import Path

from dotenv import load_dotenv

load_dotenv()

BASE_DIR = Path(__file__).resolve().parent.parent


def _secret_key() -> str:
    """Use SECRET_KEY from .env; otherwise create one once and keep it in .secret_key,
    so logins survive server restarts during development."""
    if os.getenv("SECRET_KEY"):
        return os.environ["SECRET_KEY"]
    path = BASE_DIR / ".secret_key"
    if not path.exists():
        path.write_text(secrets.token_urlsafe(48))
    return path.read_text().strip()


SECRET_KEY = _secret_key()
DATABASE_URL = os.getenv("DATABASE_URL", f"sqlite:///{BASE_DIR / 'brandstudio.db'}")
TOKEN_DAYS = int(os.getenv("TOKEN_DAYS", "7"))
COOKIE_NAME = "bs_session"
COOKIE_SECURE = os.getenv("COOKIE_SECURE", "false").lower() == "true"  # true in production (HTTPS)
DAILY_GENERATIONS = int(os.getenv("DAILY_GENERATIONS", "20"))  # protects the free AI quota
