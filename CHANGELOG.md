# Trimestt app — changelog

## v13 — 11 Aug 2026
Encryption, and saying so. 406 checks.

- **Documents and photos are now encrypted at rest** with AES-256-GCM, keyed by
  `TRIMESTT_FILE_KEY`. Files stored earlier still open, so nothing breaks on
  upgrade. A test proves the bytes on disk are not the original image
- **Patient privacy screen** from her home: encrypted connection, password she
  alone knows, only her hospital can see her records, nothing sold, no adverts,
  and no record of fetal sex
- **Hospital Privacy tab** with the technical version to hand to management —
  TLS and HSTS, scrypt hashing, AES-256-GCM at rest, tested hospital isolation,
  audit trail on every alert, rate limiting, data ownership and export
- Reassurance line on the login screen, and encryption notes on both upload
  points
- The hospital is warned on that tab if the encryption key is not configured —
  we never claim protection that is not switched on

**Set `TRIMESTT_FILE_KEY` on Railway before patients upload anything.**

## v12 — 11 Aug 2026
Code balance. 390 checks.

- **Codes tab** on the hospital dashboard: how many are available, how many have
  been used, a progress bar, the four blocks with prices, and a purchase history
- **Registering a patient consumes one code**, and the confirmation screen says
  how many are left
- **Warnings before it bites**: a banner on Today at five or fewer remaining, and
  a stronger one at zero
- **Three codes of grace** once the balance hits zero, so a nurse is never stuck
  mid-registration with a patient in front of her. After that, registration
  returns a clear message rather than failing oddly
- **Support adds codes** through an owner-key endpoint once payment clears;
  paying also clears any grace that was used
- Blocks: 25 at ₹99,975 · 50 at ₹1,89,950 · 100 at ₹3,59,900 · 200 at ₹6,79,800,
  all inclusive of GST

## v11 — 11 Aug 2026
Countdown to the due date. 370 checks.

- Her home screen now shows how long is left beside how far along she is —
  "26w 3d" with "13w 4d · 13 weeks 4 days to go" underneath
- Past the due date it counts up instead: "1 week 1 day past your date"
- The hospital patient list shows the same, so a nurse can sort by who is
  closest without doing the arithmetic

## v10 — 11 Aug 2026
Movement counter. 362 checks.

- A timer on the Log screen: start, then tap a large circle for every kick, roll
  or flutter. Live clock, running count, and movements per minute
- Saves the session and reports **how long ten movements took** — the measure
  that actually matters — with the per-minute rate alongside
- Learns her own pattern from past sessions and shows her usual time to ten
- **Alerts**: fewer than ten movements over two hours raises a red alert and
  tells her to call. A session taking more than twice her usual time raises a
  lower alert, because a slowdown against her own baseline is the early sign
- A short partial count raises nothing — she is told to try again later
- Recent sessions listed, so a change is visible to her and to the hospital

## v9 — 11 Aug 2026
Hospital staff who cannot get in. 344 checks.

- **Forgot your email or password?** on the hospital sign-in screen
- **Admins reset any staff login** from the Staff screen — a readable one-time
  password like `wardpulse418`, shown once, which signs that person out of every
  device immediately
- **Everyone can change their own password** from the Staff screen
- **Administrator recovery**: an owner-only endpoint for support, guarded by the
  `TRIMESTT_OWNER_KEY` environment variable. Never exposed in the app
- **Forgotten which email** — the hospital confirms itself by name and a
  registered phone number. We never reveal an email address to an unverified
  caller, only what to do next

Set `TRIMESTT_OWNER_KEY` on Railway to a long random string before you need it.

## v8 — 10 Aug 2026
Final version. 319 checks.

- **Hospital system intake**: the hospital issues an API key, the vendor posts
  new maternity registrations to `/api/erp/patients`, and they arrive in a
  pending queue. A nurse confirms the dates — and that confirmation is what
  enrols and bills. Duplicates by phone or MRN are rejected safely
- **CSV import** for hospitals whose vendor cannot or will not integrate. Paste
  a spreadsheet export, same queue, same confirmation
- **ERP-INTEGRATION.md** — a document to hand straight to the vendor
- **Today is now the worklist**, not statistics: critical alerts, missed hard
  windows, windows closing this week, patients who have gone quiet for a week,
  and patients who never activated — sorted by who needs a person first
- **Desktop layout for staff**: wide screens, four-across statistics, roomier
  tables. The patient app stays phone-shaped

## v7 — 10 Aug 2026
The full rework. 288 checks.

**Mother**
- Daily water target from her weight and trimester (ACOG-based, clamped 2.0–3.2 L),
  logged by the glass, doctor-overridable — fluid is restricted in some conditions
- Weight gain tracked automatically from her logs against IOM ranges for her
  pre-pregnancy BMI. She is never told to lose weight; the wording is always
  "inside / below / above the usual range", and the hospital is told
- Exercise and diet guidance per trimester on the home screen
- Log: free-text "anything else" box and a photo upload. Either one raises an
  alert, so a written complaint or a picture always reaches a person
- Plan collapsed into trimesters, current one open
- Payments page removed from the patient app entirely
- 50 new guides — food, medicines, sleep, movement, daily routine, discomforts,
  mind and family, birth prep. 88 in total across 18 categories

**Baby**
- Fixed: every baby tab rendered the same page. Baby now has its own five screens
- Real add-baby form — name, date of birth, birth weight, weeks at birth,
  delivery mode, paediatrician; editable afterwards
- Growth checked against WHO weight-for-age; a weight below the usual range
  raises an alert on its own
- Vaccines grouped by age band, each markable as given, with a printable record
- Milestones by month, tickable
- Feeds, nappies, head circumference, temperature and notes in the log

**Records locker**
- Scans, lab reports, blood work, prescriptions, vaccination records and
  discharge summaries, for mother and for each baby
- Images and PDFs to 4 MB, stored on disk beside the database
- Only the patient and her own hospital can open a file — enforced and tested

**Hospital**
- Reports page: every alert with patient, weeks, level, what was reported,
  whether care was taken, the outcome and who did it. CSV export and print
- Alerts now close with an outcome — called, advised to come in, seen in OPD,
  admitted, no action needed — not just an acknowledgement
- Doctor list, so consultants can be picked at registration and filtered on
- Registration captures height and pre-pregnancy weight for the weight tracking
- Fee is now ₹3,999 per code

**Fixed**
- `trimester` had been mangled to `trimestter` by the earlier rename, which
  silently sent every mother first-trimester guidance

## v6 — 10 Aug 2026
Pranaam demo build, part one.

- **Live EDD**: due date and current gestation appear on the registration form
  the moment the last-period date is picked — same 280-day rule as the server,
  so the desk sees exactly what gets stored. Works from a scan-confirmed due
  date too, working backwards
- **Separate staff logins with roles** — admin, desk, nurse, doctor. Only an
  admin can add or remove people. Removing a login signs that person out
  immediately
- **Password reset at the desk**: a fresh single-use code, valid 24 hours,
  issued per patient. Her records, children, logs and billing are untouched;
  old sessions are invalidated
- **Patient login screen**: no register link, forgot-password only. The device
  remembers her patient ID even after sign out, so a returning phone opens
  straight to a password prompt
- **Patient sessions never expire** — she stays signed in until she taps sign
  out. Staff sessions expire after 12 hours, because desk machines are shared
- **Patient list** now shows registration date, patient ID, activation code and
  any live reset code
- 215 checks

## v5.3 — 5 Aug 2026
- Line icons in both tab bars — Home, Plan, Log, Guides, Payments for mothers;
  Today, Patients, Register, Alerts, Billing for hospitals. Active tab lifts,
  thickens and gets a blush dot
- "Care" renamed to "Guides" so the tab says what it holds
- Service worker cache bumped, so returning users get the new build rather than
  the cached one
- 174 checks

## v5.2 — 5 Aug 2026
Blank screen fix. The deployed app rendered an empty phone frame.

- **The cause**: the v5 patch that added service-worker registration inserted it
  at every `render();` call — 14 times — producing `await if (...)`. A syntax
  error, so the whole script never ran and nothing rendered. Now registered once,
  at the end of the file
- `const screen` and `function chrome` renamed to `view` and `appbar`. Safari
  throws a SyntaxError when a top-level `const` shadows a read-only window
  global, which would have caused the same blank page on iPhone
- New TRIMESTT logo (with the second T) on the login screen, app bar and icons
- Four new tests: app.js must parse, no `await if`, exactly one service-worker
  registration, and no top-level const shadowing a browser global
- 162 checks

## v5.1 — 5 Aug 2026
Deploy fix. v5 failed Railway's health check.

- The HTTPS redirect was catching Railway's internal health check, which has no
  `x-forwarded-proto` header, so `/api/health` answered 301 instead of 200 and
  every deploy failed. Now only an explicit `x-forwarded-proto: http` redirects,
  and `/api/health` never does
- Server binds `0.0.0.0` explicitly rather than relying on Node's dual-stack default
- `healthcheckTimeout` raised to 120s
- 158 checks

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
