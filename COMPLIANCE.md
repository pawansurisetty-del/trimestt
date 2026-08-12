# Compliance position

Written by the person who built the software, not by a lawyer. It records what
Trimestt does in code and, just as importantly, **what it cannot do for you**.
Have it reviewed alongside your service agreement and your data processing
agreement with the hospital.

Reviewed against: **DPDP Act 2023** and the **DPDP Rules 2025** (notified
14 November 2025, phased — Rule 4 from November 2026, Rules 3 and 5–16 from
May 2027); **PC-PNDT Act 1994**; **NMC** professional conduct and telemedicine
guidance; **IT Act** and the SPDI Rules; **Drugs and Magic Remedies Act**.

---

## Who is who

Under the DPDP Act the **hospital is the Data Fiduciary** — it decides why and
how patient data is used. **Trimestt is a Data Processor** acting on the
hospital's instructions. That split must be written into your agreement with
each hospital; the software cannot establish it on its own.

---

## Built into the product

| Obligation | Where it lives |
|---|---|
| Itemised notice, plain language, before consent | Terms shown at activation: each item says what is collected and why |
| Notice in English and an Eighth Schedule language | Terms and the whole patient app in Telugu and Hindi; nine more languages listed |
| Consent by clear affirmative action | Tick box; both the app and the server refuse without it |
| Consent recorded with version and time | On the patient record and in a consent log |
| Withdrawal as easy as consent | One button in the app; hospital is alerted; sessions ended |
| Right to access | "Download everything we hold" produces a complete file |
| Right to correction, erasure, grievance | Request form; 90-day deadline recorded; hospital screen to answer |
| Contact for questions | Published in the notice, set by environment variables |
| Data Protection Board named for escalation | In the notice and on the rights screen |
| Children under 18 | Age captured at registration; guardian's name, relationship and phone required, with staff recording that ID was seen |
| Purpose limitation | Only what care needs; no advertising, no sale, no third-party sharing |
| Retention stated | Roughly three years after care ends, subject to medical record rules |
| Security safeguards | TLS with HSTS, scrypt password hashing, AES-256-GCM on uploaded files, per-hospital isolation enforced and tested, rate limiting |
| Breach register | Owner-only endpoint, with the 72-hour reminder |
| Cross-border processing disclosed | The notice says servers may be outside India |

### Medical

- **PC-PNDT** — no field anywhere records or displays fetal sex; a test fails if
  one is added; the upload screen carries a notice.
- **No teleconsultation.** No doctor consults or prescribes through Trimestt, and
  the terms say so. Department requests are appointment requests, not consults.
  If you ever add consultation, NMC's Telemedicine Practice Guidelines apply in
  full and this document must be rewritten.
- **No diagnosis.** Alerts are threshold comparisons routed to a person. The app
  never tells a patient what is wrong or what treatment to take.
- **No drug doses** in patient-facing content. Medicines shown are the ones her
  own clinician entered.
- **No cure claims** anywhere, which is what the Drugs and Magic Remedies Act
  bites on.
- **Audit trail** — every alert records who acknowledged it, when, and what was
  done.

---

## Not done, and needing you rather than code

1. **Data processing agreement** with each hospital. Required, and the single
   most important document you do not yet have.
2. **Verifiable parental consent** for under-18s. Rule 10 contemplates methods
   such as DigiLocker identity verification. Trimestt currently relies on
   hospital staff seeing the guardian's ID in person and recording it — a
   defensible practice, but confirm it against the Rules with counsel before
   May 2027.
3. **Clinical sign-off of the 102 guides** by a gynaecologist and a
   paediatrician, named on each article. Do this before real patients read them.
4. **Native-speaker review of the Telugu and Hindi text**, clinical content
   especially.
5. **Data residency.** Storage is outside India today. Lawful and disclosed, but
   ABDM integration would require Indian hosting, and hospitals increasingly ask.
6. **Retention enforcement.** The policy is stated but deletion is not yet
   automatic. Build the job before the first records reach three years.
7. **Breach response plan** on paper — who decides, who notifies the Board within
   72 hours, who tells patients.
8. **Consent records for seven years**, per the Rules. The log exists; the
   retention guarantee depends on your backups.
9. **Postgres migration.** A single JSON file is not a reasonable security
   safeguard at scale.
10. **Grievance officer** named publicly. Set `TRIMESTT_GRIEVANCE_NAME`,
    `TRIMESTT_GRIEVANCE_EMAIL` and `TRIMESTT_GRIEVANCE_PHONE`.

---

## Timeline that matters

- **Now** — DPDP Act in force; the Board exists. Consent and security practice
  should already be sound.
- **November 2026** — consent management rules take effect.
- **May 2027** — notice, security, breach, erasure, children's data, rights and
  contact obligations all bite.

You are ahead of most of it. The gaps above are documents and decisions, not
missing software.
