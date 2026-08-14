'use strict';
const store = require('./store');
const auth = require('./auth');
const clinical = require('./clinical');
const files = require('./files');

const MOTHER_FEE = 3999;      // hospital pays Trimestt per code
const PATIENT_FEE = 6999;     // what the hospital bills the patient
const CHILD_FEE = 2999;

/* --------------------------------------------------------------- utils -- */

function pick(obj, keys) {
  const out = {};
  keys.forEach((k) => { if (obj[k] !== undefined) out[k] = obj[k]; });
  return out;
}

function clean(value, max = 200) {
  return String(value === undefined || value === null ? '' : value).trim().slice(0, max);
}

function hospitalCode(name, seq) {
  const letters = (name.replace(/[^a-zA-Z]/g, '').toUpperCase() + 'XXX').slice(0, 3);
  return `${letters}${String(seq).padStart(2, '0')}`;
}

function patientNumber(hospital, seq) {
  return `TRM-${hospital.code}-${String(seq).padStart(4, '0')}`;
}

function raiseAlert(db, patient, { tier, reason, detail, source }) {
  const alert = {
    id: store.id('alt'),
    hospitalId: patient.hospitalId,
    patientId: patient.id,
    patientNumber: patient.number,
    patientName: patient.name,
    tier,
    reason,
    detail: detail || '',
    source: source || 'log',
    state: 'open',
    createdAt: new Date().toISOString(),
    acknowledgedAt: null,
    acknowledgedBy: null
  };
  db.alerts.unshift(alert);
  return alert;
}

function publicHospital(h) {
  if (!h) return null;
  return pick(h, ['id', 'name', 'code', 'address', 'city', 'phone', 'labourRoomPhone',
    'logo', 'colour', 'immunisationSchedule', 'thresholds', 'setupComplete']);
}

function motherPayload(db, patient) {
  const g = clinical.gestation(patient.lmp);
  return {
    id: patient.id,
    number: patient.number,
    name: patient.name,
    lmp: patient.lmp,
    edd: patient.edd,
    bloodGroup: patient.bloodGroup,
    riskTags: patient.riskTags,
    consultant: patient.consultant,
    consultantId: patient.consultantId,
    heightCm: patient.heightCm,
    prePregnancyWeightKg: patient.prePregnancyWeightKg,
    attendantName: patient.attendantName,
    attendantPhone: patient.attendantPhone,
    gestation: g,
    countdown: clinical.countdown(patient.lmp),
    consent: patient.consent || null,
    photo: patient.photo || null,
    firstName: (patient.name || '').split(' ')[0],
    checklist: patient.checklist || null,
    delivered: !!patient.delivered
  };
}

/* -------------------------------------------------------------- routes -- */

const routes = [];
function route(method, pattern, handler, guard) {
  const keys = [];
  const regex = new RegExp('^' + pattern.replace(/:([a-zA-Z]+)/g, (_, key) => {
    keys.push(key);
    return '([^/]+)';
  }) + '$');
  routes.push({ method, regex, keys, handler, guard });
}

/* ---- hospital ----------------------------------------------------------- */

route('POST', '/api/hospital/signup', (ctx) => {
  const db = store.load();
  const name = clean(ctx.body.hospitalName);
  const email = clean(ctx.body.email).toLowerCase();
  const adminName = clean(ctx.body.adminName);
  const password = String(ctx.body.password || '');

  if (!name || !email || !adminName) return ctx.fail(400, 'Hospital name, your name and email are all needed.');
  if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) return ctx.fail(400, 'That email address does not look right.');
  const problem = auth.passwordProblem(password);
  if (problem) return ctx.fail(400, problem);
  if (db.users.some((u) => u.email === email)) return ctx.fail(409, 'An account already exists for that email.');

  const seq = store.nextSeq('hospital');
  const hospital = {
    id: store.id('hos'),
    name,
    code: hospitalCode(name, seq),
    address: '', city: '', phone: '', labourRoomPhone: '',
    logo: '', colour: '#D4688C',
    immunisationSchedule: 'IAP',
    thresholds: Object.assign({}, clinical.DEFAULT_THRESHOLDS),
    setupComplete: false,
    createdAt: new Date().toISOString()
  };
  db.hospitals.push(hospital);

  const user = {
    id: store.id('usr'),
    role: 'hospital',
    staffRole: 'admin',
    hospitalId: hospital.id,
    name: adminName,
    email,
    passwordHash: auth.hashPassword(password),
    createdAt: new Date().toISOString()
  };
  db.users.push(user);
  store.save();

  return ctx.ok({ token: auth.createSession(user.id, user.role), hospital: publicHospital(hospital), user: pick(user, ['id', 'name', 'role', 'staffRole']) });
});

route('POST', '/api/hospital/login', (ctx) => {
  const db = store.load();
  const email = clean(ctx.body.email).toLowerCase();
  const user = db.users.find((u) => u.role === 'hospital' && u.email === email);
  if (!user || !auth.verifyPassword(String(ctx.body.password || ''), user.passwordHash)) {
    return ctx.fail(401, 'Email or password is wrong.');
  }
  const hospital = db.hospitals.find((h) => h.id === user.hospitalId);
  return ctx.ok({
    token: auth.createSession(user.id, user.role),
    hospital: publicHospital(hospital),
    user: pick(user, ['id', 'name', 'role', 'staffRole'])
  });
});

route('GET', '/api/hospital/me', (ctx) => {
  const db = store.load();
  const hospital = db.hospitals.find((h) => h.id === ctx.user.hospitalId);
  return ctx.ok({ hospital: publicHospital(hospital), user: pick(ctx.user, ['id', 'name', 'role', 'staffRole']) });
}, 'hospital');

route('PUT', '/api/hospital/profile', (ctx) => {
  const db = store.load();
  const hospital = db.hospitals.find((h) => h.id === ctx.user.hospitalId);
  const b = ctx.body;

  if (b.name !== undefined) hospital.name = clean(b.name) || hospital.name;
  if (b.address !== undefined) hospital.address = clean(b.address, 300);
  if (b.city !== undefined) hospital.city = clean(b.city, 80);
  if (b.phone !== undefined) hospital.phone = clean(b.phone, 20);
  if (b.labourRoomPhone !== undefined) hospital.labourRoomPhone = clean(b.labourRoomPhone, 20);
  if (b.colour !== undefined && /^#[0-9a-fA-F]{6}$/.test(b.colour)) hospital.colour = b.colour;
  if (b.immunisationSchedule === 'IAP' || b.immunisationSchedule === 'NIS') {
    hospital.immunisationSchedule = b.immunisationSchedule;
  }
  if (typeof b.logo === 'string' && b.logo.startsWith('data:image/')) {
    if (b.logo.length > 900000) return ctx.fail(413, 'That logo file is too large. Use an image under about 600 KB.');
    hospital.logo = b.logo;
  }
  if (b.thresholds && typeof b.thresholds === 'object') {
    Object.keys(clinical.DEFAULT_THRESHOLDS).forEach((key) => {
      const value = Number(b.thresholds[key]);
      if (!isNaN(value) && value > 0) hospital.thresholds[key] = value;
    });
  }

  const ready = hospital.name && hospital.address && hospital.city && hospital.phone && hospital.labourRoomPhone;
  hospital.setupComplete = !!ready;
  store.save();

  return ctx.ok({ hospital: publicHospital(hospital) });
}, 'hospital');

route('POST', '/api/hospital/patients', (ctx) => {
  const db = store.load();
  const hospital = db.hospitals.find((h) => h.id === ctx.user.hospitalId);
  if (!hospital.setupComplete) return ctx.fail(409, 'Finish the hospital setup before registering patients.');

  const b = ctx.body;
  const name = clean(b.name, 120);
  const phone = clean(b.phone, 20);
  if (!name) return ctx.fail(400, 'Patient name is needed.');
  if (!/^[0-9+\s-]{10,15}$/.test(phone)) return ctx.fail(400, 'Enter a valid phone number.');

  let lmp = clean(b.lmp, 10);
  let edd = clean(b.edd, 10);
  if (!lmp && !edd) return ctx.fail(400, 'Enter either the last menstrual period date or a scan-confirmed due date.');
  try {
    if (lmp) edd = clinical.eddFromLmp(lmp);
    else lmp = clinical.lmpFromEdd(edd);
  } catch (err) {
    return ctx.fail(400, 'That date could not be read. Use the date picker.');
  }
  const g = clinical.gestation(lmp);
  if (g.days < 0 || g.days > 320) return ctx.fail(400, 'That date gives a gestation outside the normal range. Please check it.');

  /* A patient under 18 needs a guardian on record — DPDP s.9 and Rule 10. */
  if (b.age && Number(b.age) < 18) {
    if (!clean(b.guardianName, 120) || !/^[0-9+\s-]{10,15}$/.test(clean(b.guardianPhone, 20))) {
      return ctx.fail(400, 'This patient is under 18. Record the parent or guardian\'s name and phone, having seen their ID.');
    }
  }

  hospital.credits = hospital.credits || { purchased: 0, used: 0, grace: 0, ledger: [] };
  const state = creditState(hospital);
  if (state.balance <= 0) {
    if (state.graceLeft <= 0) {
      return ctx.fail(402, 'No codes left. Add more codes to keep registering patients — your balance is on the Codes screen.');
    }
    hospital.credits.grace = (hospital.credits.grace || 0) + 1;
  }
  hospital.credits.used += 1;

  const seq = store.nextSeq('patient_' + hospital.id);
  const code = auth.activationCode();
  const patient = {
    id: store.id('pat'),
    hospitalId: hospital.id,
    number: patientNumber(hospital, seq),
    name,
    phone,
    lmp,
    edd,
    bloodGroup: clean(b.bloodGroup, 12),
    consultant: clean(b.consultant, 120),
    consultantId: clean(b.consultantId, 40),
    age: b.age ? Number(b.age) : null,
    minor: b.age ? Number(b.age) < 18 : false,
    guardian: b.age && Number(b.age) < 18 ? {
      name: clean(b.guardianName, 120),
      relationship: clean(b.guardianRelationship, 40),
      phone: clean(b.guardianPhone, 20),
      idSeenBy: ctx.user.name,
      idSeenAt: new Date().toISOString()
    } : null,
    heightCm: b.heightCm ? Number(b.heightCm) : null,
    prePregnancyWeightKg: b.prePregnancyWeightKg ? Number(b.prePregnancyWeightKg) : null,
    attendantName: clean(b.attendantName, 120),
    attendantPhone: clean(b.attendantPhone, 20),
    riskTags: Array.isArray(b.riskTags) ? b.riskTags.slice(0, 10).map((t) => clean(t, 40)) : [],
    activationCode: code,
    activated: false,
    delivered: false,
    createdAt: new Date().toISOString()
  };
  db.patients.push(patient);

  db.payments.push({
    id: store.id('pay'),
    hospitalId: hospital.id,
    patientId: patient.id,
    kind: 'mother',
    label: 'Code activation — ' + patient.name,
    amount: MOTHER_FEE,
    patientBilled: PATIENT_FEE,
    status: 'paid',                    // codes are bought in advance
    createdAt: new Date().toISOString()
  });

  store.save();
  const after = creditState(hospital);
  return ctx.ok({
    patient: { id: patient.id, number: patient.number, name: patient.name, edd: patient.edd },
    activationCode: code,
    credits: after,
    warning: after.balance <= 0
      ? 'You are now using your last few codes. Add more so registration does not stop.'
      : after.low ? 'Only ' + after.balance + ' codes left. Worth topping up this week.' : null,
    message: 'Give the patient her ID and this activation code. She sets her own password.'
  });
}, 'hospital');

/** A doctor login sees their own patients first; alerts still reach everyone. */
function visibleTo(user, patient) {
  if ((user.staffRole || 'admin') !== 'doctor') return true;
  if (user.showAll) return true;
  return !patient.consultantId || patient.consultantId === user.doctorId;
}

route('GET', '/api/hospital/patients', (ctx) => {
  const db = store.load();
  const list = db.patients
    .filter((p) => p.hospitalId === ctx.user.hospitalId)
    .filter((p) => visibleTo(ctx.user, p))
    .map((p) => {
      const g = clinical.gestation(p.lmp);
      const openAlerts = db.alerts.filter((a) => a.patientId === p.id && a.state === 'open');
      const children = db.children.filter((c) => c.patientId === p.id);
      return {
        id: p.id, number: p.number, name: p.name, phone: p.phone,
        edd: p.edd, gestation: g, countdown: clinical.countdown(p.lmp), riskTags: p.riskTags,
        activated: p.activated, delivered: p.delivered,
        registeredOn: p.createdAt,
        activationCode: p.activated ? null : p.activationCode,
        resetCode: p.resetCode && p.resetExpires > Date.now() ? p.resetCode : null,
        openAlerts: openAlerts.length,
        highestTier: openAlerts.reduce((max, a) => Math.max(max, a.tier), 0),
        children: children.length
      };
    })
    .sort((a, b) => b.highestTier - a.highestTier || a.edd.localeCompare(b.edd));
  return ctx.ok({ patients: list });
}, 'hospital');

route('GET', '/api/hospital/patients/:id', (ctx) => {
  const db = store.load();
  const patient = db.patients.find((p) => p.id === ctx.params.id && p.hospitalId === ctx.user.hospitalId);
  if (!patient) return ctx.fail(404, 'Patient not found.');
  return ctx.ok({
    patient: motherPayload(db, patient),
    plan: clinical.buildAncPlan(patient),
    logs: db.logs.filter((l) => l.patientId === patient.id).slice(0, 30),
    alerts: db.alerts.filter((a) => a.patientId === patient.id).slice(0, 30),
    children: db.children.filter((c) => c.patientId === patient.id)
  });
}, 'hospital');

route('GET', '/api/hospital/alerts', (ctx) => {
  const db = store.load();
  const all = db.alerts.filter((a) => a.hospitalId === ctx.user.hospitalId);
  return ctx.ok({
    open: all.filter((a) => a.state === 'open'),
    recent: all.filter((a) => a.state !== 'open').slice(0, 25)
  });
}, 'hospital');

route('POST', '/api/hospital/alerts/:id/acknowledge', (ctx) => {
  const db = store.load();
  const alert = db.alerts.find((a) => a.id === ctx.params.id && a.hospitalId === ctx.user.hospitalId);
  if (!alert) return ctx.fail(404, 'Alert not found.');
  alert.state = 'acknowledged';
  alert.acknowledgedAt = new Date().toISOString();
  alert.acknowledgedBy = ctx.user.name;
  store.save();
  return ctx.ok({ alert });
}, 'hospital');

route('GET', '/api/hospital/summary', (ctx) => {
  const db = store.load();
  const patients = db.patients.filter((p) => p.hospitalId === ctx.user.hospitalId);
  const payments = db.payments.filter((p) => p.hospitalId === ctx.user.hospitalId);
  const alerts = db.alerts.filter((a) => a.hospitalId === ctx.user.hospitalId && a.state === 'open');
  return ctx.ok({
    summary: {
      patients: patients.length,
      activated: patients.filter((p) => p.activated).length,
      children: db.children.filter((c) => patients.some((p) => p.id === c.patientId)).length,
      openAlerts: alerts.length,
      redAlerts: alerts.filter((a) => a.tier === 4).length,
      billed: payments.reduce((sum, p) => sum + p.amount, 0),
      collected: payments.filter((p) => p.status === 'paid').reduce((sum, p) => sum + p.amount, 0),
      patientFee: PATIENT_FEE,
      codeFee: MOTHER_FEE,
      collectedFromPatients: payments.filter((p) => p.kind === 'mother').length * PATIENT_FEE
    },
    payments
  });
}, 'hospital');

route('POST', '/api/hospital/payments/:id/paid', (ctx) => {
  const db = store.load();
  const payment = db.payments.find((p) => p.id === ctx.params.id && p.hospitalId === ctx.user.hospitalId);
  if (!payment) return ctx.fail(404, 'Payment not found.');
  payment.status = 'paid';
  payment.paidAt = new Date().toISOString();
  store.save();
  return ctx.ok({ payment });
}, 'hospital');


/* ---- staff logins ------------------------------------------------------- */

const STAFF_ROLES = {
  admin:  'Full access, including settings, staff and billing',
  desk:   'Register patients and hand over codes',
  nurse:  'Worklist, alerts and patient records',
  doctor: 'Patient records and alerts'
};

function canManage(user) {
  return (user.staffRole || 'admin') === 'admin';
}

route('GET', '/api/hospital/staff', (ctx) => {
  const db = store.load();
  const staff = db.users
    .filter((u) => u.role === 'hospital' && u.hospitalId === ctx.user.hospitalId)
    .map((u) => ({
      id: u.id, name: u.name, email: u.email,
      staffRole: u.staffRole || 'admin',
      createdAt: u.createdAt,
      isYou: u.id === ctx.user.id
    }));
  return ctx.ok({ staff, roles: STAFF_ROLES });
}, 'hospital');

route('POST', '/api/hospital/staff', (ctx) => {
  const db = store.load();
  if (!canManage(ctx.user)) return ctx.fail(403, 'Only an administrator can add staff.');

  const name = clean(ctx.body.name, 120);
  const email = clean(ctx.body.email, 160).toLowerCase();
  const staffRole = clean(ctx.body.staffRole, 20);
  const password = String(ctx.body.password || '');

  if (!name || !email) return ctx.fail(400, 'Name and email are both needed.');
  if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) return ctx.fail(400, 'That email address does not look right.');
  if (!STAFF_ROLES[staffRole]) return ctx.fail(400, 'Choose a role for this person.');
  const problem = auth.passwordProblem(password);
  if (problem) return ctx.fail(400, problem);
  if (db.users.some((u) => u.email === email)) return ctx.fail(409, 'Someone already uses that email.');

  const user = {
    id: store.id('usr'),
    role: 'hospital',
    staffRole,
    hospitalId: ctx.user.hospitalId,
    name, email,
    passwordHash: auth.hashPassword(password),
    createdAt: new Date().toISOString()
  };
  db.users.push(user);
  store.save();
  return ctx.ok({ staff: pick(user, ['id', 'name', 'email', 'staffRole']) });
}, 'hospital');

route('POST', '/api/hospital/staff/:id/remove', (ctx) => {
  const db = store.load();
  if (!canManage(ctx.user)) return ctx.fail(403, 'Only an administrator can remove staff.');
  if (ctx.params.id === ctx.user.id) return ctx.fail(400, 'You cannot remove your own login.');

  const index = db.users.findIndex((u) => u.id === ctx.params.id && u.hospitalId === ctx.user.hospitalId);
  if (index === -1) return ctx.fail(404, 'That login was not found.');
  const [removed] = db.users.splice(index, 1);
  Object.keys(db.sessions).forEach((token) => {
    if (db.sessions[token].userId === removed.id) delete db.sessions[token];
  });
  store.save();
  return ctx.ok({ removed: removed.name });
}, 'hospital');


/* ---- staff who cannot get in -------------------------------------------- */

/** A readable one-time password: two words and three digits. */
function tempPassword() {
  const words = ['ward', 'care', 'birth', 'nurse', 'chart', 'scan', 'pulse', 'room', 'desk', 'shift'];
  const crypto = require('crypto');
  return words[crypto.randomInt(words.length)] + words[crypto.randomInt(words.length)] +
         String(crypto.randomInt(100, 999));
}

route('POST', '/api/hospital/staff/:id/reset', (ctx) => {
  const db = store.load();
  if (!canManage(ctx.user)) return ctx.fail(403, 'Only an administrator can reset a login.');
  const user = db.users.find((u) => u.id === ctx.params.id && u.hospitalId === ctx.user.hospitalId && u.role === 'hospital');
  if (!user) return ctx.fail(404, 'That login was not found.');

  const password = tempPassword();
  user.passwordHash = auth.hashPassword(password);
  user.mustChangePassword = true;
  user.resetLog = user.resetLog || [];
  user.resetLog.unshift({ by: ctx.user.name, at: new Date().toISOString() });
  Object.keys(db.sessions).forEach((token) => {
    if (db.sessions[token].userId === user.id) delete db.sessions[token];
  });
  store.save();

  return ctx.ok({
    name: user.name, email: user.email, password,
    message: 'Give them this password. They will be asked to change it when they sign in.'
  });
}, 'hospital');

/** Anyone signed in can change their own password. */
route('POST', '/api/hospital/password', (ctx) => {
  const db = store.load();
  const user = db.users.find((u) => u.id === ctx.user.id);
  if (!auth.verifyPassword(String(ctx.body.current || ''), user.passwordHash)) {
    return ctx.fail(401, 'Your current password is wrong.');
  }
  const problem = auth.passwordProblem(String(ctx.body.password || ''));
  if (problem) return ctx.fail(400, problem);
  user.passwordHash = auth.hashPassword(String(ctx.body.password));
  user.mustChangePassword = false;
  store.save();
  return ctx.ok({ changed: true });
}, 'hospital');

/**
 * Recovery for the administrator, who has nobody above them.
 * Support runs this with the owner key; it is never exposed in the app.
 */
route('POST', '/api/owner/hospital-reset', (ctx) => {
  const expected = process.env.TRIMESTT_OWNER_KEY || '';
  const given = ctx.apiKey || clean(ctx.body.ownerKey, 120);
  if (!expected || given !== expected) return ctx.fail(401, 'Not authorised.');

  const db = store.load();
  const email = clean(ctx.body.email, 160).toLowerCase();
  const user = db.users.find((u) => u.role === 'hospital' && u.email === email);
  if (!user) return ctx.fail(404, 'No hospital login with that email.');
  const hospital = db.hospitals.find((h) => h.id === user.hospitalId);

  const password = tempPassword();
  user.passwordHash = auth.hashPassword(password);
  user.mustChangePassword = true;
  user.resetLog = user.resetLog || [];
  user.resetLog.unshift({ by: 'Trimestt support', at: new Date().toISOString() });
  Object.keys(db.sessions).forEach((token) => {
    if (db.sessions[token].userId === user.id) delete db.sessions[token];
  });
  store.save();
  return ctx.ok({ hospital: hospital.name, name: user.name, email: user.email, password });
});

/**
 * Forgotten which email they used. We never reveal an address to an unverified
 * caller — we confirm whether the hospital exists and tell them what to do.
 */
route('POST', '/api/hospital/recover', (ctx) => {
  const db = store.load();
  const name = clean(ctx.body.hospitalName, 120).toLowerCase();
  const phone = clean(ctx.body.phone, 20);
  const hospital = db.hospitals.find((h) =>
    h.name.toLowerCase().includes(name) && name.length > 3 &&
    (h.phone === phone || h.labourRoomPhone === phone));

  return ctx.ok({
    found: !!hospital,
    hint: hospital
      ? 'We found your hospital. Ask your administrator to reset your login, or contact Trimestt support from the number registered with us and we will do it.'
      : 'We could not match those details. Contact Trimestt support and we will verify you another way.'
  });
});

/* ---- password reset, issued at the desk --------------------------------- */

route('POST', '/api/hospital/patients/:id/reset', (ctx) => {
  const db = store.load();
  const patient = db.patients.find((p) => p.id === ctx.params.id && p.hospitalId === ctx.user.hospitalId);
  if (!patient) return ctx.fail(404, 'Patient not found.');

  patient.resetCode = auth.activationCode();
  patient.resetExpires = Date.now() + 24 * 60 * 60 * 1000;
  patient.resetLog = patient.resetLog || [];
  patient.resetLog.unshift({ by: ctx.user.name, at: new Date().toISOString() });
  store.save();

  return ctx.ok({
    number: patient.number,
    code: patient.resetCode,
    expiresInHours: 24,
    message: 'Give her this code. It works once, for 24 hours, and none of her records change.'
  });
}, 'hospital');

route('POST', '/api/patient/reset', (ctx) => {
  const db = store.load();
  const number = clean(ctx.body.patientId, 30).toUpperCase();
  const code = clean(ctx.body.code, 10).toUpperCase();
  const password = String(ctx.body.password || '');

  const patient = db.patients.find((p) => p.number === number);
  if (!patient || !patient.resetCode || patient.resetCode !== code) {
    return ctx.fail(401, 'That patient ID and reset code do not match. Ask your hospital for a new code.');
  }
  if (!patient.resetExpires || patient.resetExpires < Date.now()) {
    return ctx.fail(410, 'That code has expired. Ask your hospital for a new one.');
  }
  const problem = auth.passwordProblem(password);
  if (problem) return ctx.fail(400, problem);

  const user = db.users.find((u) => u.role === 'patient' && u.patientId === patient.id);
  if (!user) return ctx.fail(409, 'This account has not been activated yet.');

  user.passwordHash = auth.hashPassword(password);
  patient.resetCode = null;
  patient.resetExpires = null;
  Object.keys(db.sessions).forEach((token) => {
    if (db.sessions[token].userId === user.id) delete db.sessions[token];
  });
  store.save();

  return ctx.ok({ token: auth.createSession(user.id, 'patient'), number: patient.number });
});


/* ---- the hospital's doctors --------------------------------------------- */

route('GET', '/api/hospital/doctors', (ctx) => {
  const db = store.load();
  const hospital = db.hospitals.find((h) => h.id === ctx.user.hospitalId);
  return ctx.ok({ doctors: hospital.doctors || [] });
}, 'hospital');

route('POST', '/api/hospital/doctors', (ctx) => {
  const db = store.load();
  const hospital = db.hospitals.find((h) => h.id === ctx.user.hospitalId);
  const name = clean(ctx.body.name, 120);
  if (!name) return ctx.fail(400, 'Enter the doctor\'s name.');
  hospital.doctors = hospital.doctors || [];
  const doctor = {
    id: store.id('doc'),
    name,
    speciality: clean(ctx.body.speciality, 60) || 'Obstetrics',
    phone: clean(ctx.body.phone, 20)
  };
  hospital.doctors.push(doctor);
  store.save();
  return ctx.ok({ doctor });
}, 'hospital');

route('POST', '/api/hospital/doctors/:id/link', (ctx) => {
  const db = store.load();
  const user = db.users.find((u) => u.id === clean(ctx.body.userId, 40) && u.hospitalId === ctx.user.hospitalId);
  if (!user) return ctx.fail(404, 'That login was not found.');
  user.doctorId = ctx.params.id;
  store.save();
  return ctx.ok({ linked: user.name });
}, 'hospital');

/* ---- what happened after an alert --------------------------------------- */

const OUTCOMES = ['Called the patient', 'Advised to come in', 'Seen in OPD', 'Admitted', 'No action needed'];

route('POST', '/api/hospital/alerts/:id/action', (ctx) => {
  const db = store.load();
  const alert = db.alerts.find((a) => a.id === ctx.params.id && a.hospitalId === ctx.user.hospitalId);
  if (!alert) return ctx.fail(404, 'Alert not found.');
  const outcome = clean(ctx.body.outcome, 60);
  if (!OUTCOMES.includes(outcome)) return ctx.fail(400, 'Choose what was done.');

  alert.state = 'closed';
  alert.outcome = outcome;
  alert.outcomeNote = clean(ctx.body.note, 400);
  alert.closedBy = ctx.user.name;
  alert.closedAt = new Date().toISOString();
  if (!alert.acknowledgedAt) {
    alert.acknowledgedAt = alert.closedAt;
    alert.acknowledgedBy = ctx.user.name;
  }
  store.save();
  return ctx.ok({ alert, outcomes: OUTCOMES });
}, 'hospital');

/* ---- reports ------------------------------------------------------------- */

function reportRows(db, hospitalId, from, to) {
  return db.alerts
    .filter((a) => a.hospitalId === hospitalId)
    .filter((a) => (!from || a.createdAt >= from) && (!to || a.createdAt <= to + 'T23:59:59'))
    .map((a) => {
      const patient = db.patients.find((p) => p.id === a.patientId);
      const minutes = a.acknowledgedAt
        ? Math.round((new Date(a.acknowledgedAt) - new Date(a.createdAt)) / 60000)
        : null;
      return {
        raisedAt: a.createdAt,
        patient: a.patientName,
        patientId: a.patientNumber,
        weeks: patient ? clinical.gestation(patient.lmp).label : '',
        consultant: patient ? patient.consultant : '',
        tier: a.tier,
        critical: a.tier === 4 ? 'Yes' : 'No',
        reported: a.reason,
        detail: a.detail,
        source: a.source,
        state: a.state,
        acknowledgedBy: a.acknowledgedBy || '',
        minutesToAcknowledge: minutes === null ? '' : minutes,
        careTaken: a.outcome ? 'Yes' : 'No',
        outcome: a.outcome || '',
        outcomeNote: a.outcomeNote || '',
        closedBy: a.closedBy || ''
      };
    });
}

route('GET', '/api/hospital/reports', (ctx) => {
  const db = store.load();
  const from = ctx.query.get('from') || '';
  const to = ctx.query.get('to') || '';
  const rows = reportRows(db, ctx.user.hospitalId, from, to)
    .filter((r) => {
      if ((ctx.user.staffRole || 'admin') !== 'doctor' || ctx.user.showAll) return true;
      const patient = db.patients.find((p) => p.number === r.patientId);
      return !patient || visibleTo(ctx.user, patient);
    });

  const open = rows.filter((r) => r.state === 'open');
  const acknowledged = rows.filter((r) => r.minutesToAcknowledge !== '');
  return ctx.ok({
    rows,
    outcomes: OUTCOMES,
    summary: {
      total: rows.length,
      critical: rows.filter((r) => r.tier === 4).length,
      open: open.length,
      openCritical: open.filter((r) => r.tier === 4).length,
      careTaken: rows.filter((r) => r.careTaken === 'Yes').length,
      averageMinutesToAcknowledge: acknowledged.length
        ? Math.round(acknowledged.reduce((sum, r) => sum + r.minutesToAcknowledge, 0) / acknowledged.length)
        : null
    }
  });
}, 'hospital');

route('GET', '/api/hospital/reports.csv', (ctx) => {
  const db = store.load();
  const rows = reportRows(db, ctx.user.hospitalId, ctx.query.get('from') || '', ctx.query.get('to') || '');
  const headers = ['raisedAt', 'patient', 'patientId', 'weeks', 'consultant', 'tier', 'critical',
    'reported', 'detail', 'source', 'state', 'acknowledgedBy', 'minutesToAcknowledge',
    'careTaken', 'outcome', 'outcomeNote', 'closedBy'];
  const escape = (v) => '"' + String(v === null || v === undefined ? '' : v).replace(/"/g, '""') + '"';
  const csv = [headers.join(',')]
    .concat(rows.map((r) => headers.map((h) => escape(r[h])).join(',')))
    .join('\n');
  return ctx.ok({ filename: 'trimestt-alerts.csv', csv });
}, 'hospital');



/* ---- codes the hospital has bought --------------------------------------
   Codes are paid for in advance. Registration consumes one. When the balance
   runs out there are three codes of grace, so a nurse is never stuck with a
   patient standing in front of her.
   ------------------------------------------------------------------------ */

const PACKAGES = [
  { codes: 25,  price: 99975,  discount: 0,  perCode: 3999 },
  { codes: 50,  price: 189950, discount: 5,  perCode: 3799 },
  { codes: 100, price: 359900, discount: 10, perCode: 3599 },
  { codes: 200, price: 679800, discount: 15, perCode: 3399 }
];
const GRACE_CODES = 3;

function creditState(hospital) {
  const c = hospital.credits || { purchased: 0, used: 0, grace: 0, ledger: [] };
  const balance = c.purchased - c.used;
  return {
    purchased: c.purchased,
    used: c.used,
    balance,
    grace: c.grace || 0,
    graceLeft: Math.max(0, GRACE_CODES - (c.grace || 0)),
    low: balance <= 5,
    empty: balance <= 0,
    ledger: (c.ledger || []).slice(0, 30)
  };
}

route('GET', '/api/hospital/credits', (ctx) => {
  const db = store.load();
  const hospital = db.hospitals.find((h) => h.id === ctx.user.hospitalId);
  return ctx.ok({ credits: creditState(hospital), packages: PACKAGES });
}, 'hospital');

/** Support adds codes once payment has cleared. */
route('POST', '/api/owner/credits', (ctx) => {
  const expected = process.env.TRIMESTT_OWNER_KEY || '';
  const given = ctx.apiKey || clean(ctx.body.ownerKey, 120);
  if (!expected || given !== expected) return ctx.fail(401, 'Not authorised.');

  const db = store.load();
  const email = clean(ctx.body.email, 160).toLowerCase();
  const user = db.users.find((u) => u.role === 'hospital' && u.email === email);
  const hospital = user ? db.hospitals.find((h) => h.id === user.hospitalId) : null;
  if (!hospital) return ctx.fail(404, 'No hospital with that administrator email.');

  const codes = Math.max(1, Math.min(2000, Number(ctx.body.codes) || 0));
  hospital.credits = hospital.credits || { purchased: 0, used: 0, grace: 0, ledger: [] };
  hospital.credits.purchased += codes;
  hospital.credits.grace = 0;              // paying clears any grace taken
  hospital.credits.ledger.unshift({
    at: new Date().toISOString(),
    codes,
    amount: Number(ctx.body.amount) || null,
    reference: clean(ctx.body.reference, 80),
    note: clean(ctx.body.note, 200) || 'Codes added'
  });
  store.save();
  return ctx.ok({ hospital: hospital.name, credits: creditState(hospital) });
});

/* ---- ERP intake ---------------------------------------------------------
   SIVAM (or any hospital system) pushes a patient here with the hospital's
   API key. Nothing is enrolled or billed until a nurse confirms it.
   ------------------------------------------------------------------------ */

route('POST', '/api/hospital/apikey', (ctx) => {
  const db = store.load();
  if ((ctx.user.staffRole || 'admin') !== 'admin') return ctx.fail(403, 'Only an administrator can do this.');
  const hospital = db.hospitals.find((h) => h.id === ctx.user.hospitalId);
  hospital.apiKey = 'trk_' + require('crypto').randomBytes(20).toString('hex');
  hospital.apiKeyIssuedAt = new Date().toISOString();
  store.save();
  return ctx.ok({ apiKey: hospital.apiKey, issuedAt: hospital.apiKeyIssuedAt });
}, 'hospital');

route('GET', '/api/hospital/apikey', (ctx) => {
  const db = store.load();
  const hospital = db.hospitals.find((h) => h.id === ctx.user.hospitalId);
  return ctx.ok({ apiKey: hospital.apiKey || null, issuedAt: hospital.apiKeyIssuedAt || null });
}, 'hospital');

function intake(db, hospital, row, source) {
  const name = clean(row.name, 120);
  const phone = clean(row.phone, 20);
  let lmp = clean(row.lmp, 10);
  let edd = clean(row.edd, 10);

  if (!name) return { ok: false, error: 'name is required', row };
  if (!/^[0-9+\s-]{10,15}$/.test(phone)) return { ok: false, error: 'a valid phone is required', row };
  if (!lmp && !edd) return { ok: false, error: 'lmp or edd is required', row };
  try {
    if (lmp) edd = clinical.eddFromLmp(lmp); else lmp = clinical.lmpFromEdd(edd);
  } catch (err) { return { ok: false, error: 'date could not be read', row }; }
  const g = clinical.gestation(lmp);
  if (g.days < 0 || g.days > 320) return { ok: false, error: 'gestation outside the normal range', row };

  db.pending = db.pending || [];
  const mrn = clean(row.mrn, 40);
  const already = db.pending.find((x) => x.hospitalId === hospital.id && x.state === 'pending' &&
    (x.phone === phone || (mrn && x.mrn === mrn)));
  if (already) return { ok: false, error: 'already waiting to be confirmed', row };

  const existing = db.patients.find((p) => p.hospitalId === hospital.id && p.phone === phone);
  if (existing) return { ok: false, error: 'already enrolled as ' + existing.number, row };

  const record = {
    id: store.id('pen'),
    hospitalId: hospital.id,
    mrn, name, phone, lmp, edd,
    bloodGroup: clean(row.bloodGroup, 12),
    consultant: clean(row.consultant, 120),
    attendantName: clean(row.attendantName, 120),
    attendantPhone: clean(row.attendantPhone, 20),
    heightCm: row.heightCm ? Number(row.heightCm) : null,
    prePregnancyWeightKg: row.prePregnancyWeightKg ? Number(row.prePregnancyWeightKg) : null,
    source,
    state: 'pending',
    receivedAt: new Date().toISOString()
  };
  db.pending.unshift(record);
  return { ok: true, id: record.id, name: record.name, edd: record.edd };
}

route('POST', '/api/erp/patients', (ctx) => {
  const db = store.load();
  const key = clean(ctx.body.apiKey, 60) || clean(ctx.apiKey, 60);
  const hospital = db.hospitals.find((h) => h.apiKey && h.apiKey === key);
  if (!hospital) return ctx.fail(401, 'Unknown or missing API key.');

  const rows = Array.isArray(ctx.body.patients) ? ctx.body.patients : [ctx.body];
  if (rows.length > 200) return ctx.fail(413, 'Send at most 200 patients per call.');
  const results = rows.map((row) => intake(db, hospital, row, 'erp'));
  store.save();
  return ctx.ok({
    received: rows.length,
    queued: results.filter((r) => r.ok).length,
    rejected: results.filter((r) => !r.ok),
    message: 'Queued for confirmation by hospital staff. Nothing is enrolled or billed until then.'
  });
});

route('POST', '/api/hospital/import', (ctx) => {
  const db = store.load();
  const hospital = db.hospitals.find((h) => h.id === ctx.user.hospitalId);
  const text = String(ctx.body.csv || '').trim();
  if (!text) return ctx.fail(400, 'Paste or upload a CSV first.');

  const lines = text.split(/\r?\n/).filter((l) => l.trim());
  const headers = lines.shift().split(',').map((h) => h.trim().replace(/^"|"$/g, ''));
  const results = lines.map((line) => {
    const cells = line.match(/("([^"]|"")*"|[^,]*)/g).filter((_, i) => i % 2 === 0);
    const row = {};
    headers.forEach((h, i) => { row[h] = (cells[i] || '').trim().replace(/^"|"$/g, '').replace(/""/g, '"'); });
    return intake(db, hospital, row, 'csv');
  });
  store.save();
  return ctx.ok({
    received: results.length,
    queued: results.filter((r) => r.ok).length,
    rejected: results.filter((r) => !r.ok)
  });
}, 'hospital');

route('GET', '/api/hospital/pending', (ctx) => {
  const db = store.load();
  const list = (db.pending || [])
    .filter((p) => p.hospitalId === ctx.user.hospitalId && p.state === 'pending')
    .map((p) => Object.assign({}, p, { gestation: clinical.gestation(p.lmp) }));
  return ctx.ok({ pending: list });
}, 'hospital');

route('POST', '/api/hospital/pending/:id/confirm', (ctx) => {
  const db = store.load();
  const record = (db.pending || []).find((p) => p.id === ctx.params.id && p.hospitalId === ctx.user.hospitalId);
  if (!record || record.state !== 'pending') return ctx.fail(404, 'Nothing pending with that reference.');

  record.state = 'confirmed';
  record.confirmedBy = ctx.user.name;
  record.confirmedAt = new Date().toISOString();

  ctx.body = {
    name: record.name, phone: record.phone, lmp: record.lmp,
    bloodGroup: record.bloodGroup, consultant: record.consultant,
    attendantName: record.attendantName, attendantPhone: record.attendantPhone,
    heightCm: record.heightCm, prePregnancyWeightKg: record.prePregnancyWeightKg,
    riskTags: []
  };
  return handle('POST', '/api/hospital/patients', ctx);
}, 'hospital');

route('POST', '/api/hospital/pending/:id/reject', (ctx) => {
  const db = store.load();
  const record = (db.pending || []).find((p) => p.id === ctx.params.id && p.hospitalId === ctx.user.hospitalId);
  if (!record) return ctx.fail(404, 'Nothing pending with that reference.');
  record.state = 'rejected';
  record.rejectedBy = ctx.user.name;
  store.save();
  return ctx.ok({ rejected: record.name });
}, 'hospital');

/* ---- the nurse's worklist ------------------------------------------------ */

route('GET', '/api/hospital/worklist', (ctx) => {
  const db = store.load();
  const today = clinical.iso(new Date());
  const soon = clinical.iso(clinical.addDays(new Date(), 7));
  const patients = db.patients.filter((p) => p.hospitalId === ctx.user.hospitalId && visibleTo(ctx.user, p));
  const items = [];

  db.alerts.filter((a) => a.hospitalId === ctx.user.hospitalId && a.state !== 'closed').forEach((a) => {
    items.push({ kind: 'alert', urgency: a.tier === 4 ? 1 : 2, patient: a.patientName,
      patientId: a.patientNumber, id: a.id, what: a.reason, detail: a.detail, when: a.createdAt });
  });

  patients.forEach((p) => {
    const done = p.completed || {};
    clinical.buildAncPlan(p).forEach((item) => {
      if (done[item.key] || !item.hard) return;
      if (item.windowEnd < today) {
        items.push({ kind: 'missed', urgency: 2, patient: p.name, patientId: p.number,
          what: item.title + ' window has passed', detail: 'Closed ' + item.windowEnd, when: item.windowEnd });
      } else if (item.windowEnd <= soon) {
        items.push({ kind: 'closing', urgency: 3, patient: p.name, patientId: p.number,
          what: item.title + ' window closes soon', detail: 'Closes ' + item.windowEnd, when: item.windowEnd });
      }
    });

    const last = db.logs.find((l) => l.patientId === p.id);
    const quietDays = last ? clinical.daysBetween(last.date, new Date()) : null;
    if (p.activated && (quietDays === null || quietDays >= 7)) {
      items.push({ kind: 'quiet', urgency: 4, patient: p.name, patientId: p.number,
        what: 'No readings for ' + (quietDays === null ? 'any day yet' : quietDays + ' days'),
        detail: 'Worth a call', when: last ? last.date : p.createdAt });
    }
    if (!p.activated) {
      items.push({ kind: 'notactive', urgency: 4, patient: p.name, patientId: p.number,
        what: 'App not activated', detail: 'Code ' + p.activationCode, when: p.createdAt });
    }
  });

  items.sort((a, b) => a.urgency - b.urgency || String(b.when).localeCompare(String(a.when)));
  return ctx.ok({
    items: items.slice(0, 120),
    counts: {
      critical: items.filter((i) => i.urgency === 1).length,
      attention: items.filter((i) => i.urgency === 2).length,
      soon: items.filter((i) => i.urgency === 3).length,
      followUp: items.filter((i) => i.urgency === 4).length
    },
    pending: (db.pending || []).filter((p) => p.hospitalId === ctx.user.hospitalId && p.state === 'pending').length,
    credits: creditState(db.hospitals.find((h) => h.id === ctx.user.hospitalId))
  });
}, 'hospital');


/* ---- consent ------------------------------------------------------------- */

const TERMS_VERSION = '2026-08-2';
const GRIEVANCE = {
  name: process.env.TRIMESTT_GRIEVANCE_NAME || 'Trimestt — data protection contact',
  email: process.env.TRIMESTT_GRIEVANCE_EMAIL || 'privacy@trimestt.com',
  phone: process.env.TRIMESTT_GRIEVANCE_PHONE || ''
};
const RETENTION_YEARS = 3;   // after care ends, unless the hospital must keep it longer

function termsFor(hospitalName) {
  const h = hospitalName || 'your hospital';
  return {
    version: TERMS_VERSION,
    title: 'Before you start',
    /* An itemised account of what is collected and why — DPDP Rules 2025, Rule 3. */
    items: [
      { what: 'Your name, phone number and age', why: 'To know who you are and keep your record separate from everyone else\'s' },
      { what: 'Your last period date or due date', why: 'To work out your due date and build your visit plan' },
      { what: 'Readings you write in — weight, BP, sugar, movements, water, medicines', why: 'To show you your progress and warn your hospital if something looks wrong' },
      { what: 'How you feel, in your own words, and photos you choose to add', why: 'So a nurse can judge quickly whether you need to be seen' },
      { what: 'Reports and scans you upload', why: 'To keep them in one place for you and your doctor' },
      { what: 'What your hospital adds — visits, medicines, blood group, notes', why: 'To run your care' },
      { what: 'Your baby\'s details after birth', why: 'Vaccines, growth and the newborn checks' },
      { what: 'Your family member\'s name and number, if you give it', why: 'To alert them in an emergency, only if you switch that on' }
    ],
    sections: [
      { h: 'Who holds your information',
        p: `${h} holds your records and decides how they are used. Trimestt only keeps them safe on the hospital's behalf.` },
      { h: 'Who can see it',
        p: `Only you and the staff at ${h}. A family member sees it only if you switch that on. No other hospital and no other patient can ever see your records.` },
      { h: 'Where it is kept',
        p: 'Your records are kept on secure servers run by our hosting provider, which may be outside India. Everything travels locked, your password is stored scrambled, and photos and reports are kept encrypted.' },
      { h: 'How long we keep it',
        p: `While you are using the app, and for about ${RETENTION_YEARS} years after your care ends — unless the hospital must keep it longer under medical record rules. After that it is deleted.` },
      { h: 'You can change your mind',
        p: 'You can withdraw your agreement at any time, from the app, as easily as you gave it. Your hospital is told, and we stop using your information for the app.' },
      { h: 'Your rights',
        p: 'You can ask for a copy of everything we hold, ask for anything wrong to be corrected, ask for it to be deleted, and name someone to act for you if you cannot. Requests are answered within 90 days.' },
      { h: 'If you are not happy',
        p: `Write to ${GRIEVANCE.name} at ${GRIEVANCE.email}${GRIEVANCE.phone ? ' or call ' + GRIEVANCE.phone : ''}. If we do not resolve it, you may complain to the Data Protection Board of India.` },
      { h: 'This app is not an emergency service',
        p: 'Alerts go to your hospital, but if you are unwell, call them or come in. Do not wait for the app.' },
      { h: 'It does not replace your doctor',
        p: 'Trimestt reminds, records and warns. It does not diagnose, it does not prescribe, and no doctor treats you through this app. Your care stays with your hospital.' },
      { h: 'The sex of your baby',
        p: 'Nothing here records or shows the sex of an unborn baby. That is the law in India, and we follow it.' },
      { h: 'If you are under 18',
        p: 'Your parent or guardian must agree on your behalf, and your hospital records who they are.' },
      { h: 'Messages',
        p: 'Your hospital may send you reminders about visits, medicines and your baby. No advertising, ever, and we never sell your information.' }
    ],
    grievance: GRIEVANCE,
    retentionYears: RETENTION_YEARS
  };
}

route('GET', '/api/terms', (ctx) => {
  const db = store.load();
  const number = clean(ctx.query.get('patientId'), 30).toUpperCase();
  const patient = number ? db.patients.find((p) => p.number === number) : null;
  const hospital = patient ? db.hospitals.find((h) => h.id === patient.hospitalId) : null;
  return ctx.ok({ terms: termsFor(hospital ? hospital.name : null) });
});

/* ---- patient ------------------------------------------------------------ */

route('POST', '/api/patient/activate', (ctx) => {
  const db = store.load();
  const number = clean(ctx.body.patientId, 30).toUpperCase();
  const code = clean(ctx.body.code, 10).toUpperCase();
  const password = String(ctx.body.password || '');

  const patient = db.patients.find((p) => p.number === number);
  if (!patient || patient.activationCode !== code) {
    return ctx.fail(401, 'That patient ID and activation code do not match.');
  }
  if (patient.activated) return ctx.fail(409, 'This account is already active. Log in with your password.');

  const problem = auth.passwordProblem(password);
  if (problem) return ctx.fail(400, problem);

  if (ctx.body.agreed !== true) {
    return ctx.fail(400, 'Please read and tick the box to agree before you continue.');
  }
  patient.consent = {
    agreed: true,
    version: TERMS_VERSION,
    at: new Date().toISOString(),
    byGuardian: !!patient.minor,
    guardianName: patient.minor && patient.guardian ? patient.guardian.name : null
  };
  db.consentLog = db.consentLog || [];
  db.consentLog.unshift({                  // kept seven years, as the Rules require
    patientId: patient.id, hospitalId: patient.hospitalId,
    action: 'given', version: TERMS_VERSION, at: patient.consent.at
  });

  const user = {
    id: store.id('usr'),
    role: 'patient',
    hospitalId: patient.hospitalId,
    patientId: patient.id,
    number: patient.number,
    name: patient.name,
    passwordHash: auth.hashPassword(password),
    createdAt: new Date().toISOString()
  };
  db.users.push(user);
  patient.activated = true;
  store.save();

  return ctx.ok({ token: auth.createSession(user.id, user.role), number: patient.number });
});

route('POST', '/api/patient/login', (ctx) => {
  const db = store.load();
  const number = clean(ctx.body.patientId, 30).toUpperCase();
  const user = db.users.find((u) => u.role === 'patient' && u.number === number);
  if (!user || !auth.verifyPassword(String(ctx.body.password || ''), user.passwordHash)) {
    return ctx.fail(401, 'Patient ID or password is wrong.');
  }
  return ctx.ok({ token: auth.createSession(user.id, user.role), number });
});

route('GET', '/api/patient/me', (ctx) => {
  const db = store.load();
  const patient = db.patients.find((p) => p.id === ctx.user.patientId);
  const hospital = db.hospitals.find((h) => h.id === patient.hospitalId);
  const children = db.children.filter((c) => c.patientId === patient.id);
  return ctx.ok({
    hospital: publicHospital(hospital),
    mother: motherPayload(db, patient),
    children,
    payments: db.payments.filter((p) => p.patientId === patient.id),
    childFee: CHILD_FEE
  });
}, 'patient');



/* ---- her profile: photo and greeting ------------------------------------ */

route('POST', '/api/patient/photo', (ctx) => {
  const db = store.load();
  const patient = db.patients.find((p) => p.id === ctx.user.patientId);
  if (!ctx.body.photo) return ctx.fail(400, 'Choose a picture first.');
  let meta;
  try { meta = files.save(ctx.body.photo, patient.id); }
  catch (err) { return ctx.fail(err.status || 400, err.message); }
  if (patient.photo) files.remove(patient.photo);
  patient.photo = meta.file;
  store.save();
  return ctx.ok({ photo: patient.photo });
}, 'patient');

route('POST', '/api/patient/checklist', (ctx) => {
  const db = store.load();
  const patient = db.patients.find((p) => p.id === ctx.user.patientId);
  const today = clinical.iso(new Date());
  patient.checklist = patient.checklist || {};
  if (patient.checklist.date !== today) patient.checklist = { date: today, done: {} };
  const key = clean(ctx.body.key, 40);
  patient.checklist.done[key] = !patient.checklist.done[key];
  store.save();
  return ctx.ok({ checklist: patient.checklist });
}, 'patient');

/* ---- insights: hydration, weight, lifestyle ------------------------------ */

route('GET', '/api/patient/insights', (ctx) => {
  const db = store.load();
  const patient = db.patients.find((p) => p.id === ctx.user.patientId);
  const logs = db.logs.filter((l) => l.patientId === patient.id);
  const g = clinical.gestation(patient.lmp);
  const picture = clinical.weightPicture(patient, logs);
  const currentWeight = picture ? picture.currentWeight : patient.prePregnancyWeightKg;

  const today = clinical.iso(new Date());
  const todayLog = logs.find((l) => l.date === today);
  const water = clinical.waterTarget(currentWeight, g.trimester, patient.waterOverrideMl);

  const drunk = (todayLog && todayLog.waterMl) || 0;
  const ticked = (patient.checklist && patient.checklist.date === today) ? patient.checklist.done : {};

  return ctx.ok({
    gestation: g,
    countdown: clinical.countdown(patient.lmp),
    babySize: clinical.babySize(g.weeks),
    photo: patient.photo || null,
    firstName: (patient.name || '').split(' ')[0],
    checklist: [
      { key: 'symptoms', label: 'Log how you feel', hint: 'Takes half a minute', done: !!ticked.symptoms },
      { key: 'water', label: 'Drink your water', hint: drunk + ' of ' + water.ml + ' ml so far', done: !!ticked.water },
      { key: 'medicines', label: 'Take your medicines', hint: 'Tick them in Today', done: !!ticked.medicines },
      { key: 'weight', label: 'Weigh yourself', hint: 'Same time each day', done: !!ticked.weight },
      { key: 'walk', label: 'Walk a little', hint: 'Twenty minutes is plenty', done: !!ticked.walk }
    ],
    water: Object.assign({}, water, { drunkMl: drunk }),
    weight: picture,
    lifestyle: clinical.lifestyleFor(g.trimester)
  });
}, 'patient');

route('POST', '/api/patient/water', (ctx) => {
  const db = store.load();
  const patient = db.patients.find((p) => p.id === ctx.user.patientId);
  const today = clinical.iso(new Date());
  let log = db.logs.find((l) => l.patientId === patient.id && l.date === today);
  if (!log) {
    log = { id: store.id('log'), patientId: patient.id, hospitalId: patient.hospitalId,
            date: today, symptoms: [], createdAt: new Date().toISOString() };
    db.logs.unshift(log);
  }
  const add = Number(ctx.body.ml) || 200;
  log.waterMl = Math.max(0, Math.min(6000, (log.waterMl || 0) + add));
  store.save();
  return ctx.ok({ drunkMl: log.waterMl });
}, 'patient');


/* ---- movement counting ---------------------------------------------------
   The measure that matters is how long ten movements take, and whether that
   time is drifting. Rate per minute is shown because she asked for it, but the
   alert is driven by the count and the elapsed time.
   ------------------------------------------------------------------------ */

/** ACOG and RCOG: formal counting from 28 weeks, 26 if the pregnancy is high risk. */
function kicksOpenFrom(patient) {
  const highRisk = (patient.riskTags || []).length > 0;
  return highRisk ? 26 : 28;
}

route('GET', '/api/patient/kicks/status', (ctx) => {
  const db = store.load();
  const patient = db.patients.find((p) => p.id === ctx.user.patientId);
  const weeks = clinical.gestation(patient.lmp).weeks;
  const from = kicksOpenFrom(patient);
  return ctx.ok({
    open: weeks >= from,
    fromWeek: from,
    weeks,
    weeksToWait: Math.max(0, from - weeks),
    why: weeks >= from
      ? 'Count once a day, at a time your baby is usually active.'
      : `Before ${from} weeks the baby is small enough to move without you feeling it, so counting is not reliable yet. Your app will open this at ${from} weeks. Until then, tell your hospital if movements feel different.`
  });
}, 'patient');

route('POST', '/api/patient/kicks', (ctx) => {
  const db = store.load();
  const patient = db.patients.find((p) => p.id === ctx.user.patientId);
  const weeksNow = clinical.gestation(patient.lmp).weeks;
  if (weeksNow < kicksOpenFrom(patient)) {
    return ctx.fail(409, `Movement counting starts at ${kicksOpenFrom(patient)} weeks.`);
  }

  const count = Math.max(0, Math.min(200, Number(ctx.body.count) || 0));
  const seconds = Math.max(1, Math.min(6 * 3600, Number(ctx.body.seconds) || 1));
  const minutes = Math.round(seconds / 60);

  /* Her own answer, which is the thing guidance actually acts on. */
  const feelsNormal = ctx.body.feelsNormal !== false;

  db.kicks = db.kicks || [];
  const session = {
    id: store.id('kck'),
    patientId: patient.id,
    hospitalId: patient.hospitalId,
    date: clinical.iso(new Date()),
    count, seconds, minutes,
    perMinute: Math.round((count / (seconds / 60)) * 100) / 100,
    weeks: weeksNow,
    feelsNormal,
    createdAt: new Date().toISOString()
  };
  db.kicks.unshift(session);

  /* Her own history, reported to the hospital as fact rather than as a verdict. */
  const previous = db.kicks.filter((k) => k.patientId === patient.id).slice(1, 6);
  const usualMinutes = previous.length
    ? Math.round(previous.reduce((sum, k) => sum + k.minutes, 0) / previous.length)
    : null;
  const usualCount = previous.length
    ? Math.round(previous.reduce((sum, k) => sum + k.count, 0) / previous.length)
    : null;

  const detail = `${count} movements in ${minutes} minute${minutes === 1 ? '' : 's'}` +
    (usualCount !== null ? `. Her recent sessions: about ${usualCount} in ${usualMinutes} minutes.` : '.') +
    ` She says the movements ${feelsNormal ? 'feel normal for her baby' : 'feel fewer or different from usual'}.`;

  let raised = 0;
  let message;

  if (!feelsNormal) {
    /* RCOG: attend on any perceived reduction, whatever the count. */
    raiseAlert(db, patient, {
      tier: 4,
      reason: 'Movements feel fewer or different',
      detail,
      source: 'movement counting'
    });
    raised = 1;
    message = 'Call your hospital now. They have your count and they know you said the movements feel different — that is what matters, not the number.';
  } else {
    /* Every session still reaches the hospital, as information. The app does
       not tell her whether a count is normal; guidance does not support that. */
    raiseAlert(db, patient, {
      tier: 1,
      reason: 'Movement count recorded',
      detail,
      source: 'movement counting'
    });
    message = `${count} movements in ${minutes} minute${minutes === 1 ? '' : 's'}, sent to your hospital. If the movements ever feel fewer or different from usual, call them — whatever the count.`;
  }

  store.save();
  return ctx.ok({ session, usualMinutes, usualCount, raised, message });
}, 'patient');

route('GET', '/api/patient/kicks', (ctx) => {
  const db = store.load();
  const list = (db.kicks || []).filter((k) => k.patientId === ctx.user.patientId).slice(0, 20);
  return ctx.ok({
    sessions: list,
    usualMinutes: list.length ? Math.round(list.reduce((sum, k) => sum + k.minutes, 0) / list.length) : null,
    usualCount: list.length ? Math.round(list.reduce((sum, k) => sum + k.count, 0) / list.length) : null
  });
}, 'patient');


/* ---- her actual medicines ----------------------------------------------- */

route('GET', '/api/patient/medicines', (ctx) => {
  const db = store.load();
  const patient = db.patients.find((p) => p.id === ctx.user.patientId);
  const today = clinical.iso(new Date());
  const log = db.logs.find((l) => l.patientId === patient.id && l.date === today);
  return ctx.ok({
    medicines: patient.medicines || [],
    takenToday: (log && log.medicinesTakenList) || []
  });
}, 'patient');

/** She can add anything her doctor started between visits. */
route('POST', '/api/patient/medicines', (ctx) => {
  const db = store.load();
  const patient = db.patients.find((p) => p.id === ctx.user.patientId);
  const name = clean(ctx.body.name, 80);
  if (!name) return ctx.fail(400, 'Enter the medicine name.');
  patient.medicines = patient.medicines || [];
  patient.medicines.push({
    id: store.id('med'), name,
    dose: clean(ctx.body.dose, 40),
    timing: clean(ctx.body.timing, 60),
    critical: false,
    addedBy: 'patient',
    addedAt: new Date().toISOString()
  });
  store.save();
  return ctx.ok({ medicines: patient.medicines });
}, 'patient');

route('POST', '/api/hospital/patients/:id/medicines', (ctx) => {
  const db = store.load();
  const patient = db.patients.find((p) => p.id === ctx.params.id && p.hospitalId === ctx.user.hospitalId);
  if (!patient) return ctx.fail(404, 'Patient not found.');
  const name = clean(ctx.body.name, 80);
  if (!name) return ctx.fail(400, 'Enter the medicine name.');
  patient.medicines = patient.medicines || [];
  patient.medicines.push({
    id: store.id('med'), name,
    dose: clean(ctx.body.dose, 40),
    timing: clean(ctx.body.timing, 60),
    critical: !!ctx.body.critical,
    addedBy: ctx.user.name,
    addedAt: new Date().toISOString()
  });
  store.save();
  return ctx.ok({ medicines: patient.medicines });
}, 'hospital');

route('POST', '/api/hospital/patients/:id/medicines/:medId/stop', (ctx) => {
  const db = store.load();
  const patient = db.patients.find((p) => p.id === ctx.params.id && p.hospitalId === ctx.user.hospitalId);
  if (!patient) return ctx.fail(404, 'Patient not found.');
  patient.medicines = (patient.medicines || []).filter((m) => m.id !== ctx.params.medId);
  store.save();
  return ctx.ok({ medicines: patient.medicines });
}, 'hospital');

/* ---- readings taken at the hospital ------------------------------------- */

route('POST', '/api/hospital/patients/:id/heartrate', (ctx) => {
  const db = store.load();
  const patient = db.patients.find((p) => p.id === ctx.params.id && p.hospitalId === ctx.user.hospitalId);
  if (!patient) return ctx.fail(404, 'Patient not found.');
  const bpm = Number(ctx.body.bpm);
  if (!bpm || bpm < 60 || bpm > 220) return ctx.fail(400, 'Enter a heart rate between 60 and 220.');

  patient.heartRates = patient.heartRates || [];
  const weeks = clinical.gestation(patient.lmp).weeks;
  const entry = {
    at: new Date().toISOString(),
    date: clinical.iso(new Date()),
    bpm, weeks,
    method: clean(ctx.body.method, 40) || 'Doppler at the hospital',
    by: ctx.user.name,
    normal: bpm >= 110 && bpm <= 160
  };
  patient.heartRates.unshift(entry);
  store.save();
  return ctx.ok({ entry, normalRange: [110, 160] });
}, 'hospital');

route('GET', '/api/patient/heartrate', (ctx) => {
  const db = store.load();
  const patient = db.patients.find((p) => p.id === ctx.user.patientId);
  const weeks = clinical.gestation(patient.lmp).weeks;
  return ctx.ok({
    open: weeks >= 12,
    weeks,
    readings: (patient.heartRates || []).slice(0, 20),
    normalRange: [110, 160],
    note: 'Your baby\'s heartbeat is measured by your hospital with a Doppler or on a scan. A phone cannot measure it, and a heartbeat heard at home is not a substitute for counting movements — a baby\'s heart rate changes late, movements change first.'
  });
}, 'patient');


/* ---- listening at home ---------------------------------------------------
   Home Dopplers are sold everywhere and used with or without us. The danger is
   never the device — it is a mother hearing a heartbeat, feeling reassured, and
   not reporting reduced movements. So the app asks about movements FIRST, and a
   reduced-movement answer overrides anything the device says.
   Off by default. The hospital enables it, and approves each patient.
   ------------------------------------------------------------------------ */

route('POST', '/api/hospital/home-listening', (ctx) => {
  const db = store.load();
  if (!canManage(ctx.user)) return ctx.fail(403, 'Only an administrator can change this.');
  const hospital = db.hospitals.find((h) => h.id === ctx.user.hospitalId);
  hospital.homeListening = !!ctx.body.enabled;
  store.save();
  return ctx.ok({ enabled: hospital.homeListening });
}, 'hospital');

route('POST', '/api/hospital/patients/:id/home-listening', (ctx) => {
  const db = store.load();
  const patient = db.patients.find((p) => p.id === ctx.params.id && p.hospitalId === ctx.user.hospitalId);
  if (!patient) return ctx.fail(404, 'Patient not found.');
  const hospital = db.hospitals.find((h) => h.id === patient.hospitalId);
  if (!hospital.homeListening) return ctx.fail(409, 'Turn on home listening for the hospital first.');

  patient.homeListening = {
    approved: !!ctx.body.approved,
    by: ctx.user.name,
    at: new Date().toISOString(),
    note: clean(ctx.body.note, 200)
  };
  store.save();
  return ctx.ok({ homeListening: patient.homeListening });
}, 'hospital');

route('GET', '/api/patient/home-listening', (ctx) => {
  const db = store.load();
  const patient = db.patients.find((p) => p.id === ctx.user.patientId);
  const hospital = db.hospitals.find((h) => h.id === patient.hospitalId);
  const weeks = clinical.gestation(patient.lmp).weeks;
  const approved = !!(patient.homeListening && patient.homeListening.approved);

  return ctx.ok({
    available: !!hospital.homeListening && approved && weeks >= 20,
    hospitalEnabled: !!hospital.homeListening,
    approved,
    weeks,
    readings: (patient.homeReadings || []).slice(0, 20),
    normalRange: [110, 160],
    rules: [
      'A phone cannot hear a baby. This is for a hand-held Doppler your hospital has approved.',
      'Movements come first. If movements are fewer or different, call your hospital — do not check the heartbeat instead.',
      'A heartbeat you can hear does not mean all is well. A baby\'s heart rate changes late; movements change first.',
      'Not hearing anything usually means the device is in the wrong place, not that something is wrong. Do not panic, and do not keep searching for long.',
      'Never use it to decide whether to go to hospital. That decision is made on movements and on how you feel.'
    ]
  });
}, 'patient');

route('POST', '/api/patient/home-listening', (ctx) => {
  const db = store.load();
  const patient = db.patients.find((p) => p.id === ctx.user.patientId);
  const hospital = db.hospitals.find((h) => h.id === patient.hospitalId);
  const weeks = clinical.gestation(patient.lmp).weeks;

  if (!hospital.homeListening || !(patient.homeListening && patient.homeListening.approved) || weeks < 20) {
    return ctx.fail(403, 'Home listening is not switched on for you.');
  }

  const movementsNormal = ctx.body.movementsNormal === true;
  const bpm = ctx.body.bpm === undefined || ctx.body.bpm === '' ? null : Number(ctx.body.bpm);
  const heard = ctx.body.heard !== false;

  patient.homeReadings = patient.homeReadings || [];
  const reading = {
    at: new Date().toISOString(),
    date: clinical.iso(new Date()),
    weeks, bpm, heard, movementsNormal,
    normal: bpm !== null && bpm >= 110 && bpm <= 160
  };
  patient.homeReadings.unshift(reading);

  /* Movements decide, never the device. */
  if (!movementsNormal) {
    raiseAlert(db, patient, {
      tier: 4,
      reason: 'Reduced or changed movements reported',
      detail: 'Reported while using a home Doppler at ' + weeks + ' weeks' +
              (bpm ? ' (device showed ' + bpm + ' bpm).' : '.'),
      source: 'home listening'
    });
    store.save();
    return ctx.ok({
      reading, raised: 1, override: true,
      message: 'Call your hospital now. Whatever the device shows, changed movements need checking today — the heartbeat is not the test.'
    });
  }

  let raised = 0;
  let message = 'Recorded. Keep counting movements — that is the measure that matters.';
  if (bpm !== null && !reading.normal) {
    raiseAlert(db, patient, {
      tier: 4,
      reason: 'Home reading outside the normal range',
      detail: bpm + ' bpm at ' + weeks + ' weeks, against 110–160.',
      source: 'home listening'
    });
    raised = 1;
    message = 'That reading is outside the usual range. Call your hospital — they have been told.';
  } else if (!heard) {
    message = 'Not finding it is usually the device, not the baby. Stop searching, and judge by movements. If movements are fewer, call your hospital.';
  }

  store.save();
  return ctx.ok({ reading, raised, override: false, message });
}, 'patient');

/* ---- other departments --------------------------------------------------- */

const DEFAULT_DEPARTMENTS = [
  { key: 'dermatology', name: 'Dermatology', why: 'Skin changes, pigmentation, rashes, itching' },
  { key: 'psychiatry', name: 'Mental health', why: 'Low mood, anxiety, sleep, support after birth' },
  { key: 'diabetology', name: 'Diabetology', why: 'Sugar control in and after pregnancy' },
  { key: 'cardiology', name: 'Cardiology', why: 'Palpitations, breathlessness, known heart conditions' },
  { key: 'neurology', name: 'Neurology', why: 'Headaches, fits, numbness, known neurological conditions' },
  { key: 'nephrology', name: 'Renal', why: 'Kidney conditions, protein in urine, blood pressure' },
  { key: 'endocrinology', name: 'Endocrinology', why: 'Thyroid, PCOS and other hormone conditions' },
  { key: 'gastro', name: 'Gastroenterology', why: 'Severe acidity, liver conditions, jaundice' },
  { key: 'physiotherapy', name: 'Physiotherapy', why: 'Back and pelvic pain, posture, recovery after birth' },
  { key: 'nutrition', name: 'Nutrition', why: 'Diet plans, weight, anaemia, diabetes in pregnancy' },
  { key: 'lactation', name: 'Lactation support', why: 'Latch, supply, feeding difficulties' },
  { key: 'paediatrics', name: 'Paediatrics', why: 'Your baby, from birth onwards' },
  { key: 'dental', name: 'Dental', why: 'Gum problems and toothache, safe in pregnancy' },
  { key: 'anaesthesia', name: 'Anaesthesia', why: 'Questions about pain relief and caesarean' }
];

route('GET', '/api/patient/departments', (ctx) => {
  const db = store.load();
  const patient = db.patients.find((p) => p.id === ctx.user.patientId);
  const hospital = db.hospitals.find((h) => h.id === patient.hospitalId);
  const enabled = hospital.departments || DEFAULT_DEPARTMENTS.map((d) => d.key);
  return ctx.ok({
    departments: DEFAULT_DEPARTMENTS.filter((d) => enabled.includes(d.key)),
    requests: (db.referrals || []).filter((r) => r.patientId === patient.id).slice(0, 20)
  });
}, 'patient');

route('POST', '/api/patient/departments/request', (ctx) => {
  const db = store.load();
  const patient = db.patients.find((p) => p.id === ctx.user.patientId);
  const key = clean(ctx.body.department, 40);
  const dept = DEFAULT_DEPARTMENTS.find((d) => d.key === key);
  if (!dept) return ctx.fail(400, 'Choose a department.');

  db.referrals = db.referrals || [];
  const referral = {
    id: store.id('ref'),
    patientId: patient.id,
    hospitalId: patient.hospitalId,
    patientName: patient.name,
    patientNumber: patient.number,
    department: dept.name,
    reason: clean(ctx.body.reason, 400),
    state: 'open',
    requestedAt: new Date().toISOString()
  };
  db.referrals.unshift(referral);

  raiseAlert(db, patient, {
    tier: 3,
    reason: 'Asked to see ' + dept.name,
    detail: referral.reason || 'No reason given.',
    source: 'department request'
  });
  store.save();
  return ctx.ok({ referral, message: 'Your hospital has your request and will call you about an appointment.' });
}, 'patient');

route('GET', '/api/hospital/departments', (ctx) => {
  const db = store.load();
  const hospital = db.hospitals.find((h) => h.id === ctx.user.hospitalId);
  return ctx.ok({
    all: DEFAULT_DEPARTMENTS,
    enabled: hospital.departments || DEFAULT_DEPARTMENTS.map((d) => d.key),
    requests: (db.referrals || []).filter((r) => r.hospitalId === ctx.user.hospitalId).slice(0, 50)
  });
}, 'hospital');

route('POST', '/api/hospital/departments', (ctx) => {
  const db = store.load();
  const hospital = db.hospitals.find((h) => h.id === ctx.user.hospitalId);
  hospital.departments = Array.isArray(ctx.body.enabled)
    ? ctx.body.enabled.filter((k) => DEFAULT_DEPARTMENTS.some((d) => d.key === k))
    : hospital.departments;
  store.save();
  return ctx.ok({ enabled: hospital.departments });
}, 'hospital');

route('POST', '/api/hospital/referrals/:id/close', (ctx) => {
  const db = store.load();
  const referral = (db.referrals || []).find((r) => r.id === ctx.params.id && r.hospitalId === ctx.user.hospitalId);
  if (!referral) return ctx.fail(404, 'Request not found.');
  referral.state = 'closed';
  referral.closedBy = ctx.user.name;
  referral.closedAt = new Date().toISOString();
  store.save();
  return ctx.ok({ referral });
}, 'hospital');


/* ---- her rights under the DPDP Act -------------------------------------- */

route('GET', '/api/patient/my-data', (ctx) => {
  const db = store.load();
  const patient = db.patients.find((p) => p.id === ctx.user.patientId);
  const hospital = db.hospitals.find((h) => h.id === patient.hospitalId);
  return ctx.ok({
    generatedAt: new Date().toISOString(),
    hospital: hospital.name,
    you: pick(patient, ['number', 'name', 'phone', 'age', 'lmp', 'edd', 'bloodGroup', 'consultant',
      'heightCm', 'prePregnancyWeightKg', 'riskTags', 'attendantName', 'attendantPhone', 'createdAt']),
    consent: patient.consent || null,
    photo: patient.photo || null,
    firstName: (patient.name || '').split(' ')[0],
    checklist: patient.checklist || null,
    medicines: patient.medicines || [],
    plan: clinical.buildAncPlan(patient),
    completed: patient.completed || {},
    dailyLogs: db.logs.filter((l) => l.patientId === patient.id),
    movementSessions: (db.kicks || []).filter((k) => k.patientId === patient.id),
    heartRates: patient.heartRates || [],
    homeReadings: patient.homeReadings || [],
    alerts: db.alerts.filter((a) => a.patientId === patient.id),
    children: db.children.filter((c) => c.patientId === patient.id),
    documents: (db.records || []).filter((r) => r.patientId === patient.id)
      .map((r) => pick(r, ['kind', 'title', 'takenOn', 'uploadedAt', 'file'])),
    departmentRequests: (db.referrals || []).filter((r) => r.patientId === patient.id)
  });
}, 'patient');

route('POST', '/api/patient/request', (ctx) => {
  const db = store.load();
  const patient = db.patients.find((p) => p.id === ctx.user.patientId);
  const kind = clean(ctx.body.kind, 20);
  if (!['correction', 'erasure', 'grievance'].includes(kind)) return ctx.fail(400, 'Choose what you are asking for.');

  db.dataRequests = db.dataRequests || [];
  const request = {
    id: store.id('req'),
    patientId: patient.id, hospitalId: patient.hospitalId,
    patientName: patient.name, patientNumber: patient.number,
    kind,
    detail: clean(ctx.body.detail, 600),
    state: 'open',
    raisedAt: new Date().toISOString(),
    dueBy: clinical.iso(clinical.addDays(new Date(), 90))   // 90 days, per Rule 14
  };
  db.dataRequests.unshift(request);
  store.save();
  return ctx.ok({
    request,
    message: kind === 'erasure'
      ? 'Your hospital has your request. They must answer within 90 days, and will tell you what they are required to keep.'
      : 'Your hospital has your request and will answer within 90 days.'
  });
}, 'patient');

route('POST', '/api/patient/withdraw-consent', (ctx) => {
  const db = store.load();
  const patient = db.patients.find((p) => p.id === ctx.user.patientId);
  patient.consent = Object.assign({}, patient.consent, {
    agreed: false,
    withdrawnAt: new Date().toISOString()
  });
  db.consentLog = db.consentLog || [];
  db.consentLog.unshift({
    patientId: patient.id, hospitalId: patient.hospitalId,
    action: 'withdrawn', version: TERMS_VERSION, at: patient.consent.withdrawnAt
  });

  raiseAlert(db, patient, {
    tier: 3,
    reason: 'Agreement withdrawn',
    detail: 'She has withdrawn her agreement in the app. Stop sending reminders and speak to her about her records.',
    source: 'consent'
  });

  Object.keys(db.sessions).forEach((token) => {
    const u = db.users.find((x) => x.id === db.sessions[token].userId);
    if (u && u.patientId === patient.id) delete db.sessions[token];
  });
  store.save();
  return ctx.ok({
    withdrawn: true,
    message: 'Your agreement is withdrawn and your hospital has been told. Your medical records stay with the hospital, as the law requires. You can agree again any time with a new code from them.'
  });
}, 'patient');

route('GET', '/api/hospital/data-requests', (ctx) => {
  const db = store.load();
  return ctx.ok({
    requests: (db.dataRequests || []).filter((r) => r.hospitalId === ctx.user.hospitalId),
    withdrawn: db.patients.filter((p) => p.hospitalId === ctx.user.hospitalId &&
      p.consent && p.consent.agreed === false)
      .map((p) => ({ number: p.number, name: p.name, withdrawnAt: p.consent.withdrawnAt })),
    minors: db.patients.filter((p) => p.hospitalId === ctx.user.hospitalId && p.minor)
      .map((p) => ({ number: p.number, name: p.name, guardian: p.guardian }))
  });
}, 'hospital');

route('POST', '/api/hospital/data-requests/:id/close', (ctx) => {
  const db = store.load();
  const request = (db.dataRequests || []).find((r) => r.id === ctx.params.id && r.hospitalId === ctx.user.hospitalId);
  if (!request) return ctx.fail(404, 'Request not found.');
  request.state = 'closed';
  request.closedBy = ctx.user.name;
  request.closedAt = new Date().toISOString();
  request.outcome = clean(ctx.body.outcome, 400);
  store.save();
  return ctx.ok({ request });
}, 'hospital');

/* Breach register. Notification to the Board is due within 72 hours. */
route('POST', '/api/owner/breach', (ctx) => {
  const expected = process.env.TRIMESTT_OWNER_KEY || '';
  if (!expected || (ctx.apiKey || clean(ctx.body.ownerKey, 120)) !== expected) return ctx.fail(401, 'Not authorised.');
  const db = store.load();
  db.breaches = db.breaches || [];
  const entry = {
    id: store.id('brc'),
    at: new Date().toISOString(),
    noticedAt: clean(ctx.body.noticedAt, 40),
    what: clean(ctx.body.what, 800),
    affected: clean(ctx.body.affected, 400),
    action: clean(ctx.body.action, 800),
    boardNotifiedAt: clean(ctx.body.boardNotifiedAt, 40) || null,
    principalsNotifiedAt: clean(ctx.body.principalsNotifiedAt, 40) || null
  };
  db.breaches.unshift(entry);
  store.save();
  return ctx.ok({ entry, reminder: 'The Data Protection Board must be told within 72 hours, and every affected patient without delay.' });
});

/* ---- records locker ------------------------------------------------------ */

const RECORD_KINDS = ['Scan', 'Lab report', 'Blood work', 'Prescription', 'Vaccination', 'Discharge summary', 'Other'];

route('GET', '/api/patient/records', (ctx) => {
  const db = store.load();
  const owner = clean(ctx.query.get('owner'), 40) || 'mother';
  const list = (db.records || [])
    .filter((r) => r.patientId === ctx.user.patientId && (r.owner || 'mother') === owner)
    .sort((a, b) => b.takenOn.localeCompare(a.takenOn));
  return ctx.ok({ records: list, kinds: RECORD_KINDS });
}, 'patient');

route('POST', '/api/patient/records', (ctx) => {
  const db = store.load();
  const patient = db.patients.find((p) => p.id === ctx.user.patientId);
  const kind = clean(ctx.body.kind, 40);
  if (!RECORD_KINDS.includes(kind)) return ctx.fail(400, 'Choose what this document is.');

  let meta;
  try {
    meta = files.save(ctx.body.file, patient.id);
  } catch (err) {
    return ctx.fail(err.status || 400, err.message);
  }

  db.records = db.records || [];
  const record = {
    id: store.id('rec'),
    patientId: patient.id,
    hospitalId: patient.hospitalId,
    owner: clean(ctx.body.owner, 40) || 'mother',
    kind,
    title: clean(ctx.body.title, 120) || kind,
    takenOn: clean(ctx.body.takenOn, 10) || clinical.iso(new Date()),
    note: clean(ctx.body.note, 300),
    file: meta.file,
    mime: meta.mime,
    bytes: meta.bytes,
    uploadedAt: meta.uploadedAt
  };
  db.records.unshift(record);
  store.save();
  return ctx.ok({ record });
}, 'patient');

route('POST', '/api/patient/records/:id/delete', (ctx) => {
  const db = store.load();
  db.records = db.records || [];
  const index = db.records.findIndex((r) => r.id === ctx.params.id && r.patientId === ctx.user.patientId);
  if (index === -1) return ctx.fail(404, 'That document was not found.');
  const [removed] = db.records.splice(index, 1);
  files.remove(removed.file);
  store.save();
  return ctx.ok({ removed: removed.title });
}, 'patient');

route('GET', '/api/files/:name', (ctx) => {
  const db = store.load();
  const name = clean(ctx.params.name, 80);
  const record = (db.records || []).find((r) => r.file === name);
  const log = db.logs.find((l) => l.photo === name);
  const owner = record ? record : log;
  if (!owner) return ctx.fail(404, 'Not found.');

  const allowed = ctx.user && (
    (ctx.user.role === 'patient' && owner.patientId === ctx.user.patientId) ||
    (ctx.user.role === 'hospital' && owner.hospitalId === ctx.user.hospitalId)
  );
  if (!allowed) return ctx.fail(403, 'Not yours to open.');

  const buffer = files.read(name);
  if (!buffer) return ctx.fail(404, 'That file is missing.');
  return ctx.file(buffer, record ? record.mime : 'image/jpeg');
});

route('GET', '/api/patient/schedule', (ctx) => {
  const db = store.load();
  const patient = db.patients.find((p) => p.id === ctx.user.patientId);
  const plan = clinical.buildAncPlan(patient);
  const today = clinical.iso(new Date());
  const done = patient.completed || {};
  return ctx.ok({
    today,
    plan: plan.map((item) => Object.assign({}, item, {
      status: done[item.key] ? 'done'
        : item.windowEnd < today ? 'missed'
        : item.windowStart <= today ? 'open'
        : 'upcoming'
    }))
  });
}, 'patient');

route('POST', '/api/patient/schedule/:key/done', (ctx) => {
  const db = store.load();
  const patient = db.patients.find((p) => p.id === ctx.user.patientId);
  patient.completed = patient.completed || {};
  patient.completed[ctx.params.key] = new Date().toISOString();
  store.save();
  return ctx.ok({ completed: patient.completed });
}, 'patient');

route('POST', '/api/patient/logs', (ctx) => {
  const db = store.load();
  const patient = db.patients.find((p) => p.id === ctx.user.patientId);
  const hospital = db.hospitals.find((h) => h.id === patient.hospitalId);
  const b = ctx.body;

  const log = {
    id: store.id('log'),
    patientId: patient.id,
    hospitalId: patient.hospitalId,
    date: clean(b.date, 10) || clinical.iso(new Date()),
    weight: b.weight === '' || b.weight === undefined ? null : Number(b.weight),
    systolic: b.systolic ? Number(b.systolic) : null,
    diastolic: b.diastolic ? Number(b.diastolic) : null,
    fastingSugar: b.fastingSugar ? Number(b.fastingSugar) : null,
    postMealSugar: b.postMealSugar ? Number(b.postMealSugar) : null,
    kicks: b.kicks === '' || b.kicks === undefined ? null : Number(b.kicks),
    symptoms: Array.isArray(b.symptoms) ? b.symptoms.map((s) => clean(s, 40)) : [],
    medicinesTaken: !!b.medicinesTaken,
    medicinesTakenList: Array.isArray(b.medicinesTakenList) ? b.medicinesTakenList.map((m) => clean(m, 80)) : [],
    missedSupplement: !!b.missedSupplement,
    missedCriticalMedicine: !!b.missedCriticalMedicine,
    otherSymptom: clean(b.otherSymptom, 400),
    note: clean(b.note, 500),
    waterMl: b.waterMl ? Number(b.waterMl) : 0,
    photo: null,
    createdAt: new Date().toISOString()
  };

  if (b.photo) {
    try {
      const meta = files.save(b.photo, patient.id);
      log.photo = meta.file;
    } catch (err) {
      return ctx.fail(err.status || 400, err.message);
    }
  }

  db.logs.unshift(log);

  const prescribed = patient.medicines || [];
  if (prescribed.length && Array.isArray(b.medicinesTakenList)) {
    const missed = prescribed.filter((m) => !log.medicinesTakenList.includes(m.id));
    const missedCritical = missed.filter((m) => m.critical);
    log.missedCriticalMedicine = missedCritical.length > 0;
    log.missedSupplement = missed.length > 0 && missedCritical.length === 0;
    log.missedNames = missed.map((m) => m.name);
  }

  const graded = clinical.gradeLog(log, hospital);
  if (log.missedNames && log.missedNames.length && log.missedCriticalMedicine) {
    graded.forEach((a) => {
      if (/critical medicine/i.test(a.reason)) a.detail = 'Not taken: ' + log.missedNames.join(', ');
    });
  }
  if (log.photo) {
    graded.push({ tier: 3, reason: 'Photo uploaded with today\'s log', detail: log.otherSymptom || 'She has sent a picture for you to look at.' });
  } else if (log.otherSymptom) {
    graded.push({ tier: 3, reason: 'Symptom described in her own words', detail: log.otherSymptom });
  }
  const raised = graded
    .filter((a) => a.tier >= 3)
    .map((a) => raiseAlert(db, patient, Object.assign({}, a, { source: 'daily log' })));

  store.save();
  return ctx.ok({
    log,
    alerts: graded,
    raised: raised.length,
    message: raised.length
      ? 'Your hospital has been told about this. If you feel unwell, call them now.'
      : 'Saved.'
  });
}, 'patient');

route('GET', '/api/patient/logs', (ctx) => {
  const db = store.load();
  return ctx.ok({ logs: db.logs.filter((l) => l.patientId === ctx.user.patientId).slice(0, 60) });
}, 'patient');

route('POST', '/api/patient/sos', (ctx) => {
  const db = store.load();
  const patient = db.patients.find((p) => p.id === ctx.user.patientId);
  const hospital = db.hospitals.find((h) => h.id === patient.hospitalId);
  const kind = clean(ctx.body.kind, 20) || 'labour';

  let payload;
  if (kind === 'labour') {
    payload = clinical.labourAlert(patient);
  } else {
    payload = { tier: 4, reason: 'Emergency reported', detail: clean(ctx.body.note, 300) || 'Emergency button used.' };
  }
  const alert = raiseAlert(db, patient, Object.assign({}, payload, { source: 'emergency button' }));
  store.save();

  return ctx.ok({
    alert,
    call: hospital.labourRoomPhone || hospital.phone,
    instruction: payload.preterm
      ? 'Call now and leave for the hospital. Your consultant is being paged.'
      : 'Call now and get ready to leave for the hospital.'
  });
}, 'patient');

route('POST', '/api/patient/children', (ctx) => {
  const db = store.load();
  const patient = db.patients.find((p) => p.id === ctx.user.patientId);
  const name = clean(ctx.body.name, 80) || 'Baby';
  const dob = clean(ctx.body.dob, 10);
  if (!dob) return ctx.fail(400, 'Date of birth is needed.');
  try { clinical.toDate(dob); } catch (err) { return ctx.fail(400, 'That date could not be read.'); }

  const count = db.children.filter((c) => c.patientId === patient.id).length;
  if (count >= 4) return ctx.fail(409, 'You can add up to four children.');

  const child = {
    id: store.id('chd'),
    patientId: patient.id,
    hospitalId: patient.hospitalId,
    label: 'Baby ' + (count + 1),
    name,
    dob,
    birthWeightKg: ctx.body.birthWeightKg ? Number(ctx.body.birthWeightKg) : null,
    // recorded after birth, used only to read the right growth chart
    sex: ctx.body.sex === 'girl' ? 'girl' : ctx.body.sex === 'boy' ? 'boy' : null,
    gestationAtBirthWeeks: ctx.body.gestationAtBirthWeeks ? Number(ctx.body.gestationAtBirthWeeks) : null,
    deliveryMode: clean(ctx.body.deliveryMode, 40),
    paediatrician: clean(ctx.body.paediatrician, 120),
    createdAt: new Date().toISOString()
  };
  db.children.push(child);
  patient.delivered = true;

  db.payments.push({
    id: store.id('pay'),
    hospitalId: patient.hospitalId,
    patientId: patient.id,
    childId: child.id,
    kind: 'child',
    label: 'Child care — ' + child.name,
    amount: CHILD_FEE,
    status: 'pending',
    createdAt: new Date().toISOString()
  });

  store.save();
  return ctx.ok({ child, fee: CHILD_FEE });
}, 'patient');

route('GET', '/api/patient/children/:id', (ctx) => {
  const db = store.load();
  const child = db.children.find((c) => c.id === ctx.params.id && c.patientId === ctx.user.patientId);
  if (!child) return ctx.fail(404, 'Child not found.');
  const hospital = db.hospitals.find((h) => h.id === child.hospitalId);
  const done = child.vaccinesDone || {};
  const today = clinical.iso(new Date());
  const plan = clinical.buildImmunisationPlan(child.dob, hospital.immunisationSchedule).map((row) =>
    Object.assign({}, row, {
      status: done[row.key] ? 'done'
        : row.catchUpBy < today ? 'overdue'
        : row.dueOn <= today ? 'due'
        : 'upcoming'
    }));
  const ageDays = clinical.daysBetween(child.dob, new Date());
  const ageMonths = ageDays / 30.44;
  const latestWeight = (child.growth || []).find((g) => g.weightKg);
  return ctx.ok({
    child,
    ageDays,
    ageMonths: Math.round(ageMonths * 10) / 10,
    growthCheck: clinical.growthCheck(ageMonths, latestWeight ? latestWeight.weightKg : null, child.sex),
    milestones: clinical.milestonesFor(ageMonths),
    milestonesDone: child.milestonesDone || {},
    immunisation: plan,
    schedule: hospital.immunisationSchedule,
    dangerSigns: clinical.NEWBORN_DANGER_SIGNS,
    growth: (child.growth || []).slice(0, 40)
  });
}, 'patient');

route('POST', '/api/patient/children/:id/vaccine', (ctx) => {
  const db = store.load();
  const child = db.children.find((c) => c.id === ctx.params.id && c.patientId === ctx.user.patientId);
  if (!child) return ctx.fail(404, 'Child not found.');
  child.vaccinesDone = child.vaccinesDone || {};
  child.vaccinesDone[clean(ctx.body.key, 20)] = new Date().toISOString();
  store.save();
  return ctx.ok({ vaccinesDone: child.vaccinesDone });
}, 'patient');

route('POST', '/api/patient/children/:id/edit', (ctx) => {
  const db = store.load();
  const child = db.children.find((c) => c.id === ctx.params.id && c.patientId === ctx.user.patientId);
  if (!child) return ctx.fail(404, 'Child not found.');
  ['name', 'deliveryMode', 'paediatrician'].forEach((k) => {
    if (ctx.body[k] !== undefined) child[k] = clean(ctx.body[k], 120);
  });
  if (ctx.body.sex) child.sex = ctx.body.sex === 'girl' ? 'girl' : 'boy';
  if (ctx.body.birthWeightKg) child.birthWeightKg = Number(ctx.body.birthWeightKg);
  if (ctx.body.gestationAtBirthWeeks) child.gestationAtBirthWeeks = Number(ctx.body.gestationAtBirthWeeks);
  store.save();
  return ctx.ok({ child });
}, 'patient');

route('POST', '/api/patient/children/:id/milestone', (ctx) => {
  const db = store.load();
  const child = db.children.find((c) => c.id === ctx.params.id && c.patientId === ctx.user.patientId);
  if (!child) return ctx.fail(404, 'Child not found.');
  const patient = db.patients.find((p) => p.id === ctx.user.patientId);
  child.milestonesDone = child.milestonesDone || {};
  const key = clean(ctx.body.key, 80);
  const done = !!ctx.body.done;
  child.milestonesDone[key] = done;

  let raised = 0;
  if (!done && ctx.body.flag) {
    raiseAlert(db, patient, {
      tier: 3,
      reason: 'Milestone not reached — ' + child.name,
      detail: key,
      source: 'child milestones'
    });
    raised = 1;
  }
  store.save();
  return ctx.ok({ milestonesDone: child.milestonesDone, raised });
}, 'patient');

route('POST', '/api/patient/children/:id/growth', (ctx) => {
  const db = store.load();
  const child = db.children.find((c) => c.id === ctx.params.id && c.patientId === ctx.user.patientId);
  if (!child) return ctx.fail(404, 'Child not found.');
  const patient = db.patients.find((p) => p.id === ctx.user.patientId);

  child.growth = child.growth || [];
  const entry = {
    date: clean(ctx.body.date, 10) || clinical.iso(new Date()),
    weightKg: ctx.body.weightKg ? Number(ctx.body.weightKg) : null,
    lengthCm: ctx.body.lengthCm ? Number(ctx.body.lengthCm) : null,
    headCm: ctx.body.headCm ? Number(ctx.body.headCm) : null,
    feeds: ctx.body.feeds ? Number(ctx.body.feeds) : null,
    nappies: ctx.body.nappies ? Number(ctx.body.nappies) : null,
    temperature: ctx.body.temperature ? Number(ctx.body.temperature) : null,
    note: clean(ctx.body.note, 400),
    dangerSigns: Array.isArray(ctx.body.dangerSigns) ? ctx.body.dangerSigns.map((s) => clean(s, 30)) : []
  };
  child.growth.unshift(entry);

  let raised = 0;
  if (entry.dangerSigns.length) {
    const labels = clinical.NEWBORN_DANGER_SIGNS
      .filter((s) => entry.dangerSigns.includes(s.key))
      .map((s) => s.label).join(', ');
    raiseAlert(db, patient, {
      tier: 4,
      reason: 'Newborn danger sign — ' + child.name,
      detail: labels,
      source: 'child log'
    });
    raised = 1;
  }
  const ageMonths = clinical.daysBetween(child.dob, entry.date) / 30.44;
  const check = clinical.growthCheck(ageMonths, entry.weightKg, child.sex);
  if (entry.weightKg && check.status === 'below') {
    raiseAlert(db, patient, {
      tier: 3,
      reason: 'Weight below the usual range — ' + child.name,
      detail: check.message,
      source: 'child log'
    });
    raised += 1;
  }

  store.save();
  return ctx.ok({
    entry, raised, growthCheck: check,
    message: raised ? 'Your hospital has been told. If you are worried, call them now.' : 'Saved.'
  });
}, 'patient');

route('GET', '/api/patient/notifications', (ctx) => {
  const db = store.load();
  const patient = db.patients.find((p) => p.id === ctx.user.patientId);
  const hospital = db.hospitals.find((h) => h.id === patient.hospitalId);
  const readAt = patient.notificationsReadAt || '1970-01-01';
  const today = clinical.iso(new Date());
  const soon = clinical.iso(clinical.addDays(new Date(), 10));
  const items = [];

  // anything the hospital was alerted about
  db.alerts.filter((a) => a.patientId === patient.id).slice(0, 20).forEach((a) => {
    items.push({
      id: a.id,
      kind: a.tier === 4 ? 'urgent' : 'alert',
      title: a.reason,
      detail: a.detail,
      at: a.createdAt,
      state: a.state
    });
  });

  // what is due or slipping in her own plan
  const done = patient.completed || {};
  clinical.buildAncPlan(patient).forEach((item) => {
    if (done[item.key]) return;
    if (item.windowEnd < today) {
      if (!item.hard) return;
      items.push({
        id: 'plan-' + item.key,
        kind: 'urgent',
        title: item.title + ' window has passed',
        detail: 'This one matters. Call ' + hospital.name + ' to plan what to do.',
        at: item.windowEnd + 'T09:00:00.000Z'
      });
    } else if (item.windowStart <= soon) {
      items.push({
        id: 'plan-' + item.key,
        kind: item.hard ? 'due' : 'reminder',
        title: item.title,
        detail: (item.windowStart <= today ? 'Open now until ' : 'Opens ') +
                (item.windowStart <= today ? item.windowEnd : item.windowStart) +
                (item.prep ? ' · ' + item.prep : ''),
        at: item.windowStart + 'T09:00:00.000Z'
      });
    }
  });

  // vaccines due or overdue for each child
  db.children.filter((c) => c.patientId === patient.id).forEach((child) => {
    const given = child.vaccinesDone || {};
    clinical.buildImmunisationPlan(child.dob, hospital.immunisationSchedule).forEach((row) => {
      if (given[row.key]) return;
      if (row.catchUpBy < today) {
        items.push({
          id: 'vac-' + child.id + '-' + row.key,
          kind: 'urgent',
          title: child.name + ' — vaccines overdue',
          detail: row.items,
          at: row.catchUpBy + 'T09:00:00.000Z'
        });
      } else if (row.dueOn <= soon) {
        items.push({
          id: 'vac-' + child.id + '-' + row.key,
          kind: 'due',
          title: child.name + ' — vaccines due',
          detail: row.age + ' · ' + row.items,
          at: row.dueOn + 'T09:00:00.000Z'
        });
      }
    });
  });

  items.sort((a, b) => String(b.at).localeCompare(String(a.at)));
  // Only things that already happened can be unread. Upcoming reminders sit in
  // the list but never light up the badge, or it would never go quiet.
  const withRead = items.slice(0, 40).map((n) => Object.assign({}, n, {
    unread: (n.kind === 'urgent' || n.kind === 'alert') && String(n.at) > readAt
  }));
  return ctx.ok({ notifications: withRead, unread: withRead.filter((n) => n.unread).length });
}, 'patient');

route('POST', '/api/patient/notifications/read', (ctx) => {
  const db = store.load();
  const patient = db.patients.find((p) => p.id === ctx.user.patientId);
  patient.notificationsReadAt = new Date().toISOString();
  store.save();
  return ctx.ok({ readAt: patient.notificationsReadAt });
}, 'patient');

route('GET', '/api/patient/payments', (ctx) => {
  const db = store.load();
  return ctx.ok({
    payments: db.payments.filter((p) => p.patientId === ctx.user.patientId),
    motherFee: MOTHER_FEE,
    childFee: CHILD_FEE
  });
}, 'patient');


/* ---- what we tell people about their data ------------------------------- */

route('GET', '/api/trust', (ctx) => {
  return ctx.ok({
    encryptedFiles: files.encryptionOn(),
    patient: [
      'Everything you send travels over an encrypted connection. Nobody in between can read it.',
      'Your password is stored scrambled. Even we cannot see it — that is why a reset gives you a new one rather than telling you the old one.',
      'Only your hospital can see your records. No other hospital, and no other patient, ever can.',
      'Your photos and reports are stored encrypted' + (files.encryptionOn() ? '' : ' on secured servers') + ', and only opened by you or your hospital.',
      'Nothing about the sex of an unborn baby is recorded anywhere, as the law requires.',
      'We never sell your information, and we never show advertising.'
    ],
    hospital: [
      'All traffic runs over TLS with HSTS. Plain HTTP is redirected, never served.',
      'Passwords are hashed with scrypt and a per-user salt. They cannot be read back, by us or by anyone with the database.',
      'Uploaded documents and photos are encrypted at rest with AES-256-GCM' + (files.encryptionOn() ? '.' : ' once the encryption key is configured.'),
      'Every hospital is isolated. A login can only reach its own patients, and this is covered by automated tests on every release.',
      'Every alert records who acknowledged it, when, and what was done — your audit trail if a case is ever questioned.',
      'Patient data belongs to the hospital. You can export all of it at any time, and we delete it on request.',
      'Login, signup and activation are rate limited to blunt password guessing.',
      'No field anywhere records the sex of a foetus, in line with the PC-PNDT Act.'
    ]
  });
});

/* ---- shared -------------------------------------------------------------- */

route('POST', '/api/logout', (ctx) => {
  auth.destroySession(ctx.token);
  return ctx.ok({ ok: true });
});

route('GET', '/api/health', (ctx) => ctx.ok({ ok: true, time: new Date().toISOString() }));

/* ------------------------------------------------------------ dispatch -- */

function handle(method, pathname, ctx) {
  for (const r of routes) {
    if (r.method !== method) continue;
    const match = pathname.match(r.regex);
    if (!match) continue;

    ctx.params = {};
    r.keys.forEach((key, i) => { ctx.params[key] = decodeURIComponent(match[i + 1]); });

    if (r.guard) {
      if (!ctx.user) return ctx.fail(401, 'Please log in again.');
      if (ctx.user.role !== r.guard) return ctx.fail(403, 'This is not available for your account.');
    }
    return r.handler(ctx);
  }
  return ctx.fail(404, 'No such endpoint.');
}

module.exports = { handle, MOTHER_FEE, CHILD_FEE };

module.exports.termsFor = termsFor;
module.exports.GRIEVANCE = GRIEVANCE;
