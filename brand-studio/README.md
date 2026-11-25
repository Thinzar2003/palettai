# Palettai ✦ AI brand designer

*Palette + ไทย + AI.*

A full-stack AI web app: describe a business and get a complete brand kit (palette, Thai + English fonts, slogans, logo and mockups), revealed with animation. Save brands to your account, keep a version history, lock the parts you love and regenerate the rest, then share a public brand page.

**Stack:** Next.js 15 · TypeScript · Tailwind v4 · Motion · FastAPI · SQLAlchemy · SQLite/PostgreSQL · JWT (httpOnly cookie) · Gemini / Groq / OpenRouter (free tiers)

## Features
- **Accounts:** sign up, log in, log out. Passwords hashed with scrypt; sessions are JWTs in an httpOnly cookie.
- **Dashboard:** all your brands as cards in their own colours and fonts, with search.
- **AI generation:** a structured JSON brand kit, auto-fixed for WCAG contrast, with fonts limited to a curated Google Fonts list (including Thai).
- **Lock & regenerate:** lock colours, fonts, slogans, logo or story; the AI redesigns the rest to match.
- **Version history:** every generation is saved. Preview any version and restore it.
- **Share:** make a brand public and send the `/b/<slug>` link to a client.
- **Export:** download any version as JSON.
- **AI logo pipeline:** pick up to 3 styles (minimal, geometric, mascot, emblem, lettermark, line art, Thai motif). The text AI plans a distinct concept per style, **FLUX** (Cloudflare Workers AI) draws it, then the backend removes the background, traces it to SVG with **vtracer**, snaps every colour to the brand palette and sanitises the result. Falls back to LLM-drawn SVG when image generation is unavailable. Download as SVG, PNG, or a logo + name lockup.
- **Social post pack:** 7 days of Instagram/Facebook posts in 4 layouts, with Thai/English captions and hashtags. Export each as a 1080×1080 PNG.
- **Brand guide PDF:** a 6-page A4 brand guide (cover, story, logo, colours, typography, voice & social), saved via the browser's "Save as PDF".
- **Edit by hand:** colour pickers, font pickers and text fields. Every save is a new version.
- **AI refine chat:** "make it warmer", "more premium" — the AI edits only what you ask.
- **Light / dark mode** with no flash on load.
- **3D & interactive UI:** cursor-following glow, 3D tilt with glare on cards, a draggable spinning 3D logo coin, and animated page and tab transitions.
- **Daily quota per user:** protects your free AI limits (default 20 generations per 24 hours).
- **Resilient free AI:** retries busy models, falls back Flash → Flash-Lite → Groq → OpenRouter.

## Architecture
```
Browser ──► Next.js (localhost:3000)
              │  pages: /  /login  /register  /dashboard  /brands/new  /brands/[id]  /b/[slug]
              │  /api/*  ── proxied ──►  FastAPI (127.0.0.1:8000)
                                            ├─ /api/auth/*     register · login · logout · me
                                            ├─ /api/brands/*   CRUD · regenerate · versions · restore
                                            │                  kit edits · refine · logos · social
                                            ├─ /api/public/*   shared brand pages
                                            ├─ SQLAlchemy ──► SQLite (dev) / PostgreSQL (prod)
                                            └─ LLM chain ───► Gemini → Groq → OpenRouter
```
The Next.js proxy means the browser only ever talks to one origin, so the login cookie works without any CORS setup.

### Data model
```
users ─┬─< brands ─┬─< brand_versions
       │           │     version · kit (JSON) · locked parts · note · created_at
       │           └─ name · slug · brief (JSON) · is_public · current_version
       └─ email · name · password_hash
```

## Run it

### 1. Backend (terminal 1)
```bash
cd backend
python -m venv .venv
.venv\Scripts\activate            # Mac/Linux: source .venv/bin/activate
pip install -r requirements.txt
copy .env.example .env            # Mac/Linux: cp .env.example .env
# paste your free GEMINI_API_KEY (and optionally GROQ_API_KEY / OPENROUTER_API_KEY) into .env
python -m app.check_providers     # confirms your keys work
uvicorn app.main:app --reload --port 8000
```
The database file `backend/brandstudio.db` is created automatically on first start. API docs: http://127.0.0.1:8000/docs

### 2. Frontend (terminal 2)
```bash
cd frontend
npm install
copy .env.local.example .env.local   # Mac/Linux: cp
npm run dev
```
Open http://localhost:3000, click **Sign up free**, then create a brand.

### Tests
```bash
cd backend && pytest
```

## Free AI keys
| Provider | Get a key | Role |
|---|---|---|
| Google Gemini | https://aistudio.google.com/apikey | Main (best Thai) |
| Groq | https://console.groq.com/keys | Backup (fast) |
| OpenRouter | https://openrouter.ai/keys | Backup (`openrouter/free`) |

Free tiers are rate-limited, and free-tier prompts may be used by the provider to improve its products, so don't send private client data.

## Settings (`backend/.env`)
| Variable | Default | Meaning |
|---|---|---|
| `DATABASE_URL` | `sqlite:///backend/brandstudio.db` | Use `postgresql+psycopg://user:pass@host/db` in production (`pip install "psycopg[binary]"`) |
| `SECRET_KEY` | auto-generated into `.secret_key` | Signs login tokens; **set it explicitly in production** |
| `DAILY_GENERATIONS` | `20` | AI generations per user per 24 hours |
| `TOKEN_DAYS` | `7` | How long a login lasts |
| `COOKIE_SECURE` | `false` | Set `true` when served over HTTPS |
| `LLM_PROVIDERS` | `gemini,groq,openrouter` | Order of AI providers to try |

## Project structure
```
backend/app/
  main.py            app + routers + startup (creates tables)
  config.py          settings
  db.py · models.py  SQLAlchemy engine and tables
  security.py        scrypt passwords, JWT tokens
  deps.py            current-user dependency, daily quota
  routers/auth.py    /api/auth/*
  routers/brands.py  /api/brands/*, /api/public/*
  service.py         AI output → validated kit, lock/merge logic
  llm.py             free-provider chain with retries/fallback
  prompts.py · colors.py · fonts.py · mock.py
  svg.py             whitelist sanitiser for AI-generated SVG
  imagegen.py        FLUX image generation (Cloudflare Workers AI)
  vectorize.py       background removal → vtracer → palette snapping
  logo_styles.py     logo style directions + prompt builder
frontend/
  app/               pages (landing, auth, dashboard, new brand, brand workspace, public page)
  components/        BrandWorkspace, LockBar, VersionHistory, BrandCard, BrandReveal, PalettePour, …
  lib/               api client, auth context, types, font loader
```

## Roadmap
- [x] Stage 1: brief → AI brand → animated reveal
- [x] Stage 2: accounts, database, dashboard, versions, lock & regenerate, share pages
- [x] Stage 3: AI SVG logo icons, social post pack, brand guide PDF, hand editing, AI refine, dark mode, 3D UI
- [ ] Stage 4: background jobs for long AI tasks, image-model mockups
- [ ] Stage 5: deploy (Vercel + Render/Railway + Postgres), Alembic migrations, rate limiting by IP
