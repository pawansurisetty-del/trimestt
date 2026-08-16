'use strict';
/**
 * Demo data, so you can show a hospital the app in thirty seconds.
 *   node seed.js
 *
 * Creates:
 *   Hospital login  demo@trimestt.test / demo1234
 *   Patient login   (ID printed below) / demo1234
 */
const store = require('./lib/store');
const auth = require('./lib/auth');
const clinical = require('./lib/clinical');

const db = store.load();

if (db.hospitals.some((h) => h.code.startsWith('SUN'))) {
  console.log('Demo data already exists. Delete data/db.json first if you want a fresh set.');
  process.exit(0);
}

function daysAgo(n) {
  return new Date(Date.now() - n * 86400000).toISOString().slice(0, 10);
}

/* ---- hospital ---- */
const hospital = {
  id: store.id('hos'),
  name: 'Sunrise Women & Child Hospital',
  code: 'SUN01',
  address: 'Road No 12, Banjara Hills',
  city: 'Hyderabad',
  phone: '04023456789',
  labourRoomPhone: '04023456700',
  logo: '',
  colour: '#D4688C',
  immunisationSchedule: 'IAP',
  thresholds: Object.assign({}, clinical.DEFAULT_THRESHOLDS),
  setupComplete: true,
  credits: {
    purchased: 50,
    used: 0,
    grace: 0,
    ledger: [{ at: new Date().toISOString(), codes: 50, amount: 189950, reference: 'NEFT-DEMO', note: 'Codes added' }]
  },
  createdAt: new Date().toISOString()
};
db.hospitals.push(hospital);

db.users.push({
  id: store.id('usr'),
  role: 'hospital',
  hospitalId: hospital.id,
  name: 'Dr Meera Rao',
  email: 'demo@trimestt.test',
  passwordHash: auth.hashPassword('demo1234'),
  createdAt: new Date().toISOString()
});

/* ---- mothers at different stages, so every screen has something in it ---- */
const mothers = [
  { name: 'Anita Kumar',   days: 232, tags: ['GDM'],                 blood: 'O positive', activate: true },
  { name: 'Fatima Sheikh', days: 138, tags: ['Prior LSCS', 'Anaemia'], blood: 'B negative', activate: false },
  { name: 'Divya Reddy',   days: 62,  tags: [],                       blood: 'A positive', activate: false }
];

let firstNumber = '';
mothers.forEach((m, index) => {
  const lmp = daysAgo(m.days);
  const patient = {
    id: store.id('pat'),
    hospitalId: hospital.id,
    number: `TRM-SUN01-${String(index + 1).padStart(4, '0')}`,
    name: m.name,
    phone: '98765432' + (10 + index),
    lmp,
    edd: clinical.eddFromLmp(lmp),
    bloodGroup: m.blood,
    consultant: 'Dr Meera Rao',
    attendantName: 'Family contact',
    attendantPhone: '98765430' + (10 + index),
    riskTags: m.tags,
    activationCode: auth.activationCode(),
    activated: false,
    delivered: false,
    createdAt: new Date().toISOString()
  };
  db.patients.push(patient);
  hospital.credits.used += 1;
  db.payments.push({
    id: store.id('pay'), hospitalId: hospital.id, patientId: patient.id,
    kind: 'mother', label: 'Mother care — ' + patient.name, amount: 4999,
    status: index === 0 ? 'paid' : 'pending', createdAt: new Date().toISOString()
  });

  if (m.activate) {
    firstNumber = patient.number;
    patient.activated = true;

    // she has kept up with her visits, so the demo shows a clean plan with one
    // genuine alert rather than a wall of missed windows
    patient.completed = {};
    const todayIso = new Date().toISOString().slice(0, 10);
    clinical.buildAncPlan(patient).forEach((item) => {
      if (item.windowEnd < todayIso) patient.completed[item.key] = new Date().toISOString();
    });
    db.users.push({
      id: store.id('usr'), role: 'patient', hospitalId: hospital.id,
      patientId: patient.id, number: patient.number, name: patient.name,
      passwordHash: auth.hashPassword('demo1234'), createdAt: new Date().toISOString()
    });

    // a few days of normal logs, then one that trips a threshold
    [
      { date: daysAgo(3), weight: 64.2, systolic: 118, diastolic: 74, kicks: 12, medicinesTaken: true },
      { date: daysAgo(2), weight: 64.4, systolic: 122, diastolic: 78, kicks: 11, medicinesTaken: true },
      { date: daysAgo(1), weight: 64.6, systolic: 146, diastolic: 94, kicks: 9,  medicinesTaken: true }
    ].forEach((log) => {
      const entry = Object.assign({
        id: store.id('log'), patientId: patient.id, hospitalId: hospital.id,
        symptoms: [], missedSupplement: false, missedCriticalMedicine: false,
        fastingSugar: null, postMealSugar: null, note: '', createdAt: new Date().toISOString()
      }, log);
      db.logs.unshift(entry);
      clinical.gradeLog(entry, hospital)
        .filter((a) => a.tier >= 3)
        .forEach((a) => db.alerts.unshift({
          id: store.id('alt'), hospitalId: hospital.id, patientId: patient.id,
          patientNumber: patient.number, patientName: patient.name,
          tier: a.tier, reason: a.reason, detail: a.detail, source: 'daily log',
          state: 'open', createdAt: new Date().toISOString(),
          acknowledgedAt: null, acknowledgedBy: null
        }));
    });
  }
});

store.saveNow();

console.log('Demo data ready.\n');
console.log('  Hospital   demo@trimestt.test / demo1234');
console.log('  Patient    ' + firstNumber + ' / demo1234');
console.log('\nThe other two mothers are unactivated — their codes are on the Patients tab,');
console.log('so you can demo the activation flow live.');
