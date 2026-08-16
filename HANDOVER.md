# Trimestt — where things stand

Written 15 August 2026. Read this first; it is the context a new conversation
needs.

---

## What Trimestt is

A pregnancy and child-care app that hospitals in India give to their patients.
The hospital hands a mother a patient ID and an activation code at reception.
She gets her antenatal plan, logs readings daily, reads 102 guide chapters, and
has one button that calls her hospital. The hospital gets a worklist sorted by
who needs a person first.

Hospitals pay per patient code. Patients pay nothing inside the app.

- **Live at** https://www.trimestt.com (and trimestt.com)
- **Repo** github.com/pawansurisetty-del/trimestt
- **Hosting** Railway, project `athletic-blessing`, service `trimestt`
- **DNS** Cloudflare
- **Mail** Google Workspace on trimestt.com

---

## Current state

**Version 42. 991 checks passing.**

Both phone apps are built and running on real devices.

| | |
|---|---|
| Web app | live, v41 — **v42 built, not yet deployed** |
| Android | built, signed, `.aab` ready, runs on a real phone |
| iOS | built, archived, **uploaded to App Store Connect** (build 1) |
| Google Play account | created, **blocked on Google's identity check** |
| App Store Connect record | created, listing not yet filled |

### The five tasks that were being tracked

1. **Deploy** — done, v41 live
2. **Google Play account** — created; cannot create an app until Google approves
   identity documents (a few days)
3. **Native build** — Android done; iOS built and uploaded
4. **Screenshots** — three good ones captured, three to retake
5. **Reviewer account** — done, persisting

---

## Credentials and where they live

Nothing secret is in this bundle. These are the names of things.

- **Reviewer account**: patient `TRM-REV01-0001`, password `AppReview2026`.
  Recreate with `POST /api/owner/reviewer-account` (owner key required) or
  `node scripts/reviewer-account.js` **on the server**.
- **Hospital demo**: `review@trimestt.com` / `AppReview2026`
- **Railway variables**: `TRIMESTT_DATA=/data`, `TRIMESTT_OWNER_KEY`,
  `TRIMESTT_FILE_KEY`, `TRIMESTT_GRIEVANCE_NAME/EMAIL/PHONE`
- **Android signing**: `~/trimestt-upload.jks`, alias `trimestt`. Backed up.
  Losing it means never updating the Play listing again.
- **Bundle IDs**: iOS `com.trimestt.trimestt`, Android `com.trimestt.trimestt`

**The owner key was `reviewsetup`** — a temporary value set during debugging.
As of v42 the server *refuses* keys it can tell are weak, so all four
`/api/owner/*` endpoints are currently **disabled** and will stay so until a
real key is set. Generate one and put it in Railway before deploying:

```bash
openssl rand -base64 32
```

The startup log says which state you are in, next to the storage line.

---

## Bugs found the hard way — do not reintroduce these

Each of these cost an hour or more. They are all now covered by tests.

**The data directory typo.** `lib/store.js` read `TRIMEST_DATA` (one T) while
Railway sets `TRIMESTT_DATA`. The database was written inside the container, so
**every deploy destroyed all data**. The app now prints its storage path at
startup — the deploy log must read `[trimestt] storage: /data`.

**Inline event handlers are blocked.** The app's own Content-Security-Policy sets
`script-src 'self'` with no `unsafe-inline`. Inline `onload=` and `onerror=`
silently do nothing. This broke the illustrations and then the photo upload.
Wire handlers in JavaScript; do not loosen the policy.

**Blob URLs are blocked too.** `img-src 'self' data:`. Reading a file with
`URL.createObjectURL` fails silently — use a data URL.

**Profile photos could not be served.** The file route only recognised records
and log photos, so a portrait uploaded fine and then 404'd. Found only by
testing with a realistic photo; the old tests used a one-pixel PNG that passed
every path.

**Settings reverted instantly.** Changing a setting applied it, then `render()`
re-applied the stale copy in `S.me`. Use `rememberSettings()`, which updates the
cached record too. `scripts/check-settings.js` drives the real click path.

**Cross-file name collisions.** Every script loads into one global scope. `art.js`
declaring `function art` while `app.js` declared `const art` blanked the whole
app. A test now parses all scripts together.

**Older Safari cannot parse newer syntax.** A regex lookbehind would have blanked
the app on iOS 15 and 16. A test scans for lookbehind, optional chaining,
nullish coalescing, `replaceAll`, `Array.at`, `Object.hasOwn`, `findLast` and
`structuredClone`.

**CSS variables need a fallback in `:root`.** `--brand-mid` was only set by
`applyBrand()`, which runs after a hospital is known — so on the sign-in screen
the gradient was invalid and white text on white made the button invisible. A
test walks the stylesheet and fails on any variable used without a fallback.

**The webview ran under the status bar** on iPhone, printing the clock over the
hospital's name. Fixed with `StatusBar.setOverlaysWebView({ overlay: false })`.

---

## Design decisions worth keeping

**Colour is derived from each hospital's brand hex** at runtime — surfaces,
borders, text tones, gradients. A teal hospital and a maroon hospital both look
deliberate. Two colours never move: the alert red and the reassuring green. If a
hospital's brand sits within 34° of the alert hue, the alert is rotated so a
warning still reads as a warning.

**Every surface names its own ink** — `--surface` with `--on-surface`,
`--on-brand` for anything on a gradient. Nothing inherits its text colour. That
is what makes contrast reliable; a test measures seven pairs.

**One light theme.** A dark variant was built and removed — keeping two coherent
sets across every hospital's hue was not worth the contrast risk.

**The movement counter reports, it does not judge.** Current RCOG guidance says
there is insufficient evidence for a fixed movement count. The app records the
count, sends every session to the hospital, and asks whether the movements feel
normal *to her*. Only her reported change raises a red alert. **Do not add a
target back.**

**Quiet hours never suppress an urgent alert.** A tier 4 alert reaches her at
three in the morning whatever she has set.

**The emergency button lives only in the helper**, not inside pages.

**Nothing anywhere records or reveals fetal sex** (PC-PNDT Act).

---

## What is still outstanding

### Blocking the stores

- **Play**: Google's identity verification. Nothing to do but wait.
- **iOS**: listing not filled in — description, keywords, screenshots, age
  rating, App Review Information. Copy is in `SUBMISSION.md`.
- **Screenshots**: three good ones exist (Today, How do you feel, Home). Retake
  Home without the helper open, plus a guide chapter and the guides index.
- **Feature graphic** 1024×500 for Play — not made yet.

### Should be done before real patients

- **Clinical sign-off on the 102 guides.** No doctor has read them. The app says
  so honestly at the end of every chapter, and `TRIMESTT_REVIEW` in
  `public/references.js` holds the names once they do. **This is the one to hold
  a patient rollout for.**
- **Translations**: the interface is complete in Telugu and Hindi, but only 4 of
  102 chapters are translated. **Do not bulk-translate the rest.** v42 found the
  Telugu and Hindi movement chapters telling mothers to expect ten movements —
  the fixed target deliberately removed from the English on RCOG grounds — with
  the paragraph explaining why there is no number dropped entirely. Both are
  fixed and a test now guards it, but that is one chapter out of four; the same
  class of error in the other 98 would be invisible to anyone who does not read
  the language. Translate in small batches, clinician-reviewed, safety-critical
  first — which is the policy `i18n.js` already states at the top.
- ~~**Rate limiting is keyed by IP**~~ — **fixed in v42**, and it was worse than
  described. The limiter read the first `x-forwarded-for` entry, which is the one
  value a caller picks for itself, so it could be bypassed outright rather than
  merely locking out a waiting room. Now `CF-Connecting-IP`, falling back to the
  last entry. **Still to do in Cloudflare: proxy `www`**, or half your traffic
  arrives without that header.
- ~~**Service worker** does not take over immediately~~ — this was already fixed
  by v41; `sw.js` calls `skipWaiting()` and `clients.claim()`. Struck off.
- **Backups** are not scheduled and a restore has never been tested.
- **Postgres** — `lib/store-pg.js` exists as of v42 and is wired in behind
  `DATABASE_URL`. It keeps the whole database as one JSONB row, which gives you
  durability, real backups and transactional writes without touching `api.js`.
  **It is still a single writer** — do not scale to two instances on it. Run
  `npm install pg`, then `npm run migrate:pg`, and watch for
  `[trimestt] storage: postgres` in the deploy log.

  Correction to what this document used to say: the migration does *not* touch
  `lib/store.js` and nothing else. `api.js` mutates the loaded object directly
  in 243 places, so a real table-per-collection schema is an `api.js` rewrite.
  The JSONB row is the honest middle step, not the finished job.
- **Error monitoring** — none, so a crash on a patient's phone is invisible.
- **Cloudflare Web Analytics** is injecting a beacon script. It is not in the
  code — nothing references it — so it is a dashboard toggle. Turn it off.
- ~~Google Fonts~~ — **fixed in v42.** The page was fetching fonts from Google,
  which handed every patient's IP and user agent to Google before she signed in,
  while the store declarations say nothing is shared with a third party. Fonts
  are now self-hosted. **Run `npm run fonts` once and commit what it writes** —
  without the files the app falls back to the system font and looks plainer,
  which works but is not what you designed.
- **`www` is not proxied** in Cloudflare while the apex is.

### Commercial

- Pranaam Hospital: DPA to sign, go-live September.
- Fee: ₹3,999 per code to Trimestt, hospital bills the patient ₹6,999/year.

---

## How to work on it

```bash
cd trimestt-app
node seed.js          # demo data
node test_api.js      # 943 checks — must pass before any push
node server.js        # http://localhost:8080
```

Demo logins after seeding: hospital `demo@trimestt.test` / `demo1234`,
patient `TRM-SUN01-0001` / `demo1234`.

**Deploying** is a copy into the git working folder, then push. Railway builds
from GitHub automatically.

**Scripts worth knowing**
- `scripts/check-settings.js` — drives the real click path for settings
- `scripts/reviewer-account.js` — must run **on the server**, not via
  `railway run`, which executes locally
- `scripts/backup.js` — exists, not scheduled

**After deploying, clear the app cache on any test phone**, or you will spend an
hour debugging a fix that is already live.

---

## Files in this bundle

1. `trimestt-app/` — the whole web application, v41
2. `trimestt-native/` — the Capacitor project for both stores, plus every icon
   and splash size, `SUBMISSION.md` and `BUILD.md`
3. This document

The app is one Node process with no dependencies. `lib/` holds the server,
`public/` the client. Read `CHANGELOG.md` for how it got here — it records the
reasoning behind most decisions, including the mistakes.

---

## Before you deploy v42

Four of these are one line each. The first one is not optional — the owner
endpoints are shut until you do it.

1. **Set a real owner key.** `openssl rand -base64 32`, into Railway as
   `TRIMESTT_OWNER_KEY`. Until then `/api/owner/*` returns 401 to everyone,
   including you, and the startup log says so.
2. **Run `npm run fonts` and commit the result.** Otherwise the app is in the
   system font. It works; it just is not the design.
3. **Proxy `www` in Cloudflare.** The apex is proxied and `www` is not, so
   `CF-Connecting-IP` is absent on half the traffic and the rate limiter falls
   back to the weaker path. The native apps point at `www`, so this is most of
   the traffic.
4. **Turn off Cloudflare Web Analytics**, so "no third-party sharing" stays
   true now that the fonts are handled.
5. **Fix the store listing before you fill in App Store Connect.** The
   description in `SUBMISSION.md` no longer claims the guides are doctor-checked.
   Do not paste an older copy from anywhere else.

Then `node test_api.js` — 991 checks — and push.

## Postgres, when you want it

```bash
npm install pg
# scratch database first, never the live one
DATABASE_URL=postgres://... npm run migrate:pg
```

It prints the row counts, writes, reads back through a fresh connection and
compares. Stop the app before running it — it overwrites the row with the
file's contents, so running it against an old file over live data loses the
live data. The startup line should then read `[trimestt] storage: postgres`.

Keep `db.json` until you have watched it run for a few days.
