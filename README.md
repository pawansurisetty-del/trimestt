# Trimestt — the app

The product itself: a mobile web app where **hospitals set themselves up** and
**patients use the app under that hospital's name**. Login is the home screen.

Node's built-in modules only. No `npm install`, no framework, no build step.

## Run it

```bash
cd trimestt-app-v5
node seed.js        # optional — demo hospital, three mothers, live alerts
node server.js
```

Open **http://localhost:3006**. On a laptop it renders inside a phone frame, so
what you demo is what the mother sees.

Demo logins after seeding:

| Who | Login |
|---|---|
| Hospital | `demo@trimestt.test` / `demo1234` |
| Patient | `TRM-SUN01-0001` / `demo1234` |

## Test it

```bash
node test_api.js
```

119 end-to-end checks against the real server: signup validation, auth guards,
setup gating, ID generation, activation, the antenatal plan, alert grading,
the emergency button, child records, immunisation status, billing totals,
cross-patient isolation, and that passwords are never written in plaintext.

## The two flows

**Hospital** — sign up, then a setup screen: name, address, city, reception
phone, **labour room phone** (the number the emergency button dials), logo,
app colour, immunisation schedule (IAP or NIS), and the BP and sugar thresholds
that trigger alerts. Patients cannot be registered until this is complete.

Then: register a patient → the app issues a **patient ID** (`TRM-SUN01-0001`)
and a **six-character activation code**. The desk hands both over. ₹4,999 is
billed at that moment.

**Patient** — activates with the ID and code, sets her own password, and lands
in an app carrying her hospital's name, logo and colour. Inside:

- **Profile switcher** — Mother, Baby 1, Baby 2, and "+ Add baby" (₹2,999 each)
- **Home** — gestational age, next item in her plan, missed hard windows
- **Plan** — the full antenatal schedule generated from her dates, with windows
- **Log** — weight, BP, sugar, movements, medicines, symptoms. Graded on save
- **Guides** — 36 articles across 11 categories, filterable, full text in-app
- **Payments** — what her hospital has billed
- **Notifications** — bell with unread count: alerts, upcoming plan items,
  passed windows, vaccines due
- **Emergency button** — on every mother screen. Before 37 weeks it flags
  preterm labour and says the consultant is being paged

## Alert grading

`lib/clinical.js` grades each log against the hospital's own thresholds:

| Tier | Example |
|---|---|
| 1 | Missed iron or calcium — stays in the app |
| 3 | Sugar above range, substance use reported — hospital worklist |
| 4 | BP past threshold, reduced movements, bleeding, missed critical medicine, danger signs, emergency button |

Tier 3 and above reach the hospital dashboard. Nothing here diagnoses — every
red alert routes to a person.

## Files

```
server.js           HTTP server: static files + API, security headers
lib/store.js        JSON file store (swap this for Postgres later)
lib/auth.js         scrypt password hashing, session tokens, activation codes
lib/clinical.js     EDD, gestation, antenatal plan, immunisation plan, grading
lib/api.js          every route
public/index.html   app shell
public/app.css      mobile UI, phone frame, glass cards
public/app.js       screens, actions, state
seed.js             demo data
test_api.js         end-to-end tests
data/db.json        created on first run — this is your database
```

## Compliance built in

- **No field anywhere records the sex of the foetus** (PC-PNDT). The test suite
  fails if one is ever added.
- Passwords are scrypt-hashed with a per-user salt; nothing plaintext on disk.
- Every alert stores who acknowledged it and when — the audit trail is what
  protects the hospital.
- Attendant contact is a field the hospital fills in with the patient's consent,
  not an automatic lookup.

## Before real patients touch this

1. **Move off the JSON store.** It's correct and atomic, but it's one process
   and one file. Postgres (Railway) or Supabase, same shape as Cutiscan.
2. **Add HTTPS and a real domain.** Sessions travel as bearer tokens; they must
   not cross plain HTTP.
3. **Wire the notification ladder.** The tiers are graded and stored; delivery
   over WhatsApp, SMS and auto-dial is not built yet.
4. **Add rate limiting** on login and activation.
5. **Backups.** Whatever store you move to, take daily snapshots.

## Deploying

See **DEPLOY.md** — Railway, domain, HTTPS and install-as-app, start to finish.

### Notes

`package.json` has `start`, so Railway will run it as-is. Set `PORT` from the
environment — the server already reads it. Persist `data/` on a volume, or move
to Postgres first, which is the better answer.

```bash
PORT=8080 node server.js
```
