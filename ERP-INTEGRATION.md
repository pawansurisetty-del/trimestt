# Trimestt — hospital system integration

For the vendor of the hospital's existing system (HIS/ERP). One endpoint, one
key, no libraries needed.

## What this does

When a maternity patient is registered in your system, you post her basic
details to Trimestt. She lands in a **pending queue** on the hospital's
dashboard. A nurse checks the dates and confirms — only then is she enrolled and
only then is the hospital billed.

Nothing is written back into your system. This is one direction only.

## Getting a key

The hospital creates it themselves: Trimestt → **Incoming** → *Create a new key*.
It looks like `trk_…`. Treat it as a password; it can be regenerated at any time,
which immediately invalidates the old one.

## The endpoint

```
POST https://trimestt.com/api/erp/patients
Content-Type: application/json
X-API-Key: trk_xxxxxxxxxxxxxxxxxxxx
```

One patient:

```json
{
  "name": "Anita Kumar",
  "phone": "9876543210",
  "lmp": "2026-02-01",
  "mrn": "OPD/2026/1183",
  "bloodGroup": "O positive",
  "consultant": "Dr Meera Rao",
  "attendantName": "Ravi Kumar",
  "attendantPhone": "9876543211",
  "heightCm": 160,
  "prePregnancyWeightKg": 54
}
```

Several at once (up to 200 per call):

```json
{ "patients": [ { … }, { … } ] }
```

The API key may also be sent in the body as `"apiKey"` if headers are awkward
in your stack.

## Fields

| Field | Required | Notes |
|---|---|---|
| `name` | yes | |
| `phone` | yes | 10–15 digits, `+91` accepted |
| `lmp` | yes* | last menstrual period, `YYYY-MM-DD` |
| `edd` | yes* | send this instead if you only hold a scan-confirmed due date |
| `mrn` | no | your record number; used to avoid duplicates |
| `bloodGroup` | no | free text |
| `consultant` | no | matched to the hospital's doctor list where possible |
| `attendantName`, `attendantPhone` | no | family contact |
| `heightCm`, `prePregnancyWeightKg` | no | enables weight-gain tracking |

\* one of `lmp` or `edd`.

**Do not send** diagnoses, clinical notes, financials, or anything identifying
the sex of a foetus. Trimestt has no field for it and the request will simply
ignore it.

## Response

```json
{
  "received": 3,
  "queued": 1,
  "rejected": [
    { "error": "a valid phone is required", "row": { … } },
    { "error": "already enrolled as TRM-SUN01-0004", "row": { … } }
  ],
  "message": "Queued for confirmation by hospital staff…"
}
```

`200` with rejections is normal — send the batch, read the list, fix and resend.

| Status | Meaning |
|---|---|
| 200 | processed; check `queued` and `rejected` |
| 401 | unknown or missing API key |
| 413 | more than 200 patients in one call |
| 429 | too many requests; wait and retry |

## Duplicates

A patient is rejected if the same phone or MRN is already pending, or already
enrolled at that hospital. Resending is safe — it will not create a second
record.

## If an API is not possible

The hospital can paste a CSV export instead: Trimestt → Incoming → paste, with a
header row of `name,phone,lmp,consultant`. Same queue, same confirmation step.
This needs nothing at all from your side.

## Questions

Reply to the person who sent you this document. We are happy to join a call with
the hospital's IT team.
