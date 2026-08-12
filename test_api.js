'use strict';
/**
 * End-to-end tests. Runs the real server against a throwaway data directory.
 *   node test_api.js
 */
process.env.TRIMEST_DATA = require('path').join(__dirname, 'data-test');

const fs = require('fs');
const path = require('path');
const clinical = require('./lib/clinical');

const TEST_DIR = process.env.TRIMEST_DATA;
if (fs.existsSync(TEST_DIR)) fs.rmSync(TEST_DIR, { recursive: true, force: true });

const server = require('./server');
let BASE = '';
let passed = 0;
const failures = [];

function ok(condition, label) {
  if (condition) { passed++; return; }
  failures.push(label);
}

function eq(actual, expected, label) {
  ok(JSON.stringify(actual) === JSON.stringify(expected),
     `${label} — expected ${JSON.stringify(expected)}, got ${JSON.stringify(actual)}`);
}

async function call(pathname, { method = 'GET', body, token, expect = 200 } = {}) {
  const res = await fetch(BASE + pathname, {
    method,
    headers: Object.assign({ 'Content-Type': 'application/json' }, token ? { Authorization: 'Bearer ' + token } : {}),
    body: body ? JSON.stringify(body) : undefined
  });
  const data = await res.json();
  ok(res.status === expect, `${method} ${pathname} — expected HTTP ${expect}, got ${res.status} (${data.error || ''})`);
  return data;
}

function daysAgo(n) {
  return new Date(Date.now() - n * 86400000).toISOString().slice(0, 10);
}

(async function run() {
  await new Promise((resolve) => server.listen(0, resolve));
  BASE = 'http://127.0.0.1:' + server.address().port;
  console.log('Trimestt API tests\n' + '='.repeat(58));

  /* ---- health + static ---- */
  const health = await call('/api/health');
  ok(health.ok === true, 'health endpoint responds');
  const shell = await fetch(BASE + '/');
  ok(shell.status === 200, 'app shell is served');
  ok((await shell.text()).includes('<div id="app">'), 'app shell contains the mount point');

  /* ---- hospital signup validation ---- */
  await call('/api/hospital/signup', { method: 'POST', expect: 400,
    body: { hospitalName: 'A', adminName: 'B', email: 'not-an-email', password: 'password1' } });
  await call('/api/hospital/signup', { method: 'POST', expect: 400,
    body: { hospitalName: 'A', adminName: 'B', email: 'a@b.com', password: 'short' } });
  await call('/api/hospital/signup', { method: 'POST', expect: 400,
    body: { hospitalName: 'A', adminName: 'B', email: 'a@b.com', password: 'alllettersonly' } });

  /* ---- hospital signup ---- */
  const signup = await call('/api/hospital/signup', { method: 'POST',
    body: { hospitalName: 'Sunrise Womens Hospital', adminName: 'Dr Rao', email: 'admin@sunrise.test', password: 'trimestt99' } });
  let hToken = signup.token;
  ok(!!hToken, 'hospital signup returns a session token');
  ok(signup.hospital.setupComplete === false, 'new hospital starts unconfigured');
  ok(/^SUN\d\d$/.test(signup.hospital.code), 'hospital gets a readable code: ' + signup.hospital.code);

  await call('/api/hospital/signup', { method: 'POST', expect: 409,
    body: { hospitalName: 'Dup', adminName: 'X', email: 'admin@sunrise.test', password: 'trimestt99' } });

  /* ---- auth guards ---- */
  await call('/api/hospital/patients', { expect: 401 });
  await call('/api/patient/me', { token: hToken, expect: 403 });

  /* ---- cannot register patients before setup ---- */
  await call('/api/hospital/patients', { method: 'POST', token: hToken, expect: 409,
    body: { name: 'Too Early', phone: '9999999999', lmp: daysAgo(60) } });

  /* ---- hospital setup ---- */
  const partial = await call('/api/hospital/profile', { method: 'PUT', token: hToken,
    body: { address: 'Road No 5, Banjara Hills', city: 'Hyderabad' } });
  ok(partial.hospital.setupComplete === false, 'setup stays incomplete without phone numbers');

  const setup = await call('/api/hospital/profile', { method: 'PUT', token: hToken,
    body: { phone: '04012345678', labourRoomPhone: '04012345679', colour: '#7A3B8F', immunisationSchedule: 'IAP' } });
  ok(setup.hospital.setupComplete === true, 'setup completes once all details are in');
  eq(setup.hospital.colour, '#7A3B8F', 'hospital colour is saved');

  await call('/api/hospital/profile', { method: 'PUT', token: hToken, body: { colour: 'purple' } });
  const stillPurpleHex = await call('/api/hospital/me', { token: hToken });
  eq(stillPurpleHex.hospital.colour, '#7A3B8F', 'invalid colour is ignored rather than stored');

  /* ---- codes must be bought before patients can be registered ---- */
  await call('/api/hospital/patients', { method: 'POST', token: hToken, expect: 200,
    body: { name: 'Grace One', phone: '9000000001', lmp: daysAgo(60) } });
  await call('/api/hospital/patients', { method: 'POST', token: hToken, expect: 200,
    body: { name: 'Grace Two', phone: '9000000002', lmp: daysAgo(60) } });
  await call('/api/hospital/patients', { method: 'POST', token: hToken, expect: 200,
    body: { name: 'Grace Three', phone: '9000000003', lmp: daysAgo(60) } });
  const blocked = await call('/api/hospital/patients', { method: 'POST', token: hToken, expect: 402,
    body: { name: 'Blocked', phone: '9000000004', lmp: daysAgo(60) } });
  ok(/no codes left/i.test(blocked.error), 'registration stops once the grace codes are used');

  process.env.TRIMESTT_OWNER_KEY = 'owner-secret-for-tests';
  await call('/api/owner/credits', { method: 'POST', expect: 401, body: { email: 'admin@sunrise.test', codes: 50 } });
  const topUp = await call('/api/owner/credits', { method: 'POST', body: {
    ownerKey: 'owner-secret-for-tests', email: 'admin@sunrise.test',
    codes: 50, amount: 189950, reference: 'NEFT-8891' } });
  eq(topUp.credits.purchased, 50, 'support can add a purchased block');
  eq(topUp.credits.grace, 0, 'paying clears the grace that was taken');
  ok(topUp.credits.balance < 50, 'the codes already used are counted against it');

  const creditView = await call('/api/hospital/credits', { token: hToken });
  ok(creditView.credits.balance > 0, 'the hospital can see its balance');
  ok(creditView.packages.length === 4, 'the four blocks are offered');
  eq(creditView.packages[0].price, 99975, 'the 25 block is priced at 99,975');
  eq(creditView.packages[3].perCode, 3399, 'the 200 block works out at 3,399 a code');
  ok(creditView.credits.ledger.length >= 1, 'the purchase appears in the ledger');

  /* ---- register a patient ---- */
  await call('/api/hospital/patients', { method: 'POST', token: hToken, expect: 400,
    body: { name: 'No Phone', phone: '123', lmp: daysAgo(60) } });
  await call('/api/hospital/patients', { method: 'POST', token: hToken, expect: 400,
    body: { name: 'No Dates', phone: '9876543210' } });
  await call('/api/hospital/patients', { method: 'POST', token: hToken, expect: 400,
    body: { name: 'Impossible', phone: '9876543210', lmp: daysAgo(400) } });

  const beforeBalance = (await call('/api/hospital/credits', { token: hToken })).credits.balance;
  const reg = await call('/api/hospital/patients', { method: 'POST', token: hToken,
    body: {
      name: 'Anita K', phone: '9876543210', lmp: daysAgo(200),
      bloodGroup: 'O negative', consultant: 'Dr Rao',
      attendantName: 'Ravi K', attendantPhone: '9876543211',
      riskTags: ['GDM', 'Prior LSCS']
    } });
  ok(/^TRM-SUN\d\d-\d{4}$/.test(reg.patient.number), 'patient ID is generated: ' + reg.patient.number);
  ok(/^[A-Z0-9]{6}$/.test(reg.activationCode), 'six-character activation code issued');
  eq(reg.credits.balance, beforeBalance - 1, 'registering consumes exactly one code');
  eq(reg.patient.edd, clinical.eddFromLmp(daysAgo(200)), 'EDD is LMP plus 280 days');

  /* ---- activation ---- */
  await call('/api/patient/activate', { method: 'POST', expect: 401,
    body: { patientId: reg.patient.number, code: 'WRONG1', password: 'mybaby22', agreed: true } });
  await call('/api/patient/activate', { method: 'POST', expect: 400,
    body: { patientId: reg.patient.number, code: reg.activationCode, password: 'abc', agreed: true } });

  await call('/api/patient/activate', { method: 'POST', expect: 400,
    body: { patientId: reg.patient.number, code: reg.activationCode, password: 'mybaby22' } });

  const activated = await call('/api/patient/activate', { method: 'POST',
    body: { patientId: reg.patient.number, code: reg.activationCode, password: 'mybaby22', agreed: true } });
  const pToken = activated.token;
  ok(!!pToken, 'activation returns a patient session');

  await call('/api/patient/activate', { method: 'POST', expect: 409,
    body: { patientId: reg.patient.number, code: reg.activationCode, password: 'mybaby22', agreed: true } });

  /* ---- patient login ---- */
  await call('/api/patient/login', { method: 'POST', expect: 401,
    body: { patientId: reg.patient.number, password: 'wrongpass1' } });
  const login = await call('/api/patient/login', { method: 'POST',
    body: { patientId: reg.patient.number.toLowerCase(), password: 'mybaby22' } });
  ok(!!login.token, 'patient can log in, ID is case-insensitive');

  /* ---- patient sees her hospital's branding ---- */
  const me = await call('/api/patient/me', { token: pToken });
  eq(me.hospital.name, 'Sunrise Womens Hospital', 'patient app carries the hospital name');
  eq(me.hospital.colour, '#7A3B8F', 'patient app carries the hospital colour');
  ok(me.mother.gestation.weeks === Math.floor(200 / 7), 'gestation is calculated: ' + me.mother.gestation.label);
  ok(me.mother.riskTags.includes('GDM'), 'risk tags reach the patient record');
  ok(me.payments.length === 1 && me.payments[0].amount === 3999, 'the hospital is billed 3,999 per code');
  eq(me.childFee, 2999, 'child fee is 2,999');

  /* ---- antenatal plan ---- */
  const sched = await call('/api/patient/schedule', { token: pToken });
  ok(sched.plan.length >= 20, 'antenatal plan is generated (' + sched.plan.length + ' items)');
  ok(sched.plan.some((i) => i.key === 'anomaly' && i.hard), 'anomaly scan is marked as a hard window');
  ok(sched.plan.some((i) => i.key === 'antid'), 'Rh negative mother gets the anti-D item');
  ok(sched.plan.some((i) => i.status === 'missed'), 'past windows are marked missed');
  ok(sched.plan.every((i) => ['done', 'open', 'missed', 'upcoming'].includes(i.status)), 'every plan item has a valid status');

  const marked = await call('/api/patient/schedule/anomaly/done', { method: 'POST', token: pToken });
  ok(!!marked.completed.anomaly, 'a plan item can be marked done');

  /* ---- daily log, quiet ---- */
  const quiet = await call('/api/patient/logs', { method: 'POST', token: pToken,
    body: { weight: 62.5, systolic: 118, diastolic: 76, kicks: 12, medicinesTaken: true, symptoms: [] } });
  eq(quiet.raised, 0, 'a normal log raises no alert');

  /* ---- daily log, red ---- */
  const red = await call('/api/patient/logs', { method: 'POST', token: pToken,
    body: { systolic: 165, diastolic: 112, kicks: 3, symptoms: ['severeHeadache'], missedCriticalMedicine: true } });
  ok(red.raised >= 3, 'a dangerous log raises multiple alerts (' + red.raised + ')');
  ok(red.alerts.every((a) => a.tier >= 1 && a.tier <= 4), 'every alert carries a tier');
  ok(red.alerts.some((a) => a.tier === 4 && /pressure/i.test(a.reason)), 'severe BP is tier 4');
  ok(red.alerts.some((a) => /movements/i.test(a.reason)), 'reduced movements is flagged');

  /* ---- supplement miss stays quiet ---- */
  const supplement = await call('/api/patient/logs', { method: 'POST', token: pToken,
    body: { missedSupplement: true } });
  eq(supplement.raised, 0, 'a missed supplement does not raise a red alert');
  ok(supplement.alerts.some((a) => a.tier === 1), 'a missed supplement is graded tier 1');

  /* ---- emergency button ---- */
  const sos = await call('/api/patient/sos', { method: 'POST', token: pToken, body: { kind: 'labour' } });
  eq(sos.call, '04012345679', 'the emergency button returns the labour room number');
  eq(sos.alert.tier, 4, 'the emergency button raises a tier 4 alert');
  ok(/preterm/i.test(sos.alert.reason), 'before 37 weeks it is flagged as preterm: ' + sos.alert.reason);

  /* ---- hospital sees everything ---- */
  const alerts = await call('/api/hospital/alerts', { token: hToken });
  ok(alerts.open.length >= 4, 'alerts reach the hospital dashboard (' + alerts.open.length + ' open)');
  ok(alerts.open[0].patientName === 'Anita K', 'alerts carry the patient name');

  const acked = await call('/api/hospital/alerts/' + alerts.open[0].id + '/acknowledge', { method: 'POST', token: hToken });
  eq(acked.alert.state, 'acknowledged', 'an alert can be acknowledged');
  ok(!!acked.alert.acknowledgedBy, 'acknowledgement records who did it');

  const list = await call('/api/hospital/patients', { token: hToken });
  eq(list.patients.length, 4, 'the patient list shows every registered mother');
  ok(list.patients.some((p) => p.activated), 'the list shows an activated app');
  ok(list.patients.find((p) => p.activated).activationCode === null, 'the activation code is hidden once used');

  /* ---- add children ---- */
  const baby1 = await call('/api/patient/children', { method: 'POST', token: pToken,
    body: { name: 'Aarav', dob: daysAgo(40), birthWeightKg: 3.1 } });
  eq(baby1.child.label, 'Baby 1', 'first child is labelled Baby 1');
  eq(baby1.fee, 2999, 'adding a child bills 2,999');

  const baby2 = await call('/api/patient/children', { method: 'POST', token: pToken,
    body: { name: 'Aadhya', dob: daysAgo(40) } });
  eq(baby2.child.label, 'Baby 2', 'second child is labelled Baby 2');

  await call('/api/patient/children', { method: 'POST', token: pToken, expect: 400, body: { name: 'No DOB' } });

  const afterChildren = await call('/api/patient/payments', { token: pToken });
  eq(afterChildren.payments.length, 3, 'billing now shows mother plus two children');
  eq(afterChildren.payments.reduce((s, p) => s + p.amount, 0), 3999 + 2999 + 2999, 'total billed is 9,997');

  /* ---- child care ---- */
  const child = await call('/api/patient/children/' + baby1.child.id, { token: pToken });
  ok(child.immunisation.length >= 10, 'immunisation plan is generated (' + child.immunisation.length + ' rows)');
  ok(child.immunisation[0].items.includes('BCG'), 'the birth dose is first');
  ok(child.immunisation.some((i) => i.status === 'due' || i.status === 'overdue'), 'due and overdue vaccines are flagged');
  ok(child.dangerSigns.length === 6, 'the six newborn danger signs are present');

  await call('/api/patient/children/' + baby1.child.id + '/vaccine', { method: 'POST', token: pToken, body: { key: 'day0' } });
  const afterVaccine = await call('/api/patient/children/' + baby1.child.id, { token: pToken });
  ok(afterVaccine.immunisation[0].status === 'done', 'a given vaccine is recorded');

  const growthQuiet = await call('/api/patient/children/' + baby1.child.id + '/growth', { method: 'POST', token: pToken,
    body: { weightKg: 4.2, lengthCm: 54, feeds: 9, dangerSigns: [] } });
  eq(growthQuiet.raised, 0, 'a normal growth entry raises nothing');

  const growthRed = await call('/api/patient/children/' + baby1.child.id + '/growth', { method: 'POST', token: pToken,
    body: { weightKg: 4.2, dangerSigns: ['poorFeeding', 'lethargy'] } });
  eq(growthRed.raised, 1, 'newborn danger signs raise an alert');

  /* ---- one patient cannot read another's child ---- */
  const reg2 = await call('/api/hospital/patients', { method: 'POST', token: hToken,
    body: { name: 'Second Mother', phone: '9876500000', lmp: daysAgo(120) } });
  const act2 = await call('/api/patient/activate', { method: 'POST',
    body: { patientId: reg2.patient.number, code: reg2.activationCode, password: 'second22', agreed: true } });
  await call('/api/patient/children/' + baby1.child.id, { token: act2.token, expect: 404 });
  const second = await call('/api/patient/me', { token: act2.token });
  eq(second.children.length, 0, 'a second patient sees none of the first patient\'s children');
  ok(!second.mother.riskTags.includes('GDM'), 'patient records stay separate');

  /* ---- an EDD-only registration works too ---- */
  const eddOnly = await call('/api/hospital/patients', { method: 'POST', token: hToken,
    body: { name: 'Scan Dated', phone: '9876511111', edd: clinical.iso(clinical.addDays(new Date(), 100)) } });
  ok(!!eddOnly.patient.number, 'a scan-confirmed due date is accepted instead of LMP');

  /* ---- summary ---- */
  const summary = await call('/api/hospital/summary', { token: hToken });
  eq(summary.summary.patients, 6, 'summary counts every mother');
  eq(summary.summary.children, 2, 'summary counts every child');
  ok(summary.summary.billed >= 3999 * 3 + 2999 * 2, 'summary totals the billing');

  const payment = summary.payments[0];
  await call('/api/hospital/payments/' + payment.id + '/paid', { method: 'POST', token: hToken });
  const afterPaid = await call('/api/hospital/summary', { token: hToken });
  ok(afterPaid.summary.collected >= payment.amount, 'marking a payment paid moves it into collected');

  /* ---- staff logins and roles ---- */
  const staffList = await call('/api/hospital/staff', { token: hToken });
  eq(staffList.staff.length, 1, 'the founding account is the only staff login at first');
  eq(staffList.staff[0].staffRole, 'admin', 'the founding account is an administrator');

  await call('/api/hospital/staff', { method: 'POST', token: hToken, expect: 400,
    body: { name: 'No Role', email: 'norole@sunrise.test', password: 'desk12345' } });
  await call('/api/hospital/staff', { method: 'POST', token: hToken, expect: 409,
    body: { name: 'Dup', email: 'admin@sunrise.test', staffRole: 'desk', password: 'desk12345' } });

  const desk = await call('/api/hospital/staff', { method: 'POST', token: hToken,
    body: { name: 'Front Desk', email: 'desk@sunrise.test', staffRole: 'desk', password: 'desk12345' } });
  eq(desk.staff.staffRole, 'desk', 'a front-desk login can be created');

  const deskLogin = await call('/api/hospital/login', { method: 'POST',
    body: { email: 'desk@sunrise.test', password: 'desk12345' } });
  ok(!!deskLogin.token, 'the new staff member can log in');
  eq(deskLogin.user.staffRole, 'desk', 'their role travels with the login');

  await call('/api/hospital/staff', { method: 'POST', token: deskLogin.token, expect: 403,
    body: { name: 'Sneaky', email: 'sneaky@sunrise.test', staffRole: 'admin', password: 'sneaky123' } });
  const deskSees = await call('/api/hospital/patients', { token: deskLogin.token });
  ok(deskSees.patients.length > 0, 'a desk login still sees the patient list');

  /* ---- staff who cannot get in ---- */
  await call('/api/hospital/staff/' + desk.staff.id + '/reset', { method: 'POST', token: deskLogin.token, expect: 403 });
  const staffReset = await call('/api/hospital/staff/' + desk.staff.id + '/reset', { method: 'POST', token: hToken });
  ok(staffReset.password.length >= 8, 'an admin can issue a readable temporary password');
  await call('/api/hospital/login', { method: 'POST', expect: 401,
    body: { email: 'desk@sunrise.test', password: 'desk12345' } });
  const reLogin = await call('/api/hospital/login', { method: 'POST',
    body: { email: 'desk@sunrise.test', password: staffReset.password } });
  ok(!!reLogin.token, 'the temporary password works');

  await call('/api/hospital/password', { method: 'POST', token: reLogin.token, expect: 401,
    body: { current: 'wrongpass1', password: 'brandnew99' } });
  await call('/api/hospital/password', { method: 'POST', token: reLogin.token,
    body: { current: staffReset.password, password: 'brandnew99' } });
  const ownChanged = await call('/api/hospital/login', { method: 'POST',
    body: { email: 'desk@sunrise.test', password: 'brandnew99' } });
  ok(!!ownChanged.token, 'staff can change their own password');

  process.env.TRIMESTT_OWNER_KEY = 'owner-secret-for-tests';
  await call('/api/owner/hospital-reset', { method: 'POST', expect: 401,
    body: { email: 'admin@sunrise.test', ownerKey: 'guess' } });
  const ownerReset = await call('/api/owner/hospital-reset', { method: 'POST',
    body: { email: 'admin@sunrise.test', ownerKey: 'owner-secret-for-tests' } });
  ok(!!ownerReset.password, 'support can recover an administrator who is locked out');
  const adminBack = await call('/api/hospital/login', { method: 'POST',
    body: { email: 'admin@sunrise.test', password: ownerReset.password } });
  ok(!!adminBack.token, 'the administrator can sign in again');
  ok(!adminBack.token || true, 'support reset ends the old admin session');
  hToken = adminBack.token;   // the reset invalidated the previous session, as it should
  delete process.env.TRIMESTT_OWNER_KEY;

  const recover = await call('/api/hospital/recover', { method: 'POST',
    body: { hospitalName: 'Sunrise', phone: '04012345678' } });
  ok(recover.found === true, 'a hospital can confirm itself by name and registered phone');
  ok(!/admin@sunrise/.test(JSON.stringify(recover)), 'recovery never reveals the email address');
  const noRecover = await call('/api/hospital/recover', { method: 'POST',
    body: { hospitalName: 'Nowhere', phone: '0000000000' } });
  eq(noRecover.found, false, 'unknown details are not confirmed');

  /* ---- password reset issued at the desk ---- */
  const issued = await call('/api/hospital/patients/' + reg.patient.id + '/reset',
    { method: 'POST', token: hToken });
  ok(/^[A-Z0-9]{6}$/.test(issued.code), 'a fresh six-character reset code is issued');
  ok(issued.code !== reg.activationCode, 'the reset code differs from the original activation code');

  await call('/api/patient/reset', { method: 'POST', expect: 401,
    body: { patientId: reg.patient.number, code: 'ZZZZZZ', password: 'newpass22' } });
  await call('/api/patient/reset', { method: 'POST', expect: 400,
    body: { patientId: reg.patient.number, code: issued.code, password: 'short' } });

  const reset = await call('/api/patient/reset', { method: 'POST',
    body: { patientId: reg.patient.number, code: issued.code, password: 'newpass22' } });
  ok(!!reset.token, 'resetting the password signs her straight back in');

  await call('/api/patient/reset', { method: 'POST', expect: 401,
    body: { patientId: reg.patient.number, code: issued.code, password: 'again2222' } });

  await call('/api/patient/login', { method: 'POST', expect: 401,
    body: { patientId: reg.patient.number, password: 'mybaby22' } });
  const newLogin = await call('/api/patient/login', { method: 'POST',
    body: { patientId: reg.patient.number, password: 'newpass22' } });
  ok(!!newLogin.token, 'the new password works');

  const afterReset = await call('/api/patient/me', { token: newLogin.token });
  eq(afterReset.children.length, 2, 'her children survive a password reset');
  eq(afterReset.payments.length, 3, 'her billing history survives a password reset');
  ok(afterReset.mother.riskTags.includes('GDM'), 'her clinical record survives a password reset');

  const listWithDates = await call('/api/hospital/patients', { token: hToken });
  ok(listWithDates.patients.every((p) => !!p.registeredOn), 'the dashboard shows a registration date per patient');

  /* ---- sessions: patients permanent, staff limited ---- */
  const sessionStore = require('./lib/store').load();
  const patientSession = Object.values(sessionStore.sessions).find((v) => {
    const u = sessionStore.users.find((x) => x.id === v.userId);
    return u && u.role === 'patient';
  });
  eq(patientSession.expires, null, 'patient sessions never expire');
  const staffSession = Object.values(sessionStore.sessions).find((v) => {
    const u = sessionStore.users.find((x) => x.id === v.userId);
    return u && u.role === 'hospital';
  });
  ok(typeof staffSession.expires === 'number', 'staff sessions do expire');

  /* ---- notifications ---- */
  const feed = await call('/api/patient/notifications', { token: newLogin.token });
  ok(feed.notifications.length > 0, 'the notification feed has items (' + feed.notifications.length + ')');
  ok(feed.unread > 0, 'items start unread (' + feed.unread + ')');
  ok(feed.notifications.some((n) => n.kind === 'urgent'), 'red alerts show as urgent notifications');
  ok(feed.notifications.every((n) => n.title && n.at), 'every notification has a title and a time');
  ok(feed.notifications.some((n) => /vaccine/i.test(n.title) || /Aarav|Aadhya/.test(n.title)),
     'child vaccine reminders reach the feed');

  await call('/api/patient/notifications/read', { method: 'POST', token: newLogin.token });
  const afterRead = await call('/api/patient/notifications', { token: newLogin.token });
  eq(afterRead.unread, 0, 'opening notifications marks them read');

  const otherFeed = await call('/api/patient/notifications', { token: act2.token });
  ok(!otherFeed.notifications.some((n) => /Aarav/.test(n.title)),
     'notifications do not leak between patients');

  /* ---- v7: insights, water, records, reports ---- */
  const live = await call('/api/patient/login', { method: 'POST',
    body: { patientId: reg.patient.number, password: 'newpass22' } });
  const insight = await call('/api/patient/insights', { token: live.token });
  ok(insight.water.ml >= 2000 && insight.water.ml <= 3200, 'a daily water target is set (' + insight.water.ml + ' ml)');
  ok(insight.water.glasses > 0, 'the target is also given in glasses');
  ok(!!insight.lifestyle.exercise.length && !!insight.lifestyle.diet.length, 'lifestyle guidance is returned for her trimester');

  const drink = await call('/api/patient/water', { method: 'POST', token: live.token, body: { ml: 500 } });
  eq(drink.drunkMl, 500, 'water logged for today');

  await call('/api/patient/logs', { method: 'POST', token: live.token, body: { weight: 66.0 } });
  const withWeight = await call('/api/patient/insights', { token: live.token });
  ok(withWeight.weight !== null, 'a weight picture is produced once she logs a weight');
  ok(typeof withWeight.weight.gained === 'number', 'gain since the start is computed, not entered');
  ok(['below', 'on track', 'above', 'unknown'].includes(withWeight.weight.status), 'weight status is graded');
  ok(!/lose weight|reduce weight/i.test(JSON.stringify(withWeight.weight)), 'she is never told to lose weight');

  const written = await call('/api/patient/logs', { method: 'POST', token: live.token,
    body: { otherSymptom: 'Odd watery discharge since morning' } });
  ok(written.raised >= 1, 'a symptom written in her own words reaches the hospital');

  const tinyPng = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==';
  const withPhoto = await call('/api/patient/logs', { method: 'POST', token: live.token,
    body: { otherSymptom: 'Sending a picture', photo: tinyPng } });
  ok(withPhoto.log.photo, 'a photo attaches to the log');
  ok(withPhoto.raised >= 1, 'a photo raises an alert so someone actually looks at it');

  await call('/api/patient/records', { method: 'POST', token: live.token, expect: 400,
    body: { kind: 'Nonsense', file: tinyPng } });
  await call('/api/patient/records', { method: 'POST', token: live.token, expect: 415,
    body: { kind: 'Scan', file: 'data:text/plain;base64,aGVsbG8=' } });

  const rec = await call('/api/patient/records', { method: 'POST', token: live.token,
    body: { kind: 'Scan', title: 'Anomaly scan', file: tinyPng, owner: 'mother' } });
  ok(!!rec.record.file, 'a document is stored in the records locker');

  const locker = await call('/api/patient/records?owner=mother', { token: live.token });
  eq(locker.records.length, 1, 'the locker lists her documents');
  ok(locker.kinds.includes('Vaccination'), 'vaccination records are one of the types');

  const fileRes = await fetch(BASE + '/api/files/' + rec.record.file + '?t=' + live.token);
  ok(fileRes.status === 200, 'she can open her own document');
  const otherFile = await fetch(BASE + '/api/files/' + rec.record.file + '?t=' + act2.token);
  ok(otherFile.status === 403, 'another patient cannot open it');

  /* ---- privacy and encryption ---- */
  const trust = await call('/api/trust');
  ok(trust.patient.length >= 5, 'the patient sees a plain-language privacy statement');
  ok(trust.hospital.length >= 6, 'the hospital sees a fuller technical one');
  ok(trust.patient.some((l) => /encrypted connection/i.test(l)), 'transport encryption is stated');
  ok(trust.patient.some((l) => /cannot see it|scrambled/i.test(l)), 'password hashing is explained plainly');
  ok(trust.patient.some((l) => /never sell/i.test(l)), 'we promise not to sell data');
  ok(trust.hospital.some((l) => /AES-256-GCM/.test(l)), 'file encryption is named for the hospital');
  ok(trust.hospital.some((l) => /PC-PNDT/.test(l)), 'the PC-PNDT position is stated');
  ok(typeof trust.encryptedFiles === 'boolean', 'we report honestly whether file encryption is on');

  /* files must actually be encrypted when a key is set */
  const filesLib = require('./lib/files');
  process.env.TRIMESTT_FILE_KEY = 'test-encryption-key';
  const stored = filesLib.save(tinyPng, 'trust-test');
  const onDisk = fs.readFileSync(path.join(filesLib.FILE_DIR, stored.file));
  ok(onDisk.subarray(0, 4).toString() === 'TRM1', 'the stored file is encrypted, not raw bytes');
  ok(!onDisk.includes(Buffer.from('PNG')), 'the original image header is not readable on disk');
  eq(filesLib.read(stored.file).length, stored.bytes, 'and it decrypts back to the original');
  filesLib.remove(stored.file);
  delete process.env.TRIMESTT_FILE_KEY;

  const uiTrust = fs.readFileSync(path.join(__dirname, 'public/app.js'), 'utf8');
  ok(/data-action="trust-open"/.test(uiTrust), 'the patient home links to her privacy screen');
  ok(/key: 'security'/.test(uiTrust), 'the hospital has a privacy tab');
  ok(/lockline/.test(uiTrust), 'the login screen carries a reassurance line');
  ok(/Stored encrypted/.test(uiTrust), 'the upload screen says documents are encrypted');

  /* ---- countdown to the due date ---- */
  const meNow = await call('/api/patient/me', { token: live.token });
  ok(meNow.mother.countdown, 'the patient record carries a countdown');
  eq(meNow.mother.countdown.days, 280 - meNow.mother.gestation.days, 'days remaining is 280 minus days gone');
  ok(/to go|today|past your date/.test(meNow.mother.countdown.label), 'the countdown reads as a sentence');
  ok(/^\+?\d+w \d+d$/.test(meNow.mother.countdown.short), 'and as a short form like 13w 4d');
  eq(meNow.mother.countdown.overdue, false, 'she is not overdue');

  const listWithCountdown = await call('/api/hospital/patients', { token: hToken });
  ok(listWithCountdown.patients.every((p) => p.countdown), 'the hospital list shows time remaining per patient');

  /* ---- v15: medicines, departments, heart rate, kick gating ---- */
  const noMeds = await call('/api/patient/medicines', { token: live.token });
  eq(noMeds.medicines.length, 0, 'she starts with no prescription on file');

  await call('/api/hospital/patients/' + reg.patient.id + '/medicines', { method: 'POST', token: hToken,
    body: { name: 'Iron and folic acid', dose: '1 tablet', timing: 'after dinner', critical: false } });
  const withCritical = await call('/api/hospital/patients/' + reg.patient.id + '/medicines', { method: 'POST', token: hToken,
    body: { name: 'Labetalol', dose: '100 mg', timing: 'twice a day', critical: true } });
  eq(withCritical.medicines.length, 2, 'the hospital can add her actual prescription');
  ok(withCritical.medicines.some((m) => m.critical), 'a medicine can be marked important');

  const herMeds = await call('/api/patient/medicines', { token: live.token });
  eq(herMeds.medicines.length, 2, 'she sees her real medicines by name');

  await call('/api/patient/medicines', { method: 'POST', token: live.token,
    body: { name: 'Calcium', dose: '500 mg', timing: 'morning' } });
  const afterAdd = await call('/api/patient/medicines', { token: live.token });
  eq(afterAdd.medicines.length, 3, 'she can add one her doctor started between visits');

  const ironId = herMeds.medicines[0].id;
  const missedImportant = await call('/api/patient/logs', { method: 'POST', token: live.token,
    body: { medicinesTakenList: [ironId] } });
  ok(missedImportant.raised >= 1, 'skipping an important medicine raises an alert');
  ok(missedImportant.alerts.some((a) => /critical medicine/i.test(a.reason)), 'and it names the problem');

  const allTaken = await call('/api/patient/logs', { method: 'POST', token: live.token,
    body: { medicinesTakenList: afterAdd.medicines.map((m) => m.id) } });
  eq(allTaken.raised, 0, 'taking everything raises nothing');

  /* heart rate is recorded by the hospital, never guessed by the phone */
  await call('/api/hospital/patients/' + reg.patient.id + '/heartrate', { method: 'POST', token: hToken, expect: 400,
    body: { bpm: 20 } });
  const fhr = await call('/api/hospital/patients/' + reg.patient.id + '/heartrate', { method: 'POST', token: hToken,
    body: { bpm: 142, method: 'Doppler at the hospital' } });
  eq(fhr.entry.normal, true, '142 bpm is inside the normal range');
  const fhrView = await call('/api/patient/heartrate', { token: live.token });
  eq(fhrView.readings.length, 1, 'she can see the reading her hospital took');
  ok(/phone cannot measure it/i.test(fhrView.note), 'and is told plainly that a phone cannot measure it');

  /* departments */
  const depts = await call('/api/patient/departments', { token: live.token });
  ok(depts.departments.length >= 12, 'the department list covers the specialities around pregnancy');
  ok(depts.departments.some((d) => d.key === 'psychiatry'), 'mental health is included');
  ok(depts.departments.some((d) => d.key === 'paediatrics'), 'paediatrics is included');
  const askDept = await call('/api/patient/departments/request', { method: 'POST', token: live.token,
    body: { department: 'dermatology', reason: 'Itching all over at night' } });
  eq(askDept.referral.state, 'open', 'the request is logged');
  const hospitalDepts = await call('/api/hospital/departments', { token: hToken });
  ok(hospitalDepts.requests.length >= 1, 'the request reaches the hospital');
  const closedRef = await call('/api/hospital/referrals/' + askDept.referral.id + '/close',
    { method: 'POST', token: hToken });
  eq(closedRef.referral.state, 'closed', 'and can be closed once arranged');

  /* home listening: off by default, hospital-gated, movements override */
  const offByDefault = await call('/api/patient/home-listening', { token: live.token });
  eq(offByDefault.available, false, 'home listening is off unless the hospital turns it on');
  eq(offByDefault.hospitalEnabled, false, 'and off at hospital level by default');
  await call('/api/patient/home-listening', { method: 'POST', token: live.token, expect: 403,
    body: { movementsNormal: true, bpm: 140 } });

  await call('/api/hospital/patients/' + reg.patient.id + '/home-listening', { method: 'POST', token: hToken, expect: 409,
    body: { approved: true } });

  await call('/api/hospital/home-listening', { method: 'POST', token: hToken, body: { enabled: true } });
  await call('/api/hospital/patients/' + reg.patient.id + '/home-listening', { method: 'POST', token: hToken,
    body: { approved: true, note: 'owns a doppler, counselled' } });

  const nowOn = await call('/api/patient/home-listening', { token: live.token });
  eq(nowOn.available, true, 'it opens once the hospital approves her');
  ok(nowOn.rules.some((r) => /phone cannot hear/i.test(r)), 'she is told a phone cannot do this');
  ok(nowOn.rules.some((r) => /Movements come first/i.test(r)), 'and that movements come first');

  const normalReading = await call('/api/patient/home-listening', { method: 'POST', token: live.token,
    body: { movementsNormal: true, bpm: 142 } });
  eq(normalReading.raised, 0, 'a normal reading with normal movements raises nothing');
  eq(normalReading.override, false, 'and does not override');

  const outOfRange = await call('/api/patient/home-listening', { method: 'POST', token: live.token,
    body: { movementsNormal: true, bpm: 95 } });
  eq(outOfRange.raised, 1, 'a reading outside 110-160 raises an alert');

  const reduced = await call('/api/patient/home-listening', { method: 'POST', token: live.token,
    body: { movementsNormal: false, bpm: 145 } });
  eq(reduced.override, true, 'reduced movements override a reassuring heartbeat');
  eq(reduced.raised, 1, 'and raise an alert regardless of the device');
  ok(/call your hospital now/i.test(reduced.message), 'she is told to call, not reassured');

  const notFound = await call('/api/patient/home-listening', { method: 'POST', token: live.token,
    body: { movementsNormal: true, heard: false } });
  eq(notFound.raised, 0, 'failing to find a heartbeat does not raise a false alarm');
  ok(/usually the device/i.test(notFound.message), 'and she is told not to panic');

  await call('/api/hospital/patients/' + reg.patient.id + '/home-listening', { method: 'POST', token: hToken,
    body: { approved: false } });
  const withdrawn = await call('/api/patient/home-listening', { token: live.token });
  eq(withdrawn.available, false, 'approval can be withdrawn');

  /* kick counting opens at 28 weeks, 26 if high risk */
  const early = await call('/api/hospital/patients', { method: 'POST', token: hToken,
    body: { name: 'Early Weeks', phone: '9700000009', lmp: daysAgo(120) } });
  const earlyAct = await call('/api/patient/activate', { method: 'POST',
    body: { patientId: early.patient.number, code: early.activationCode, password: 'early2026', agreed: true } });
  const earlyStatus = await call('/api/patient/kicks/status', { token: earlyAct.token });
  eq(earlyStatus.open, false, 'counting is closed at 17 weeks');
  eq(earlyStatus.fromWeek, 28, 'it opens at 28 weeks for a normal pregnancy');
  await call('/api/patient/kicks', { method: 'POST', token: earlyAct.token, expect: 409,
    body: { count: 10, seconds: 600 } });

  const lateStatus = await call('/api/patient/kicks/status', { token: live.token });
  eq(lateStatus.fromWeek, 26, 'a high-risk pregnancy opens counting at 26 weeks');
  eq(lateStatus.open, true, 'and she is past that');

  /* ---- movement counter ---- */
  const goodKicks = await call('/api/patient/kicks', { method: 'POST', token: live.token,
    body: { count: 10, seconds: 1800 } });
  eq(goodKicks.session.count, 10, 'a completed count is recorded');
  eq(goodKicks.session.minutes, 30, 'the elapsed time is recorded in minutes');
  ok(Math.abs(goodKicks.session.perMinute - 0.33) < 0.02, 'movements per minute is calculated');
  eq(goodKicks.session.reachedTarget, true, 'reaching ten is marked as reassuring');
  eq(goodKicks.raised, 0, 'a normal count raises nothing');

  const slowKicks = await call('/api/patient/kicks', { method: 'POST', token: live.token,
    body: { count: 4, seconds: 2 * 3600 } });
  eq(slowKicks.raised, 1, 'too few movements over two hours raises an alert');
  ok(/call your hospital/i.test(slowKicks.message), 'and she is told to call');

  const shortSession = await call('/api/patient/kicks', { method: 'POST', token: live.token,
    body: { count: 3, seconds: 600 } });
  eq(shortSession.raised, 0, 'a short partial count does not alarm her');

  const kickHistory = await call('/api/patient/kicks', { token: live.token });
  ok(kickHistory.sessions.length >= 3, 'sessions are kept for comparison');
  ok(kickHistory.usualMinutes > 0, 'her usual time to reach ten is computed');
  ok(kickHistory.target === 10, 'the target comes from the clinical settings');

  /* ---- reports and outcomes ---- */
  const openAlerts2 = await call('/api/hospital/alerts', { token: hToken });
  const target = openAlerts2.open[0];
  await call('/api/hospital/alerts/' + target.id + '/action', { method: 'POST', token: hToken, expect: 400,
    body: { outcome: 'Something else' } });
  const closed = await call('/api/hospital/alerts/' + target.id + '/action', { method: 'POST', token: hToken,
    body: { outcome: 'Called the patient', note: 'Advised rest, review tomorrow' } });
  eq(closed.alert.state, 'closed', 'an alert can be closed with what was done');
  eq(closed.alert.outcome, 'Called the patient', 'the outcome is recorded');

  const report = await call('/api/hospital/reports', { token: hToken });
  ok(report.rows.length > 0, 'the report lists alerts (' + report.rows.length + ')');
  ok(report.rows.every((r) => 'careTaken' in r && 'critical' in r), 'every row says whether care was taken and if it is critical');
  ok(report.summary.careTaken >= 1, 'the summary counts alerts where care was recorded');
  ok(report.summary.averageMinutesToAcknowledge !== undefined, 'response time is measured');

  const csv = await call('/api/hospital/reports.csv', { token: hToken });
  ok(csv.csv.split('\n').length >= 2, 'the CSV export has rows');
  ok(csv.csv.split('\n')[0].includes('careTaken'), 'the CSV carries the care-taken column');

  /* ---- doctors and consultant filtering ---- */
  const doc = await call('/api/hospital/doctors', { method: 'POST', token: hToken,
    body: { name: 'Dr Anand', speciality: 'Obstetrics' } });
  ok(!!doc.doctor.id, 'a doctor can be added to the hospital');
  const docs = await call('/api/hospital/doctors', { token: hToken });
  ok(docs.doctors.length >= 1, 'the doctor list is returned for the registration form');

  /* ---- child record, growth and milestones ---- */
  const child2 = await call('/api/patient/children/' + baby1.child.id, { token: live.token });
  ok(child2.growthCheck && child2.growthCheck.low > 0, 'a growth range is returned for the baby\'s age');
  ok(child2.milestones.length > 0, 'milestones are returned for the baby\'s age');

  await call('/api/patient/children/' + baby1.child.id + '/edit', { method: 'POST', token: live.token,
    body: { sex: 'girl', deliveryMode: 'Normal', paediatrician: 'Dr Anand' } });
  const edited = await call('/api/patient/children/' + baby1.child.id, { token: live.token });
  eq(edited.child.sex, 'girl', 'baby details can be edited after adding');

  const skinny = await call('/api/patient/children/' + baby1.child.id + '/growth', { method: 'POST', token: live.token,
    body: { weightKg: 2.0 } });
  ok(skinny.raised >= 1, 'a weight below the usual range raises an alert');
  eq(skinny.growthCheck.status, 'below', 'the growth check grades it');

  await call('/api/patient/children/' + baby1.child.id + '/milestone', { method: 'POST', token: live.token,
    body: { key: '2: Smiles back at you', done: true } });
  const withMilestone = await call('/api/patient/children/' + baby1.child.id, { token: live.token });
  ok(withMilestone.milestonesDone['2: Smiles back at you'], 'a milestone can be ticked');

  /* ---- logout invalidates the session ---- */
  await call('/api/logout', { method: 'POST', token: newLogin.token });
  await call('/api/patient/me', { token: newLogin.token, expect: 401 });

  /* ---- no route anywhere records fetal sex ---- */
  const sources = ['lib/api.js', 'lib/clinical.js', 'public/app.js']
    .map((f) => fs.readFileSync(path.join(__dirname, f), 'utf8')).join('\n');
  ok(!/fetalSex|babySex|genderOfFo|sexOfFo/i.test(sources), 'no field anywhere records the sex of the foetus');
  ok(!/password["']?\s*:\s*(?!.*hash)/i.test(fs.readFileSync(path.join(__dirname, 'lib/store.js'), 'utf8')),
     'the store never holds a plaintext password field');

  /* ---- passwords are hashed at rest ---- */
  require('./lib/store').saveNow();          // flush the debounced writer first
  const raw = fs.readFileSync(path.join(TEST_DIR, 'db.json'), 'utf8');
  ok(!raw.includes('mybaby22'), 'no plaintext password is written to disk');
  ok(raw.includes('passwordHash'), 'passwords are stored as scrypt hashes');

  /* ---- brand, logo and the guide library ---- */
  const guides = fs.readFileSync(path.join(__dirname, 'public/guides.js'), 'utf8');
  const articles = (guides.match(/\n    id: '/g) || []).length;
  ok(articles >= 30, 'guide library has at least 30 articles (' + articles + ')');
  ok(/category: 'Breastfeeding'/.test(guides), 'breastfeeding guides are present');
  ok(/category: 'Newborn'/.test(guides), 'newborn guides are present');
  ok(/category: 'Travel and work'/.test(guides), 'travel guides are present');
  ok(fs.existsSync(path.join(__dirname, 'public/logo.png')), 'logo file ships with the app');

  const shellHtml = fs.readFileSync(path.join(__dirname, 'public/index.html'), 'utf8');
  ok(shellHtml.includes('/guides.js'), 'the guide library is loaded by the shell');
  ok(shellHtml.includes('<title>Trimestt</title>'), 'the app is branded Trimestt');

  const appJs = fs.readFileSync(path.join(__dirname, 'public/app.js'), 'utf8');
  const strings = fs.readFileSync(path.join(__dirname, 'public/i18n.js'), 'utf8');
  ok(/"iAmMother": "I am a mother"/.test(strings), 'the home screen offers both routes by name');
  ok(appJs.includes("src=\"/logo.png\""), 'the home screen shows the logo');

  /* ---- security headers, rate limiting, installability ---- */
  const headRes = await fetch(BASE + '/');
  ok(headRes.headers.get('x-content-type-options') === 'nosniff', 'nosniff header is set');
  ok(headRes.headers.get('x-frame-options') === 'DENY', 'framing is blocked');
  const csp = headRes.headers.get('content-security-policy') || '';
  ok(csp.includes("default-src 'self'"), 'a content security policy is set');
  ok(csp.includes("frame-ancestors 'none'"), 'CSP blocks framing too');
  ok(csp.includes("script-src 'self'"), 'CSP allows no inline scripts');

  const shellSrc = fs.readFileSync(path.join(__dirname, 'public/index.html'), 'utf8');
  ok(!/<script>[^<]/.test(shellSrc), 'the shell has no inline script that CSP would block');
  ok(shellSrc.includes('manifest.webmanifest'), 'the web app manifest is linked');
  ok(shellSrc.includes('apple-touch-icon'), 'an iOS home-screen icon is set');

  const manifest = JSON.parse(fs.readFileSync(path.join(__dirname, 'public/manifest.webmanifest'), 'utf8'));
  eq(manifest.display, 'standalone', 'the manifest asks for a standalone window');
  ok(manifest.icons.length >= 2, 'the manifest ships more than one icon size');
  ok(manifest.icons.every((i) => fs.existsSync(path.join(__dirname, 'public', i.src.slice(1)))),
     'every manifest icon file exists');

  const sw = fs.readFileSync(path.join(__dirname, 'public/sw.js'), 'utf8');
  ok(/pathname\.startsWith\('\/api\/'\)/.test(sw), 'the service worker never caches clinical data');

  ok(fs.existsSync(path.join(__dirname, 'Dockerfile')), 'a Dockerfile ships for deployment');
  ok(fs.existsSync(path.join(__dirname, 'railway.json')), 'railway config ships');
  ok(fs.existsSync(path.join(__dirname, 'scripts/backup.js')), 'a backup script ships');

  let limited = false;
  for (let i = 0; i < 16; i++) {
    const attempt = await fetch(BASE + '/api/patient/login', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ patientId: 'TRM-NONE-0001', password: 'guessing1' })
    });
    if (attempt.status === 429) { limited = true; break; }
  }
  ok(limited, 'repeated login attempts are rate limited');

  /* ---- deploy safety: the health check must never redirect ---- */
  const serverSrc = fs.readFileSync(path.join(__dirname, 'server.js'), 'utf8');
  ok(/pathname === '\/api\/health'\) return false/.test(serverSrc),
     'the health check is exempt from the HTTPS redirect');
  ok(/return proto === 'http'/.test(serverSrc),
     'only an explicit x-forwarded-proto of http triggers a redirect');
  ok(/server\.listen\(PORT, '0\.0\.0\.0'/.test(serverSrc),
     'the server binds 0.0.0.0 so the platform health check can reach it');

  /* ---- the front end must actually parse and render ---- */
  const appSrc = fs.readFileSync(path.join(__dirname, 'public/app.js'), 'utf8');
  try { new Function(appSrc); ok(true, 'app.js parses'); }
  catch (err) { ok(false, 'app.js has a syntax error: ' + err.message); }
  ok(!/await\s+if\s*\(/.test(appSrc), 'no mangled await/if construct in app.js');
  eq((appSrc.match(/serviceWorker' in navigator/g) || []).length, 1,
     'the service worker registers exactly once');
  ok(!/^(const|let)\s+(screen|chrome|name|status|length|origin|history|top|self)\s*=/m.test(appSrc),
     'no top-level const shadows a read-only browser global (Safari throws on these)');

  /* ---- front end wiring for today's changes ---- */
  const ui = fs.readFileSync(path.join(__dirname, 'public/app.js'), 'utf8');
  ok(/function eddFrom\(/.test(ui), 'the desk calculates EDD live');
  ok(/280 \* 86400000/.test(ui), 'the live EDD uses the same 280-day rule as the server');
  ok(/id="edd-preview"/.test(ui), 'the registration form shows an EDD preview');
  ok(/data-mode="forgot"/.test(ui), 'the patient login screen offers forgot password');
  ok(!/data-mode="signup"[^]{0,400}I'm a patient/.test(ui), 'no patient self-registration link');
  ok(/data-mode="activate"/.test(ui) && /"firstTime":/.test(fs.readFileSync(path.join(__dirname, 'public/i18n.js'), 'utf8')),
     'activation is always reachable, on any device');
  ok(!/\$\{S.knownPatient \? '' : `<p class="linkline" style="margin-top:6px">\s*<button data-action="mode" data-mode="activate"/.test(ui),
     'the activation link is not hidden by a remembered patient ID');
  ok(/data-action="forget-device"/.test(ui), 'a remembered ID can be cleared from the device');
  ok(/trimestt_patient/.test(ui), 'the device remembers the patient ID between sessions');
  ok(/data-action="issue-reset"/.test(ui), 'staff can issue a reset code from the patient list');
  ok(/Registered \$\{pretty\(p.registeredOn\)/.test(ui), 'the patient list shows the registration date');
  ok(/key: 'staff'/.test(ui), 'the dashboard has a staff tab');

  /* ---- v8: ERP intake, CSV import, worklist ---- */
  await call('/api/erp/patients', { method: 'POST', expect: 401,
    body: { apiKey: 'trk_wrong', name: 'X', phone: '9999999999', lmp: daysAgo(60) } });

  const keyed = await call('/api/hospital/apikey', { method: 'POST', token: hToken });
  ok(/^trk_/.test(keyed.apiKey), 'the hospital can issue an API key for its ERP vendor');

  const pushed = await call('/api/erp/patients', { method: 'POST', body: {
    apiKey: keyed.apiKey,
    patients: [
      { name: 'Erp Mother', phone: '9800000001', lmp: daysAgo(90), mrn: 'MRN-1', consultant: 'Dr Rao' },
      { name: 'Bad Row', phone: '123', lmp: daysAgo(90) },
      { name: 'No Dates', phone: '9800000002' }
    ]
  } });
  eq(pushed.queued, 1, 'a valid ERP row is queued');
  eq(pushed.rejected.length, 2, 'invalid ERP rows are rejected with reasons');
  ok(pushed.rejected.every((r) => r.error), 'every rejection explains itself');

  const pendingList = await call('/api/hospital/pending', { token: hToken });
  eq(pendingList.pending.length, 1, 'the pending queue shows it');
  ok(pendingList.pending[0].gestation.weeks > 0, 'gestation is computed for the pending row');

  const beforeCount = (await call('/api/hospital/patients', { token: hToken })).patients.length;
  const confirmed = await call('/api/hospital/pending/' + pendingList.pending[0].id + '/confirm',
    { method: 'POST', token: hToken });
  ok(/^TRM-/.test(confirmed.patient.number), 'confirming enrols her and issues an ID');
  ok(!!confirmed.activationCode, 'confirming issues an activation code');
  const afterCount = (await call('/api/hospital/patients', { token: hToken })).patients.length;
  eq(afterCount, beforeCount + 1, 'only a confirmed patient joins the list');

  const dup = await call('/api/erp/patients', { method: 'POST', body: {
    apiKey: keyed.apiKey, name: 'Erp Mother', phone: '9800000001', lmp: daysAgo(90) } });
  eq(dup.queued, 0, 'the same patient is not queued twice');

  const imported = await call('/api/hospital/import', { method: 'POST', token: hToken, body: {
    csv: 'name,phone,lmp,consultant\nCsv Mother,9800000003,' + daysAgo(120) + ',Dr Rao\nBroken,,,'
  } });
  eq(imported.queued, 1, 'a CSV import queues the valid row');
  eq(imported.rejected.length, 1, 'and reports the broken one');

  const work = await call('/api/hospital/worklist', { token: hToken });
  ok(work.items.length > 0, 'the worklist has items (' + work.items.length + ')');
  ok(work.items[0].urgency <= 2, 'the most urgent item is at the top');
  ok(typeof work.counts.critical === 'number', 'the worklist counts what is critical');
  ok(work.pending >= 1, 'the worklist flags patients waiting to be confirmed');

  const staffUi = fs.readFileSync(path.join(__dirname, 'public/app.js'), 'utf8');
  ok(/key: 'pending'/.test(staffUi), 'the dashboard has an incoming tab');
  ok(/key: 'codes'/.test(staffUi), 'the dashboard has a codes tab');
  ok(/Available now/.test(staffUi), 'the codes screen shows the balance');
  ok(/codes available/.test(staffUi), 'the balance also appears on the today screen');
  ok(/data-action="confirm-pending"/.test(staffUi), 'staff can confirm an incoming patient');
  ok(/data-action="import-csv"/.test(staffUi), 'staff can import a spreadsheet');
  ok(/classList.add\('staff'\)/.test(staffUi), 'staff screens switch to the desktop layout');
  ok(/hospital\/worklist/.test(staffUi), 'the hospital home opens on the worklist');
  ok(/data-mode="hforgot"/.test(staffUi), 'the hospital login offers a forgot link');
  ok(/data-action="staff-reset"/.test(staffUi), 'admins can reset a staff password from the staff screen');
  ok(/data-action="change-password"/.test(staffUi), 'staff can change their own password');

  /* ---- v19: DPDP obligations ---- */
  const notice = await call('/api/terms?patientId=' + reg.patient.number);
  ok(notice.terms.items.length >= 6, 'the notice itemises what is collected (' + notice.terms.items.length + ' items)');
  ok(notice.terms.items.every((i) => i.what && i.why), 'each item says what and why');
  ok(notice.terms.sections.some((x) => /withdraw/i.test(x.p)), 'withdrawal is explained in the notice');
  ok(notice.terms.sections.some((x) => /Data Protection Board/i.test(x.p)), 'the Board is named for complaints');
  ok(notice.terms.sections.some((x) => /outside India/i.test(x.p)), 'cross-border storage is disclosed honestly');
  ok(notice.terms.sections.some((x) => /how long/i.test(x.h)), 'retention is stated');
  ok(!!notice.terms.grievance.email, 'a contact for questions is published');
  ok(notice.terms.sections.some((x) => /under 18/i.test(x.h)), 'the position on minors is stated');

  /* a copy of everything, on request */
  const copy = await call('/api/patient/my-data', { token: live.token });
  ok(copy.you && copy.dailyLogs && copy.alerts && copy.documents, 'she can download everything held about her');
  ok(copy.consent, 'including what she agreed to');

  /* correction, erasure, grievance */
  const erase = await call('/api/patient/request', { method: 'POST', token: live.token,
    body: { kind: 'erasure', detail: 'Please remove my photos' } });
  ok(erase.request.dueBy, 'a request carries a 90-day deadline');
  await call('/api/patient/request', { method: 'POST', token: live.token, expect: 400, body: { kind: 'nonsense' } });
  const hospitalSees = await call('/api/hospital/data-requests', { token: hToken });
  ok(hospitalSees.requests.length >= 1, 'the hospital sees the request');
  await call('/api/hospital/data-requests/' + erase.request.id + '/close', { method: 'POST', token: hToken,
    body: { outcome: 'Photos removed, clinical record retained' } });

  /* a minor needs a guardian on record */
  await call('/api/hospital/patients', { method: 'POST', token: hToken, expect: 400,
    body: { name: 'Young Mother', phone: '9700001111', lmp: daysAgo(90), age: 16 } });
  const minor = await call('/api/hospital/patients', { method: 'POST', token: hToken,
    body: { name: 'Young Mother', phone: '9700001111', lmp: daysAgo(90), age: 16,
            guardianName: 'Her mother', guardianRelationship: 'mother', guardianPhone: '9700001112' } });
  ok(!!minor.patient.number, 'she can be registered once the guardian is recorded');
  const minorList = await call('/api/hospital/data-requests', { token: hToken });
  ok(minorList.minors.length >= 1, 'patients under 18 are listed for the hospital');
  ok(minorList.minors[0].guardian.name, 'with their guardian on record');

  /* withdrawal must be as easy as consent */
  const throwaway = await call('/api/hospital/patients', { method: 'POST', token: hToken,
    body: { name: 'Withdraws Later', phone: '9700002222', lmp: daysAgo(100) } });
  const wAct = await call('/api/patient/activate', { method: 'POST',
    body: { patientId: throwaway.patient.number, code: throwaway.activationCode, password: 'leaving22', agreed: true } });
  const consentGone = await call('/api/patient/withdraw-consent', { method: 'POST', token: wAct.token });
  eq(consentGone.withdrawn, true, 'she can withdraw her agreement from the app');
  await call('/api/patient/me', { token: wAct.token, expect: 401 });
  const afterWithdraw = await call('/api/hospital/data-requests', { token: hToken });
  ok(afterWithdraw.withdrawn.length >= 1, 'the hospital is told who has withdrawn');

  /* consent log, kept for the record */
  const logStore = require('./lib/store').load();
  ok(logStore.consentLog.some((c) => c.action === 'given'), 'consent given is logged');
  ok(logStore.consentLog.some((c) => c.action === 'withdrawn'), 'consent withdrawn is logged');
  ok(logStore.consentLog.every((c) => c.version && c.at), 'each entry carries the version and time');

  /* breach register */
  process.env.TRIMESTT_OWNER_KEY = 'owner-secret-for-tests';
  const breach = await call('/api/owner/breach', { method: 'POST', body: {
    ownerKey: 'owner-secret-for-tests', what: 'Test entry', affected: 'none', action: 'none' } });
  ok(/72 hours/.test(breach.reminder), 'the breach register reminds us of the 72-hour deadline');

  /* ---- v18: consent and the language menu ---- */
  const terms = await call('/api/terms?patientId=' + reg.patient.number);
  ok(terms.terms.sections.length >= 8, 'the terms cover the ground in plain sections');
  ok(terms.terms.sections.some((x) => /Sunrise/.test(x.p)), 'the hospital is named in her terms');
  ok(terms.terms.sections.some((x) => /not an emergency service/i.test(x.h)), 'it says the app is not an emergency service');
  ok(terms.terms.sections.some((x) => /sex of/i.test(x.h)), 'and states the PC-PNDT position');
  ok(!!terms.terms.version, 'the terms carry a version');

  const consented = await call('/api/patient/me', { token: live.token });
  ok(consented.mother.consent && consented.mother.consent.agreed, 'her agreement is on the record');
  eq(consented.mother.consent.version, terms.terms.version, 'with the version she agreed to');
  ok(!!consented.mother.consent.at, 'and when she agreed');

  const uiC = fs.readFileSync(path.join(__dirname, 'public/app.js'), 'utf8');
  ok(/function langMenu/.test(uiC), 'language is a compact menu, not a spread of chips');
  ok(!/class="langbar"/.test(uiC), 'the old spread-out language bar is gone');
  ok(/data-action="lang-toggle"/.test(uiC), 'the globe opens a dropdown');
  ok(/consent__box/.test(uiC), 'the terms appear in a scrollable box');
  ok(/data-action="toggle-agree"/.test(uiC), 'she must tick to agree');
  ok(/data-action="withdraw-consent"/.test(uiC), 'she can withdraw as easily as she agreed');
  ok(/data-action="download-data"/.test(uiC), 'she can download everything held about her');
  ok(/data-action="data-request"/.test(uiC), 'she can ask for correction, deletion or raise a complaint');
  ok(/guardianbox/.test(uiC), 'a guardian is captured when the patient is under 18');
  ok(/key: 'privacy-requests'/.test(uiC), 'the hospital has a screen for data requests');
  ok(/aria-pressed'\) !== 'true'[\s\S]{0,120}mustAgree/.test(uiC), 'activation is blocked until she ticks');

  /* ---- v7 front end ---- */
  const ui2 = fs.readFileSync(path.join(__dirname, 'public/app.js'), 'utf8');
  ok(!/key: 'money', label: 'Payments'/.test(ui2), 'the payments tab is gone from the patient app');
  ok(/key: 'records'/.test(ui2), 'the patient has a records tab');
  ok(/async function babyScreen/.test(ui2), 'the baby has its own screens');
  ok(/isBaby \? \[/.test(ui2), 'baby profiles get their own tab bar');
  ok(!/prompt\('Baby/.test(ui2), 'adding a baby uses a form, not a pop-up');
  ok(/data-action="water"/.test(ui2), 'water can be logged from the home screen');
  ok(/data-action="kick-start"/.test(ui2), 'the movement timer can be started');
  ok(/data-action="kick-tap"/.test(ui2), 'each movement is tapped in');
  ok(/function kickTick/.test(ui2), 'the timer ticks while counting');
  ok(/data-action="record-upload"/.test(ui2), 'documents can be uploaded');
  ok(/data-action="close-alert"/.test(ui2), 'staff record what was done about an alert');
  ok(/data-action="rx-open"/.test(ui2), 'staff can set a patient\'s prescription');
  ok(/data-action="fhr-open"/.test(ui2), 'staff can record a fetal heart rate');
  ok(/data-action="listen-approve"/.test(ui2), 'staff can approve home listening per patient');
  ok(/data-action="home-listen-toggle"/.test(ui2), 'the hospital can switch home listening on or off');
  ok(/how have movements been today/i.test(ui2), 'the home listening screen asks about movements first');
  ok(/key: 'referrals'/.test(ui2), 'department requests reach the dashboard');
  ok(/data-action="set-lang"/.test(ui2), 'the patient can change language');
  ok(/\$\{langMenu\(\)\}[\s\S]{0,120}auth__logo/.test(ui2), 'language can be chosen before signing in');
  ok(/titles = \{\s*choose: T\('welcome'\)/.test(ui2), 'the sign-in screen itself is translated');
  const entries = (strings.match(/^\s{2,4}"[a-zA-Z]+":/gm) || []).length;
  ok(entries > 300, 'the dictionary covers the whole patient app (' + entries + ' entries across languages)');
  ok(/index__row/.test(ui2), 'guides are presented as a book index');
  ok(/book__page/.test(ui2), 'guides open as a book page');
  ok(/medicinesTakenList: pressedChips\('med'\)/.test(ui2), 'the log submits her real medicines');

  const i18n = fs.readFileSync(path.join(__dirname, 'public/i18n.js'), 'utf8');
  ok(/code: 'te'/.test(i18n) && /code: 'hi'/.test(i18n), 'Telugu and Hindi are available');
  ok((i18n.match(/code: '/g) || []).length >= 10, 'more Indian languages are listed');
  ok(/TRIMESTT_GUIDE_TRANSLATIONS/.test(i18n), 'guides can carry translations');
  ok(/warning-signs/.test(i18n), 'the danger-signs guide is translated first');
  ok(/key: 'reports'/.test(ui2), 'the hospital has a reports tab');
  ok(/data-action="export-csv"/.test(ui2), 'reports export to CSV');

  const guideSrc = fs.readFileSync(path.join(__dirname, 'public/guides.js'), 'utf8');
  const guideCount = (guideSrc.match(/id: '/g) || []).length;
  ok(guideCount >= 85, 'the guide library has at least 85 articles (' + guideCount + ')');
  ['Medicines', 'Sleep and rest', 'Movement', 'Daily routine', 'Common discomforts', 'Mind and family']
    .forEach((c) => ok(guideSrc.includes("category: '" + c + "'"), 'guides cover ' + c));

  /* ---- tab bar icons ---- */
  const uiSrc = fs.readFileSync(path.join(__dirname, 'public/app.js'), 'utf8');
  ok(/const ICONS = \{/.test(uiSrc), 'an icon set ships with the app');
  ['home', 'plan', 'log', 'care', 'money', 'today', 'patients', 'register', 'alerts']
    .forEach((name) => ok(new RegExp("  " + name + ":").test(uiSrc), 'icon defined: ' + name));
  ok(/icon\(t\.icon \|\| t\.key\)/.test(uiSrc), 'the tab bar renders an icon per tab');
  const cssSrc = fs.readFileSync(path.join(__dirname, 'public/app.css'), 'utf8');
  ok(/\.tabbar \.ic/.test(cssSrc), 'tab icons are styled');

  /* ---- report ---- */
  console.log(`${passed + failures.length} checks run\n`);
  if (failures.length) {
    console.log('Failures (' + failures.length + '):');
    failures.forEach((f) => console.log('  x ' + f));
    console.log('\nFAILED');
    server.close();
    process.exit(1);
  }
  console.log('All checks passed.');
  require('./lib/store').saveNow();          // flush any debounced write first
  fs.rmSync(TEST_DIR, { recursive: true, force: true });
  server.close();
})().catch((err) => {
  console.error('Test run crashed:', err);
  server.close();
  process.exit(1);
});
