# Deploying Palettai (free)

```
Browser ─► Vercel (Next.js website)  ──/api/* proxy──►  Render (FastAPI)  ──►  Neon (PostgreSQL)
                                                              └──►  Gemini / Groq / OpenRouter
```

| Part | Host | Free plan notes |
|---|---|---|
| Website | **Vercel** | Free "Hobby" plan |
| Backend API | **Render** | Sleeps after 15 min without traffic; the first request after that takes ~1 minute to wake up |
| Database | **Neon** | Free forever, 1 GB storage; sleeps when idle and wakes in under a second |

Total time: about 30 minutes. You need a GitHub account.

---

## Step 1: Put the code on GitHub

1. Create an **empty private repository** on github.com called `palettai` (don't add a README).
2. In PowerShell:
   ```powershell
   cd D:\Projects\brand-studio
   git init
   git add .
   git status
   ```
   ⚠️ **Check the list before committing.** It must **not** contain `backend/.env`, `frontend/.env.local`,
   `.venv`, `node_modules`, `brandstudio.db` or `.secret_key` (they're in `.gitignore`).
   If any of them appear, stop and ask for help: never push API keys to GitHub.
3. Then:
   ```powershell
   git commit -m "Palettai: AI brand designer"
   git branch -M main
   git remote add origin https://github.com/<your-username>/palettai.git
   git push -u origin main
   ```

## Step 2: Create the database on Neon

1. Sign up at **https://neon.com** (GitHub login works).
2. **Create project** → name `palettai` → region **AWS Asia Pacific (Singapore)** → Create.
3. On the dashboard, click **Connect** and copy the **connection string**. It looks like:
   `postgresql://neondb_owner:xxxx@ep-xxxx.ap-southeast-1.aws.neon.tech/neondb?sslmode=require`
   Keep it private: it's the database password.

The tables are created automatically the first time the backend starts.

## Step 3: Deploy the backend on Render

1. Sign up at **https://render.com** with GitHub.
2. **New → Blueprint** → choose your `palettai` repo. Render reads `render.yaml` and proposes the `palettai-api` service.
3. Fill in the secret values it asks for:
   - `DATABASE_URL`: the Neon connection string from step 2
   - `GEMINI_API_KEY`: your Gemini key
   - `GROQ_API_KEY` and `OPENROUTER_API_KEY`: optional backups (leave empty if you don't have them)
   - `CLOUDFLARE_ACCOUNT_ID` and `CLOUDFLARE_API_TOKEN`: optional, turns on FLUX image logos (see below)
   - `SECRET_KEY` is generated for you.
4. Click **Apply** and wait for the build (3–5 minutes).
5. Copy the service URL, e.g. `https://palettai-api.onrender.com`, and open
   `https://palettai-api.onrender.com/health`. You should see `"ok": true` and your AI providers.

## Step 4: Deploy the website on Vercel

1. Sign up at **https://vercel.com** with GitHub.
2. **Add New → Project** → import the `palettai` repo.
3. Set **Root Directory** to `frontend` (click *Edit* next to it). Vercel detects Next.js.
4. Under **Environment Variables** add:
   - `BACKEND_URL` = your Render URL from step 3, e.g. `https://palettai-api.onrender.com` (no trailing slash)
5. Click **Deploy**. After ~2 minutes you get a URL like `https://palettai.vercel.app`.

## Step 5: Test it

Open your Vercel URL → **Sign up free** → create a brand.
If the first request is slow, the Render backend was asleep; it wakes in about a minute.

---

## Updating the live app later

Just push to GitHub; Vercel and Render redeploy automatically:
```powershell
git add .
git commit -m "Describe your change"
git push
```

## Troubleshooting

| Problem | Fix |
|---|---|
| Website says "The server isn't responding" | Open `<render-url>/health`. If it's loading, the backend is waking up; wait a minute. |
| Render build fails on `psycopg` | Check `PYTHON_VERSION` is `3.12.7` in the Render environment. |
| Login works but you're logged out on refresh | `COOKIE_SECURE` must be `true` and you must use the **https** Vercel URL. |
| `/health` shows `"ok": false` | The AI key env vars are missing on Render: add them under *Environment*, then *Manual Deploy*. |
| "Daily limit reached" | Default is 20 AI generations per user per day; set `DAILY_GENERATIONS` on Render to change it. |

## Local development still works as before

Without `DATABASE_URL`, the backend keeps using the local SQLite file, so your PC setup is unchanged.

## AI image logos (Cloudflare Workers AI, free)

Without these keys, logos are drawn as SVG code by the text AI. With them, FLUX draws each logo,
and the backend traces it into a clean SVG in your brand colours.

1. Sign up at **dash.cloudflare.com** (free).
2. Left menu → **AI → Workers AI** → **Use REST API**.
3. Copy your **Account ID**, then click **Create a Workers AI API Token** and copy the token.
4. Add both to `backend/.env` locally, and on Render → *palettai-api → Environment*:
   `CLOUDFLARE_ACCOUNT_ID=...` and `CLOUDFLARE_API_TOKEN=...`
5. Check `<render-url>/health`: `logo_images` should show the FLUX model name.

The free allowance resets every day; if it runs out, Palettai falls back to SVG drawing automatically.
