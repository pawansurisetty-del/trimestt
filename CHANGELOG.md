# Trimestt app — changelog

## v5 — 4 Aug 2026
Ready to go live.

- **HTTPS enforced in production**: 301 redirect reading `x-forwarded-proto`,
  HSTS for a year, content security policy with no inline scripts, nosniff,
  and framing blocked
- **Rate limiting** on login, signup and activation — 12 attempts per IP per
  15 minutes, then 429
- **Installs like an app**: web manifest, iOS and Android icons, standalone
  display, service worker caching the shell. Nothing under `/api/` is ever
  cached
- **Dockerfile and railway.json** for one-click deploy, health check on
  `/api/health`
- **Backup script** keeping the last 30 snapshots
- `DEPLOY.md` — Railway, Hostinger DNS for trimestt.com, HTTPS checks,
  install instructions, and what must be done before real patients
- 155 checks

## v4 — 4 Aug 2026
Visual rebuild plus notifications.

- **New palette**: lavender and blush pink throughout, no teal anywhere.
  Plum text, soft lilac wash behind the glass, pink for the child track
- **Taller app bar** (96px) with a curved base, larger logo and a notification bell
- **Login is centred** in the screen instead of sitting at the top
- **Notifications**: a bell with an unread count, opening a feed of alerts,
  plan items coming due, passed hard windows and vaccines due or overdue.
  Only things that already happened light the badge, so it can reach zero
- **Live green dot** pulsing beside the week count on the home card
- **Emergency button** is sticky at the bottom of every mother screen, larger,
  with its own pulsing dot
- Hospital app bar shows open alert count on the bell and jumps to Alerts
- Demo mother now has a clean visit history, so the seeded demo shows one real
  alert instead of a wall of missed windows
- 135 checks

## v3 — 4 Aug 2026
**Renamed to Trimestt** (trimestt.com) throughout — app, API, docs, demo logins.

- New home screen: logo, tagline, and a straight choice between
  **I am a mother** and **I am a hospital**, then the matching form
- Guide library replaces the short guide list: 36 articles across 11 categories
  — trimesters, precautions, travel and work, food, labour, after delivery,
  breastfeeding, newborn and baby care. Filter by category, tap to read
- Logo ships with the app and is used on the login screen and app bar
- Fixed: `node test_api.js` crashed with ENOENT on macOS. The store now writes
  the first file synchronously and the test flushes before reading it
- 128 checks (up from 119)

## v2 — 4 Aug 2026
The product itself. The v1 marketing site is separate and still valid for sales.

**Built**
- Login as the home screen, patient and hospital side by side
- Hospital signup → setup (details, logo, colour, immunisation schedule,
  alert thresholds). Patients cannot be registered until setup is complete
- Patient registration issues a patient ID and a six-character activation code;
  she sets her own password
- Patient app carries the hospital's name, logo and colour
- Profile switcher: Mother, Baby 1, Baby 2, add up to four children
- Antenatal plan generated from LMP or a scan-confirmed EDD, with clinical
  windows and hard-window flags
- Daily log graded against the hospital's thresholds into four alert tiers
- Emergency button: preterm-aware, returns the labour room number
- Child care: immunisation plan (IAP or NIS), growth entries, newborn danger
  signs, vaccination record
- Billing: ₹4,999 per mother at registration, ₹2,999 per child added
- Hospital dashboard: today, patients, register, alerts with acknowledgement,
  billing

**Quality**
- `test_api.js` — 119 end-to-end checks, including cross-patient isolation and
  no plaintext passwords on disk
- No field records the sex of the foetus; the test suite enforces it

**Not built yet**
- WhatsApp, SMS and auto-dial delivery (tiers are graded and stored, not sent)
- Report and scan uploads
- Consultation summaries written by the doctor
- Postgres or Supabase (currently a JSON file store)
- Rate limiting on login

## v1 — 4 Aug 2026
Marketing site: six pages, 704 checks. Separate download.
