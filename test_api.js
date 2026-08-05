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
  const hToken = signup.token;
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

  /* ---- register a patient ---- */
  await call('/api/hospital/patients', { method: 'POST', token: hToken, expect: 400,
    body: { name: 'No Phone', phone: '123', lmp: daysAgo(60) } });
  await call('/api/hospital/patients', { method: 'POST', token: hToken, expect: 400,
    body: { name: 'No Dates', phone: '9876543210' } });
  await call('/api/hospital/patients', { method: 'POST', token: hToken, expect: 400,
    body: { name: 'Impossible', phone: '9876543210', lmp: daysAgo(400) } });

  const reg = await call('/api/hospital/patients', { method: 'POST', token: hToken,
    body: {
      name: 'Anita K', phone: '9876543210', lmp: daysAgo(200),
      bloodGroup: 'O negative', consultant: 'Dr Rao',
      attendantName: 'Ravi K', attendantPhone: '9876543211',
      riskTags: ['GDM', 'Prior LSCS']
    } });
  ok(/^TRM-SUN\d\d-0001$/.test(reg.patient.number), 'patient ID is generated: ' + reg.patient.number);
  ok(/^[A-Z0-9]{6}$/.test(reg.activationCode), 'six-character activation code issued');
  eq(reg.patient.edd, clinical.eddFromLmp(daysAgo(200)), 'EDD is LMP plus 280 days');

  /* ---- activation ---- */
  await call('/api/patient/activate', { method: 'POST', expect: 401,
    body: { patientId: reg.patient.number, code: 'WRONG1', password: 'mybaby22' } });
  await call('/api/patient/activate', { method: 'POST', expect: 400,
    body: { patientId: reg.patient.number, code: reg.activationCode, password: 'abc' } });

  const activated = await call('/api/patient/activate', { method: 'POST',
    body: { patientId: reg.patient.number, code: reg.activationCode, password: 'mybaby22' } });
  const pToken = activated.token;
  ok(!!pToken, 'activation returns a patient session');

  await call('/api/patient/activate', { method: 'POST', expect: 409,
    body: { patientId: reg.patient.number, code: reg.activationCode, password: 'mybaby22' } });

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
  ok(me.payments.length === 1 && me.payments[0].amount === 4999, 'mother is billed 4,999 at registration');
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
  eq(list.patients.length, 1, 'the patient list shows one mother');
  ok(list.patients[0].activated === true, 'the list shows her app as active');
  ok(list.patients[0].activationCode === null, 'the activation code is hidden once used');

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
  eq(afterChildren.payments.reduce((s, p) => s + p.amount, 0), 4999 + 2999 + 2999, 'total billed is 10,997');

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
    body: { patientId: reg2.patient.number, code: reg2.activationCode, password: 'second22' } });
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
  eq(summary.summary.patients, 3, 'summary counts every mother');
  eq(summary.summary.children, 2, 'summary counts every child');
  ok(summary.summary.billed >= 4999 * 3 + 2999 * 2, 'summary totals the billing');

  const payment = summary.payments[0];
  await call('/api/hospital/payments/' + payment.id + '/paid', { method: 'POST', token: hToken });
  const afterPaid = await call('/api/hospital/summary', { token: hToken });
  ok(afterPaid.summary.collected >= payment.amount, 'marking a payment paid moves it into collected');

  /* ---- notifications ---- */
  const feed = await call('/api/patient/notifications', { token: pToken });
  ok(feed.notifications.length > 0, 'the notification feed has items (' + feed.notifications.length + ')');
  ok(feed.unread > 0, 'items start unread (' + feed.unread + ')');
  ok(feed.notifications.some((n) => n.kind === 'urgent'), 'red alerts show as urgent notifications');
  ok(feed.notifications.every((n) => n.title && n.at), 'every notification has a title and a time');
  ok(feed.notifications.some((n) => /vaccine/i.test(n.title) || /Aarav|Aadhya/.test(n.title)),
     'child vaccine reminders reach the feed');

  await call('/api/patient/notifications/read', { method: 'POST', token: pToken });
  const afterRead = await call('/api/patient/notifications', { token: pToken });
  eq(afterRead.unread, 0, 'opening notifications marks them read');

  const otherFeed = await call('/api/patient/notifications', { token: act2.token });
  ok(!otherFeed.notifications.some((n) => /Aarav/.test(n.title)),
     'notifications do not leak between patients');

  /* ---- logout invalidates the session ---- */
  await call('/api/logout', { method: 'POST', token: pToken });
  await call('/api/patient/me', { token: pToken, expect: 401 });

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
  ok(appJs.includes('I am a mother') && appJs.includes('I am a hospital'),
     'the home screen offers both routes by name');
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
