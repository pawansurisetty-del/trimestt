'use strict';
/* Trimestt app. One file, no framework. Screens render to strings, then get
   wired by data-action attributes. */

const S = {
  token: localStorage.getItem('trimestt_token') || '',
  role: localStorage.getItem('trimestt_role') || '',
  knownPatient: localStorage.getItem('trimestt_patient') || '',
  view: 'auth',
  authMode: localStorage.getItem('trimestt_patient') ? 'patient' : 'choose',
  tab: 'home',
  profile: 'mother',
  guideCat: 'All',
  guideId: null,
  me: null,
  hospital: null,
  cache: {}
};

const $ = (sel) => document.querySelector(sel);
const view = () => $('#screen');

/* ------------------------------------------------------------- helpers -- */

function esc(value) {
  return String(value === undefined || value === null ? '' : value)
    .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;').replace(/'/g, '&#39;');
}

function toast(message, kind) {
  const el = $('#toast');
  el.textContent = message;
  el.className = 'toast show' + (kind ? ' toast--' + kind : '');
  clearTimeout(toast._t);
  toast._t = setTimeout(() => { el.className = 'toast'; }, 3800);
}

async function api(path, method = 'GET', body) {
  const res = await fetch('/api' + path, {
    method,
    headers: Object.assign(
      { 'Content-Type': 'application/json' },
      S.token ? { Authorization: 'Bearer ' + S.token } : {}
    ),
    body: body ? JSON.stringify(body) : undefined
  });
  const data = await res.json().catch(() => ({ error: 'The server sent something unreadable.' }));
  if (!res.ok) {
    if (res.status === 401 && S.token) signOut(true);
    throw new Error(data.error || 'Request failed.');
  }
  return data;
}

function setSession(token, role, patientNumber) {
  S.token = token; S.role = role;
  localStorage.setItem('trimestt_token', token);
  localStorage.setItem('trimestt_role', role);
  if (patientNumber) {
    S.knownPatient = patientNumber;
    localStorage.setItem('trimestt_patient', patientNumber);   // survives sign out
  }
}

function signOut(silent) {
  if (S.token) api('/logout', 'POST').catch(() => {});
  S.token = ''; S.role = ''; S.me = null; S.hospital = null; S.view = 'auth'; S.tab = 'home'; S.profile = 'mother';
  localStorage.removeItem('trimestt_token');
  localStorage.removeItem('trimestt_role');   // the patient ID stays, so she only types a password
  applyBrand('#1F5F5B');
  render();
  if (!silent) toast('Signed out.');
}

function applyBrand(colour) {
  const hex = /^#[0-9a-fA-F]{6}$/.test(colour || '') ? colour : '#1F5F5B';
  document.documentElement.style.setProperty('--brand', hex);
  document.documentElement.style.setProperty('--brand-deep', shade(hex, -22));
}

function shade(hex, percent) {
  const n = parseInt(hex.slice(1), 16);
  const f = (v) => Math.max(0, Math.min(255, Math.round(v + (v * percent) / 100)));
  return '#' + [f((n >> 16) & 255), f((n >> 8) & 255), f(n & 255)]
    .map((v) => v.toString(16).padStart(2, '0')).join('');
}

/* Naegele: EDD = LMP + 280 days. Mirrors lib/clinical.js so the desk sees the
   same number the server will store. */
function eddFrom(lmp) {
  const d = new Date(lmp);
  if (isNaN(d)) return null;
  return new Date(d.getTime() + 280 * 86400000);
}

function gestationLabel(lmp) {
  const days = Math.round((Date.now() - new Date(lmp).getTime()) / 86400000);
  if (days < 0 || days > 320) return null;
  return Math.floor(days / 7) + 'w ' + (days % 7) + 'd today';
}

function refreshEdd() {
  const box = $('#edd-preview');
  if (!box) return;
  const lmpEl = $('#rl'), eddEl = $('#re');
  const lmp = lmpEl && lmpEl.value ? lmpEl.value : '';
  const edd = eddEl && eddEl.value ? eddEl.value : '';

  let eddDate = null, basis = '';
  if (lmp) { eddDate = eddFrom(lmp); basis = gestationLabel(lmp) || ''; }
  else if (edd) {
    eddDate = new Date(edd);
    const impliedLmp = new Date(eddDate.getTime() - 280 * 86400000).toISOString().slice(0, 10);
    basis = gestationLabel(impliedLmp) || '';
  }

  if (!eddDate || isNaN(eddDate)) { box.style.display = 'none'; return; }
  box.style.display = 'block';
  $('#edd-date').firstChild.nodeValue = pretty(eddDate.toISOString().slice(0, 10));
  $('#edd-gest').textContent = basis || 'Check this date — it gives an unusual gestation';
}

function pretty(dateStr) {
  if (!dateStr) return '—';
  const d = new Date(dateStr);
  if (isNaN(d)) return dateStr;
  return d.toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });
}

function today() { return new Date().toISOString().slice(0, 10); }

function rupees(n) { return '₹' + Number(n || 0).toLocaleString('en-IN'); }

function form(id) {
  const out = {};
  document.querySelectorAll('#' + id + ' [name]').forEach((input) => {
    out[input.name] = input.type === 'checkbox' ? input.checked : input.value;
  });
  return out;
}

function pressedChips(group) {
  return Array.from(document.querySelectorAll('[data-chip="' + group + '"][aria-pressed="true"]'))
    .map((el) => el.dataset.value);
}


/* ---------- icon set: stroked line icons, inherit colour ---------- */
const ICONS = {
  home:     '<path d="M3 10.5 12 3l9 7.5"/><path d="M5.5 9.5V20h13V9.5"/><path d="M9.8 20v-5.4h4.4V20"/>',
  plan:     '<rect x="3.2" y="4.8" width="17.6" height="16" rx="2.4"/><path d="M3.2 9.4h17.6M8 3v3.4M16 3v3.4"/><path d="M7.6 13.4h3M7.6 17h6.8"/>',
  log:      '<path d="M5 4.6h9.4L19 9.2V19.4a1.6 1.6 0 0 1-1.6 1.6H5a1.6 1.6 0 0 1-1.6-1.6V6.2A1.6 1.6 0 0 1 5 4.6Z"/><path d="M14 4.6v5h5"/><path d="M7.6 13h7M7.6 16.6h4.6"/>',
  care:     '<path d="M4 5.4A1.6 1.6 0 0 1 5.6 3.8H11a2 2 0 0 1 2 2v14.4a1.6 1.6 0 0 0-1.6-1.6H5.6A1.6 1.6 0 0 1 4 17V5.4Z"/><path d="M20 5.4a1.6 1.6 0 0 0-1.6-1.6H13a2 2 0 0 0-2 2v14.4a1.6 1.6 0 0 1 1.6-1.6h5.8A1.6 1.6 0 0 0 20 17V5.4Z"/>',
  money:    '<rect x="2.8" y="5.4" width="18.4" height="13.2" rx="2.2"/><path d="M2.8 10h18.4"/><path d="M6.6 14.8h3.4"/>',
  today:    '<path d="M3.4 20.2h17.2"/><path d="M6.4 20.2v-6.6M11 20.2V6.8M15.6 20.2v-9.4M20.2 20.2V9"/>',
  patients: '<circle cx="9.4" cy="8.6" r="3.4"/><path d="M3.6 20a5.8 5.8 0 0 1 11.6 0"/><path d="M16.4 5.6a3.4 3.4 0 0 1 0 6.6M17.4 14.6a5.4 5.4 0 0 1 3 5.4"/>',
  register: '<circle cx="10" cy="8.4" r="3.6"/><path d="M3.8 20a6.2 6.2 0 0 1 12.4 0"/><path d="M18.6 8.6v5.2M21.2 11.2H16"/>',
  alerts:   '<path d="M18 8.6a6 6 0 1 0-12 0c0 6.6-3 7.8-3 7.8h18s-3-1.2-3-7.8"/><path d="M13.7 20.4a2 2 0 0 1-3.4 0"/>'
};

function icon(name) {
  return ICONS[name]
    ? `<svg class="ic" viewBox="0 0 24 24" aria-hidden="true">${ICONS[name]}</svg>`
    : '';
}

/* ------------------------------------------------------------- chrome --- */

function appbar(title, sub, opts = {}) {
  const logo = S.hospital && S.hospital.logo
    ? `<img class="appbar__logo" src="${esc(S.hospital.logo)}" alt="">`
    : `<img class="appbar__logo" src="/logo-192.png" alt="">`;
  return `
    <div class="appbar">
      ${logo}
      <div>
        <div class="appbar__title">${esc(title)}</div>
        <div class="appbar__sub">${esc(sub || '')}</div>
      </div>
      <div class="appbar__spacer"></div>
      ${opts.bell !== undefined ? `
        <button class="bell" data-action="${opts.bellAction || 'open-notes'}" aria-label="Notifications">
          <svg viewBox="0 0 24 24"><path d="M18 8a6 6 0 1 0-12 0c0 7-3 8-3 8h18s-3-1-3-8"/><path d="M13.7 21a2 2 0 0 1-3.4 0"/></svg>
          ${opts.bell > 0 ? `<span class="bell__count">${opts.bell > 9 ? '9+' : opts.bell}</span>` : ''}
        </button>` : ''}
      ${opts.signOut ? '<button data-action="signout">Sign out</button>' : ''}
    </div>`;
}

function tabbar(tabs) {
  return `<div class="tabbar">` + tabs.map((t) => `
    <button data-action="tab" data-tab="${t.key}" aria-current="${S.tab === t.key}">
      ${icon(t.icon || t.key)}<span>${esc(t.label)}</span>
    </button>`).join('') + `</div>`;
}

/* ---------------------------------------------------------------- auth -- */

function authScreen() {
  $('#chrome').innerHTML = '';
  $('#tabs').innerHTML = '';
  view().classList.add('screen--center');
  document.body.classList.remove('staff');

  const patient = `
    <form id="f-patient" onsubmit="return false">
      <div class="field">
        <label for="pid">Patient ID</label>
        <input id="pid" name="patientId" value="${esc(S.knownPatient)}" placeholder="TRM-XXX01-0001" autocapitalize="characters" autocomplete="username">
      </div>
      <div class="field">
        <label for="ppw">Password</label>
        <input id="ppw" name="password" type="password" autocomplete="current-password">
      </div>
      <button class="btn" data-action="patient-login">Open my care</button>
      <p class="linkline">
        <button data-action="mode" data-mode="forgot">Forgot password?</button>
      </p>
      ${S.knownPatient ? '' : `<p class="linkline" style="margin-top:6px">
        <button data-action="mode" data-mode="activate">First time — activate with your hospital code</button>
      </p>`}
    </form>`;

  const forgot = `
    <form id="f-forgot" onsubmit="return false">
      <p class="muted">Ask your hospital for a reset code. It works once, and nothing in your record changes.</p>
      <div class="field">
        <label for="fid">Patient ID</label>
        <input id="fid" name="patientId" value="${esc(S.knownPatient)}" autocapitalize="characters">
      </div>
      <div class="field">
        <label for="fcode">Reset code</label>
        <input id="fcode" name="code" placeholder="ABC123" autocapitalize="characters" maxlength="6">
      </div>
      <div class="field">
        <label for="fpw">New password</label>
        <input id="fpw" name="password" type="password" autocomplete="new-password">
        <p class="hint">At least 8 characters, with a letter and a number.</p>
      </div>
      <button class="btn" data-action="do-reset">Set new password</button>
      <p class="linkline"><button data-action="mode" data-mode="patient">Back to sign in</button></p>
    </form>`;

  const activate = `
    <form id="f-activate" onsubmit="return false">
      <p class="muted">Your hospital gave you a patient ID and a six-character code. Set your own password now.</p>
      <div class="field">
        <label for="aid">Patient ID</label>
        <input id="aid" name="patientId" placeholder="TRM-XXX01-0001" autocapitalize="characters">
      </div>
      <div class="field">
        <label for="acode">Activation code</label>
        <input id="acode" name="code" placeholder="ABC123" autocapitalize="characters" maxlength="6">
      </div>
      <div class="field">
        <label for="apw">Create a password</label>
        <input id="apw" name="password" type="password" autocomplete="new-password">
        <p class="hint">At least 8 characters, with a letter and a number.</p>
      </div>
      <button class="btn" data-action="activate">Create my account</button>
      <p class="linkline">Already set up?
        <button data-action="mode" data-mode="patient">Log in instead</button>
      </p>
    </form>`;

  const hforgot = `
    <form id="f-hrecover" onsubmit="return false">
      <p class="muted">Staff logins are reset by your hospital's administrator, from the Staff screen. It takes them about ten seconds.</p>
      <p class="muted">If you are the administrator, confirm your hospital below and we will tell you how to get back in.</p>
      <div class="field">
        <label for="hrn">Hospital name</label>
        <input id="hrn" name="hospitalName" autocomplete="organization">
      </div>
      <div class="field">
        <label for="hrp">A phone number registered with us</label>
        <input id="hrp" name="phone" type="tel">
      </div>
      <button class="btn" data-action="hospital-recover">Continue</button>
      <p class="linkline"><button data-action="mode" data-mode="hospital">Back to sign in</button></p>
    </form>`;

  const hospital = `
    <form id="f-hospital" onsubmit="return false">
      <div class="field">
        <label for="hem">Work email</label>
        <input id="hem" name="email" type="email" autocomplete="username">
      </div>
      <div class="field">
        <label for="hpw">Password</label>
        <input id="hpw" name="password" type="password" autocomplete="current-password">
      </div>
      <button class="btn" data-action="hospital-login">Open dashboard</button>
      <p class="linkline">
        <button data-action="mode" data-mode="hforgot">Forgot your email or password?</button>
      </p>
      <p class="linkline" style="margin-top:6px">New hospital?
        <button data-action="mode" data-mode="signup">Create an account</button>
      </p>
    </form>`;

  const signup = `
    <form id="f-signup" onsubmit="return false">
      <div class="field">
        <label for="shn">Hospital name</label>
        <input id="shn" name="hospitalName" autocomplete="organization">
      </div>
      <div class="field">
        <label for="san">Your name</label>
        <input id="san" name="adminName" autocomplete="name">
      </div>
      <div class="field">
        <label for="sem">Work email</label>
        <input id="sem" name="email" type="email" autocomplete="username">
      </div>
      <div class="field">
        <label for="spw">Create a password</label>
        <input id="spw" name="password" type="password" autocomplete="new-password">
        <p class="hint">At least 8 characters, with a letter and a number.</p>
      </div>
      <button class="btn" data-action="signup">Create hospital account</button>
      <p class="linkline">Already registered?
        <button data-action="mode" data-mode="hospital">Log in</button>
      </p>
    </form>`;

  const choose = `
    <div class="choose">
      <button class="choice" data-action="mode" data-mode="patient">
        <span class="choice__title">I am a mother</span>
        <span class="choice__sub">Your pregnancy, your baby, your hospital's care</span>
      </button>
      <button class="choice choice--alt" data-action="mode" data-mode="hospital">
        <span class="choice__title">I am a hospital</span>
        <span class="choice__sub">Set up your hospital and register patients</span>
      </button>
    </div>`;

  const panels = { choose, patient, forgot, activate, hospital, hforgot, signup };
  const titles = {
    choose: 'Welcome to Trimestt',
    patient: 'Welcome back',
    forgot: 'Reset your password',
    activate: 'Set up your account',
    hospital: 'Hospital sign in',
    hforgot: 'Cannot get in?',
    signup: 'Create a hospital account'
  };
  const subs = {
    choose: 'Pregnancy and child care, from your hospital.',
    patient: 'Sign in with the ID your hospital gave you.',
    forgot: 'Your records stay exactly as they are.',
    activate: 'You only do this once.',
    hospital: 'Sign in to your hospital account.',
    hforgot: 'We will not send your details to anyone unverified.',
    signup: 'Takes about a minute.'
  };

  view().innerHTML = `
    <div class="auth">
      <img class="auth__logo" src="/logo.png" alt="Trimestt">
      <p class="auth__tag">Pregnancy and child care, from your hospital</p>
      <div class="auth__card">
        <h1>${esc(titles[S.authMode])}</h1>
        <p class="muted">${esc(subs[S.authMode])}</p>
        ${panels[S.authMode]}
        ${S.authMode !== 'choose' ? '<p class="linkline"><button data-action="mode" data-mode="choose">Back</button></p>' : ''}
      </div>
      <p class="muted center" style="margin-top:18px">Trimestt supports your care. It does not diagnose, and it does not replace your doctor.</p>
    </div>`;
}

/* ------------------------------------------------------------ hospital -- */

async function loadHospital() {
  const data = await api('/hospital/me');
  S.hospital = data.hospital;
  S.me = data.user;
  applyBrand(S.hospital.colour);
}

function hospitalSetupScreen() {
  view().classList.remove('screen--center');
  document.body.classList.add('staff');
  const h = S.hospital;
  $('#chrome').innerHTML = appbar(h.name, 'Hospital setup', { signOut: true });
  $('#tabs').innerHTML = '';
  view().innerHTML = `
    <h1>Set up your hospital</h1>
    <p>This is what your patients see inside the app. You can change any of it later.</p>
    <form id="f-setup" onsubmit="return false">
      <div class="card">
        <h3>Details</h3>
        <div class="field"><label for="sn">Hospital name</label><input id="sn" name="name" value="${esc(h.name)}"></div>
        <div class="field"><label for="sa">Address</label><textarea id="sa" name="address">${esc(h.address)}</textarea></div>
        <div class="field--split">
          <div class="field"><label for="sc">City</label><input id="sc" name="city" value="${esc(h.city)}"></div>
          <div class="field"><label for="sp">Reception phone</label><input id="sp" name="phone" value="${esc(h.phone)}"></div>
        </div>
        <div class="field">
          <label for="sl">Labour room phone</label>
          <input id="sl" name="labourRoomPhone" value="${esc(h.labourRoomPhone)}">
          <p class="hint">This is the number the emergency button dials.</p>
        </div>
      </div>

      <div class="card">
        <h3>Branding</h3>
        <div class="field">
          <label for="slogo">Logo</label>
          <input id="slogo" type="file" accept="image/png,image/jpeg,image/svg+xml">
          <p class="hint">Square works best. Under 600 KB.</p>
        </div>
        <div id="logo-preview">${h.logo ? `<img src="${esc(h.logo)}" alt="Current logo" style="width:64px;height:64px;border-radius:14px;object-fit:cover">` : '<p class="muted">No logo yet.</p>'}</div>
        <div class="field">
          <label for="scol">App colour</label>
          <input id="scol" name="colour" type="color" value="${esc(h.colour)}" style="height:46px;padding:4px">
        </div>
      </div>

      <div class="card">
        <h3>Clinical settings</h3>
        <div class="field">
          <label for="sis">Immunisation schedule</label>
          <select id="sis" name="immunisationSchedule">
            <option value="IAP" ${h.immunisationSchedule === 'IAP' ? 'selected' : ''}>IAP (private practice)</option>
            <option value="NIS" ${h.immunisationSchedule === 'NIS' ? 'selected' : ''}>National Immunisation Schedule</option>
          </select>
        </div>
        <div class="field--split">
          <div class="field"><label for="th1">BP systolic alert</label><input id="th1" name="systolicHigh" type="number" value="${h.thresholds.systolicHigh}"></div>
          <div class="field"><label for="th2">BP diastolic alert</label><input id="th2" name="diastolicHigh" type="number" value="${h.thresholds.diastolicHigh}"></div>
        </div>
        <div class="field--split">
          <div class="field"><label for="th3">Fasting sugar</label><input id="th3" name="fastingSugarHigh" type="number" value="${h.thresholds.fastingSugarHigh}"></div>
          <div class="field"><label for="th4">Post-meal sugar</label><input id="th4" name="postMealSugarHigh" type="number" value="${h.thresholds.postMealSugarHigh}"></div>
        </div>
        <p class="hint">Readings past these values raise a red alert on your dashboard.</p>
      </div>

      <button class="btn" data-action="save-setup">Save and continue</button>
    </form>
    <div class="divider"></div>
    <p class="muted">No field in Trimestt records the sex of the foetus, in line with the PC-PNDT Act.</p>`;

  const fileInput = $('#slogo');
  if (fileInput) {
    fileInput.addEventListener('change', () => {
      const file = fileInput.files[0];
      if (!file) return;
      if (file.size > 600000) { toast('That file is over 600 KB. Use a smaller image.', 'error'); fileInput.value = ''; return; }
      const reader = new FileReader();
      reader.onload = () => {
        S.cache.logo = reader.result;
        $('#logo-preview').innerHTML = `<img src="${esc(reader.result)}" alt="New logo" style="width:64px;height:64px;border-radius:14px;object-fit:cover">`;
      };
      reader.readAsDataURL(file);
    });
  }
}

async function hospitalScreen() {
  view().classList.remove('screen--center');
  document.body.classList.add('staff');
  const h = S.hospital;
  const openAlerts = await api('/hospital/alerts');
  $('#chrome').innerHTML = appbar(h.name, 'Trimestt dashboard · ' + h.code,
    { signOut: true, bell: openAlerts.open.length, bellAction: 'open-hospital-alerts' });
  $('#tabs').innerHTML = tabbar([
    { key: 'home', label: 'Today', icon: 'today' },
    { key: 'patients', label: 'Patients', icon: 'patients' },
    { key: 'register', label: 'Register', icon: 'register' },
    { key: 'pending', label: 'Incoming', icon: 'patients' },
    { key: 'alerts', label: 'Alerts', icon: 'alerts' },
    { key: 'money', label: 'Billing', icon: 'money' },
    { key: 'reports', label: 'Reports', icon: 'log' },
    { key: 'staff', label: 'Staff', icon: 'patients' }
  ]);

  if (S.tab === 'home') {
    const [work, summary] = await Promise.all([api('/hospital/worklist'), api('/hospital/summary')]);
    const c = work.counts;
    const label = { alert: 'Alert', missed: 'Missed', closing: 'Closing', quiet: 'No readings', notactive: 'Not activated' };
    view().innerHTML = `
      <h1>Today</h1>
      <p>Sorted by what needs a person first. Clear it top to bottom.</p>
      ${work.pending ? `
      <div class="card alert-card alert-card--t3">
        <div class="spread">
          <div><h3>${work.pending} patient${work.pending > 1 ? 's' : ''} waiting to be confirmed</h3>
          <p class="muted" style="margin:0">Arrived from your hospital system. Nothing is enrolled or billed until you confirm.</p></div>
        </div>
        <button class="btn btn--sm btn--soft" style="margin-top:10px" data-action="tab" data-tab="pending">Review them</button>
      </div>` : ''}
      <div class="stat-grid">
        <div class="card"><div class="stat" style="color:var(--alert)">${c.critical}<small>Critical now</small></div></div>
        <div class="card"><div class="stat">${c.attention}<small>Needs attention</small></div></div>
      </div>
      ${work.items.length ? work.items.map((i) => `
        <div class="card ${i.urgency === 1 ? 'alert-card alert-card--t4' : i.urgency === 2 ? 'alert-card alert-card--t3' : ''}">
          <div class="spread">
            <div>
              <span class="card__tag">${esc(label[i.kind] || i.kind)}</span>
              <h3>${esc(i.patient)}</h3>
              <p class="muted" style="margin:2px 0 0">${esc(i.patientId)}</p>
            </div>
            ${i.urgency === 1 ? '<span class="tag tag--red">Now</span>' : ''}
          </div>
          <p style="margin:8px 0 0">${esc(i.what)}</p>
          <p class="muted" style="margin:2px 0 0">${esc(i.detail || '')}</p>
          ${i.kind === 'alert' ? `<button class="btn btn--sm btn--soft" style="margin-top:10px" data-action="tab" data-tab="alerts">Handle it</button>` : ''}
        </div>`).join('') : '<div class="empty">Nothing waiting. Everyone is on track.</div>'}
      <div class="card card--flat">
        <div class="spread"><h3>This period</h3><span class="tag tag--sage">${summary.summary.patients} mothers · ${summary.summary.children} children</span></div>
        <p class="muted" style="margin:0">${rupees(summary.summary.collected)} settled of ${rupees(summary.summary.billed)} raised.</p>
      </div>`;
    return;
  }

  if (S.tab === 'pending') {
    const data = await api('/hospital/pending');
    view().innerHTML = `
      <h1>Waiting to be confirmed</h1>
      <p>Patients sent from your hospital system. Check the dates, then confirm — that is what enrols and bills them.</p>
      ${data.pending.length ? data.pending.map((p) => `
        <div class="card">
          <h3>${esc(p.name)}</h3>
          <p class="muted" style="margin:2px 0 8px">${esc(p.phone)}${p.mrn ? ' · MRN ' + esc(p.mrn) : ''} · from ${esc(p.source)}</p>
          <div class="card--flat" style="padding:10px 0">
            <p style="margin:0"><b>${esc(p.gestation.label)}</b> · EDD ${pretty(p.edd)}${p.consultant ? ' · ' + esc(p.consultant) : ''}</p>
          </div>
          <div class="btn-row" style="margin-top:10px">
            <button class="btn btn--sm" data-action="confirm-pending" data-id="${p.id}">Confirm and enrol</button>
            <button class="btn btn--sm btn--soft" data-action="reject-pending" data-id="${p.id}">Not ours</button>
          </div>
        </div>`).join('') : '<div class="empty">Nothing waiting.</div>'}
      <h2>Bring patients in</h2>
      <div class="card">
        <h3>Paste a spreadsheet export</h3>
        <p class="muted">First row must be the column names. Needs at least name, phone and lmp.</p>
        <form id="f-import" onsubmit="return false">
          <div class="field">
            <textarea id="csvbox" name="csv" style="min-height:120px" placeholder="name,phone,lmp,consultant&#10;Anita K,9876543210,2026-02-01,Dr Rao"></textarea>
          </div>
          <button class="btn btn--soft" data-action="import-csv">Import</button>
        </form>
      </div>
      <div class="card">
        <h3>Connect your hospital system</h3>
        <p class="muted">Give this key to your software vendor. They post new maternity registrations to us and they appear above.</p>
        <div id="apikeybox"></div>
        <button class="btn btn--soft" data-action="make-key">Create a new key</button>
      </div>`;
    const key = await api('/hospital/apikey');
    $('#apikeybox').innerHTML = key.apiKey
      ? `<div class="code-box" style="font-size:13px;letter-spacing:.04em;word-break:break-all">${esc(key.apiKey)}</div>`
      : '<p class="muted">No key yet.</p>';
    return;
  }

  if (S.tab === 'patients') {
    const data = await api('/hospital/patients');
    view().innerHTML = `
      <h1>Patients</h1>
      ${data.patients.length ? data.patients.map((p) => `
        <div class="card ${p.highestTier === 4 ? 'alert-card alert-card--t4' : ''}">
          <div class="spread">
            <h3>${esc(p.name)}</h3>
            ${p.openAlerts ? `<span class="tag tag--red">${p.openAlerts} alert${p.openAlerts > 1 ? 's' : ''}</span>` : ''}
          </div>
          <p class="muted" style="margin-bottom:8px">${esc(p.number)} · ${esc(p.gestation.label)} · EDD ${pretty(p.edd)}</p>
          <p class="muted" style="margin:-4px 0 8px;font-size:12px">Registered ${pretty(p.registeredOn)}</p>
          ${p.riskTags.length ? `<div class="chip-row" style="margin-bottom:8px">${p.riskTags.map((t) => `<span class="tag tag--hard">${esc(t)}</span>`).join('')}</div>` : ''}
          ${p.activated
            ? `<span class="tag tag--sage">App active</span>
               <button class="btn btn--sm btn--soft" style="margin-left:8px" data-action="issue-reset" data-id="${p.id}">Reset password</button>`
            : `<div class="pill-note">Not activated yet. Code: <strong>${esc(p.activationCode)}</strong></div>`}
          ${p.resetCode ? `<div class="pill-note" style="margin-top:8px">Reset code: <strong>${esc(p.resetCode)}</strong> · valid 24 hours</div>` : ''}
        </div>`).join('') : '<div class="empty">No patients registered yet.</div>'}`;
    return;
  }

  if (S.tab === 'register') {
    view().innerHTML = `
      <h1>Register a patient</h1>
      <p>Do this at the first consultation. She gets an ID and a code, and sets her own password.</p>
      <form id="f-reg" onsubmit="return false">
        <div class="field"><label for="rn">Patient name</label><input id="rn" name="name"></div>
        <div class="field"><label for="rp">Phone</label><input id="rp" name="phone" type="tel" placeholder="+91"></div>
        <div class="field">
          <label for="rl">Last menstrual period</label>
          <input id="rl" name="lmp" type="date" max="${today()}" data-edd>
          <p class="hint">The due date and her current week appear as soon as you pick this.</p>
        </div>
        <div class="field">
          <label for="re">Due date (if known from scan)</label>
          <input id="re" name="edd" type="date" data-edd>
        </div>
        <div class="card card--brand" id="edd-preview" style="display:none">
          <div class="eyebrow" style="color:rgba(255,255,255,.8)">Expected delivery</div>
          <div class="stat" id="edd-date" style="margin-top:6px">—<small id="edd-gest"></small></div>
        </div>
        <div class="field--split">
          <div class="field">
            <label for="rb">Blood group</label>
            <select id="rb" name="bloodGroup">
              <option value="">Select</option>
              <option>O positive</option><option>O negative</option>
              <option>A positive</option><option>A negative</option>
              <option>B positive</option><option>B negative</option>
              <option>AB positive</option><option>AB negative</option>
            </select>
          </div>
          <div class="field"><label for="rc">Consultant</label><input id="rc" name="consultant" list="doclist"><datalist id="doclist"></datalist></div>
        </div>
        <div class="field--split">
          <div class="field"><label for="rh">Height (cm)</label><input id="rh" name="heightCm" type="number" inputmode="numeric"></div>
          <div class="field"><label for="rpw">Weight before pregnancy (kg)</label><input id="rpw" name="prePregnancyWeightKg" type="number" step="0.1" inputmode="decimal"></div>
        </div>
        <p class="hint" style="margin:-6px 0 12px">These two let the app track her weight gain against the right range. Optional, but useful.</p>
        <div class="field"><label for="ran">Attendant name</label><input id="ran" name="attendantName"></div>
        <div class="field">
          <label for="rap">Attendant phone</label>
          <input id="rap" name="attendantPhone" type="tel">
          <p class="hint">Usually her husband. Alerts also go here, with her consent.</p>
        </div>
        <div class="field">
          <label>Risk tags</label>
          <div class="chip-row">
            ${['Prior LSCS', 'GDM', 'PIH', 'Anaemia', 'Twins', 'Thyroid', 'Rh negative', 'Advanced age']
              .map((t) => `<button type="button" class="chip" data-chip="risk" data-value="${t}" aria-pressed="false">${t}</button>`).join('')}
          </div>
        </div>
        <button class="btn" data-action="register">Register and get code</button>
      </form>`;
    return;
  }

  if (S.tab === 'alerts') {
    const data = await api('/hospital/alerts');
    view().innerHTML = `
      <h1>Alerts</h1>
      ${data.open.length ? data.open.map(alertCard).join('') : '<div class="empty">Nothing open. Good.</div>'}
      ${data.recent.length ? `<h2>Handled</h2>${data.recent.map(alertCard).join('')}` : ''}`;
    return;
  }

  if (S.tab === 'reports') {
    const data = await api('/hospital/reports');
    const s2 = data.summary;
    view().innerHTML = `
      <h1>Reports</h1>
      <p>Every alert, who handled it, and what was done. Export it for your records or print a copy for the doctor.</p>
      <div class="stat-grid">
        <div class="card"><div class="stat" style="color:var(--alert)">${s2.openCritical}<small>Critical, still open</small></div></div>
        <div class="card"><div class="stat">${s2.open}<small>All open</small></div></div>
      </div>
      <div class="stat-grid">
        <div class="card"><div class="stat">${s2.careTaken}/${s2.total}<small>Care recorded</small></div></div>
        <div class="card"><div class="stat">${s2.averageMinutesToAcknowledge === null ? '—' : s2.averageMinutesToAcknowledge + 'm'}<small>Average response</small></div></div>
      </div>
      <div class="btn-row" style="margin-bottom:14px">
        <button class="btn btn--sm btn--ghost" data-action="export-csv">Download as CSV</button>
        <button class="btn btn--sm btn--soft" data-action="print">Print</button>
      </div>
      <div class="card" style="overflow-x:auto">
        <table class="report">
          <thead><tr>
            <th>Raised</th><th>Patient</th><th>Weeks</th><th>Level</th><th>Reported</th>
            <th>Care taken</th><th>Outcome</th><th>By</th>
          </tr></thead>
          <tbody>
            ${data.rows.length ? data.rows.map((r) => `
              <tr class="${r.tier === 4 ? 'row--critical' : ''}">
                <td>${pretty(r.raisedAt)}</td>
                <td>${esc(r.patient)}<br><span class="muted">${esc(r.patientId)}</span></td>
                <td>${esc(r.weeks)}</td>
                <td><span class="tag ${r.tier === 4 ? 'tag--red' : 'tag--hard'}">L${r.tier}</span></td>
                <td>${esc(r.reported)}<br><span class="muted">${esc(r.detail)}</span></td>
                <td>${r.careTaken === 'Yes' ? '<span class="tag tag--sage">Yes</span>' : '<span class="tag tag--red">Not yet</span>'}</td>
                <td>${esc(r.outcome)}${r.outcomeNote ? '<br><span class="muted">' + esc(r.outcomeNote) + '</span>' : ''}</td>
                <td>${esc(r.closedBy || r.acknowledgedBy)}</td>
              </tr>`).join('') : '<tr><td colspan="8" class="muted">No alerts in this period.</td></tr>'}
          </tbody>
        </table>
      </div>`;
    return;
  }

  if (S.tab === 'staff') {
    const data = await api('/hospital/staff');
    const isAdmin = !S.me || !S.me.staffRole || S.me.staffRole === 'admin';
    view().innerHTML = `
      <h1>Staff logins</h1>
      <p>Everyone gets their own login, so every action on a patient record carries a name.</p>
      ${data.staff.map((m) => `
        <div class="card">
          <div class="spread">
            <div>
              <h3>${esc(m.name)}${m.isYou ? ' · you' : ''}</h3>
              <p class="muted" style="margin:0">${esc(m.email)}</p>
            </div>
            <div style="text-align:right">
              <span class="tag">${esc(data.roles[m.staffRole] ? m.staffRole : 'admin')}</span>
              ${isAdmin && !m.isYou ? `<br><button class="btn btn--sm btn--ghost" style="margin-top:6px" data-action="staff-reset" data-id="${m.id}">Reset password</button>
                 <button class="btn btn--sm btn--soft" style="margin-top:6px" data-action="staff-remove" data-id="${m.id}">Remove</button>` : ''}
            </div>
          </div>
        </div>`).join('')}
      <h2>Your own password</h2>
      <form id="f-mypw" onsubmit="return false">
        <div class="card">
          <div class="field"><label for="cpc">Current password</label><input id="cpc" name="current" type="password"></div>
          <div class="field"><label for="cpn">New password</label><input id="cpn" name="password" type="password">
            <p class="hint">At least 8 characters, with a letter and a number.</p></div>
          <button class="btn btn--soft" data-action="change-password">Change my password</button>
        </div>
      </form>

      ${isAdmin ? `
      <h2>Add someone</h2>
      <form id="f-staff" onsubmit="return false">
        <div class="card">
          <div class="field"><label for="sfn">Name</label><input id="sfn" name="name"></div>
          <div class="field"><label for="sfe">Email</label><input id="sfe" name="email" type="email"></div>
          <div class="field">
            <label for="sfr">Role</label>
            <select id="sfr" name="staffRole">
              ${Object.keys(data.roles).map((r) => `<option value="${r}">${r} — ${esc(data.roles[r])}</option>`).join('')}
            </select>
          </div>
          <div class="field">
            <label for="sfp">Temporary password</label>
            <input id="sfp" name="password" type="text">
            <p class="hint">They can change it later. At least 8 characters, with a letter and a number.</p>
          </div>
          <button class="btn" data-action="staff-add">Create login</button>
        </div>
      </form>` : '<div class="card card--flat"><p style="margin:0">Only an administrator can add or remove logins.</p></div>'}`;
    return;
  }

  if (S.tab === 'money') {
    const data = await api('/hospital/summary');
    view().innerHTML = `
      <h1>Billing</h1>
      <div class="card card--brand">
        <div class="stat">${rupees(data.summary.collected)}<small>Collected</small></div>
        <p style="margin-top:10px;margin-bottom:0">${rupees(data.summary.billed - data.summary.collected)} still pending.</p>
      </div>
      ${data.payments.length ? data.payments.map((p) => `
        <div class="card">
          <div class="spread">
            <div>
              <h3>${esc(p.label)}</h3>
              <p class="muted" style="margin:0">${rupees(p.amount)} · ${p.kind === 'mother' ? 'Mother care' : 'Child care'}</p>
            </div>
            ${p.status === 'paid'
              ? '<span class="tag tag--sage">Paid</span>'
              : `<button class="btn btn--sm" data-action="mark-paid" data-id="${p.id}">Mark paid</button>`}
          </div>
        </div>`).join('') : '<div class="empty">No billing yet.</div>'}`;
  }
}

function alertCard(a) {
  return `
    <div class="card alert-card alert-card--t${a.tier}">
      <div class="spread">
        <h3>${esc(a.reason)}</h3>
        <span class="tag ${a.tier === 4 ? 'tag--red' : 'tag--hard'}">L${a.tier}</span>
      </div>
      <p class="muted" style="margin:4px 0 8px">${esc(a.patientName)} · ${esc(a.patientNumber)}</p>
      <p style="margin-bottom:10px">${esc(a.detail)}</p>
      <p class="muted" style="margin-bottom:${a.state === 'open' ? '10px' : '0'}">${esc(a.source)} · ${pretty(a.createdAt)}</p>
      ${a.state === 'closed'
        ? `<span class="tag tag--sage">${esc(a.outcome || 'Handled')} · ${esc(a.closedBy || a.acknowledgedBy || 'staff')}</span>`
        : `<div class="btn-row" style="flex-wrap:wrap">
             ${a.state === 'open' ? `<button class="btn btn--sm btn--soft" data-action="ack" data-id="${a.id}">Acknowledge</button>` : ''}
             ${['Called the patient', 'Advised to come in', 'Seen in OPD', 'Admitted', 'No action needed']
               .map((o) => `<button class="btn btn--sm btn--ghost" data-action="close-alert" data-id="${a.id}" data-outcome="${esc(o)}">${esc(o)}</button>`).join('')}
           </div>`}
    </div>`;
}

/* ------------------------------------------------------------- patient -- */

async function loadPatient() {
  const data = await api('/patient/me');
  S.me = data;
  S.hospital = data.hospital;
  applyBrand(S.hospital.colour);
}

/* ---------- shared helpers ---------- */

function readFile(input) {
  return new Promise((resolve, reject) => {
    const file = input.files && input.files[0];
    if (!file) return resolve(null);
    if (file.size > 4 * 1024 * 1024) return reject(new Error('That file is over 4 MB. Please use a smaller one.'));
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result);
    reader.onerror = () => reject(new Error('That file could not be read.'));
    reader.readAsDataURL(file);
  });
}

function sosBlock() {
  return `
    <div class="sos">
      <button class="btn btn--danger" data-action="sos">I am having pains — tell the hospital</button>
      <p class="muted center" style="margin-top:8px">This calls your hospital and sends your details to them.</p>
    </div>`;
}

function switcherHtml() {
  return `
    <div class="switcher">
      <button data-action="profile" data-profile="mother" aria-pressed="${S.profile === 'mother'}">Mother</button>
      ${S.me.children.map((c) => `
        <button data-action="profile" data-profile="${c.id}" aria-pressed="${S.profile === c.id}">${esc(c.label)}</button>`).join('')}
      <button class="add" data-action="add-child">+ Add baby</button>
    </div>`;
}

function recordsScreen(owner, records, kinds) {
  return `
    <h1>Records</h1>
    <p>Scans, lab reports, blood work, prescriptions and vaccination records — all in one place.</p>
    <form id="f-record" onsubmit="return false">
      <div class="card">
        <div class="field">
          <label for="rcf">Choose a file</label>
          <input id="rcf" type="file" accept="image/*,application/pdf">
          <p class="hint">Photo or PDF, up to 4 MB.</p>
        </div>
        <div class="field">
          <label for="rck">What is it</label>
          <select id="rck" name="kind">${kinds.map((k) => `<option>${esc(k)}</option>`).join('')}</select>
        </div>
        <div class="field--split">
          <div class="field"><label for="rct">Title</label><input id="rct" name="title" placeholder="e.g. Anomaly scan"></div>
          <div class="field"><label for="rcd">Date on report</label><input id="rcd" name="takenOn" type="date" value="${today()}"></div>
        </div>
        <button class="btn" data-action="record-upload" data-owner="${esc(owner)}">Add to records</button>
        <p class="hint" style="margin-top:10px">Please do not upload anything showing the sex of an unborn baby — it is not permitted by law, and Trimestt does not store it.</p>
      </div>
    </form>
    ${records.length ? records.map((r) => `
      <div class="card">
        <div class="spread">
          <div>
            <span class="card__tag" style="display:block">${esc(r.kind)}</span>
            <h3>${esc(r.title)}</h3>
            <p class="muted" style="margin:2px 0 0">${pretty(r.takenOn)} · ${(r.bytes / 1024).toFixed(0)} KB</p>
          </div>
        </div>
        <div class="btn-row" style="margin-top:10px">
          <a class="btn btn--sm btn--ghost" href="/api/files/${esc(r.file)}?t=${esc(S.token)}" target="_blank" rel="noopener">Open</a>
          <button class="btn btn--sm btn--soft" data-action="record-delete" data-id="${r.id}">Remove</button>
        </div>
      </div>`).join('') : '<div class="empty">Nothing added yet. Upload your first report above.</div>'}`;
}

/* ---------- patient ---------- */

async function patientScreen() {
  view().classList.remove('screen--center');
  document.body.classList.remove('staff');
  const h = S.hospital;
  const feed = await api('/patient/notifications');
  S.notifications = feed.notifications;
  S.unread = feed.unread;

  $('#chrome').innerHTML = appbar(h.name, h.city ? h.city : 'Trimestt', { signOut: true, bell: S.unread });

  const isBaby = S.profile !== 'mother';
  $('#tabs').innerHTML = tabbar(isBaby ? [
    { key: 'home', label: 'Home', icon: 'home' },
    { key: 'plan', label: 'Vaccines', icon: 'plan' },
    { key: 'log', label: 'Log', icon: 'log' },
    { key: 'care', label: 'Guides', icon: 'care' },
    { key: 'records', label: 'Records', icon: 'money' }
  ] : [
    { key: 'home', label: 'Home', icon: 'home' },
    { key: 'plan', label: 'Plan', icon: 'plan' },
    { key: 'log', label: 'Log', icon: 'log' },
    { key: 'care', label: 'Guides', icon: 'care' },
    { key: 'records', label: 'Records', icon: 'money' }
  ]);

  if (S.tab === 'notes') return notificationsScreen(h);
  if (isBaby) return babyScreen();
  return motherScreen();
}

function notificationsScreen(h) {
  const list = S.notifications || [];
  view().innerHTML = `
    <h1>Notifications</h1>
    <p>Reminders from your plan, and anything your hospital has been told about.</p>
    ${list.length ? list.map((n) => `
      <div class="note note--${esc(n.kind)}${n.unread ? ' note--unread' : ''}">
        <div class="note__bar"></div>
        <div>
          <time>${pretty(n.at)}${n.kind === 'urgent' ? ' · needs attention' : ''}</time>
          <h3>${esc(n.title)}</h3>
          <p>${esc(n.detail)}</p>
        </div>
      </div>`).join('') : '<div class="empty">Nothing new. We will tell you when something is due.</div>'}
    <button class="btn btn--soft" data-action="tab" data-tab="home">Back to home</button>`;
  if (S.unread) {
    api('/patient/notifications/read', 'POST').then(() => {
      S.unread = 0;
      $('#chrome').innerHTML = appbar(h.name, h.city || 'Trimestt', { signOut: true, bell: 0 });
    }).catch(() => {});
  }
}

async function motherScreen() {
  const m = S.me.mother;
  const switcher = switcherHtml();

  if (S.tab === 'home') {
    const [sched, insight] = await Promise.all([api('/patient/schedule'), api('/patient/insights')]);
    const next = sched.plan.find((i) => i.status === 'open') || sched.plan.find((i) => i.status === 'upcoming');
    const missed = sched.plan.filter((i) => i.status === 'missed' && i.hard);
    const w = insight.water;
    const pct = Math.min(100, Math.round((w.drunkMl / w.ml) * 100));
    const wt = insight.weight;

    view().innerHTML = `
      ${switcher}
      <div class="card card--brand">
        <div class="live" style="color:rgba(255,255,255,.92)"><span class="live__dot"></span> You are at</div>
        <div class="stat" style="margin-top:8px">${esc(m.gestation.label)}<small>Trimester ${m.gestation.trimester} · EDD ${pretty(m.edd)}</small></div>
      </div>

      <div class="card">
        <div class="spread"><h3>Water today</h3><span class="tag">${w.drunkMl} of ${w.ml} ml</span></div>
        <div class="bar-track"><div class="bar-fill" style="width:${pct}%"></div></div>
        <p class="muted" style="margin:8px 0 10px">About ${w.glasses} glasses across the day${w.overridden ? ' — set by your doctor' : ''}. Sip through the day rather than all at once.</p>
        <div class="btn-row">
          <button class="btn btn--sm btn--ghost" data-action="water" data-ml="200">+1 glass</button>
          <button class="btn btn--sm btn--ghost" data-action="water" data-ml="500">+ bottle</button>
        </div>
      </div>

      ${wt ? `
      <div class="card">
        <div class="spread"><h3>Your weight</h3><span class="tag ${wt.status === 'on track' ? 'tag--sage' : 'tag--hard'}">${esc(wt.status)}</span></div>
        <div class="stat" style="font-size:28px;margin:6px 0 4px">+${wt.gained} kg<small>gained since you started</small></div>
        <p style="margin:8px 0 0">${esc(wt.message)}</p>
        ${wt.totalRange ? `<p class="muted" style="margin:6px 0 0">Usual total for your build: ${wt.totalRange[0]}–${wt.totalRange[1]} kg across the pregnancy.</p>` : ''}
      </div>` : `
      <div class="card card--flat">
        <h3>Your weight</h3>
        <p style="margin:0">Add your weight in today's log and we will track the change for you from here on.</p>
      </div>`}

      ${next ? `
      <div class="card">
        <div class="eyebrow">Next</div>
        <h3>${esc(next.title)}</h3>
        <p class="muted" style="margin:2px 0 8px">${pretty(next.windowStart)} to ${pretty(next.windowEnd)} · ${esc(next.weeks)}</p>
        ${next.prep ? `<div class="pill-note">${esc(next.prep)}</div>` : ''}
      </div>` : ''}

      ${missed.length ? `
      <div class="card alert-card alert-card--t3">
        <h3>${missed.length} important ${missed.length > 1 ? 'items' : 'item'} passed its window</h3>
        <p style="margin:0">${missed.map((i) => esc(i.title)).join(', ')}. Call your hospital to plan what to do.</p>
      </div>` : ''}

      <div class="card">
        <h3>Good for you this trimester</h3>
        <div class="eyebrow" style="margin-top:10px">Movement</div>
        <ul class="checks">${insight.lifestyle.exercise.map((t) => `<li>${esc(t)}</li>`).join('')}</ul>
        <div class="eyebrow" style="margin-top:12px">Eating</div>
        <ul class="checks">${insight.lifestyle.diet.map((t) => `<li>${esc(t)}</li>`).join('')}</ul>
        <p class="muted" style="margin:10px 0 0">General guidance. Where your hospital's advice differs, follow theirs.</p>
      </div>

      <div class="card card--flat">
        <h3>Your care team</h3>
        <p style="margin:0">${esc(m.consultant || S.hospital.name)}<br><span class="muted">${esc(S.hospital.phone)}</span></p>
      </div>
      ${sosBlock()}`;
    return;
  }

  if (S.tab === 'plan') {
    const sched = await api('/patient/schedule');
    const groups = [
      { title: 'First trimester', from: 0, to: 13 },
      { title: 'Second trimester', from: 14, to: 27 },
      { title: 'Third trimester and after', from: 28, to: 99 }
    ];
    const weekOf = (item) => parseInt(item.weeks, 10) || 0;
    view().innerHTML = `
      ${switcher}
      <h1>Your plan</h1>
      <p>Built from your dates. The window matters more than the exact day.</p>
      ${groups.map((g) => {
        const items = sched.plan.filter((i) => weekOf(i) >= g.from && weekOf(i) <= g.to);
        if (!items.length) return '';
        const open = m.gestation.weeks >= g.from && m.gestation.weeks <= g.to;
        return `
        <details class="planset" ${open ? 'open' : ''}>
          <summary>${esc(g.title)} <span class="tag">${items.filter((i) => i.status === 'done').length}/${items.length} done</span></summary>
          <div class="card">
            ${items.map((i) => `
              <div class="item item--${i.status}">
                <div class="item__bar"></div>
                <div>
                  <h3>${esc(i.title)}</h3>
                  <div class="meta">${esc(i.weeks)} · ${pretty(i.windowStart)} – ${pretty(i.windowEnd)}</div>
                  ${i.prep ? `<p class="muted" style="margin:6px 0 0">${esc(i.prep)}</p>` : ''}
                </div>
                <div>
                  ${i.status === 'done' ? '<span class="tag tag--sage">Done</span>'
                    : i.status === 'missed' ? '<span class="tag tag--red">Passed</span>'
                    : i.hard ? '<span class="tag tag--hard">Important</span>' : ''}
                  ${i.status !== 'done' ? `<button class="btn btn--sm btn--soft" style="margin-top:6px" data-action="mark-done" data-key="${i.key}">Done</button>` : ''}
                </div>
              </div>`).join('')}
          </div>
        </details>`;
      }).join('')}`;
    return;
  }

  if (S.tab === 'log') {
    view().innerHTML = `
      ${switcher}
      <h1>Today's log</h1>
      <p>Fill in what you have. Anything outside your doctor's range reaches the hospital straight away.</p>
      <form id="f-log" onsubmit="return false">
        <div class="card">
          <div class="field--split">
            <div class="field"><label for="lw">Weight (kg)</label><input id="lw" name="weight" type="number" step="0.1" inputmode="decimal"></div>
            <div class="field"><label for="lk">Movements counted</label><input id="lk" name="kicks" type="number" inputmode="numeric"></div>
          </div>
          <div class="field--split">
            <div class="field"><label for="ls">BP systolic</label><input id="ls" name="systolic" type="number" inputmode="numeric"></div>
            <div class="field"><label for="ld">BP diastolic</label><input id="ld" name="diastolic" type="number" inputmode="numeric"></div>
          </div>
        </div>

        <details class="more">
          <summary>Add sugar readings</summary>
          <div class="card">
            <div class="field--split">
              <div class="field"><label for="lf">Fasting sugar</label><input id="lf" name="fastingSugar" type="number" inputmode="numeric"></div>
              <div class="field"><label for="lp">Post-meal sugar</label><input id="lp" name="postMealSugar" type="number" inputmode="numeric"></div>
            </div>
          </div>
        </details>

        <div class="card">
          <h3>Medicines</h3>
          <div class="chip-row" style="margin-top:8px">
            <button type="button" class="chip" data-chip="meds" data-value="taken" aria-pressed="false">Took everything</button>
            <button type="button" class="chip" data-chip="meds" data-value="missedSupplement" aria-pressed="false">Missed iron or calcium</button>
            <button type="button" class="chip chip--warn" data-chip="meds" data-value="missedCritical" aria-pressed="false">Missed a critical medicine</button>
          </div>
        </div>

        <div class="card">
          <h3>How are you feeling</h3>
          <div class="chip-row" style="margin-top:8px">
            ${[['bleeding', 'Bleeding'], ['leaking', 'Leaking fluid'], ['severeHeadache', 'Severe headache'],
               ['blurredVision', 'Blurred vision'], ['breathlessness', 'Breathless'], ['fever', 'Fever'],
               ['painfulContractions', 'Painful tightening'], ['swelling', 'Swelling'], ['vomiting', 'Vomiting']]
              .map(([k, label]) => `<button type="button" class="chip chip--warn" data-chip="symptom" data-value="${k}" aria-pressed="false">${label}</button>`).join('')}
          </div>
          <div class="field" style="margin-top:14px">
            <label for="lo">Anything else — in your own words</label>
            <textarea id="lo" name="otherSymptom" placeholder="Describe anything that does not fit above."></textarea>
          </div>
          <div class="field">
            <label for="lph">Add a photo</label>
            <input id="lph" type="file" accept="image/*">
            <p class="hint">If something looks unusual — discharge, a rash, swelling — a photo helps your nurse decide quickly. It goes only to your hospital.</p>
          </div>
        </div>

        <div class="field"><label for="ln">Note for your doctor</label><textarea id="ln" name="note"></textarea></div>
        <button class="btn" data-action="save-log">Save today's log</button>
      </form>
      ${sosBlock()}`;
    return;
  }

  if (S.tab === 'care') return guidesScreen(switcher, null);

  if (S.tab === 'records') {
    const data = await api('/patient/records?owner=mother');
    view().innerHTML = switcher + recordsScreen('mother', data.records, data.kinds);
    return;
  }
}

/* ---------- guides ---------- */

function guidesScreen(switcher, ageFilter) {
  const all = window.TRIMESTT_GUIDES || [];

  if (S.guideId) {
    const g = all.find((x) => x.id === S.guideId);
    view().innerHTML = `
      <button class="btn btn--soft btn--sm" style="margin-top:14px" data-action="guide-back">Back to guides</button>
      <div class="eyebrow" style="margin-top:16px">${esc(g.category)} · ${esc(g.read)} read</div>
      <h1 style="margin-top:4px">${esc(g.title)}</h1>
      <div class="card article">${g.body.map((para) => `<p>${esc(para)}</p>`).join('')}</div>
      <p class="muted center">General guidance. Where your hospital's instructions differ, follow theirs.</p>`;
    return;
  }

  const babyCats = ['Newborn', 'Baby care', 'Breastfeeding'];
  const pool = ageFilter === 'baby' ? all.filter((g) => babyCats.includes(g.category))
             : all.filter((g) => !babyCats.includes(g.category) || S.me.children.length);
  const cats = ['All'].concat(Array.from(new Set(pool.map((g) => g.category))));
  const shown = S.guideCat === 'All' ? pool : pool.filter((g) => g.category === S.guideCat);

  view().innerHTML = `
    ${switcher}
    <h1>Guides</h1>
    <p>${pool.length} short reads, written for mothers and checked by doctors.</p>
    <div class="chip-row" style="margin-bottom:14px">
      ${cats.map((c) => `<button class="chip" data-action="guide-cat" data-cat="${esc(c)}" aria-pressed="${S.guideCat === c}">${esc(c)}</button>`).join('')}
    </div>
    ${shown.map((g) => `
      <button class="card guide-card" data-action="guide-open" data-id="${g.id}">
        <div class="eyebrow">${esc(g.category)} · ${esc(g.read)}</div>
        <h3>${esc(g.title)}</h3>
        <p style="margin:4px 0 0">${esc(g.body[0].slice(0, 105))}…</p>
      </button>`).join('')}`;
}

/* ---------- baby ---------- */

async function babyScreen() {
  const data = await api('/patient/children/' + S.profile);
  const c = data.child;
  const switcher = switcherHtml();

  if (S.tab === 'home') {
    const next = data.immunisation.find((i) => i.status === 'due' || i.status === 'overdue')
      || data.immunisation.find((i) => i.status === 'upcoming');
    const g = data.growthCheck;
    const latest = (data.growth || [])[0];
    view().innerHTML = `
      ${switcher}
      <div class="card card--brand">
        <div class="live" style="color:rgba(255,255,255,.92)"><span class="live__dot"></span> ${esc(c.label)}</div>
        <div class="stat" style="margin-top:8px">${esc(c.name)}<small>${data.ageDays} days old · born ${pretty(c.dob)}${c.birthWeightKg ? ' · ' + c.birthWeightKg + ' kg at birth' : ''}</small></div>
      </div>

      <div class="card alert-card alert-card--t4">
        <h3>Bring the baby in now if you see</h3>
        <div class="chip-row" style="margin-top:8px">
          ${data.dangerSigns.map((s) => `<button type="button" class="chip chip--warn" data-chip="danger" data-value="${s.key}" aria-pressed="false">${esc(s.label)}</button>`).join('')}
        </div>
        <button class="btn btn--danger" style="margin-top:12px" data-action="danger-report">Tell the hospital now</button>
      </div>

      ${next ? `
      <div class="card ${next.status === 'overdue' ? 'alert-card alert-card--t3' : ''}">
        <div class="eyebrow">Next vaccines</div>
        <h3>${esc(next.age)}</h3>
        <p class="muted" style="margin:2px 0 6px">Due ${pretty(next.dueOn)}${next.status === 'overdue' ? ' · overdue' : ''}</p>
        <p style="margin:0 0 10px">${esc(next.items)}</p>
        <button class="btn btn--soft" data-action="vaccine-done" data-key="${next.key}">Mark as given</button>
      </div>` : ''}

      <div class="card">
        <div class="spread"><h3>Growth</h3>${g.status !== 'unknown' ? `<span class="tag ${g.status === 'typical' ? 'tag--sage' : 'tag--hard'}">${esc(g.status)}</span>` : ''}</div>
        ${latest && latest.weightKg
          ? `<div class="stat" style="font-size:28px;margin:6px 0 4px">${latest.weightKg} kg<small>last recorded ${pretty(latest.date)}</small></div>
             <p style="margin:6px 0 0">${esc(g.message || '')}</p>`
          : '<p style="margin:0">Add a weight in the log and we will chart it against the usual range for this age.</p>'}
        <p class="muted" style="margin:8px 0 0">Usual range at this age: ${g.low}–${g.high} kg.</p>
      </div>

      <div class="card">
        <h3>Feeding and nappies</h3>
        <p style="margin:0">${latest && latest.feeds ? latest.feeds + ' feeds' : 'No feeds logged yet'}${latest && latest.nappies ? ' · ' + latest.nappies + ' wet nappies' : ''} on ${latest ? pretty(latest.date) : 'no entries yet'}.</p>
        <p class="muted" style="margin:6px 0 0">Six or more wet nappies a day after day five is the reassuring sign.</p>
      </div>
      ${sosBlock()}`;
    return;
  }

  if (S.tab === 'plan') {
    const bands = [
      { title: 'Birth and first weeks', test: (i) => /day|week/.test(i.key) },
      { title: 'First year', test: (i) => /month/.test(i.key) && parseInt(i.key.replace('month', ''), 10) <= 12 },
      { title: 'Second year and beyond', test: (i) => /month/.test(i.key) && parseInt(i.key.replace('month', ''), 10) > 12 }
    ];
    view().innerHTML = `
      ${switcher}
      <h1>Vaccines</h1>
      <p>On the schedule your hospital follows (${esc(data.schedule)}). Tap to mark each one given.</p>
      ${bands.map((b) => {
        const rows = data.immunisation.filter(b.test);
        if (!rows.length) return '';
        return `
        <details class="planset" ${rows.some((r) => r.status === 'due' || r.status === 'overdue') ? 'open' : ''}>
          <summary>${esc(b.title)} <span class="tag">${rows.filter((r) => r.status === 'done').length}/${rows.length} given</span></summary>
          <div class="card">
            ${rows.map((i) => `
              <div class="item item--${i.status}">
                <div class="item__bar"></div>
                <div>
                  <h3>${esc(i.age)}</h3>
                  <div class="meta">Due ${pretty(i.dueOn)} · catch up by ${pretty(i.catchUpBy)}</div>
                  <p class="muted" style="margin:4px 0 0">${esc(i.items)}</p>
                </div>
                <div>
                  ${i.status === 'done' ? '<span class="tag tag--sage">Given</span>'
                    : i.status === 'overdue' ? '<span class="tag tag--red">Overdue</span>'
                    : i.status === 'due' ? '<span class="tag tag--hard">Due</span>' : ''}
                  ${i.status !== 'done' ? `<button class="btn btn--sm btn--soft" style="margin-top:6px" data-action="vaccine-done" data-key="${i.key}">Given</button>` : ''}
                </div>
              </div>`).join('')}
          </div>
        </details>`;
      }).join('')}
      <button class="btn btn--ghost" data-action="vaccine-record">Vaccination record for school</button>`;
    return;
  }

  if (S.tab === 'log') {
    view().innerHTML = `
      ${switcher}
      <h1>${esc(c.name)}'s log</h1>
      <p>Weight and feeding tell you most of what matters in the early months.</p>
      <form id="f-growth" onsubmit="return false">
        <div class="card">
          <div class="field--split">
            <div class="field"><label for="gw">Weight (kg)</label><input id="gw" name="weightKg" type="number" step="0.01" inputmode="decimal"></div>
            <div class="field"><label for="gl">Length (cm)</label><input id="gl" name="lengthCm" type="number" step="0.1" inputmode="decimal"></div>
          </div>
          <div class="field--split">
            <div class="field"><label for="gf">Feeds in 24 hours</label><input id="gf" name="feeds" type="number" inputmode="numeric"></div>
            <div class="field"><label for="gn">Wet nappies</label><input id="gn" name="nappies" type="number" inputmode="numeric"></div>
          </div>
        </div>
        <details class="more">
          <summary>Add more</summary>
          <div class="card">
            <div class="field--split">
              <div class="field"><label for="gh">Head circumference (cm)</label><input id="gh" name="headCm" type="number" step="0.1" inputmode="decimal"></div>
              <div class="field"><label for="gt">Temperature (°F)</label><input id="gt" name="temperature" type="number" step="0.1" inputmode="decimal"></div>
            </div>
          </div>
        </details>
        <div class="card alert-card alert-card--t4">
          <h3>Danger signs</h3>
          <div class="chip-row" style="margin-top:8px">
            ${data.dangerSigns.map((s) => `<button type="button" class="chip chip--warn" data-chip="danger" data-value="${s.key}" aria-pressed="false">${esc(s.label)}</button>`).join('')}
          </div>
        </div>
        <div class="field"><label for="gnote">Anything else</label><textarea id="gnote" name="note"></textarea></div>
        <button class="btn" data-action="save-growth">Save</button>
      </form>

      <h2>Milestones</h2>
      <div class="card">
        ${data.milestones.map((row) => `
          <div class="card__row" style="display:block">
            <h3>${row.m} month${row.m > 1 ? 's' : ''}</h3>
            <div class="chip-row" style="margin-top:6px">
              ${row.items.map((it) => `
                <button class="chip" data-action="milestone" data-key="${esc(row.m + ': ' + it)}"
                  aria-pressed="${data.milestonesDone[row.m + ': ' + it] ? 'true' : 'false'}">${esc(it)}</button>`).join('')}
            </div>
          </div>`).join('')}
        <p class="muted" style="margin:10px 0 0">Tap what your baby can do. If something from a past month is still not there, mention it at your next visit.</p>
      </div>

      ${data.growth.length ? `
      <h2>Recent entries</h2>
      <div class="card">
        ${data.growth.slice(0, 10).map((g) => `
          <div class="card__row">
            <div>
              <h3>${pretty(g.date)}</h3>
              <p class="muted" style="margin:0">${g.weightKg ? g.weightKg + ' kg' : '—'}${g.lengthCm ? ' · ' + g.lengthCm + ' cm' : ''}${g.feeds ? ' · ' + g.feeds + ' feeds' : ''}${g.nappies ? ' · ' + g.nappies + ' nappies' : ''}</p>
            </div>
          </div>`).join('')}
      </div>` : ''}`;
    return;
  }

  if (S.tab === 'care') return guidesScreen(switcher, 'baby');

  if (S.tab === 'records') {
    const recs = await api('/patient/records?owner=' + encodeURIComponent(S.profile));
    view().innerHTML = switcher + recordsScreen(S.profile, recs.records, recs.kinds);
    return;
  }
}

/* -------------------------------------------------------------- render -- */

async function render() {
  try {
    setTimeout(function () {
      document.querySelectorAll('[data-edd]').forEach(function (el) {
        el.addEventListener('change', refreshEdd);
        el.addEventListener('input', refreshEdd);
      });
      refreshEdd();
    }, 0);
    if (!S.token) { S.view = 'auth'; authScreen(); return; }
    if (S.role === 'hospital') {
      if (!S.hospital) await loadHospital();
      if (!S.hospital.setupComplete) { hospitalSetupScreen(); return; }
      await hospitalScreen();
      return;
    }
    if (!S.me) await loadPatient();
    await patientScreen();
  } catch (err) {
    toast(err.message, 'error');
    if (!S.token) authScreen();
  }
}

/* ------------------------------------------------------------- actions -- */

const ACTIONS = {
  async mode(el) { S.authMode = el.dataset.mode; authScreen(); },

  async 'patient-login'() {
    const f = form('f-patient');
    const data = await api('/patient/login', 'POST', f);
    setSession(data.token, 'patient', data.number);
    S.me = null; S.tab = 'home'; S.profile = 'mother';
    await render();
    toast('Welcome back.', 'ok');
  },

  async activate() {
    const f = form('f-activate');
    const data = await api('/patient/activate', 'POST', f);
    setSession(data.token, 'patient', data.number);
    S.me = null; S.tab = 'home';
    await render();
    toast('Your account is ready.', 'ok');
  },

  async 'do-reset'() {
    const data = await api('/patient/reset', 'POST', form('f-forgot'));
    setSession(data.token, 'patient', data.number);
    S.me = null; S.tab = 'home';
    await render();
    toast('Password changed. Everything else is as you left it.', 'ok');
  },

  async 'hospital-login'() {
    const data = await api('/hospital/login', 'POST', form('f-hospital'));
    setSession(data.token, 'hospital');
    S.hospital = data.hospital; S.me = data.user; S.tab = 'home';
    applyBrand(S.hospital.colour);
    await render();
  },

  async signup() {
    const data = await api('/hospital/signup', 'POST', form('f-signup'));
    setSession(data.token, 'hospital');
    S.hospital = data.hospital; S.me = data.user;
    await render();
    toast('Account created. Finish your setup.', 'ok');
  },

  async 'save-setup'() {
    const f = form('f-setup');
    const payload = {
      name: f.name, address: f.address, city: f.city, phone: f.phone,
      labourRoomPhone: f.labourRoomPhone, colour: f.colour,
      immunisationSchedule: f.immunisationSchedule,
      thresholds: {
        systolicHigh: f.systolicHigh, diastolicHigh: f.diastolicHigh,
        fastingSugarHigh: f.fastingSugarHigh, postMealSugarHigh: f.postMealSugarHigh
      }
    };
    if (S.cache.logo) payload.logo = S.cache.logo;
    const data = await api('/hospital/profile', 'PUT', payload);
    S.hospital = data.hospital;
    S.cache.logo = null;
    applyBrand(S.hospital.colour);
    await render();
    toast(S.hospital.setupComplete ? 'Setup saved.' : 'Saved. Address, city and both phone numbers are still needed.', S.hospital.setupComplete ? 'ok' : 'error');
  },

  async register() {
    const f = form('f-reg');
    f.riskTags = pressedChips('risk');
    const data = await api('/hospital/patients', 'POST', f);
    view().innerHTML = `
      <h1>${esc(data.patient.name)} is registered</h1>
      <p>Give her these two things now. She uses them once, then sets her own password.</p>
      <div class="card">
        <div class="eyebrow">Patient ID</div>
        <div class="code-box" style="letter-spacing:.1em;font-size:19px">${esc(data.patient.number)}</div>
        <div class="eyebrow">Activation code</div>
        <div class="code-box">${esc(data.activationCode)}</div>
      </div>
      <div class="card card--flat">
        <h3>Due date</h3>
        <p style="margin:0">${pretty(data.patient.edd)}</p>
      </div>
      <button class="btn" data-action="tab" data-tab="register">Register another</button>
      <div style="height:8px"></div>
      <button class="btn btn--soft" data-action="tab" data-tab="patients">See all patients</button>`;
    toast('Registered. ' + rupees(4999) + ' billed.', 'ok');
  },

  async 'staff-add'() {
    await api('/hospital/staff', 'POST', form('f-staff'));
    await render();
    toast('Login created.', 'ok');
  },

  async 'hospital-recover'() {
    const data = await api('/hospital/recover', 'POST', form('f-hrecover'));
    toast(data.hint, data.found ? 'ok' : 'error');
  },

  async 'staff-reset'(el) {
    const data = await api('/hospital/staff/' + el.dataset.id + '/reset', 'POST');
    view().innerHTML = `
      <h1>New password for ${esc(data.name)}</h1>
      <p>${esc(data.message)}</p>
      <div class="card">
        <div class="eyebrow">${esc(data.email)}</div>
        <div class="code-box" style="font-size:20px;letter-spacing:.08em">${esc(data.password)}</div>
      </div>
      <button class="btn btn--soft" data-action="tab" data-tab="staff">Back to staff</button>`;
  },

  async 'change-password'() {
    await api('/hospital/password', 'POST', form('f-mypw'));
    await render();
    toast('Password changed.', 'ok');
  },

  async 'staff-remove'(el) {
    if (!confirm('Remove this login? They will be signed out immediately.')) return;
    await api('/hospital/staff/' + el.dataset.id + '/remove', 'POST');
    await render();
    toast('Login removed.', 'ok');
  },

  async 'issue-reset'(el) {
    const data = await api('/hospital/patients/' + el.dataset.id + '/reset', 'POST');
    view().innerHTML = `
      <h1>Reset code for ${esc(data.number)}</h1>
      <p>${esc(data.message)}</p>
      <div class="card">
        <div class="eyebrow">Give her this code</div>
        <div class="code-box">${esc(data.code)}</div>
        <p class="muted" style="margin:0">She opens the app, taps <b>Forgot password?</b>, and enters her patient ID and this code.</p>
      </div>
      <button class="btn btn--soft" data-action="tab" data-tab="patients">Back to patients</button>`;
  },

  async ack(el) {
    await api('/hospital/alerts/' + el.dataset.id + '/acknowledge', 'POST');
    await render();
    toast('Acknowledged.', 'ok');
  },

  async 'confirm-pending'(el) {
    const data = await api('/hospital/pending/' + el.dataset.id + '/confirm', 'POST');
    view().innerHTML = `
      <h1>${esc(data.patient.name)} is enrolled</h1>
      <p>Give her these two things now.</p>
      <div class="card">
        <div class="eyebrow">Patient ID</div>
        <div class="code-box" style="letter-spacing:.1em;font-size:19px">${esc(data.patient.number)}</div>
        <div class="eyebrow">Activation code</div>
        <div class="code-box">${esc(data.activationCode)}</div>
      </div>
      <button class="btn btn--soft" data-action="tab" data-tab="pending">Back to incoming</button>`;
  },

  async 'reject-pending'(el) {
    await api('/hospital/pending/' + el.dataset.id + '/reject', 'POST');
    await render();
    toast('Removed from the list.', 'ok');
  },

  async 'import-csv'() {
    const data = await api('/hospital/import', 'POST', { csv: $('#csvbox').value });
    await render();
    toast(data.queued + ' queued, ' + data.rejected.length + ' skipped.', data.rejected.length ? 'error' : 'ok');
  },

  async 'make-key'() {
    if (!confirm('Create a new key? Any key you gave your vendor earlier stops working.')) return;
    await api('/hospital/apikey', 'POST');
    await render();
    toast('New key created.', 'ok');
  },

  async 'close-alert'(el) {
    const note = prompt('Anything to add? (optional)') || '';
    await api('/hospital/alerts/' + el.dataset.id + '/action', 'POST',
      { outcome: el.dataset.outcome, note });
    await render();
    toast('Recorded.', 'ok');
  },

  async 'export-csv'() {
    const data = await api('/hospital/reports.csv');
    const blob = new Blob([data.csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url; a.download = data.filename;
    document.body.appendChild(a); a.click(); document.body.removeChild(a);
    URL.revokeObjectURL(url);
    toast('Downloaded.', 'ok');
  },

  async 'mark-paid'(el) {
    await api('/hospital/payments/' + el.dataset.id + '/paid', 'POST');
    await render();
    toast('Marked paid.', 'ok');
  },

  async tab(el) { S.tab = el.dataset.tab; S.guideId = null; await render(); },

  async profile(el) { S.profile = el.dataset.profile; S.tab = 'home'; await render(); },

  async 'mark-done'(el) {
    await api('/patient/schedule/' + el.dataset.key + '/done', 'POST');
    await render();
    toast('Marked as done.', 'ok');
  },

  async water(el) {
    const data = await api('/patient/water', 'POST', { ml: Number(el.dataset.ml) });
    await render();
    toast('Logged. ' + data.drunkMl + ' ml today.', 'ok');
  },

  async 'record-upload'(el) {
    const file = await readFile($('#rcf'));
    if (!file) { toast('Choose a file first.', 'error'); return; }
    const f = form('f-record');
    await api('/patient/records', 'POST', {
      owner: el.dataset.owner, kind: f.kind, title: f.title, takenOn: f.takenOn, file
    });
    await render();
    toast('Added to your records.', 'ok');
  },

  async 'record-delete'(el) {
    if (!confirm('Remove this document?')) return;
    await api('/patient/records/' + el.dataset.id + '/delete', 'POST');
    await render();
    toast('Removed.', 'ok');
  },

  async milestone(el) {
    const done = el.getAttribute('aria-pressed') === 'true';
    await api('/patient/children/' + S.profile + '/milestone', 'POST', { key: el.dataset.key, done: !done });
    el.setAttribute('aria-pressed', String(!done));
  },

  async 'danger-report'() {
    const signs = pressedChips('danger');
    if (!signs.length) { toast('Tap what you can see first.', 'error'); return; }
    const data = await api('/patient/children/' + S.profile + '/growth', 'POST',
      { date: today(), dangerSigns: signs });
    await render();
    toast(data.message, 'error');
  },

  async 'vaccine-record'() {
    const data = await api('/patient/children/' + S.profile);
    const given = data.immunisation.filter((i) => i.status === 'done');
    view().innerHTML = `
      <h1>Vaccination record</h1>
      <p class="muted">${esc(data.child.name)} · born ${pretty(data.child.dob)} · ${esc(S.hospital.name)}</p>
      <div class="card">
        ${given.length ? given.map((i) => `
          <div class="card__row"><div><h3>${esc(i.age)}</h3><p class="muted" style="margin:0">${esc(i.items)}</p></div></div>`).join('')
        : '<p style="margin:0">Nothing marked as given yet.</p>'}
      </div>
      <div class="btn-row">
        <button class="btn" data-action="print">Print or save as PDF</button>
        <button class="btn btn--soft" data-action="tab" data-tab="plan">Back</button>
      </div>`;
  },

  async print() { window.print(); },

  async 'save-log'() {
    const f = form('f-log');
    const meds = pressedChips('meds');
    const photo = await readFile($('#lph'));
    const payload = Object.assign({}, f, {
      photo: photo,
      date: today(),
      symptoms: pressedChips('symptom'),
      medicinesTaken: meds.includes('taken'),
      missedSupplement: meds.includes('missedSupplement'),
      missedCriticalMedicine: meds.includes('missedCritical')
    });
    const data = await api('/patient/logs', 'POST', payload);
    S.tab = 'home';
    await render();
    toast(data.message, data.raised ? 'error' : 'ok');
  },

  async sos() {
    if (!confirm('This tells your hospital you are in pain and shares your details with them. Continue?')) return;
    const data = await api('/patient/sos', 'POST', { kind: 'labour' });
    view().innerHTML = `
      <div class="card alert-card alert-card--t4">
        <h1 style="margin-top:6px">Your hospital has been told</h1>
        <p style="font-size:16px;color:var(--ink)">${esc(data.instruction)}</p>
        <a class="btn btn--danger" href="tel:${esc(data.call)}" style="text-decoration:none">Call ${esc(data.call)}</a>
      </div>
      <div class="card">
        <h3>What they can see</h3>
        <p style="margin:0">Your name, how many weeks you are, blood group, your risk notes and your consultant.</p>
      </div>
      <button class="btn btn--soft" data-action="tab" data-tab="home">Back</button>`;
  },

  async 'add-child'() {
    S.tab = 'newbaby';
    view().innerHTML = `
      <h1>Add your baby</h1>
      <p>Once this is saved, the baby's own care starts — vaccines, growth and danger signs.</p>
      <form id="f-baby" onsubmit="return false">
        <div class="card">
          <div class="field"><label for="bn">Baby's name</label><input id="bn" name="name" placeholder="You can change this later"></div>
          <div class="field"><label for="bd">Date of birth</label><input id="bd" name="dob" type="date" max="${today()}" value="${today()}"></div>
          <div class="field--split">
            <div class="field"><label for="bw">Birth weight (kg)</label><input id="bw" name="birthWeightKg" type="number" step="0.01" inputmode="decimal"></div>
            <div class="field"><label for="bg">Weeks at birth</label><input id="bg" name="gestationAtBirthWeeks" type="number" inputmode="numeric"></div>
          </div>
          <div class="field">
            <label for="bs">Boy or girl</label>
            <select id="bs" name="sex"><option value="">Prefer not to say</option><option value="boy">Boy</option><option value="girl">Girl</option></select>
            <p class="hint">Used only to read the right growth chart after birth.</p>
          </div>
          <div class="field">
            <label for="bm">Delivery</label>
            <select id="bm" name="deliveryMode"><option value="">Select</option><option>Normal</option><option>Caesarean</option><option>Assisted</option></select>
          </div>
          <div class="field"><label for="bp">Paediatrician</label><input id="bp" name="paediatrician"></div>
          <button class="btn" data-action="save-baby">Add baby</button>
        </div>
      </form>
      <button class="btn btn--soft" data-action="profile" data-profile="mother">Cancel</button>`;
  },

  async 'save-baby'() {
    const data = await api('/patient/children', 'POST', form('f-baby'));
    S.me = null;
    S.profile = data.child.id;
    S.tab = 'home';
    await render();
    toast(data.child.label + ' added.', 'ok');
  },

  async 'vaccine-done'(el) {
    await api('/patient/children/' + S.profile + '/vaccine', 'POST', { key: el.dataset.key });
    await render();
    toast('Recorded.', 'ok');
  },

  async 'save-growth'() {
    const f = form('f-growth');
    f.date = today();
    f.dangerSigns = pressedChips('danger');
    const data = await api('/patient/children/' + S.profile + '/growth', 'POST', f);
    await render();
    toast(data.message, data.raised ? 'error' : 'ok');
  },

  async 'open-notes'() { S.tab = 'notes'; S.guideId = null; await render(); },

  async 'open-hospital-alerts'() { S.tab = 'alerts'; await render(); },

  async 'guide-cat'(el) { S.guideCat = el.dataset.cat; await render(); },

  async 'guide-open'(el) { S.guideId = el.dataset.id; await render(); },

  async 'guide-back'() { S.guideId = null; await render(); },

  async signout() { signOut(); }
};

document.addEventListener('click', async (event) => {
  const chip = event.target.closest('[data-chip]');
  if (chip) {
    chip.setAttribute('aria-pressed', chip.getAttribute('aria-pressed') === 'true' ? 'false' : 'true');
    return;
  }
  const el = event.target.closest('[data-action]');
  if (!el) return;
  const action = ACTIONS[el.dataset.action];
  if (!action) return;
  event.preventDefault();
  el.disabled = true;
  try {
    await action(el);
  } catch (err) {
    toast(err.message, 'error');
  } finally {
    el.disabled = false;
  }
});

document.addEventListener('keydown', (event) => {
  if (event.key !== 'Enter') return;
  const inForm = event.target.closest('form');
  if (!inForm) return;
  const button = inForm.querySelector('[data-action]');
  if (button) { event.preventDefault(); button.click(); }
});

render();

if ('serviceWorker' in navigator) {
  window.addEventListener('load', function () {
    navigator.serviceWorker.register('/sw.js').catch(function () {});
  });
}
