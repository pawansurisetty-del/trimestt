'use strict';
/**
 * Creates the account an app-store reviewer signs in with.
 *
 * Trimestt needs a hospital-issued code to get past the first screen, so a
 * reviewer sees nothing without this. Apple rejects for exactly that, and it is
 * the most common reason a hospital-issued app fails review.
 *
 *   TRIMESTT_DATA=/data node scripts/reviewer-account.js
 *
 * Run it against production, note the credentials it prints, and paste them into
 * the App Review notes and the Play Console test instructions.
 */

const store = require('../lib/store');
const auth = require('../lib/auth');
const clinical = require('../lib/clinical');

const HOSPITAL_EMAIL = 'review@trimestt.com';
const REVIEW_PASSWORD = 'AppReview2026';

function daysAgo(n) {
  const d = new Date();
  d.setDate(d.getDate() - n);
  return clinical.iso(d);
}

function main() {
  const db = store.load();

  /* a demonstration hospital, kept apart from any real one */
  let hospital = db.hospitals.find((h) => h.name === 'Trimestt Demonstration Hospital');
  if (!hospital) {
    hospital = {
      id: store.id('hos'),
      name: 'Trimestt Demonstration Hospital',
      slug: 'REV',
      city: 'Hyderabad',
      address: 'Demonstration account for app store review',
      phone: '04000000000',
      labourRoomPhone: '04000000001',
      colour: '#D9718E',
      logo: null,
      immunisation: 'IAP',
      thresholds: Object.assign({}, clinical.DEFAULT_THRESHOLDS),
      doctors: [{ id: store.id('doc'), name: 'Dr Demo', speciality: 'Obstetrics', phone: '' }],
      credits: { purchased: 50, used: 0, grace: 0, ledger: [] },
      setupComplete: true,
      createdAt: new Date().toISOString()
    };
    db.hospitals.push(hospital);

    db.users.push({
      id: store.id('usr'),
      role: 'hospital',
      staffRole: 'admin',
      hospitalId: hospital.id,
      name: 'App Review',
      email: HOSPITAL_EMAIL,
      passwordHash: auth.hashPassword(REVIEW_PASSWORD),
      createdAt: new Date().toISOString()
    });
  }

  /* a patient at 24 weeks, so every screen has something real to show */
  let patient = db.patients.find((p) => p.hospitalId === hospital.id && p.name === 'Demo Patient');
  if (!patient) {
    const seq = store.nextSeq('patient_' + hospital.id);
    const lmp = daysAgo(168);
    patient = {
      id: store.id('pat'),
      hospitalId: hospital.id,
      number: 'TRM-REV01-' + String(seq).padStart(4, '0'),
      name: 'Demo Patient',
      phone: '9000000000',
      age: 28,
      lmp,
      edd: clinical.eddFromLmp(lmp),
      bloodGroup: 'O positive',
      consultant: 'Dr Demo',
      heightCm: 160,
      prePregnancyWeightKg: 55,
      riskTags: [],
      activated: false,
      activationCode: auth.activationCode(),
      completed: {},
      medicines: [
        { id: store.id('med'), name: 'Iron and folic acid', dose: '1 tablet', timing: 'after dinner', critical: false, addedBy: 'Demo', addedAt: new Date().toISOString() },
        { id: store.id('med'), name: 'Calcium', dose: '500 mg', timing: 'morning', critical: false, addedBy: 'Demo', addedAt: new Date().toISOString() }
      ],
      consent: { agreed: true, version: '2026-08-2', at: new Date().toISOString() },
      createdAt: new Date().toISOString()
    };
    db.patients.push(patient);
    hospital.credits.used += 1;

    /* three weeks of readings, so the charts and the plan are not empty */
    for (let d = 20; d >= 0; d--) {
      db.logs.unshift({
        id: store.id('log'),
        patientId: patient.id,
        hospitalId: hospital.id,
        date: daysAgo(d),
        weight: Math.round((60 + (20 - d) * 0.08) * 10) / 10,
        systolic: 112 + (d % 5),
        diastolic: 72 + (d % 4),
        kicks: 10 + (d % 3),
        waterMl: 1800 + (d % 4) * 200,
        symptoms: [],
        medicinesTaken: true,
        createdAt: new Date().toISOString()
      });
    }
  }

  /* the reviewer signs in with a password rather than an activation code */
  let user = db.users.find((u) => u.role === 'patient' && u.patientId === patient.id);
  if (!user) {
    user = {
      id: store.id('usr'),
      role: 'patient',
      patientId: patient.id,
      hospitalId: hospital.id,
      number: patient.number,          // login is by patient number, not email
      name: patient.name,
      passwordHash: auth.hashPassword(REVIEW_PASSWORD),
      createdAt: new Date().toISOString()
    };
    db.users.push(user);
    patient.activated = true;
  } else {
    user.passwordHash = auth.hashPassword(REVIEW_PASSWORD);
  }

  store.save();

  console.log('\nReviewer account ready. Paste this into App Review notes and Play test instructions:\n');
  console.log('  Patient ID   ' + patient.number);
  console.log('  Password     ' + REVIEW_PASSWORD);
  console.log('');
  console.log('  Hospital login (only if they ask to see the staff side):');
  console.log('  Email        ' + HOSPITAL_EMAIL);
  console.log('  Password     ' + REVIEW_PASSWORD);
  console.log('');
  console.log('  She is at ' + clinical.gestation(patient.lmp).label + ', with three weeks of readings behind her.\n');
}

main();
