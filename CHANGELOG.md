# Trimestt app — changelog

## v37 — 15 Aug 2026
Text size actually changes. 920 checks.

Two faults, either of which alone would have made it do nothing.

**The size was set on `<html>`**, but `body` carries a fixed `font-size` that
overrides it — and every component uses pixel sizes anyway, so nothing inherited
from the root regardless.

Text now scales through a `--tscale` multiplier applied to the text a patient
actually reads: headings, body copy, chapter pages, list rows, form labels and
buttons. Icons, tab labels and chrome stay put, so nothing overflows at the
largest setting. Verified by rendering all three: the same screen comes out 519,
541 and 595 pixels tall.

**Her choice was never applied on load.** The setting saved correctly, but
`applySettings` only ran when she changed something — so on the next visit the
app reverted to normal. It is now applied from her record as soon as she signs
in.

## v36 — 15 Aug 2026
The picture was uploading all along. 914 checks.

Testing the whole path with a realistic photo rather than a one-pixel test image
found it in a minute: **the upload succeeded and the picture could not be
served.** The file route only recognised files belonging to a record or a log
photo. A profile picture belongs to the patient directly, so it always came back
404 — the picture saved, then failed to appear, which looks identical to nothing
happening.

- The file route now recognises a portrait, and still refuses to serve it to
  anyone but her and her hospital. There is a test for both
- Pictures are scaled to 1200 pixels, which lands around 0.8 MB against the
  server's 1.5 MB body limit. The previous target allowed up to 3.9 MB, which
  the server would have refused anyway — a second mismatch waiting to bite
- She can remove her picture and set another

The lesson for me: the earlier tests used a one-pixel PNG, which is small enough
that every size limit and serving path passed regardless. A test that cannot
fail is not a test.

## v35.1 — 15 Aug 2026
The picture, properly this time. 908 checks.

Shrinking the photo needed to load it into an image first, and it did that from
a `blob:` address. Our own Content-Security-Policy allows images only from
`'self'` and `data:`, so the browser refused it, the shrink failed, and the app
fell back to sending the full-size file — which the server then rejected for
being over four megabytes. Two of my own safeguards cancelling each other out.

- The picture is now read as a `data:` URL, which the policy allows. The policy
  itself is unchanged
- A picture that genuinely cannot be sent now says so, with its size, instead of
  failing quietly
- The upload failure is logged to the console, so the next one can be diagnosed
  in seconds rather than by guesswork

## v35 — 15 Aug 2026
Photos upload. One theme. 905 checks.

**Why the picture never uploaded.** A photo straight off a phone camera is
commonly six to ten megabytes; the server refuses anything over four. The app
was rejecting the file before it ever left the phone, and the message was easy
to miss.

Pictures are now scaled to fit within 1400 pixels and re-encoded as JPEG before
they are sent, with a second attempt at lower quality if the first is still
large. A six megabyte photo becomes roughly two hundred kilobytes — which also
matters for a patient on mobile data.

Documents are left untouched: a scan report has to stay legible. Formats a
browser cannot draw, such as HEIC, fall back to being sent as they are.

**Dark and automatic themes removed.** The palette is derived from each
hospital's brand colour, and keeping two coherent sets of that across every
hospital was not worth the contrast risk you found. One light theme, which is
what the app was designed around. The semantic colour tokens from v34 stay —
they are what makes the light theme reliable.

**The file control** on the symptoms screen was the browser's own "Choose file /
No file chosen". It is now a proper button that shows the chosen file's name.

## v34 — 15 Aug 2026
Text can no longer be invisible. 905 checks.

The contrast problems had one cause: components set a background but let their
text colour be inherited. When the theme changed, some inherited the wrong one
and text ended up the same tone as the surface behind it.

- **Every surface now names its own ink.** `--surface` with `--on-surface`,
  `--surface-2` with `--on-surface-soft`, and `--on-brand` for anything sitting
  on a hospital gradient. No component relies on inheritance
- **The dark theme is now only a token swap** — it redefines the pairs and
  nothing else, so it cannot drift out of step with the light one
- **Contrast is measured, not assumed.** A test computes the ratio for seven
  surface and ink pairs across both themes and fails below 4.5:1. Measured from
  the rendered page: 11.2:1 in light, 12.9:1 in dark
- The sign-in choices, the pregnancy card, alerts and buttons all state their
  ink explicitly

## v34 — 15 Aug 2026
Raw HTML in the middle of a chapter. 888 checks.

Found on a real phone, not in any test: a chapter was printing

    Start [term]" data-action="term" data-term="folic acid">folic acid if you...

The glossary marked one term, then kept scanning the same string for the next —
so a later term matched text inside the button it had already inserted and broke
the tag. Every match is now found against the plain text first and the markup is
built once at the end, which also means several terms can be marked in a
paragraph instead of one.

- **File inputs are styled.** "Choose file / No file chosen" is the raw Android
  control and looked broken next to everything else
- **A new version now takes over immediately.** The service worker was waiting
  for every tab to close, which can be days. If a clinical correction ever needs
  to reach patients quickly, it now does

## v33 — 15 Aug 2026
Her profile, her settings. 877 checks.

**The picture now works.** Tapping the avatar opened the gallery and then did
nothing, because the file input was never added to the page — Android does not
fire the change event on a detached input. It is attached now, and the avatar
opens a proper profile screen rather than the picker directly.

**Profile**
- Her picture, with a way to remove it again
- A second number for herself
- Who to call if she cannot answer: name, relationship and number. She can
  correct these herself; her registered phone stays with the hospital
- Change her own password

**Appearance**
- **Light, dark, or match the phone.** The dark theme is derived the same way as
  the light one, so a hospital's brand hue still drives it — only the lightness
  relationships invert. The alert red is lifted so it still reads as a warning on
  a dark surface
- Three text sizes, for anyone reading without their glasses

**Notifications**
- Reminders, sound, vibrate, and whether her family contact hears about them too
- **Quiet hours**, which hold reminders until morning — and never hold back
  anything urgent. A tier 4 alert reaches her at three in the morning whatever
  she has set, and there is a test for exactly that

**Also**
- Page-turn sound and the emergency helper can both be switched off
- The helper no longer overlaps the tab bar on phones with a gesture bar

## v33 — 15 Aug 2026
Settings, and two things found on a real phone. 841 checks.

**A settings screen**, reachable from her home:
- Her picture, and a way to change it
- Reminders on or off, notification sound, vibration
- **Quiet hours** — no reminders between the times she chooses. Urgent alerts
  ignore this entirely, which is the whole point of them, and the code says so
- The helper button can be switched off
- Page turn sound
- **Text size** — normal, large, largest, applied across the whole app
- Language
- Change her own password, without troubling the hospital

All of it in English, Telugu and Hindi.

**Two bugs the Android build exposed, which no amount of desktop testing would
have found:**

- The helper sat on top of the Records tab. It now clears the bar and sits
  slightly smaller
- The phone webview reports a viewport taller than the visible area, so centring
  the app left a strip of background below the tab bar. In the phone app it now
  fills the screen

While merging this I found a **second settings implementation** from an earlier
version, still wired to the same two routes. The first one declared won, which is
why the new screen appeared to do nothing. Both are now one.

## v32 — 14 Aug 2026
The phone apps load this site. 820 checks.

The native shell was set up to serve a local page that then navigated to
trimestt.com. That navigation was blocked and the app closed on launch. It now
loads the site directly, which is the right arrangement anyway — every push to
Railway reaches every patient immediately, with no store review.

Because the shell page is no longer used, the native parts moved into the web
app itself:

- **Push registration**, asked for only once she is signed in. A permission
  prompt on the first screen, before she knows what the app is, gets declined
- **Status bar and splash**, matched to the brand
- All of it behind a check for `window.Capacitor`, so in an ordinary browser none
  of it runs

- **`POST /api/patient/device`** stores her device token so a notification can
  reach her when the app is closed. Up to five devices, since she may change
  phones
- The hospital can see whether a patient is reachable by push, without ever
  seeing the token

## v31 — 14 Aug 2026
Data was never on the volume. 806 checks.

`lib/store.js` read **`TRIMEST_DATA`** — one T — while the deployment sets
**`TRIMESTT_DATA`**. The names never matched, so the database was written inside
the container rather than the mounted volume, and **every deploy destroyed it**.

That is why the reviewer account disappeared: it was created, then the next
deploy replaced the container. Any hospital or patient created before a deploy
was lost the same way.

- The store now reads `TRIMESTT_DATA`, and still honours the old spelling so a
  container started with either keeps working
- **It prints the storage path at startup**, with a warning if the variable is
  unset. Check the deploy log — it should read `[trimestt] storage: /data`
- A test asserts the code reads the same variable name the deployment documents

Nothing was lost that mattered — there were no real patients yet. Had this been
found a month later it would have taken Pranaam's records with it.

## v30.1 — 14 Aug 2026
The invisible sign-in button. 802 checks.

`--brand-mid` was only ever set by applyBrand(), which runs once a hospital is
known. On the sign-in screen there is no hospital, so the gradient behind "I am a
mother" was invalid, the background fell back to nothing, and white text on white
made the button disappear. Every patient opening the app hit this.

- The variable now has a value in `:root`, like every other
- **A test walks the whole stylesheet** and fails if any custom property is used
  without a fallback. All 41 are covered
- The title and subtitle on both buttons now stack properly instead of running
  together

## v30 — 14 Aug 2026
Reviewer account, created on the server. 799 checks.

`railway run` executes on your own machine and only injects the environment
variables, so `scripts/reviewer-account.js` wrote to a local file and the account
never existed in production. That is why the credentials would not sign in.

- **`POST /api/owner/reviewer-account`** creates or refreshes the account on the
  server itself, guarded by `TRIMESTT_OWNER_KEY`
- Running it twice refreshes the password rather than creating a second account
- It sets the patient number on the login record, which is what sign-in matches
  on — the local script had been missing that at first too
- The account arrives already activated with three weeks of readings, so no
  screen a reviewer opens is empty

## v29 — 12 Aug 2026
The movement counter reports; it does not judge. 788 checks.

Current RCOG guidance says there is insufficient evidence for a fixed movement
count, and that a woman should be seen on any perceived reduction. So the app no
longer decides whether a count is normal.

- **No target, and no verdict.** The circle counts movements rather than counting
  towards ten. Nothing is marked reached or missed, and a low count on its own
  raises no alarm
- **Every session goes to the hospital** — the count, how long it took, the rate,
  and how it compares with her own recent sessions. Ordinary counts arrive as
  information; the hospital sees the pattern rather than only the exceptions
- **One question at the end: does this feel normal for your baby?** Her answer is
  what the app acts on. "Fewer or different" raises a red alert and shows the
  call screen, whatever the number was
- Her own history is shown as her baby's pattern, explicitly not a target
- The chapter and all three languages were rewritten to match

This is the safer arrangement in both directions: it cannot reassure a woman
whose baby has slowed, and it cannot frighten one whose baby is simply quiet that
hour.

## v28 — 12 Aug 2026
Where the guidance comes from. 781 checks.

- **Every chapter now ends by naming its sources** — the bodies whose published
  guidance it follows, so a patient or her doctor can check any statement
- **A references screen** listing all fifteen documents in full, with links and
  which parts of the app draw on each
- Sources are named for the parts that are not chapters too: the weight gain
  ranges, the water target, the visit plan, the immunisation schedule, the growth
  ranges and the movement counting
- **The app says plainly that no doctor has read the wording yet.** A citation
  says what we read; it does not say a clinician has approved what we wrote.
  Once a hospital's obstetrician and paediatrician sign off, their names replace
  the warning — set them in `public/references.js`

### A clinical correction this turned up

Checking the sources found that RCOG's guidance on reduced fetal movements was
reissued, and it now says there is **insufficient evidence for a fixed movement
count**; women should attend on any perceived reduction rather than count to a
number.

Our movement counter was calling ten movements "reassuring". That wording is
gone. The counter now says a change from her baby's own pattern matters more than
any number, and tells her to call whatever the count says. The chapter was
rewritten to match.

This is exactly the class of error that clinical review exists to catch, and it
was found by writing the citations rather than by testing the code.

## v27 — 12 Aug 2026
New app icon, everywhere. 745 checks.

- The mother-and-baby mark on violet is now the icon in every place a phone or a
  store shows one: the home screen after installing, the browser tab, the
  sign-in screen, and the header when a hospital has not uploaded their own logo
- Generated at every size both stores need, including an **adaptive icon** for
  Android where the mark is separated from its background so it survives the
  circular, squircle and rounded-square crops different phones apply
- A **maskable** icon for the installed web app, with the mark held well inside
  the safe circle
- The header tile lost its white backing — the mark carries its own field, so a
  white square around it looked like a sticker
- Splash screens use the mark on the app's blush rather than the violet, so
  opening the app does not flash a dark screen before a light one

Everything is in `appstore/` in the native project, ready to drop into Xcode and
Android Studio.

## v26 — 12 Aug 2026
Ready to submit. 740 checks.

Both stores refuse a submission without these, and none of them existed.

- **/privacy, /terms and /support are live pages.** The privacy text is generated
  from the same source as the notice patients agree to in the app, so the two can
  never drift apart
- **Reviewer account script** — `node scripts/reviewer-account.js` creates a
  demonstration hospital and a patient at 24 weeks with three weeks of readings
  behind her, so every screen has real content. Apple rejects apps a reviewer
  cannot get into, and Trimestt needs a hospital code to pass the first screen
- **App icons at every size**, cropped to the mother-and-baby mark. The wordmark
  is illegible at 60px and both stores discourage text in icons. Includes a
  maskable icon that survives Android's circular crop
- **The header now clears the notch** and the tab bar clears the home indicator,
  using safe-area insets. Without this the hospital name sits under the status
  bar on every recent iPhone
- Theme colour, manifest colours and the iOS touch icon all match the blush
  palette rather than the old lavender

## v25 — 12 Aug 2026
Blush, and the illustrations you actually supplied. 705 checks.

**Your illustrations were never being shown.** The swap from the drawn figure to
your painted PNG was written as an inline `onload` handler, and our own
Content-Security-Policy blocks inline handlers — as it should. So the browser
silently ignored it and you saw my drawing every time. The swap is now wired in
JavaScript and the policy stays strict. A test fails if an inline handler is ever
added again.

**The palette is blush now.** Default brand is a rose, and because every tone is
derived from the hue, the whole app follows: pale blush page, warm pink washes,
rose borders, and text in a warm near-black rather than a cool grey. Gradients
travel between two pastels instead of fading into their own tint.

**White text is now readable on every hospital colour.** The gradients were
running from the lightest tone, which failed contrast on a pastel brand. They run
from a mid tone to a deep one, and a test checks white against five hospital hues
at AA.

**A pink hospital no longer swallows the alert red.** If a hospital's brand sits
within 34 degrees of the alert hue, the alert is rotated and deepened so a
warning still reads as a warning. Getting this wrong in a maternity app is not a
cosmetic problem.

## v24.1 — 12 Aug 2026
Blush, throughout. 694 checks.

- The default palette is now blush rose rather than lavender, and every neutral
  is warmed toward it — surfaces, borders, even the body text carry the rose
  hue, so nothing on the page reads as grey
- Surfaces sit lighter and less saturated for a genuinely pastel feel; depth
  comes from the gradient end rather than from heavier colour
- **The alert red moved away from pink** to a true red. With a pink brand, a
  pink alert stops reading as a warning — the two must never be confused
- The demo hospital and any hospital that has not chosen a colour now start
  blush instead of lavender
- The phone bezel and toasts were warmed to match; a near-black frame around a
  pastel page looked wrong
- **"Make a password" is now "Create a password"** at activation, in all three
  languages

## v24 — 12 Aug 2026
The design system. 691 checks.

**Colour is now derived, not fixed.** Give Trimestt a hospital's brand hex and it
builds the whole palette from that hue — surfaces, borders, text tones, washes,
gradients and shadows. A teal hospital, a maroon hospital and a navy hospital
each look deliberate rather than like an indigo template with one colour swapped.
Even the body text carries a trace of their hue rather than a dead grey.

Two colours never move: the alert red and the reassuring green. Red has to mean
red in every hospital, whatever their branding.

**The forty-week ribbon** is the new signature on the Today card. Every other
pregnancy app draws a progress ring; a ring tells you a fraction but not which
trimester you are in. The ribbon lays out all forty weeks, tick height marks the
trimester, filled ticks are the weeks behind her, and the tall white tick is now.

**Glass, used with discipline.** The app bar, tab bar, language menu, helper and
term sheet float over content, so they are glass. Content cards are solid. Solid
anchors content; glass frames actions. Blurring everything is what made the 2021
version of this trend look dated.

**Typography with a job.** The display serif appears in exactly three places —
the gestation figure, her weight, and chapter titles. Everywhere else is the
sans. Dates, measurements and page numbers are set in the mono face, so data
reads as data.

**Everything on a scale.** Spacing runs on a 4px base, corners on four radii,
elevation on three levels. The stylesheet was rewritten rather than patched
again; the old one had accumulated overrides that were fighting each other,
which is what turned the cards white on hover.

**Motion that means something.** Cards rise into place in sequence on entry, the
ribbon sweeps up week by week, and controls respond to being pressed. All of it
stops for anyone whose phone asks for reduced motion.

**Her photo** sits top right, tappable to change, with a single initial until she
adds one.

## v23.1 — 12 Aug 2026
The baby in the womb. 681 checks.

- Your rendered image now sits on the pregnancy card at the top of Today
- Like the last one it arrived with the checkerboard baked in as pixels, so the
  background was removed. A plain key left a white fringe from the soft glow, so
  the bubble was masked to an ellipse just inside its own edge — no halo against
  the purple card
- **12 KB** after resizing and palette compression, and cached offline
- The drawn version stays as the fallback

## v23 — 12 Aug 2026
Your illustration, in the banner. 674 checks.

- The painted illustration you supplied now sits on the home banner
- It arrived with a white background baked in, so the background was keyed out
  by flood fill from the edges, the edge softened slightly so it does not look
  stamped out, and the result trimmed to the figure
- Reduced to 408 x 620 and palette-compressed to **34 KB**, from 230 KB. It loads
  instantly and is cached for offline use
- Shown whole rather than cropped, so her head is not cut off
- The drawn figure remains as the fallback if the file is ever missing

Keep the original PNG somewhere safe — you will want it at full size for the app
store screenshots.

## v22.2 — 12 Aug 2026
Bring your own illustration. 671 checks.

- Drop a **`journey-mother.png`** into `public/` and the home banner uses it
- The drawn figure is in the page first and only hidden once the image has
  actually loaded, so a missing or broken file can never leave the banner blank
- The banner was widened to give a painted illustration proper room
- See DEPLOY.md for the size and the rights note

## v22.1 — 12 Aug 2026
The journey figure, redrawn to the reference. 669 checks.

- She is now in profile, turned toward the bump, as in the picture you sent:
  long dark hair falling behind the shoulder and sweeping down the front, a pink
  tank top cropped above a bare bump, a mauve skirt, both hands cradling — one
  resting on the upper curve, one supporting from beneath — and petals drifting
  behind her
- The banner was resized so she fits inside it rather than being cropped

## v22 — 12 Aug 2026
Fixing what I got wrong. 667 checks.

**Cards went blank on hover** — a hover rule of mine forced every card to a
white background, including the purple pregnancy card, so its white text
vanished. Fixed; gradient cards keep their gradient.

**Older iPhones would have seen nothing at all.** The page-splitting code used a
regex lookbehind, which Safari on iOS 15 and 16 cannot parse — the whole app
would have failed silently on those phones. Rewritten without it. A test now
scans every script for lookbehind, optional chaining, nullish coalescing,
replaceAll, Array.at, Object.hasOwn, findLast and structuredClone. CSS `inset`
and `dvh` now carry fallbacks for the same reason.

**The book really is a book now.** Pages were all showing 1/1 because pagination
measured a container that had no height yet. It now splits on text length —
three pages for a typical chapter — and long paragraphs break at sentence ends
rather than mid-thought. Page turns animate and sound as intended.

**The emergency button is gone from the middle of every page.** It lives only in
the helper.

**The helper is a line, not a block.** A slim pink pill that unrolls beside the
bot for three seconds and rolls away for three.

**Today now opens with the pregnancy card** — weeks, due date, time to go, and
the baby in the womb — followed by this week's size and tips. Home keeps the
greeting, the journey banner, quick actions and the checklist.

**New illustrations.** The figure on the journey banner is now a woman in a pink
top cradling her bump, with her hair loose — the previous drawing read as a
covered figure, which was not the intention. The pregnancy card carries a baby
curled in the womb.

## v21.1 — 12 Aug 2026
Blank screen fix. 617 checks.

- `art.js` declared `function art` and `app.js` declared `const art`. The browser
  loads both into one scope, so the whole of app.js failed to parse and nothing
  rendered. Artwork now lives inside a closure and only `window.art` is exposed
- **New test**: every front-end script is parsed together, exactly as the browser
  loads them, and the shell is checked for load order. This class of failure
  cannot pass silently again — it is invisible to any test that wraps a single
  file in its own scope, which is why it slipped through

## v21 — 12 Aug 2026
The book, and a helper. 609 checks.

**Guides now read like a book**
- Each chapter is split into pages that fit the screen, and turns one at a time
  with a page-turn animation
- A soft paper rustle on each turn, made in the browser rather than shipped as a
  file. A speaker button mutes it, and the choice is remembered
- Every page carries the logo, the chapter name and its number, on a proper
  lower margin
- Reaching the end of a chapter turns straight into the next one, so the whole
  library reads as one book
- Respects reduced-motion settings: pages change without animation

**Key words explained where she meets them**
- Fifty terms — anomaly scan, pre-eclampsia, colostrum, lochia, LSCS, fundal
  height — are underlined in the text
- Tapping one slides up a short plain-language meaning without losing her place

**A small helper**
- A bot at the bottom right of the patient app. Every three seconds it opens a
  card offering the emergency button, then closes for three
- Tapping the bot pins it open; tapping again returns it to the cycle
- It never appears while she is reading a chapter, and it holds still for anyone
  who has asked their phone to reduce motion

## v20 — 12 Aug 2026
The visual rebuild. 594 checks.

**New look**
- Indigo header with a curved base, soft white cards, pink emergency button
- Her photo in the header, tap to change it
- "Good morning, Priya" by time of day, using her first name

**Home**
- Pregnancy journey banner with an illustration, changing by trimester
- Quick Actions grid — symptoms, medicines, water, weight, movements, visits,
  records, guides
- Today's Checklist, five items, ticked off as she goes
- **Baby this week** — what size the baby is, with a drawing: a pea at 6 weeks,
  a lime at 12, a banana at 20, a pumpkin at 40. Length and weight for every
  week from 4 to 40, with a note that it is typical rather than her measurement
- Water with a filling bar, weight with a real line chart of her own readings

**Today**
- Split into two screens. Symptoms is a grid of illustrated tiles with a
  free-text box and a photo. Vitals holds water, weight with its chart, blood
  pressure, movements, sugar and her medicines by name

**Guides**
- Book hero card, category chips with small icons, and numbered chapters with
  read times

**Also**
- Fifty-seven original illustrations, drawn as SVG so they scale and cost
  nothing to load
- Weight no longer shows "unknown" — it explains that the hospital needs to add
  her height and pre-pregnancy weight

## v19 — 11 Aug 2026
DPDP and medical compliance pass. 551 checks. See COMPLIANCE.md.

- **Itemised notice** — each thing collected now says what it is and why, which
  is what Rule 3 of the DPDP Rules 2025 requires. Plain language, in her language
- **Cross-border storage disclosed** honestly, along with how long records are
  kept and who to write to
- **Right to a copy** — one button downloads everything held about her
- **Correction, erasure and grievance** requests, with the 90-day deadline
  recorded and a hospital screen to answer them
- **Withdraw consent** from the app, as easily as it was given. The hospital is
  alerted, sessions end, and her medical record stays with the hospital as the
  law requires
- **Patients under 18** — age captured at registration, and a guardian's name,
  relationship and phone required before she can be enrolled. Listed for the
  hospital, with staff recording that ID was seen
- **Consent log** of every agreement and withdrawal, with version and time
- **Grievance contact** published in the notice, set by environment variables
- **Data Protection Board** named as the escalation route
- **Breach register** for the owner, with the 72-hour reminder
- Terms now say plainly that no doctor consults or prescribes through the app —
  which keeps it outside the NMC telemedicine guidelines

**Set `TRIMESTT_GRIEVANCE_NAME` and `TRIMESTT_GRIEVANCE_EMAIL` on Railway.**

## v18 — 11 Aug 2026
Language menu and consent. 510 checks.

- **Language is now a globe and a code in the top right** — "EN", "TE", "HI" —
  opening a small dropdown. The twelve languages no longer spread across the
  screen. It sits on the sign-in screen and in the app bar once she is in
- **Consent before an account exists**: setting up now shows the terms in a
  scrollable box, in her language, with a tick box underneath. The button
  refuses until she ticks, and the server refuses too — agreement is not
  something the app can skip
- **What she agrees to is recorded** — the version and the moment — which is
  what the DPDP Act expects and what a hospital will be asked for
- The terms name her hospital, and say plainly: the hospital holds the records,
  only they can see them, the app is not an emergency service, it does not
  replace her doctor, nothing records the sex of an unborn baby, and nothing is
  ever sold or advertised

## v17 — 11 Aug 2026
Language, properly. 493 checks.

- **Language chips sit above the sign-in card**, so she chooses before she logs
  in — and the sign-in screen itself changes with the choice. It is remembered
  on that phone
- **151 phrases across every patient screen** translated into Telugu and Hindi:
  sign in, activation, password reset, home, water, weight, today's log,
  medicines, plan, the book, records, baby, movements, departments, privacy and
  the emergency button
- Written in **plain, everyday words**, not clinical or formal ones. "Today"
  rather than "Daily log". "BP upper" rather than "systolic". Short sentences
- Nothing falls back silently: a test fails if any phrase is missing from a
  language

Staff screens stay in English — nurses and doctors work in it, and translating
clinical settings without review would cause more harm than good. Guides carry
their own translations, and still say plainly when one is not ready.

## v16 — 11 Aug 2026
Listening at home, built to be safe. 490 checks.

**Hospital side**
- Privacy screen: a hospital-wide switch, off by default
- Patient list: approve or withdraw home listening for one patient at a time,
  with a note kept on the record and the warning shown before you approve
- Both are needed. Neither alone opens it

**Patient side, once approved**
- Every reading starts with one question: how have movements been today?
- **Answering "fewer or different" overrides everything.** No reading is saved as
  reassurance, a red alert goes to the hospital, and she gets a call screen with
  the labour room number
- A value outside 110–160 raises an alert
- Not finding a heartbeat raises nothing and tells her it is the device, not the
  baby — false alarms here cause real harm too
- Five rules shown every time, including that a phone cannot do this and that a
  heart rate changes late while movements change first

**What is deliberately not built**: any attempt to hear a heartbeat through the
phone microphone. It is not physically possible; apps that claim it are picking
up the mother's own pulse. Building it would have been the one feature in
Trimestt capable of costing a baby.

## v15 — 11 Aug 2026
Seven requests. 461 checks.

- **Fees corrected**: the hospital bills the patient ₹6,999 and pays us ₹3,999
  per code. Both figures now appear in billing rather than a stale ₹4,999
- **Languages**: switcher on her home screen. Interface fully translated into
  Telugu and Hindi; nine more Indian languages listed. Guides show a translation
  where one exists and English with a clear note where it does not — clinical
  content is never machine-translated silently
- **Movement counting opens at 28 weeks**, or 26 if she has any risk tag, which
  is what ACOG and RCOG advise. Before that the screen explains why and tells
  her to report any change anyway
- **Medicines by name**: the hospital sets her prescription and she ticks the
  actual tablets. Missing one marked important raises an alert naming it. She
  can add anything started between visits
- **14 new guides** — fears, liquids, myths and facts, constipation in detail,
  epilepsy, spicy food, PCOS, thyroid, clothing, hunger, ideal sleep, an ideal
  day, why water matters, and road travel in India. 102 guides in 20 categories
- **The pregnancy book**: guides now open as a chapter index with a page-turn
  animation, grouped by subject
- **Fetal heart rate** recorded by the hospital with a Doppler or scan, shown to
  her with the normal range. See the note below
- **Other departments**: dermatology, mental health, diabetology, cardiology,
  neurology, renal, endocrinology, gastro, physiotherapy, nutrition, lactation,
  paediatrics, dental and anaesthesia. She asks, it reaches a new Requests tab

### On the heart rate

A phone cannot measure a fetal heartbeat, so nothing here pretends to. Readings
are entered by clinicians. Her screen also carries the line that matters: a
baby's heart rate changes late, movements change first — so a heartbeat heard at
home is never a reason to delay reporting reduced movements.

## v14 — 11 Aug 2026
Activation fix. 409 checks.

- **The activation link now always appears** on the patient sign-in screen.
  It had been hidden once a device remembered a patient ID, which meant a new
  patient on a shared or previously used phone had no way in
- **"Not TRM-…? Use a different ID"** clears the remembered ID from that device,
  for front-desk phones and shared handsets
- Activation is not self-registration: she still needs the ID and code her
  hospital issues, so nobody can create an account on their own

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
