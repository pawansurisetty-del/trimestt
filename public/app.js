'use strict';
/* Trimestt app. One file, no framework. Screens render to strings, then get
   wired by data-action attributes. */

const S = {
  token: localStorage.getItem('trimestt_token') || '',
  role: localStorage.getItem('trimestt_role') || '',
  view: 'auth',
  authMode: 'choose',
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

function setSession(token, role) {
  S.token = token; S.role = role;
  localStorage.setItem('trimestt_token', token);
  localStorage.setItem('trimestt_role', role);
}

function signOut(silent) {
  if (S.token) api('/logout', 'POST').catch(() => {});
  S.token = ''; S.role = ''; S.me = null; S.hospital = null; S.view = 'auth'; S.tab = 'home'; S.profile = 'mother';
  localStorage.removeItem('trimestt_token');
  localStorage.removeItem('trimestt_role');
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
      <span class="dot"></span>${esc(t.label)}
    </button>`).join('') + `</div>`;
}

/* ---------------------------------------------------------------- auth -- */

function authScreen() {
  $('#chrome').innerHTML = '';
  $('#tabs').innerHTML = '';
  view().classList.add('screen--center');

  const patient = `
    <form id="f-patient" onsubmit="return false">
      <div class="field">
        <label for="pid">Patient ID</label>
        <input id="pid" name="patientId" placeholder="TRM-XXX01-0001" autocapitalize="characters" autocomplete="username">
      </div>
      <div class="field">
        <label for="ppw">Password</label>
        <input id="ppw" name="password" type="password" autocomplete="current-password">
      </div>
      <button class="btn" data-action="patient-login">Open my care</button>
      <p class="linkline">First time here?
        <button data-action="mode" data-mode="activate">Activate with your code</button>
      </p>
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
      <p class="linkline">New hospital?
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

  const panels = { choose, patient, activate, hospital, signup };
  const titles = {
    choose: 'Welcome to Trimestt',
    patient: 'Welcome back',
    activate: 'Set up your account',
    hospital: 'Hospital sign in',
    signup: 'Create a hospital account'
  };
  const subs = {
    choose: 'Pregnancy and child care, from your hospital.',
    patient: 'Sign in with the ID your hospital gave you.',
    activate: 'You only do this once.',
    hospital: 'Sign in to your hospital account.',
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
  const h = S.hospital;
  const openAlerts = await api('/hospital/alerts');
  $('#chrome').innerHTML = appbar(h.name, 'Trimestt dashboard · ' + h.code,
    { signOut: true, bell: openAlerts.open.length, bellAction: 'open-hospital-alerts' });
  $('#tabs').innerHTML = tabbar([
    { key: 'home', label: 'Today' },
    { key: 'patients', label: 'Patients' },
    { key: 'register', label: 'Register' },
    { key: 'alerts', label: 'Alerts' },
    { key: 'money', label: 'Billing' }
  ]);

  if (S.tab === 'home') {
    const data = await api('/hospital/summary');
    const s = data.summary;
    view().innerHTML = `
      <h1>Today</h1>
      <div class="card card--brand">
        <div class="stat-grid">
          <div><div class="stat">${s.patients}<small>Mothers</small></div></div>
          <div><div class="stat">${s.children}<small>Children</small></div></div>
        </div>
      </div>
      <div class="stat-grid">
        <div class="card"><div class="stat" style="color:var(--alert)">${s.redAlerts}<small>Red alerts open</small></div></div>
        <div class="card"><div class="stat">${s.openAlerts}<small>All open alerts</small></div></div>
      </div>
      <div class="card">
        <div class="spread"><h3>Activation</h3><span class="tag">${s.activated} of ${s.patients}</span></div>
        <p class="muted">Patients who finished setting up their app. If this number lags, the front desk needs a nudge.</p>
      </div>
      <div class="card">
        <div class="spread"><h3>Billed this period</h3><span class="tag tag--sage">${rupees(s.collected)} collected</span></div>
        <p class="muted">${rupees(s.billed)} raised across mothers and children.</p>
      </div>`;
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
          ${p.riskTags.length ? `<div class="chip-row" style="margin-bottom:8px">${p.riskTags.map((t) => `<span class="tag tag--hard">${esc(t)}</span>`).join('')}</div>` : ''}
          ${p.activated
            ? `<span class="tag tag--sage">App active</span>`
            : `<div class="pill-note">Not activated yet. Code: <strong>${esc(p.activationCode)}</strong></div>`}
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
          <input id="rl" name="lmp" type="date" max="${today()}">
          <p class="hint">Or leave blank and enter a scan-confirmed due date below.</p>
        </div>
        <div class="field"><label for="re">Due date (if known from scan)</label><input id="re" name="edd" type="date"></div>
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
          <div class="field"><label for="rc">Consultant</label><input id="rc" name="consultant"></div>
        </div>
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
      ${a.state === 'open'
        ? `<button class="btn btn--soft" data-action="ack" data-id="${a.id}">Acknowledge</button>`
        : `<span class="tag tag--sage">Handled by ${esc(a.acknowledgedBy || 'staff')}</span>`}
    </div>`;
}

/* ------------------------------------------------------------- patient -- */

async function loadPatient() {
  const data = await api('/patient/me');
  S.me = data;
  S.hospital = data.hospital;
  applyBrand(S.hospital.colour);
}

async function patientScreen() {
  view().classList.remove('screen--center');
  const h = S.hospital;
  const m = S.me.mother;
  const feed = await api('/patient/notifications');
  S.notifications = feed.notifications;
  S.unread = feed.unread;
  $('#chrome').innerHTML = appbar(h.name, h.city ? h.city : 'Trimestt', { signOut: true, bell: S.unread });
  $('#tabs').innerHTML = tabbar([
    { key: 'home', label: 'Home' },
    { key: 'plan', label: 'Plan' },
    { key: 'log', label: 'Log' },
    { key: 'care', label: 'Care' },
    { key: 'money', label: 'Payments' }
  ]);

  const switcher = `
    <div class="switcher">
      <button data-action="profile" data-profile="mother" aria-pressed="${S.profile === 'mother'}">Mother</button>
      ${S.me.children.map((c) => `
        <button data-action="profile" data-profile="${c.id}" aria-pressed="${S.profile === c.id}">${esc(c.label)}</button>`).join('')}
      <button class="add" data-action="add-child">+ Add baby</button>
    </div>`;

  if (S.profile !== 'mother') return childScreen(switcher);

  if (S.tab === 'notes') {
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
      await api('/patient/notifications/read', 'POST');
      S.unread = 0;
      $('#chrome').innerHTML = appbar(h.name, h.city ? h.city : 'Trimestt', { signOut: true, bell: 0 });
    }
    return;
  }

  if (S.tab === 'home') {
    const sched = await api('/patient/schedule');
    const next = sched.plan.find((i) => i.status === 'open') || sched.plan.find((i) => i.status === 'upcoming');
    const missed = sched.plan.filter((i) => i.status === 'missed' && i.hard);
    view().innerHTML = `
      ${switcher}
      <div class="card card--brand">
        <div class="eyebrow" style="color:rgba(255,255,255,.8)">You are at</div>
        <div class="stat">${esc(m.gestation.label)}<small>Trimestter ${m.gestation.trimestter} · EDD ${pretty(m.edd)}</small></div>
      </div>
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
        <h3>Today</h3>
        <p class="muted" style="margin-bottom:10px">Log your readings so your hospital can see how you are doing.</p>
        <button class="btn btn--ghost" data-action="tab" data-tab="log">Open today's log</button>
      </div>
      <div class="card card--flat">
        <h3>Your care team</h3>
        <p style="margin:0">${esc(m.consultant || h.name)}<br><span class="muted">${esc(h.phone)}</span></p>
      </div>
      ${sosBlock()}`;
    return;
  }

  if (S.tab === 'plan') {
    const sched = await api('/patient/schedule');
    view().innerHTML = `
      ${switcher}
      <h1>Your plan</h1>
      <p>Built from your dates. Windows matter more than exact days.</p>
      <div class="card">
        ${sched.plan.map((i) => `
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
      </div>`;
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
          <div class="field--split">
            <div class="field"><label for="lf">Fasting sugar</label><input id="lf" name="fastingSugar" type="number" inputmode="numeric"></div>
            <div class="field"><label for="lp">Post-meal sugar</label><input id="lp" name="postMealSugar" type="number" inputmode="numeric"></div>
          </div>
        </div>
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
        </div>
        <div class="field"><label for="ln">Anything else</label><textarea id="ln" name="note"></textarea></div>
        <button class="btn" data-action="save-log">Save today's log</button>
      </form>
      ${sosBlock()}`;
    return;
  }

  if (S.tab === 'care') {
    const all = window.TRIMESTT_GUIDES || [];

    if (S.guideId) {
      const g = all.find((x) => x.id === S.guideId);
      view().innerHTML = `
        <button class="btn btn--soft btn--sm" style="margin-top:14px" data-action="guide-back">Back to guides</button>
        <div class="eyebrow" style="margin-top:16px">${esc(g.category)} · ${esc(g.read)} read</div>
        <h1 style="margin-top:4px">${esc(g.title)}</h1>
        <div class="card article">
          ${g.body.map((para) => `<p>${esc(para)}</p>`).join('')}
        </div>
        <p class="muted center">General guidance. Where your hospital's instructions differ, follow theirs.</p>`;
      return;
    }

    const cats = ['All'].concat(Array.from(new Set(all.map((g) => g.category))));
    const shown = S.guideCat === 'All' ? all : all.filter((g) => g.category === S.guideCat);

    view().innerHTML = `
      ${switcher}
      <h1>Guides</h1>
      <p>${all.length} short reads covering pregnancy, delivery, feeding and your baby.</p>
      <div class="chip-row" style="margin-bottom:14px">
        ${cats.map((c) => `<button class="chip" data-action="guide-cat" data-cat="${esc(c)}" aria-pressed="${S.guideCat === c}">${esc(c)}</button>`).join('')}
      </div>
      ${shown.map((g) => `
        <button class="card guide-card" data-action="guide-open" data-id="${g.id}">
          <div class="eyebrow">${esc(g.category)} · ${esc(g.read)}</div>
          <h3>${esc(g.title)}</h3>
          <p style="margin:4px 0 0">${esc(g.body[0].slice(0, 105))}…</p>
        </button>`).join('')}`;
    return;
  }

  if (S.tab === 'money') {
    const data = await api('/patient/payments');
    view().innerHTML = `
      ${switcher}
      <h1>Payments</h1>
      <p>Handled by your hospital. Nothing is charged inside the app.</p>
      ${data.payments.map((p) => `
        <div class="card">
          <div class="spread">
            <div>
              <h3>${esc(p.label)}</h3>
              <p class="muted" style="margin:0">${p.kind === 'mother' ? 'Pregnancy through six weeks after delivery' : 'One child, first year of care'}</p>
            </div>
            <div style="text-align:right">
              <div style="font-weight:800">${rupees(p.amount)}</div>
              <span class="tag ${p.status === 'paid' ? 'tag--sage' : 'tag--hard'}">${p.status === 'paid' ? 'Paid' : 'Pending'}</span>
            </div>
          </div>
        </div>`).join('')}
      <div class="card card--flat">
        <h3>Adding another baby</h3>
        <p style="margin:0">Each child added costs ${rupees(data.childFee)}, billed by your hospital.</p>
      </div>`;
  }
}

function sosBlock() {
  return `
    <div class="sos">
      <button class="btn btn--danger" data-action="sos">I am having pains — tell the hospital</button>
      <p class="muted center" style="margin-top:8px">This calls your hospital and sends your details to them.</p>
    </div>`;
}

async function childScreen(switcher) {
  const data = await api('/patient/children/' + S.profile);
  const c = data.child;
  const months = Math.floor(data.ageDays / 30.44);
  const next = data.immunisation.find((i) => i.status === 'due' || i.status === 'overdue')
    || data.immunisation.find((i) => i.status === 'upcoming');

  view().innerHTML = `
    ${switcher}
    <div class="card card--brand">
      <div class="eyebrow" style="color:rgba(255,255,255,.8)">${esc(c.label)}</div>
      <div class="stat">${esc(c.name)}<small>${data.ageDays} days old · born ${pretty(c.dob)}</small></div>
    </div>

    ${next ? `
    <div class="card ${next.status === 'overdue' ? 'alert-card alert-card--t3' : ''}">
      <div class="eyebrow">Next vaccines</div>
      <h3>${esc(next.age)} — ${esc(next.items)}</h3>
      <p class="muted" style="margin:4px 0 10px">Due ${pretty(next.dueOn)}${next.status === 'overdue' ? ' · overdue' : ''}</p>
      <button class="btn btn--soft" data-action="vaccine-done" data-key="${next.key}">Mark as given</button>
    </div>` : ''}

    <div class="card alert-card alert-card--t4">
      <h3>Bring the baby in now if you see</h3>
      <div class="chip-row" style="margin-top:8px">
        ${data.dangerSigns.map((s) => `<button type="button" class="chip chip--warn" data-chip="danger" data-value="${s.key}" aria-pressed="false">${esc(s.label)}</button>`).join('')}
      </div>
      <p class="muted" style="margin:10px 0 0">Tap what you see, then save below. Your hospital is told straight away.</p>
    </div>

    <div class="card">
      <h3>Growth and feeding</h3>
      <form id="f-growth" onsubmit="return false">
        <div class="field--split">
          <div class="field"><label for="gw">Weight (kg)</label><input id="gw" name="weightKg" type="number" step="0.01" inputmode="decimal"></div>
          <div class="field"><label for="gl">Length (cm)</label><input id="gl" name="lengthCm" type="number" step="0.1" inputmode="decimal"></div>
        </div>
        <div class="field"><label for="gf">Feeds in 24 hours</label><input id="gf" name="feeds" type="number" inputmode="numeric"></div>
        <button class="btn" data-action="save-growth">Save</button>
      </form>
    </div>

    <h2>Immunisation (${esc(data.schedule)})</h2>
    <div class="card">
      ${data.immunisation.map((i) => `
        <div class="item item--${i.status}">
          <div class="item__bar"></div>
          <div>
            <h3>${esc(i.age)}</h3>
            <div class="meta">Due ${pretty(i.dueOn)}</div>
            <p class="muted" style="margin:4px 0 0">${esc(i.items)}</p>
          </div>
          <div>
            ${i.status === 'done' ? '<span class="tag tag--sage">Given</span>'
              : i.status === 'overdue' ? '<span class="tag tag--red">Overdue</span>'
              : i.status === 'due' ? '<span class="tag tag--hard">Due</span>' : ''}
          </div>
        </div>`).join('')}
    </div>

    ${data.growth.length ? `
    <h2>Recent entries</h2>
    <div class="card">
      ${data.growth.slice(0, 8).map((g) => `
        <div class="card__row">
          <div>
            <h3>${pretty(g.date)}</h3>
            <p class="muted" style="margin:0">${g.weightKg ? g.weightKg + ' kg' : '—'}${g.lengthCm ? ' · ' + g.lengthCm + ' cm' : ''}${g.feeds ? ' · ' + g.feeds + ' feeds' : ''}</p>
          </div>
        </div>`).join('')}
    </div>` : ''}`;
}

/* -------------------------------------------------------------- render -- */

async function render() {
  try {
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
    setSession(data.token, 'patient');
    S.me = null; S.tab = 'home'; S.profile = 'mother';
    await render();
    toast('Welcome back.', 'ok');
  },

  async activate() {
    const f = form('f-activate');
    const data = await api('/patient/activate', 'POST', f);
    setSession(data.token, 'patient');
    S.me = null; S.tab = 'home';
    await render();
    toast('Your account is ready.', 'ok');
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

  async ack(el) {
    await api('/hospital/alerts/' + el.dataset.id + '/acknowledge', 'POST');
    await render();
    toast('Acknowledged.', 'ok');
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

  async 'save-log'() {
    const f = form('f-log');
    const meds = pressedChips('meds');
    const payload = Object.assign({}, f, {
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
    const name = prompt('Baby\'s name (you can change it later)');
    if (name === null) return;
    const dob = prompt('Date of birth (YYYY-MM-DD)', today());
    if (!dob) return;
    const data = await api('/patient/children', 'POST', { name: name || 'Baby', dob });
    S.me = null;
    S.profile = data.child.id;
    await render();
    toast(data.child.label + ' added. ' + rupees(data.fee) + ' billed by your hospital.', 'ok');
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
