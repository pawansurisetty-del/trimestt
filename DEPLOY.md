# Going live — Trimestt

Read the warning first. The rest is twenty minutes of work.

---

## ⚠️ Read this before real patients use it

Trimestt currently stores everything in **one JSON file**. That is fine for
demos and fine for a handful of pilot mothers on a single instance with a
volume attached and daily backups. It is **not** where you want to be with
three hospitals and hundreds of pregnancies, because:

- it runs on one instance only — you cannot scale to two
- a lost volume is a lost database
- there are no transactions, so a crash mid-write loses the last few seconds

**Deploy now for demos and your first hospital conversations. Move to Postgres
before you enrol patients you cannot afford to lose.** That migration touches
`lib/store.js` and nothing else — it was written to be swapped.

Also true today: alerts are graded and stored, but nothing sends them over
WhatsApp, SMS or a phone call yet. Until that ships, the hospital must watch
the dashboard. Say that plainly to any hospital you onboard.

---

## 1. Push to GitHub

```bash
cd trimestt-app-v5
git init
git add .
git commit -m "Trimestt v5"
git branch -M main
git remote add origin https://github.com/YOUR_USERNAME/trimestt.git
git push -u origin main
```

`data/` is already in `.gitignore` — no patient data ever reaches the repo.

## 2. Deploy on Railway

1. New Project → Deploy from GitHub repo → pick `trimestt`
2. Railway reads `railway.json` and builds from the `Dockerfile`
3. **Variables**: add
   - `NODE_ENV` = `production`
   - `TRIMESTT_DATA` = `/data`
4. **Volume**: add one, mount path `/data`. Without this, every deploy wipes
   your database.
5. Deploy. Check `https://your-app.up.railway.app/api/health` returns `{"ok":true}`

`PORT` is injected by Railway and the server already reads it.

## 3. Point trimestt.com at it

In Railway: Settings → Networking → Custom Domain → add `trimestt.com` and
`www.trimestt.com`. Railway shows you the target host.

In Hostinger DNS (same as you did for cutiscan.com):

| Type | Name | Value |
|---|---|---|
| ALIAS (or ANAME) | `@` | the host Railway gives you |
| CNAME | `www` | the host Railway gives you |

If Hostinger will not do ALIAS at the apex, use their URL-forward from `@` to
`www` and keep the CNAME.

DNS takes a few minutes to a few hours. Railway issues the TLS certificate
automatically once it resolves — you do not need Certbot.

## 4. Confirm HTTPS is real

```bash
curl -I https://trimestt.com                 # expect 200
curl -I http://trimestt.com                  # expect 301 to https
curl -sI https://trimestt.com | grep -i strict-transport
```

The server sends HSTS, a content security policy, `nosniff`, and `DENY` on
framing whenever `NODE_ENV=production`. It also 301s any plain HTTP request,
reading `x-forwarded-proto` from Railway's proxy.

## 5. Installing it like an app

It is a progressive web app, so it installs from the browser with no store
review:

- **Android / Chrome** — visit trimestt.com, menu → *Install app*
- **iPhone / Safari** — visit trimestt.com, Share → *Add to Home Screen*

It then opens full screen with your logo on the home screen, no browser bar,
and the shell works even on a bad signal. Clinical data is never cached — the
service worker skips everything under `/api/`.

Tell the front desk to walk each mother through *Add to Home Screen* while she
is still at the counter. Otherwise she bookmarks it, forgets, and you lose her.

**Native App Store and Play Store builds** are a later step — wrap this same
app, or build in Expo as you did for HealNDeal. Do it after the pilot, not
before.

## 6. First run in production

```bash
# on your machine, against the live URL
curl -s https://trimestt.com/api/health
```

Then open the site, create your real hospital account, and complete setup.
**Do not run `seed.js` in production** — it exists for demos.

## 7. Backups

```bash
node scripts/backup.js
```

Keeps the last 30 snapshots under `TRIMESTT_DATA/backups`. Run it daily —
Railway cron, or a scheduled job that runs the command. Pull a copy off the
server regularly; a backup that lives only on the volume it protects is not a
backup.

## 8. What to do before the first real patient

1. Postgres instead of the JSON store
2. WhatsApp and SMS delivery for tier 3 and 4 alerts
3. A password reset flow (there is none — right now a hospital re-issues the
   activation code)
4. A privacy policy and consent text on the activation screen (DPDP Act)
5. Load the guides through a gynaecologist and a paediatrician for sign-off,
   with their names on each article

## Environment variables

| Name | Purpose |
|---|---|
| `PORT` | injected by Railway; defaults to 3006 locally |
| `NODE_ENV` | set to `production` to switch on HSTS and the HTTPS redirect |
| `TRIMESTT_DATA` | where `db.json` lives; set to your mounted volume |
| `TRIMESTT_OWNER_KEY` | long random string; lets support recover a locked-out hospital administrator. Without it, that endpoint is disabled |
