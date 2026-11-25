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
    if os.getenv("RENDER") or os.getenv("PRODUCTION"):
        raise RuntimeError("Set SECRET_KEY in the environment for production (otherwise every restart logs users out).")
    path = BASE_DIR / ".secret_key"
    if not path.exists():
        path.write_text(secrets.token_urlsafe(48))
    return path.read_text().strip()


SECRET_KEY = _secret_key()
def _database_url() -> str:
    """SQLite locally; PostgreSQL in production. Hosts like Neon/Render give URLs that start
    with postgres:// or postgresql:// — SQLAlchemy needs the driver name (psycopg) in it."""
    url = os.getenv("DATABASE_URL", "").strip() or f"sqlite:///{BASE_DIR / 'brandstudio.db'}"
    for prefix in ("postgres://", "postgresql://"):
        if url.startswith(prefix):
            return "postgresql+psycopg://" + url[len(prefix):]
    return url


DATABASE_URL = _database_url()
IS_PRODUCTION = DATABASE_URL.startswith("postgresql")
TOKEN_DAYS = int(os.getenv("TOKEN_DAYS", "7"))
COOKIE_NAME = "bs_session"
COOKIE_SECURE = os.getenv("COOKIE_SECURE", "false").lower() == "true"  # true in production (HTTPS)
DAILY_GENERATIONS = int(os.getenv("DAILY_GENERATIONS", "20"))  # protects the free AI quota

# Email (password reset). Render's free plan blocks SMTP, so mail goes through Brevo's HTTPS API.
BREVO_API_KEY = os.getenv("BREVO_API_KEY", "").strip()
MAIL_FROM = os.getenv("MAIL_FROM", "").strip()            # a sender address verified in Brevo
MAIL_FROM_NAME = os.getenv("MAIL_FROM_NAME", "Palettai")
APP_URL = os.getenv("APP_URL", "http://localhost:3000").rstrip("/")   # where reset links point
