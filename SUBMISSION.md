# Getting Trimestt into the App Store and Play Store

Written on 12 August 2026. Everything here is done on your MacBook.

---

## The one thing that decides your timeline

Google requires a **closed test of at least 12 testers, opted in continuously
for 14 days**, before a personal developer account can apply for production
access. That clock cannot start until the account exists and a build is
uploaded.

So: **create the Google Play account today**. Every day it waits pushes the Play
launch back a day, one for one. Apple has no equivalent wait.

Realistic dates if you start today:

| | |
|---|---|
| Apple review submitted | around 18 August |
| **Live on the App Store** | **22–26 August** |
| Android closed test starts | around 15 August |
| Closed test ends | around 29 August |
| Production access review | up to 7 days |
| **Live on Play** | **first week of September** |

Android patients can install directly from a link on trimestt.com from day one,
so nobody waits. Tell Pranaam that plainly rather than promising both by the
31st.

---

## Step 1 — Accounts

**Google Play** — https://play.google.com/console/signup
- $25, paid once
- Register as an **individual** for now. An organisation account skips the
  14-day test but needs a D-U-N-S number, which takes up to a month
- Apply for the D-U-N-S in parallel anyway; it is free and you will want it

**Apple** — $99 a year
- Your identity verification is already with them. Nothing more to do until it
  clears
- Enrolled as an individual, so the App Store seller name will be your own name
  rather than Trimestt. Fine for now; changing it later needs a company and a
  D-U-N-S

---

## Step 2 — Build the app

The native project is in `trimestt-native/`. It wraps the live site, so the app
always runs the current version of Trimestt without waiting on a store review —
you keep pushing to Railway exactly as now.

```bash
cd trimestt-native
npm install
npx cap add ios
npx cap add android
npx cap sync
```

Then drop the icons in:

```bash
# Android
cp -R ../appstore/android/mipmap-* android/app/src/main/res/

# iOS — open Xcode, select App > Assets > AppIcon,
# and drag appstore/ios/AppIcon-1024.png onto the 1024 slot
npx cap open ios
```

### What makes this pass Apple's review

Apple rejects apps that are only a wrapped website (guideline 4.2, minimum
functionality). The shell adds real native behaviour, which is why it clears:

- **Push notifications** — visit reminders and vaccine due dates reaching her
  when the app is closed. This is the strongest single answer to 4.2
- **Camera** — uploading scans and reports
- **Offline handling** — a proper message rather than a browser error
- **Native splash and status bar**

If you are asked to justify it, that list is the answer. Do not argue that the
website is enough.

---

## Step 3 — Android, and the 14-day clock

```bash
cd android
./gradlew bundleRelease
# output: android/app/build/outputs/bundle/release/app-release.aab
```

You will need an upload key the first time:

```bash
keytool -genkey -v -keystore trimestt-upload.jks -keyalg RSA \
        -keysize 2048 -validity 10000 -alias trimestt
```

**Back that keystore up in two places.** Lose it and you can never update the
app under the same listing.

Then in the Play Console:
1. Create the app, fill the store listing (text below)
2. Testing → Closed testing → create a track
3. Upload the .aab
4. Add **15 testers by email**, not 12. If you drop below twelve the clock
   resets
5. Send them the opt-in link and check they actually open the app — Google
   looks at whether testers used it, not just that they joined
6. After 14 continuous days, apply for production access

---

## Step 4 — Store listing

### Name and subtitle
- **App name:** Trimestt
- **Subtitle / short description:** Pregnancy care from your hospital

### Description

**Before you paste this anywhere:** the two claims below are the ones that can
get a medical app pulled after launch, so check them against the code rather
than against memory.

1. **Clinical review.** This copy does *not* say the chapters are checked by
   doctors, because `public/references.js` has `reviewed: false` and the app
   tells every patient so at the end of every chapter. A listing that claims
   review the product itself disclaims is a misrepresentation in the Medical
   category. When `TRIMESTT_REVIEW` is filled in, and only then, add
   "reviewed by Dr X, obstetrician, and Dr Y, paediatrician" — with the names.
2. **The movement counter.** It reports; it does not judge. Do not describe it
   as learning a pattern, setting a target, or telling her whether a count is
   normal. Current RCOG guidance is that there is insufficient evidence for a
   fixed count, which is why the target was removed on purpose.

> Trimestt is given to you by your hospital. It keeps your whole pregnancy in
> one place — every visit, scan and test worked out from your own dates, so you
> know what is due and when.
>
> Write in a reading each day and your hospital sees it the same minute. If
> something is outside the range your doctor set, they know straight away rather
> than at your next visit.
>
> **What it does**
> - Your plan for all forty weeks, with the week range for each visit and scan
> - Daily log: weight, blood pressure, sugar, movements and your medicines by name
> - A water target worked out for you, and your weight tracked against the range
>   that fits your build
> - A movement timer that records each session and sends it to your hospital
> - 102 short chapters on food, medicines, sleep, labour and your baby
> - Your scans, reports and prescriptions kept safely in one place
> - After birth: vaccines, growth, feeding and the signs that mean bring your
>   baby in
> - One button that calls your hospital and sends them your details
>
> Available in English, Telugu and Hindi.
>
> Trimestt supports your care. It does not diagnose, and it does not replace your
> doctor. If you are unwell, call your hospital or go in — do not wait for the
> app.
>
> You need a patient ID and code from your hospital to use Trimestt.

### Keywords (Apple, 100 characters)

```
pregnancy,antenatal,maternity,baby,vaccination,hospital,scan,due date,trimester,kick count
```

### Category
- Primary: **Medical**
- Secondary (Play): Health & Fitness

### Age rating
- Apple: **17+** — select "Medical/Treatment Information: Infrequent/Mild"
- Play: complete the content rating questionnaire; expect PEGI 3 / Everyone,
  with the medical information declaration

---

## Step 5 — Privacy, which is where health apps get stuck

Both stores require a live privacy policy URL **before** you submit. Yours does
not exist yet.

**Build `trimestt.com/privacy` first.** The content is already written — it is
the notice patients agree to at activation, served from `/api/terms`. Put it on
a plain page.

### Apple privacy labels

Declare **Data Linked to You**:

| Category | Purpose |
|---|---|
| Contact Info — name, phone | App Functionality |
| Health & Fitness — health | App Functionality |
| Identifiers — user ID | App Functionality |
| User Content — photos, other | App Functionality |

Declare **no** tracking, **no** data used for advertising, **no** data brokered.
All true, and worth saying plainly.

### Play Data safety form

- Data is encrypted in transit: **yes**
- Users can request deletion: **yes** — point at the in-app request
- Data shared with third parties: **no**
- Collected: personal info, health info, photos, app activity — all "App
  functionality", all optional except name and phone

Answer these honestly. A wrong answer here is the most common reason a health
app gets pulled after launch.

---

## Step 6 — Screenshots

Required sizes:
- **iPhone 6.7 inch** — 1290 × 2796, at least three
- **iPhone 6.5 inch** — 1242 × 2688, at least three
- **Android phone** — at least two, 1080 × 1920 or larger
- **Play feature graphic** — 1024 × 500

Take them from the live app with a demo patient at about 20 weeks, so the
screens have real content. The six worth showing:

1. Today — the pregnancy card with the forty-week ribbon
2. Home — journey banner, quick actions, checklist
3. The daily log
4. Baby this week
5. The guide reader
6. The emergency button

Do not use a real patient's data.

---

## Before you submit, check these

- [ ] `trimestt.com/privacy` is live
- [ ] `trimestt.com/support` or a support email in the listing
- [ ] A test account for the reviewer — a patient ID and password that works.
      **Apple will reject without this**, because your app needs a hospital code
      to get past the first screen. Put it in App Review notes
- [ ] Review notes explaining that Trimestt is issued by hospitals and the
      reviewer should use the supplied credentials
- [ ] Push notifications tested on a real device
- [ ] The app opened on a real iPhone, not only the simulator

---

## The reviewer note, ready to paste

> Trimestt is provided to patients by their hospital. A patient receives an ID
> and an activation code at the hospital reception, so the app cannot be used
> without credentials.
>
> Please use this demo account:
> Patient ID: [FILL IN]
> Password: [FILL IN]
>
> The app records readings the patient enters and shows the antenatal schedule
> her hospital has set. It does not diagnose, prescribe, or provide
> consultations. Alerts are threshold comparisons routed to hospital staff, and
> the app states clearly in-product that it is not an emergency service.

---

## After launch

- Updates to the web app reach everyone immediately — no store review
- Only changes to the native shell need a new submission
- Keep the upload keystore and the Apple certificates backed up
- Watch the first reviews. Patients will report what your staff training misses
