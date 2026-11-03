# Deploying on Hostinger

This is a Next.js 16 app with a server (admin panel, lead forms, emails), so it needs **Node.js hosting**:
a Hostinger **Business / Cloud** web-hosting plan (Websites → *Node.js apps*) or a **VPS**.
Plain shared hosting (PHP / static files only) will not run it.

## Option A — Business / Cloud plan (hPanel "Node.js apps")

1. hPanel → **Websites → Add website → Node.js apps** → **Upload your website files** → choose this zip.
2. Build settings (fill in if not detected automatically):

   | Setting | Value |
   |---|---|
   | Framework | Next.js |
   | Node.js version | 22.x (20.9 or newer) |
   | Root directory | `./` |
   | Build command | `npm run build` (uses webpack — see note below) |
   | Start command | `npm start` |
   | Output directory | `.next` |

3. **Environment variables** — add these *before* the first build (the build reads them):

   | Name | Value |
   |---|---|
   | `NEXT_PUBLIC_SITE_URL` | `https://your-domain.com` (no trailing slash) |
   | `NEXT_PUBLIC_SUPABASE_URL` | Supabase → Project Settings → API |
   | `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` | publishable key (`sb_publishable_…`) |
   | `SUPABASE_SECRET_KEY` | secret key (`sb_secret_…`, keep secret) |
   | `SMTP_HOST` | `smtp.gmail.com` |
   | `SMTP_PORT` | `465` |
   | `SMTP_USER` | the Gmail address |
   | `SMTP_PASS` | Gmail **app password** |
   | `MAIL_FROM_NAME` | `Shri Banke Bihari` |
   | `LEAD_NOTIFY_TO` | who gets lead / review alerts (comma-separated) |

   The three Supabase values are required. Without them the admin panel shows
   "Database not connected" and nobody can sign in.

   > **Why webpack:** Hostinger's Node.js hosting runs on an older Linux (glibc 2.28). Next.js's fast
   > native compiler (Turbopack) needs glibc 2.29, so `npm run build` uses webpack with the bundled
   > WebAssembly compiler instead. The config is plain JavaScript (`next.config.mjs`) for the same reason.
   > The first build takes a few minutes. On a VPS with modern Ubuntu you can use `npm run build:turbo`.

4. **Deploy**, then point your domain to the app (hPanel connects it and issues SSL).
5. After changing any environment variable, **redeploy** (`NEXT_PUBLIC_*` values are baked in at build time).

## Option B — VPS (Ubuntu)

```bash
# Node 22 + PM2
curl -fsSL https://deb.nodesource.com/setup_22.x | sudo -E bash - && sudo apt install -y nodejs unzip
sudo npm i -g pm2

unzip real-state-hostinger.zip -d /var/www/real-state && cd /var/www/real-state
cp .env.example .env.local && nano .env.local      # fill in the values from the table above
npm ci && npm run build
PORT=3000 pm2 start npm --name real-state -- start && pm2 save && pm2 startup
```

Then put Nginx in front (proxy `https://your-domain.com` → `http://127.0.0.1:3000`) and add SSL with
`sudo apt install certbot python3-certbot-nginx && sudo certbot --nginx`.

## One-time database setup (Supabase)

1. Create a Supabase project, then in **SQL Editor** run every file in `supabase/migrations/` in order:
   `0001_init` → `0002_crm` → `0003_cms` → `0004_property_details` → `0005_reels` → `0006_cities` → `0007_reviews` → `0008_banks` → `0009_requirements`.
2. Authentication → turn **off** public sign-ups → **Add user** for the owner (first user = admin).
3. Log in at `https://your-domain.com/admin` and add your listings.

## Keep-alive (free Supabase)

Free Supabase projects pause after ~7 idle days. Ping `https://your-domain.com/api/health` every
2–3 days — Hostinger **Cron Jobs** (`curl -s https://your-domain.com/api/health`) or the GitHub
workflow in `.github/workflows/keepalive.yml`.
