'use strict';
const store = require('./store');
const auth = require('./auth');
const clinical = require('./clinical');

const MOTHER_FEE = 4999;
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
    attendantName: patient.attendantName,
    attendantPhone: patient.attendantPhone,
    gestation: g,
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
    logo: '', colour: '#9A7CC0',
    immunisationSchedule: 'IAP',
    thresholds: Object.assign({}, clinical.DEFAULT_THRESHOLDS),
    setupComplete: false,
    createdAt: new Date().toISOString()
  };
  db.hospitals.push(hospital);

  const user = {
    id: store.id('usr'),
    role: 'hospital',
    hospitalId: hospital.id,
    name: adminName,
    email,
    passwordHash: auth.hashPassword(password),
    createdAt: new Date().toISOString()
  };
  db.users.push(user);
  store.save();

  return ctx.ok({ token: auth.createSession(user.id), hospital: publicHospital(hospital), user: pick(user, ['id', 'name', 'role']) });
});

route('POST', '/api/hospital/login', (ctx) => {
  const db = store.load();
  const email = clean(ctx.body.email).toLowerCase();
  const user = db.users.find((u) => u.role === 'hospital' && u.email === email);
  if (!user || !auth.verifyPassword(String(ctx.body.password || ''), user.passwordHash)) {
    return ctx.fail(401, 'Email or password is wrong.');
  }
  const hospital = db.hospitals.find((h) => h.id === user.hospitalId);
  return ctx.ok({ token: auth.createSession(user.id), hospital: publicHospital(hospital), user: pick(user, ['id', 'name', 'role']) });
});

route('GET', '/api/hospital/me', (ctx) => {
  const db = store.load();
  const hospital = db.hospitals.find((h) => h.id === ctx.user.hospitalId);
  return ctx.ok({ hospital: publicHospital(hospital), user: pick(ctx.user, ['id', 'name', 'role']) });
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
    label: 'Mother care — ' + patient.name,
    amount: MOTHER_FEE,
    status: 'pending',
    createdAt: new Date().toISOString()
  });

  store.save();
  return ctx.ok({
    patient: { id: patient.id, number: patient.number, name: patient.name, edd: patient.edd },
    activationCode: code,
    message: 'Give the patient her ID and this activation code. She sets her own password.'
  });
}, 'hospital');

route('GET', '/api/hospital/patients', (ctx) => {
  const db = store.load();
  const list = db.patients
    .filter((p) => p.hospitalId === ctx.user.hospitalId)
    .map((p) => {
      const g = clinical.gestation(p.lmp);
      const openAlerts = db.alerts.filter((a) => a.patientId === p.id && a.state === 'open');
      const children = db.children.filter((c) => c.patientId === p.id);
      return {
        id: p.id, number: p.number, name: p.name, phone: p.phone,
        edd: p.edd, gestation: g, riskTags: p.riskTags,
        activated: p.activated, delivered: p.delivered,
        activationCode: p.activated ? null : p.activationCode,
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
      collected: payments.filter((p) => p.status === 'paid').reduce((sum, p) => sum + p.amount, 0)
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

  return ctx.ok({ token: auth.createSession(user.id), number: patient.number });
});

route('POST', '/api/patient/login', (ctx) => {
  const db = store.load();
  const number = clean(ctx.body.patientId, 30).toUpperCase();
  const user = db.users.find((u) => u.role === 'patient' && u.number === number);
  if (!user || !auth.verifyPassword(String(ctx.body.password || ''), user.passwordHash)) {
    return ctx.fail(401, 'Patient ID or password is wrong.');
  }
  return ctx.ok({ token: auth.createSession(user.id), number });
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
    missedSupplement: !!b.missedSupplement,
    missedCriticalMedicine: !!b.missedCriticalMedicine,
    note: clean(b.note, 500),
    createdAt: new Date().toISOString()
  };
  db.logs.unshift(log);

  const graded = clinical.gradeLog(log, hospital);
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
  return ctx.ok({
    child,
    ageDays: clinical.daysBetween(child.dob, new Date()),
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
    feeds: ctx.body.feeds ? Number(ctx.body.feeds) : null,
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
  store.save();
  return ctx.ok({
    entry,
    raised,
    message: raised ? 'Call your hospital now. They have been alerted.' : 'Saved.'
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
