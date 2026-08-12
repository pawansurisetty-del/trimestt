'use strict';
/* Trimestt app. One file, no framework. Screens render to strings, then get
   wired by data-action attributes. */

const S = {
  token: localStorage.getItem('trimestt_token') || '',
  role: localStorage.getItem('trimestt_role') || '',
  knownPatient: localStorage.getItem('trimestt_patient') || '',
  lang: localStorage.getItem('trimestt_lang') || 'en',
  langOpen: false,
  view: 'auth',
  authMode: localStorage.getItem('trimestt_patient') ? 'patient' : 'choose',
  tab: 'home',
  profile: 'mother',
  guideCat: 'All',
  kick: null,
  rxPatient: null,
  fhrPatient: null,
  listenPatient: null,
  guideId: null,
  me: null,
  hospital: null,
  cache: {}
};

const $ = (sel) => document.querySelector(sel);
const view = () => $('#screen');

/** Translate a key. Falls back to English rather than showing a blank. */
function T(key) {
  const dict = (window.TRIMESTT_STRINGS || {})[S.lang] || {};
  const fallback = (window.TRIMESTT_STRINGS || {}).en || {};
  return dict[key] || fallback[key] || key;
}

/** A guide in her language where one exists, otherwise English with a note. */
function localisedGuide(g) {
  const set = (window.TRIMESTT_GUIDE_TRANSLATIONS || {})[S.lang] || {};
  const t = set[g.id];
  return t
    ? { title: t.title, body: t.body, translated: true }
    : { title: g.title, body: g.body, translated: S.lang === 'en' };
}

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
      ${opts.lang ? langMenu() : ''}
      ${opts.bell !== undefined ? `
        <button class="bell" data-action="${opts.bellAction || 'open-notes'}" aria-label="Notifications">
          <svg viewBox="0 0 24 24"><path d="M18 8a6 6 0 1 0-12 0c0 7-3 8-3 8h18s-3-1-3-8"/><path d="M13.7 21a2 2 0 0 1-3.4 0"/></svg>
          ${opts.bell > 0 ? `<span class="bell__count">${opts.bell > 9 ? '9+' : opts.bell}</span>` : ''}
        </button>` : ''}
      ${opts.signOut ? `<button data-action="signout">${esc(T('signOut'))}</button>` : ''}
    </div>`;
}

function tabbar(tabs) {
  return `<div class="tabbar">` + tabs.map((t) => `
    <button data-action="tab" data-tab="${t.key}" aria-current="${S.tab === t.key}">
      ${icon(t.icon || t.key)}<span>${esc(t.label)}</span>
    </button>`).join('') + `</div>`;
}

/* ---------------------------------------------------------------- auth -- */

/** The terms she must read and tick before an account is made. */
async function loadTerms() {
  const box = $('#termsbox');
  if (!box) return;
  const idInput = $('#aid');
  const query = idInput && idInput.value ? '?patientId=' + encodeURIComponent(idInput.value) : '';
  try {
    const data = await api('/terms' + query);
    S.termsVersion = data.terms.version;
    box.innerHTML =
      `<h4>${esc(T('whatWeCollect'))}</h4>` +
      data.terms.items.map((i) => `<p>• <b>${esc(i.what)}</b> — ${esc(i.why)}</p>`).join('') +
      data.terms.sections.map((sec) => `<h4>${esc(sec.h)}</h4><p>${esc(sec.p)}</p>`).join('');
  } catch (err) {
    box.textContent = err.message;
  }
}

/** Globe and the current code, top right. Opens a small menu. */
function langMenu() {
  const current = (window.TRIMESTT_LANGS || []).find((l) => l.code === S.lang) || { code: 'en' };
  return `
    <div class="langmenu ${S.langOpen ? 'is-open' : ''}">
      <button class="langbtn" data-action="lang-toggle" aria-expanded="${!!S.langOpen}" aria-label="${esc(T('language'))}">
        <svg viewBox="0 0 24 24" class="ic"><circle cx="12" cy="12" r="9"/><path d="M3 12h18"/><path d="M12 3a15 15 0 0 1 0 18a15 15 0 0 1 0-18"/></svg>
        <span>${esc(current.code.toUpperCase())}</span>
      </button>
      ${S.langOpen ? `
      <div class="langlist" role="menu">
        ${(window.TRIMESTT_LANGS || []).map((l) => `
          <button role="menuitem" data-action="set-lang" data-lang="${l.code}" aria-pressed="${S.lang === l.code}">
            <span>${esc(l.native)}</span><small>${esc(l.label)}</small>
          </button>`).join('')}
      </div>` : ''}
    </div>`;
}

function authScreen() {
  $('#chrome').innerHTML = '';
  $('#tabs').innerHTML = '';
  view().classList.add('screen--center');
  document.body.classList.remove('staff');

  const patient = `
    <form id="f-patient" onsubmit="return false">
      <div class="field">
        <label for="pid">${esc(T('patientId'))}</label>
        <input id="pid" name="patientId" value="${esc(S.knownPatient)}" placeholder="TRM-XXX01-0001" autocapitalize="characters" autocomplete="username">
      </div>
      <div class="field">
        <label for="ppw">${esc(T('password'))}</label>
        <input id="ppw" name="password" type="password" autocomplete="current-password">
      </div>
      <button class="btn" data-action="patient-login">${esc(T('openMyCare'))}</button>
      <p class="linkline">
        <button data-action="mode" data-mode="forgot">${esc(T('forgotPassword'))}</button>
      </p>
      <p class="linkline" style="margin-top:6px">
        <button data-action="mode" data-mode="activate">${esc(T('firstTime'))}</button>
      </p>
      ${S.knownPatient ? `<p class="linkline" style="margin-top:6px">
        <button data-action="forget-device">${esc(T('notYou'))}</button>
      </p>` : ''}
    </form>`;

  const forgot = `
    <form id="f-forgot" onsubmit="return false">
      <p class="muted">Ask your hospital for a reset code. It works once, and nothing in your record changes.</p>
      <div class="field">
        <label for="fid">${esc(T('patientId'))}</label>
        <input id="fid" name="patientId" value="${esc(S.knownPatient)}" autocapitalize="characters">
      </div>
      <div class="field">
        <label for="fcode">${esc(T('resetCode'))}</label>
        <input id="fcode" name="code" placeholder="ABC123" autocapitalize="characters" maxlength="6">
      </div>
      <div class="field">
        <label for="fpw">${esc(T('newPassword'))}</label>
        <input id="fpw" name="password" type="password" autocomplete="new-password">
        <p class="hint">At least 8 characters, with a letter and a number.</p>
      </div>
      <button class="btn" data-action="do-reset">${esc(T('setNewPassword'))}</button>
      <p class="linkline"><button data-action="mode" data-mode="patient">${esc(T('backToSignIn'))}</button></p>
    </form>`;

  const activate = `
    <form id="f-activate" onsubmit="return false">
      <p class="muted">Your hospital gave you a patient ID and a six-character code. Set your own password now.</p>
      <div class="field">
        <label for="aid">${esc(T('patientId'))}</label>
        <input id="aid" name="patientId" placeholder="TRM-XXX01-0001" autocapitalize="characters">
      </div>
      <div class="field">
        <label for="acode">${esc(T('activationCode'))}</label>
        <input id="acode" name="code" placeholder="ABC123" autocapitalize="characters" maxlength="6">
      </div>
      <div class="field">
        <label for="apw">${esc(T('createPassword'))}</label>
        <input id="apw" name="password" type="password" autocomplete="new-password">
        <p class="hint">${esc(T('passwordRule'))}</p>
      </div>

      <div class="consent">
        <div class="consent__head">${esc(T('readTerms'))}</div>
        <div class="consent__box" id="termsbox">${esc(T('loading'))}</div>
        <button type="button" class="consent__tick" id="agreetick" data-action="toggle-agree" aria-pressed="false">
          <span class="box"></span>
          <span>${esc(T('agreeBox'))}</span>
        </button>
        <p class="hint">${esc(T('agreeHelp'))}</p>
      </div>

      <button class="btn" data-action="activate">${esc(T('createAccount'))}</button>
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
      <p class="linkline"><button data-action="mode" data-mode="hospital">${esc(T('backToSignIn'))}</button></p>
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
        <span class="choice__title">${esc(T('iAmMother'))}</span>
        <span class="choice__sub">${esc(T('iAmMotherSub'))}</span>
      </button>
      <button class="choice choice--alt" data-action="mode" data-mode="hospital">
        <span class="choice__title">${esc(T('iAmHospital'))}</span>
        <span class="choice__sub">${esc(T('iAmHospitalSub'))}</span>
      </button>
    </div>`;

  const panels = { choose, patient, forgot, activate, hospital, hforgot, signup };
  if (S.authMode === 'activate') setTimeout(loadTerms, 0);
  const titles = {
    choose: T('welcome'),
    patient: T('welcomeBack'),
    forgot: T('resetTitle'),
    activate: T('activateTitle'),
    hospital: 'Hospital sign in',
    hforgot: 'Cannot get in?',
    signup: 'Create a hospital account'
  };
  const subs = {
    choose: T('tagline'),
    patient: T('signInWithId'),
    forgot: T('resetSub'),
    activate: T('activateSub'),
    hospital: 'Sign in to your hospital account.',
    hforgot: 'We will not send your details to anyone unverified.',
    signup: 'Takes about a minute.'
  };

  view().innerHTML = `
    <div class="auth">
      ${langMenu()}
      <img class="auth__logo" src="/logo.png" alt="Trimestt">
      <p class="auth__tag">${esc(T('tagline'))}</p>
      <div class="auth__card">
        <h1>${esc(titles[S.authMode])}</h1>
        <p class="muted">${esc(subs[S.authMode])}</p>
        ${panels[S.authMode]}
        ${S.authMode !== 'choose' ? '<p class="linkline"><button data-action="mode" data-mode="choose">Back</button></p>' : ''}
      </div>
      <p class="lockline">${esc(T('encryptedLine'))}</p>
      <p class="muted center" style="margin-top:14px">${esc(T('notDoctor'))}</p>
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
    { key: 'referrals', label: 'Requests', icon: 'care' },
    { key: 'codes', label: 'Codes', icon: 'money' },
    { key: 'reports', label: 'Reports', icon: 'log' },
    { key: 'staff', label: 'Staff', icon: 'patients' },
    { key: 'security', label: 'Privacy', icon: 'care' },
    { key: 'privacy-requests', label: 'Data', icon: 'log' }
  ]);

  if (S.tab === 'home') {
    const [work, summary] = await Promise.all([api('/hospital/worklist'), api('/hospital/summary')]);
    const c = work.counts;
    const label = { alert: 'Alert', missed: 'Missed', closing: 'Closing', quiet: 'No readings', notactive: 'Not activated' };
    view().innerHTML = `
      <h1>Today</h1>
      <p>Sorted by what needs a person first. Clear it top to bottom.</p>
      ${work.credits && (work.credits.low || work.credits.empty) ? `
      <div class="card ${work.credits.empty ? 'alert-card alert-card--t4' : 'alert-card alert-card--t3'}">
        <div class="spread">
          <div>
            <h3>${work.credits.empty ? 'You have run out of codes' : 'Only ' + work.credits.balance + ' codes left'}</h3>
            <p class="muted" style="margin:0">${work.credits.empty
              ? work.credits.graceLeft + ' spare codes remain before registration stops.'
              : 'Top up so registration at your desk never pauses.'}</p>
          </div>
        </div>
        <button class="btn btn--sm btn--soft" style="margin-top:10px" data-action="tab" data-tab="codes">See codes</button>
      </div>` : ''}
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
        <p class="muted" style="margin:0">${work.credits ? work.credits.balance + ' codes available · ' + work.credits.used + ' used so far' : ''}</p>
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
          <p class="muted" style="margin-bottom:8px">${esc(p.number)} · ${esc(p.gestation.label)} · ${esc(p.countdown.short)} ${p.countdown.overdue ? 'overdue' : 'to go'} · EDD ${pretty(p.edd)}</p>
          <p class="muted" style="margin:-4px 0 8px;font-size:12px">Registered ${pretty(p.registeredOn)}</p>
          ${p.riskTags.length ? `<div class="chip-row" style="margin-bottom:8px">${p.riskTags.map((t) => `<span class="tag tag--hard">${esc(t)}</span>`).join('')}</div>` : ''}
          ${p.activated
            ? `<span class="tag tag--sage">App active</span>
               <button class="btn btn--sm btn--soft" style="margin-left:8px" data-action="issue-reset" data-id="${p.id}">Reset password</button>`
            : `<div class="pill-note">Not activated yet. Code: <strong>${esc(p.activationCode)}</strong></div>`}
          ${p.resetCode ? `<div class="pill-note" style="margin-top:8px">Reset code: <strong>${esc(p.resetCode)}</strong> · valid 24 hours</div>` : ''}
          <div class="btn-row" style="margin-top:10px;flex-wrap:wrap">
            <button class="btn btn--sm btn--ghost" data-action="rx-open" data-id="${p.id}" data-name="${esc(p.name)}">Prescription</button>
            <button class="btn btn--sm btn--ghost" data-action="fhr-open" data-id="${p.id}" data-name="${esc(p.name)}">Heart rate</button>
            <button class="btn btn--sm btn--ghost" data-action="listen-approve" data-id="${p.id}" data-name="${esc(p.name)}">Home listening</button>
          </div>
        </div>`).join('') : '<div class="empty">No patients registered yet.</div>'}`;
    return;
  }

  if (S.tab === 'register') {
    view().innerHTML = `
      <h1>Register a patient</h1>
      <p>Do this at the first consultation. She gets an ID and a code, and sets her own password.</p>
      <form id="f-reg" onsubmit="return false">
        <div class="field"><label for="rn">Patient name</label><input id="rn" name="name"></div>
        <div class="field--split">
          <div class="field"><label for="rp">Phone</label><input id="rp" name="phone" type="tel" placeholder="+91"></div>
          <div class="field"><label for="rage">Age</label><input id="rage" name="age" type="number" inputmode="numeric" data-age></div>
        </div>
        <div id="guardianbox" style="display:none">
          <div class="card alert-card alert-card--t3">
            <h3>Patient is under 18</h3>
            <p class="muted" style="margin:0 0 10px">A parent or guardian must agree on her behalf. Record their details after seeing their ID.</p>
            <div class="field"><label for="rgn">Guardian's name</label><input id="rgn" name="guardianName"></div>
            <div class="field--split">
              <div class="field"><label for="rgr">Relationship</label><input id="rgr" name="guardianRelationship" placeholder="mother, father, husband"></div>
              <div class="field"><label for="rgp">Guardian's phone</label><input id="rgp" name="guardianPhone" type="tel"></div>
            </div>
          </div>
        </div>
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

  if (S.tab === 'referrals') {
    const data = await api('/hospital/departments');
    const open = data.requests.filter((r) => r.state === 'open');
    view().innerHTML = `
      <h1>Department requests</h1>
      <p>Patients asking to see another speciality. Arranging these is where a maternity unit becomes the family's hospital.</p>
      ${open.length ? open.map((r) => `
        <div class="card">
          <div class="spread">
            <div>
              <span class="card__tag">${esc(r.department)}</span>
              <h3>${esc(r.patientName)}</h3>
              <p class="muted" style="margin:2px 0 0">${esc(r.patientNumber)} · ${pretty(r.requestedAt)}</p>
            </div>
          </div>
          <p style="margin:8px 0 10px">${esc(r.reason || 'No reason given.')}</p>
          <button class="btn btn--sm btn--soft" data-action="close-referral" data-id="${r.id}">Appointment arranged</button>
        </div>`).join('') : '<div class="empty">Nothing waiting.</div>'}
      ${data.requests.filter((r) => r.state === 'closed').length ? `
      <h2>Arranged</h2>
      <div class="card">
        ${data.requests.filter((r) => r.state === 'closed').slice(0, 15).map((r) => `
          <div class="card__row">
            <div><h3>${esc(r.patientName)} · ${esc(r.department)}</h3>
            <p class="muted" style="margin:0">${pretty(r.closedAt)} by ${esc(r.closedBy || 'staff')}</p></div>
          </div>`).join('')}
      </div>` : ''}`;
    return;
  }

  if (S.tab === 'codes') {
    const data = await api('/hospital/credits');
    const c = data.credits;
    const pct = c.purchased ? Math.round((c.used / c.purchased) * 100) : 100;
    view().innerHTML = `
      <h1>Codes</h1>
      <p>Each patient you register uses one code. Buy them in advance so registration never pauses.</p>

      <div class="card card--brand">
        <div class="eyebrow" style="color:rgba(255,255,255,.8)">Available now</div>
        <div class="stat" style="margin-top:6px">${c.balance}<small>${c.used} used of ${c.purchased} bought</small></div>
        <div class="bar-track" style="margin-top:12px;background:rgba(255,255,255,.25)">
          <div class="bar-fill" style="width:${Math.min(100, pct)}%;background:#fff"></div>
        </div>
        ${c.empty ? `<p style="margin:12px 0 0"><b>${c.graceLeft} spare codes left.</b> After that, registration pauses until you add more.</p>` : ''}
      </div>

      <h2>Add codes</h2>
      ${data.packages.map((p2) => `
        <div class="card">
          <div class="spread">
            <div>
              <h3>${p2.codes} codes</h3>
              <p class="muted" style="margin:2px 0 0">₹${p2.perCode.toLocaleString('en-IN')} each${p2.discount ? ' · ' + p2.discount + '% better rate' : ''}</p>
            </div>
            <div style="text-align:right">
              <div style="font-family:var(--display);font-size:24px;font-weight:600">${rupees(p2.price)}</div>
              <span class="tag tag--sage">inclusive of GST</span>
            </div>
          </div>
        </div>`).join('')}

      <div class="card card--flat">
        <h3>How to add</h3>
        <p style="margin:0">Transfer to the account on your invoice and tell us the reference. Codes appear here as soon as the payment reaches us, usually the same working day.</p>
      </div>

      ${c.ledger.length ? `
      <h2>History</h2>
      <div class="card">
        ${c.ledger.map((l) => `
          <div class="card__row">
            <div>
              <h3>+${l.codes} codes</h3>
              <p class="muted" style="margin:0">${pretty(l.at)}${l.reference ? ' · ' + esc(l.reference) : ''}${l.amount ? ' · ' + rupees(l.amount) : ''}</p>
            </div>
          </div>`).join('')}
      </div>` : ''}`;
    return;
  }

  if (S.tab === 'privacy-requests') {
    const data = await api('/hospital/data-requests');
    view().innerHTML = `
      <h1>Data requests</h1>
      <p>Patients asking for a copy, a correction, deletion, or raising a complaint. The law gives you 90 days.</p>
      ${data.requests.filter((r) => r.state === 'open').length
        ? data.requests.filter((r) => r.state === 'open').map((r) => `
          <div class="card alert-card alert-card--t3">
            <div class="spread">
              <div>
                <span class="card__tag">${esc(r.kind)}</span>
                <h3>${esc(r.patientName)}</h3>
                <p class="muted" style="margin:2px 0 0">${esc(r.patientNumber)} · due by ${pretty(r.dueBy)}</p>
              </div>
            </div>
            <p style="margin:8px 0 10px">${esc(r.detail || 'No detail given.')}</p>
            <button class="btn btn--sm btn--soft" data-action="close-data-request" data-id="${r.id}">Mark as answered</button>
          </div>`).join('')
        : '<div class="empty">Nothing waiting.</div>'}

      ${data.withdrawn.length ? `
      <h2>Agreement withdrawn</h2>
      <div class="card">
        ${data.withdrawn.map((w) => `
          <div class="card__row"><div>
            <h3>${esc(w.name)}</h3>
            <p class="muted" style="margin:0">${esc(w.number)} · ${pretty(w.withdrawnAt)} — stop app reminders, keep her medical record</p>
          </div></div>`).join('')}
      </div>` : ''}

      ${data.minors.length ? `
      <h2>Patients under 18</h2>
      <div class="card">
        ${data.minors.map((m) => `
          <div class="card__row"><div>
            <h3>${esc(m.name)}</h3>
            <p class="muted" style="margin:0">${esc(m.number)} · guardian ${esc(m.guardian ? m.guardian.name : 'not recorded')} ${m.guardian ? '· ' + esc(m.guardian.phone) : ''}</p>
          </div></div>`).join('')}
        <p class="muted" style="margin:10px 0 0">Their guardian agreed on their behalf, and you recorded seeing the guardian's ID.</p>
      </div>` : ''}`;
    return;
  }

  if (S.tab === 'security') {
    const data = await api('/trust');
    view().innerHTML = `
      <h1>Data protection</h1>
      <p>What we do to keep your patients' records safe, in plain terms you can pass to your management.</p>
      <div class="card">
        ${data.hospital.map((line) => `<p class="trustline">${esc(line)}</p>`).join('')}
      </div>
      ${data.encryptedFiles ? '' : `
      <div class="card alert-card alert-card--t3">
        <h3>Document encryption is not switched on</h3>
        <p style="margin:0">Uploaded files are stored unencrypted on this installation. Contact Trimestt support before patients begin uploading reports.</p>
      </div>`}
      <div class="card">
        <h3>Home listening</h3>
        <p style="margin:0 0 10px">Off unless you turn it on. Even then, each patient must be approved individually, and the app always asks about movements before a reading — reduced movements override whatever a device showed.</p>
        <div class="btn-row">
          <button class="btn btn--sm btn--ghost" data-action="home-listen-toggle" data-on="yes">Turn on for this hospital</button>
          <button class="btn btn--sm btn--soft" data-action="home-listen-toggle" data-on="no">Turn off</button>
        </div>
      </div>

      <div class="card card--flat">
        <h3>Your patients see a shorter version</h3>
        <p style="margin:0">Inside the app, every mother has a privacy screen telling her that only your hospital can see her records, that nothing is sold, and that no advertising is shown.</p>
      </div>`;
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
                 <button class="btn btn--sm btn--soft" style="margin-top:6px" data-action="staff-remove" data-id="${m.id}">${esc(T('remove'))}</button>` : ''}
            </div>
          </div>
        </div>`).join('')}
      <div class="card card--flat" id="trustpanel"></div>

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
      <button class="btn btn--danger" data-action="sos">${esc(T('emergency'))}</button>
      <p class="muted center" style="margin-top:8px">${esc(T('emergencyNote'))}</p>
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
    <h1>${esc(T('recordsTitle'))}</h1>
    <p>${esc(T('recordsHelp'))}</p>
    <form id="f-record" onsubmit="return false">
      <div class="card">
        <div class="field">
          <label for="rcf">${esc(T('chooseFile'))}</label>
          <input id="rcf" type="file" accept="image/*,application/pdf">
          <p class="hint">Photo or PDF, up to 4 MB. Stored encrypted, and opened only by you and your hospital.</p>
        </div>
        <div class="field">
          <label for="rck">${esc(T('whatIsIt'))}</label>
          <select id="rck" name="kind">${kinds.map((k) => `<option>${esc(k)}</option>`).join('')}</select>
        </div>
        <div class="field--split">
          <div class="field"><label for="rct">${esc(T('title'))}</label><input id="rct" name="title" placeholder="e.g. Anomaly scan"></div>
          <div class="field"><label for="rcd">${esc(T('reportDate'))}</label><input id="rcd" name="takenOn" type="date" value="${today()}"></div>
        </div>
        <button class="btn" data-action="record-upload" data-owner="${esc(owner)}">${esc(T('addToRecords'))}</button>
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
          <a class="btn btn--sm btn--ghost" href="/api/files/${esc(r.file)}?t=${esc(S.token)}" target="_blank" rel="noopener">${esc(T('open'))}</a>
          <button class="btn btn--sm btn--soft" data-action="record-delete" data-id="${r.id}">${esc(T('remove'))}</button>
        </div>
      </div>`).join('') : `<div class="empty">${esc(T('noRecords'))}</div>`}`;
}

/* ---------- patient ---------- */

async function patientScreen() {
  view().classList.remove('screen--center');
  document.body.classList.remove('staff');
  const h = S.hospital;
  const feed = await api('/patient/notifications');
  S.notifications = feed.notifications;
  S.unread = feed.unread;

  $('#chrome').innerHTML = appbar(h.name, h.city ? h.city : 'Trimestt', { signOut: true, bell: S.unread, lang: true });

  const isBaby = S.profile !== 'mother';
  $('#tabs').innerHTML = tabbar(isBaby ? [
    { key: 'home', label: T('home'), icon: 'home' },
    { key: 'plan', label: T('vaccines'), icon: 'plan' },
    { key: 'log', label: T('log'), icon: 'log' },
    { key: 'care', label: T('guides'), icon: 'care' },
    { key: 'records', label: T('records'), icon: 'money' }
  ] : [
    { key: 'home', label: T('home'), icon: 'home' },
    { key: 'plan', label: T('plan'), icon: 'plan' },
    { key: 'log', label: T('log'), icon: 'log' },
    { key: 'care', label: T('guides'), icon: 'care' },
    { key: 'records', label: T('records'), icon: 'money' }
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
        <div class="live" style="color:rgba(255,255,255,.92)"><span class="live__dot"></span> ${esc(T('youAreAt'))}</div>
        <div class="stat" style="margin-top:8px">${esc(m.gestation.label)}<small>${esc(T('trimester'))} ${m.gestation.trimester} · ${esc(T('dueDate'))} ${pretty(m.edd)}</small></div>
        <div class="countdown">
          <b>${esc(m.countdown.short)}</b>
          <span>${esc(m.countdown.label)}</span>
        </div>
      </div>

      <div class="card">
        <div class="spread"><h3>${esc(T('waterToday'))}</h3><span class="tag">${w.drunkMl} of ${w.ml} ml</span></div>
        <div class="bar-track"><div class="bar-fill" style="width:${pct}%"></div></div>
        <p class="muted" style="margin:8px 0 10px">About ${w.glasses} glasses across the day${w.overridden ? ' — set by your doctor' : ''}. Sip through the day rather than all at once.</p>
        <div class="btn-row">
          <button class="btn btn--sm btn--ghost" data-action="water" data-ml="200">${esc(T('glass'))}</button>
          <button class="btn btn--sm btn--ghost" data-action="water" data-ml="500">+ bottle</button>
        </div>
      </div>

      ${wt ? `
      <div class="card">
        <div class="spread"><h3>${esc(T('yourWeight'))}</h3><span class="tag ${wt.status === 'on track' ? 'tag--sage' : 'tag--hard'}">${esc(wt.status)}</span></div>
        <div class="stat" style="font-size:28px;margin:6px 0 4px">+${wt.gained} kg<small>${esc(T('gainedSince'))}</small></div>
        <p style="margin:8px 0 0">${esc(wt.message)}</p>
        ${wt.totalRange ? `<p class="muted" style="margin:6px 0 0">Usual total for your build: ${wt.totalRange[0]}–${wt.totalRange[1]} kg across the pregnancy.</p>` : ''}
      </div>` : `
      <div class="card card--flat">
        <h3>${esc(T('yourWeight'))}</h3>
        <p style="margin:0">${esc(T('weightHelp'))}</p>
      </div>`}

      ${next ? `
      <div class="card">
        <div class="eyebrow">${esc(T('next'))}</div>
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
        <h3>${esc(T('goodForYou'))}</h3>
        <div class="eyebrow" style="margin-top:10px">${esc(T('movement'))}</div>
        <ul class="checks">${insight.lifestyle.exercise.map((t) => `<li>${esc(t)}</li>`).join('')}</ul>
        <div class="eyebrow" style="margin-top:12px">${esc(T('eating'))}</div>
        <ul class="checks">${insight.lifestyle.diet.map((t) => `<li>${esc(t)}</li>`).join('')}</ul>
        <p class="muted" style="margin:10px 0 0">${esc(T('generalNote'))}</p>
      </div>

      <div id="homelisten"></div>

      <button class="card guide-card" data-action="depts-open" style="border-left:5px solid var(--brand)">
        <div class="eyebrow">Other departments</div>
        <h3>${esc(T('deptCard'))}</h3>
        <p style="margin:4px 0 0">Skin, mental health, diabetes, thyroid, physiotherapy, nutrition and more — ask your hospital for an appointment.</p>
      </button>

      <button class="card guide-card" data-action="trust-open" style="border-left:5px solid var(--sage)">
        <div class="eyebrow">Your privacy</div>
        <h3>${esc(T('privacyCard'))}</h3>
        <p style="margin:4px 0 0">Only you and ${esc(S.hospital.name)}. Everything is encrypted, and nothing is ever sold or advertised.</p>
      </button>

      <div class="card card--flat">
        <h3>${esc(T('careTeam'))}</h3>
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
      <h1>${esc(T('yourPlan'))}</h1>
      <p>${esc(T('planHelp'))}</p>
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
                  ${i.status === 'done' ? `<span class="tag tag--sage">${esc(T('doneTag'))}</span>`
                    : i.status === 'missed' ? `<span class="tag tag--red">${esc(T('passed'))}</span>`
                    : i.hard ? `<span class="tag tag--hard">${esc(T('important'))}</span>` : ''}
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
      <h1>${esc(T('todaysLog'))}</h1>
      <p>${esc(T('logHelp'))}</p>
      <button class="card guide-card" data-action="kick-open" style="border-left:5px solid var(--brand)">
        <div class="eyebrow">Movements</div>
        <h3>${esc(T('countMoves'))}</h3>
        <p style="margin:4px 0 0">${esc(T('countMovesSub'))}</p>
      </button>
      <form id="f-log" onsubmit="return false">
        <div class="card">
          <div class="field--split">
            <div class="field"><label for="lw">${esc(T('weight'))}</label><input id="lw" name="weight" type="number" step="0.1" inputmode="decimal"></div>
            <div class="field"><label for="lk">${esc(T('movesCounted'))}</label><input id="lk" name="kicks" type="number" inputmode="numeric"></div>
          </div>
          <div class="field--split">
            <div class="field"><label for="ls">${esc(T('bpTop'))}</label><input id="ls" name="systolic" type="number" inputmode="numeric"></div>
            <div class="field"><label for="ld">${esc(T('bpLow'))}</label><input id="ld" name="diastolic" type="number" inputmode="numeric"></div>
          </div>
        </div>

        <details class="more">
          <summary>${esc(T('sugarSection'))}</summary>
          <div class="card">
            <div class="field--split">
              <div class="field"><label for="lf">${esc(T('fasting'))}</label><input id="lf" name="fastingSugar" type="number" inputmode="numeric"></div>
              <div class="field"><label for="lp">${esc(T('postMeal'))}</label><input id="lp" name="postMealSugar" type="number" inputmode="numeric"></div>
            </div>
          </div>
        </details>

        <div class="card" id="medbox">
          <h3>${esc(T('medicines'))}</h3>
          <p class="muted" style="margin:4px 0 0">Loading your prescription…</p>
        </div>

        <div class="card">
          <h3>${esc(T('feeling'))}</h3>
          <div class="chip-row" style="margin-top:8px">
            ${[['bleeding', 'Bleeding'], ['leaking', 'Leaking fluid'], ['severeHeadache', 'Severe headache'],
               ['blurredVision', 'Blurred vision'], ['breathlessness', 'Breathless'], ['fever', 'Fever'],
               ['painfulContractions', 'Painful tightening'], ['swelling', 'Swelling'], ['vomiting', 'Vomiting']]
              .map(([k, label]) => `<button type="button" class="chip chip--warn" data-chip="symptom" data-value="${k}" aria-pressed="false">${label}</button>`).join('')}
          </div>
          <div class="field" style="margin-top:14px">
            <label for="lo">${esc(T('anythingElse'))}</label>
            <textarea id="lo" name="otherSymptom" placeholder="Describe anything that does not fit above."></textarea>
          </div>
          <div class="field">
            <label for="lph">${esc(T('photo'))}</label>
            <input id="lph" type="file" accept="image/*">
            <p class="hint">If something looks unusual — discharge, a rash, swelling — a photo helps your nurse decide quickly. It is encrypted, and goes only to your hospital.</p>
          </div>
        </div>

        <div class="field"><label for="ln">${esc(T('noteDoctor'))}</label><textarea id="ln" name="note"></textarea></div>
        <button class="btn" data-action="save-log">${esc(T('saveLog'))}</button>
      </form>
      ${sosBlock()}`;
    return;
  }

  if (S.tab === 'listen') {
    const data = await api('/patient/home-listening');
    if (!data.available) {
      view().innerHTML = `
        <button class="btn btn--soft btn--sm" style="margin-top:14px" data-action="tab" data-tab="home">${esc(T('back'))}</button>
        <h1 style="margin-top:16px">Listening at home</h1>
        <div class="card">
          <p style="margin:0">Your hospital has not switched this on for you. Ask them at your next visit if you have a Doppler at home — many hospitals prefer you did not use one, and they will tell you why.</p>
        </div>`;
      return;
    }
    view().innerHTML = `
      <button class="btn btn--soft btn--sm" style="margin-top:14px" data-action="tab" data-tab="home">${esc(T('back'))}</button>
      <h1 style="margin-top:16px">Listening at home</h1>

      <div class="card alert-card alert-card--t4">
        <h3>Before you use it, read this</h3>
        ${data.rules.map((r) => `<p class="trustline">${esc(r)}</p>`).join('')}
      </div>

      <form id="f-listen" onsubmit="return false">
        <div class="card">
          <h3>First — how have movements been today?</h3>
          <div class="chip-row" style="margin-top:10px">
            <button type="button" class="chip" data-chip="mv" data-value="normal" aria-pressed="false">Normal for my baby</button>
            <button type="button" class="chip chip--warn" data-chip="mv" data-value="reduced" aria-pressed="false">Fewer or different</button>
          </div>
          <p class="muted" style="margin:10px 0 0">If they are fewer or different, we will tell you to call — whatever the device says.</p>
        </div>

        <div class="card">
          <h3>What the device showed</h3>
          <div class="field"><label for="lb">Beats per minute</label><input id="lb" name="bpm" type="number" inputmode="numeric" placeholder="Leave blank if you could not find it"></div>
          <div class="chip-row">
            <button type="button" class="chip" data-chip="heard" data-value="no" aria-pressed="false">I could not find it</button>
          </div>
        </div>

        <button class="btn" data-action="listen-save">Save this reading</button>
      </form>

      ${data.readings.length ? `
      <h2>Recent</h2>
      <div class="card">
        ${data.readings.map((r) => `
          <div class="item item--${r.movementsNormal && (r.normal || r.bpm === null) ? 'done' : 'missed'}">
            <div class="item__bar"></div>
            <div>
              <h3>${r.bpm ? r.bpm + ' bpm' : 'Not found'}</h3>
              <div class="meta">${pretty(r.date)} · ${r.weeks}w · movements ${r.movementsNormal ? 'normal' : 'reduced'}</div>
            </div>
          </div>`).join('')}
      </div>` : ''}
      ${sosBlock()}`;
    return;
  }

  if (S.tab === 'depts') {
    const data = await api('/patient/departments');
    view().innerHTML = `
      <button class="btn btn--soft btn--sm" style="margin-top:14px" data-action="tab" data-tab="home">${esc(T('back'))}</button>
      <h1 style="margin-top:16px">${esc(T('deptTitle'))}</h1>
      <p>Pregnancy affects more than one part of the body. Ask and your hospital will arrange it — you are already their patient.</p>
      <form id="f-dept" onsubmit="return false">
        <div class="card">
          <div class="field">
            <label for="dsel">${esc(T('whichDept'))}</label>
            <select id="dsel" name="department">
              ${data.departments.map((d) => `<option value="${d.key}">${esc(d.name)} — ${esc(d.why)}</option>`).join('')}
            </select>
          </div>
          <div class="field">
            <label for="drea">${esc(T('whatTrouble'))}</label>
            <textarea id="drea" name="reason" placeholder="A line or two is enough."></textarea>
          </div>
          <button class="btn" data-action="dept-request">${esc(T('askAppointment'))}</button>
        </div>
      </form>
      ${data.requests.length ? `
      <h2>${esc(T('yourRequests'))}</h2>
      <div class="card">
        ${data.requests.map((r) => `
          <div class="card__row">
            <div>
              <h3>${esc(r.department)}</h3>
              <p class="muted" style="margin:0">${pretty(r.requestedAt)} · ${r.state === 'open' ? 'with your hospital' : 'arranged'}</p>
            </div>
          </div>`).join('')}
      </div>` : ''}`;
    return;
  }

  if (S.tab === 'trust') {
    const data = await api('/trust');
    view().innerHTML = `
      <button class="btn btn--soft btn--sm" style="margin-top:14px" data-action="tab" data-tab="home">Back</button>
      <h1 style="margin-top:16px">${esc(T('privacyTitle'))}</h1>
      <p>What happens to everything you put into this app.</p>
      <div class="card">
        ${data.patient.map((line) => `<p class="trustline">${esc(line)}</p>`).join('')}
      </div>
      <div class="card card--flat">
        <h3>${esc(T('whoSees'))}</h3>
        <p style="margin:0"><b>${esc(S.hospital.name)}</b> sees your records so they can care for you. Your family member sees them only if you switch that on. Nobody else does.</p>
      </div>
      <button class="card guide-card" data-action="rights-open" style="border-left:5px solid var(--brand)">
        <div class="eyebrow">${esc(T('yourRights'))}</div>
        <h3>${esc(T('rightsHelp'))}</h3>
      </button>
      <p class="muted center">Questions about your records? Ask your hospital — the data is theirs to hold and yours to see.</p>`;
    return;
  }

  if (S.tab === 'rights') {
    const terms = await api('/terms');
    view().innerHTML = `
      <button class="btn btn--soft btn--sm" style="margin-top:14px" data-action="tab" data-tab="trust">${esc(T('back'))}</button>
      <h1 style="margin-top:16px">${esc(T('yourRights'))}</h1>
      <p>${esc(T('rightsHelp'))}</p>

      <div class="card">
        <button class="btn btn--ghost" data-action="download-data">${esc(T('downloadData'))}</button>
      </div>

      <form id="f-right" onsubmit="return false">
        <div class="card">
          <div class="field">
            <label for="rqd">${esc(T('tellUsMore'))}</label>
            <textarea id="rqd" name="detail"></textarea>
          </div>
          <div class="btn-row" style="flex-wrap:wrap">
            <button class="btn btn--sm btn--soft" data-action="data-request" data-kind="correction">${esc(T('askCorrection'))}</button>
            <button class="btn btn--sm btn--soft" data-action="data-request" data-kind="erasure">${esc(T('askErasure'))}</button>
            <button class="btn btn--sm btn--soft" data-action="data-request" data-kind="grievance">${esc(T('complain'))}</button>
          </div>
        </div>
      </form>

      <div class="card">
        <h3>${esc(T('withdraw'))}</h3>
        <p style="margin:6px 0 10px">${esc(T('withdrawWarn'))}</p>
        <button class="btn btn--danger" data-action="withdraw-consent">${esc(T('withdraw'))}</button>
      </div>

      <div class="card card--flat">
        <h3>${esc(T('complain'))}</h3>
        <p style="margin:0">${esc(terms.terms.grievance.name)}<br>${esc(terms.terms.grievance.email)}</p>
        <p class="muted" style="margin:8px 0 0">If we do not resolve it, you may complain to the Data Protection Board of India.</p>
      </div>

      ${S.me.mother.consent ? `<p class="muted center">${esc(T('agreedOn'))} ${pretty(S.me.mother.consent.at)} · v${esc(S.me.mother.consent.version)}</p>` : ''}`;
    return;
  }

  if (S.tab === 'kicks') return kickScreen();

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
    const L = localisedGuide(g);
    view().innerHTML = `
      <button class="btn btn--soft btn--sm" style="margin-top:14px" data-action="guide-back">${esc(T('back'))}</button>
      <div class="book">
        <div class="book__page">
          <div class="eyebrow">${esc(g.category)} · ${esc(g.read)}</div>
          <h1 style="margin-top:4px">${esc(L.title)}</h1>
          ${L.translated ? '' : `<p class="pill-note">${esc(T('englishOnly'))}</p>`}
          <div class="article">${L.body.map((para) => `<p>${esc(para)}</p>`).join('')}</div>
        </div>
      </div>
      <p class="muted center">General guidance. Where your hospital's instructions differ, follow theirs.</p>`;
    return;
  }

  const babyCats = ['Newborn', 'Baby care', 'Breastfeeding'];
  const pool = ageFilter === 'baby' ? all.filter((g) => babyCats.includes(g.category))
             : all.filter((g) => !babyCats.includes(g.category) || S.me.children.length);
  const cats = [T('all')].concat(Array.from(new Set(pool.map((g) => g.category))));
  const shown = S.guideCat === T('all') || S.guideCat === 'All' ? pool : pool.filter((g) => g.category === S.guideCat);

  const byCat = {};
  pool.forEach((g) => { (byCat[g.category] = byCat[g.category] || []).push(g); });

  view().innerHTML = `
    ${switcher}
    <div class="book book--cover">
      <div class="book__page">
        <div class="eyebrow">${esc(S.hospital.name)}</div>
        <h1 style="margin:6px 0 4px">${esc(T('yourBook'))}</h1>
        <p style="margin:0">${pool.length} ${esc(T('bookSub'))}</p>
      </div>
    </div>

    <div class="chip-row" style="margin-bottom:14px">
      ${cats.map((c) => `<button class="chip" data-action="guide-cat" data-cat="${esc(c)}" aria-pressed="${S.guideCat === c}">${esc(c)}</button>`).join('')}
    </div>

    ${(S.guideCat === T('all') || S.guideCat === 'All')
      ? Object.keys(byCat).map((cat) => `
        <div class="index">
          <h2 class="index__head">${esc(cat)}</h2>
          ${byCat[cat].map((g, i) => `
            <button class="index__row" data-action="guide-open" data-id="${g.id}">
              <span class="index__no">${String(i + 1).padStart(2, '0')}</span>
              <span class="index__title">${esc(localisedGuide(g).title)}</span>
              <span class="index__dots"></span>
              <span class="index__read">${esc(g.read)}</span>
            </button>`).join('')}
        </div>`).join('')
      : shown.map((g) => `
        <button class="card guide-card" data-action="guide-open" data-id="${g.id}">
          <div class="eyebrow">${esc(g.category)} · ${esc(g.read)}</div>
          <h3>${esc(localisedGuide(g).title)}</h3>
          <p style="margin:4px 0 0">${esc(localisedGuide(g).body[0].slice(0, 105))}…</p>
        </button>`).join('')}`;
}


/* ---------- movement counter ---------- */

function kickTick() {
  if (!S.kick || !S.kick.startedAt) return;
  const seconds = Math.round((Date.now() - S.kick.startedAt) / 1000);
  const el = $('#kick-clock');
  if (!el) { clearInterval(S.kick.timer); return; }
  const m = Math.floor(seconds / 60), sec = seconds % 60;
  el.textContent = m + ':' + String(sec).padStart(2, '0');
  const rate = S.kick.count / Math.max(seconds / 60, 0.1);
  const rateEl = $('#kick-rate');
  if (rateEl) rateEl.textContent = S.kick.count ? rate.toFixed(2) + ' per minute' : 'tap when you feel a movement';
}

async function kickScreen() {
  const status = await api('/patient/kicks/status');
  if (!status.open) {
    view().innerHTML = `
      <button class="btn btn--soft btn--sm" style="margin-top:14px" data-action="tab" data-tab="log">${esc(T('back'))}</button>
      <h1 style="margin-top:16px">Movement counting</h1>
      <div class="card card--brand">
        <div class="stat">${status.weeks}w<small>opens at ${status.fromWeek} weeks · ${status.weeksToWait} to go</small></div>
      </div>
      <div class="card">
        <p style="margin:0">${esc(status.why)}</p>
      </div>
      <div class="card card--flat">
        <h3>Until then</h3>
        <p style="margin:0">You may feel flutters from around 18 to 20 weeks, and they become a pattern by about 28. If movements ever feel fewer or different from what is normal for you, call your hospital the same day — whatever the week.</p>
      </div>`;
    return;
  }
  const history = await api('/patient/kicks');
  const target = history.target;
  const running = S.kick && S.kick.startedAt;

  view().innerHTML = `
    <button class="btn btn--soft btn--sm" style="margin-top:14px" data-action="tab" data-tab="log">Back to log</button>
    <h1 style="margin-top:16px">${esc(T('movementsTitle'))}</h1>
    <p>Lie on your left side at a time your baby is usually active. Tap the circle each time you feel a movement — a kick, roll, flutter or hiccup all count.</p>

    <div class="card card--brand center">
      <div class="live" style="justify-content:center;color:rgba(255,255,255,.9)">
        ${running ? '<span class="live__dot"></span> counting' : 'ready'}
      </div>
      <div class="kick-clock" id="kick-clock">${running ? '0:00' : '0:00'}</div>
      <div class="kick-rate" id="kick-rate">${running ? 'tap when you feel a movement' : 'start when you are settled'}</div>
      <button class="kick-tap" data-action="kick-tap" ${running ? '' : 'disabled'}>
        <span>${S.kick ? S.kick.count : 0}</span>
        <small>of ${target}</small>
      </button>
      <div class="btn-row" style="justify-content:center;margin-top:16px">
        ${running
          ? `<button class="btn btn--light" data-action="kick-stop">${esc(T('finishSave'))}</button>`
          : `<button class="btn btn--light" data-action="kick-start">${esc(T('startCounting'))}</button>`}
      </div>
    </div>

    ${history.usualMinutes ? `
    <div class="card">
      <h3>Your usual pattern</h3>
      <p style="margin:0">Ten movements normally take you about <b>${history.usualMinutes} minutes</b>. A session that takes much longer than that is worth telling your hospital about.</p>
    </div>` : ''}

    <div class="card card--flat">
      <h3>${esc(T('whenToCall'))}</h3>
      <p style="margin:0">Fewer movements than usual, or movements that feel different, means calling your hospital the same day. Babies do not slow down towards the end of pregnancy.</p>
    </div>

    ${history.sessions.length ? `
    <h2>Recent sessions</h2>
    <div class="card">
      ${history.sessions.map((k) => `
        <div class="item item--${k.reachedTarget ? 'done' : 'missed'}">
          <div class="item__bar"></div>
          <div>
            <h3>${k.count} movements in ${k.minutes} min</h3>
            <div class="meta">${pretty(k.date)} · ${k.perMinute} per minute</div>
          </div>
          <div>${k.reachedTarget ? '<span class="tag tag--sage">Reached ' + k.count + '</span>' : '<span class="tag tag--red">Below ' + history.target + '</span>'}</div>
        </div>`).join('')}
    </div>` : ''}`;

  if (running) {
    clearInterval(S.kick.timer);
    S.kick.timer = setInterval(kickTick, 1000);
    kickTick();
  }
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
        <h3>${esc(T('dangerTitle'))}</h3>
        <div class="chip-row" style="margin-top:8px">
          ${data.dangerSigns.map((s) => `<button type="button" class="chip chip--warn" data-chip="danger" data-value="${s.key}" aria-pressed="false">${esc(s.label)}</button>`).join('')}
        </div>
        <button class="btn btn--danger" style="margin-top:12px" data-action="danger-report">${esc(T('tellHospital'))}</button>
      </div>

      ${next ? `
      <div class="card ${next.status === 'overdue' ? 'alert-card alert-card--t3' : ''}">
        <div class="eyebrow">${esc(T('nextVaccines'))}</div>
        <h3>${esc(next.age)}</h3>
        <p class="muted" style="margin:2px 0 6px">Due ${pretty(next.dueOn)}${next.status === 'overdue' ? ' · overdue' : ''}</p>
        <p style="margin:0 0 10px">${esc(next.items)}</p>
        <button class="btn btn--soft" data-action="vaccine-done" data-key="${next.key}">${esc(T('markGiven'))}</button>
      </div>` : ''}

      <div class="card">
        <div class="spread"><h3>${esc(T('growth'))}</h3>${g.status !== 'unknown' ? `<span class="tag ${g.status === 'typical' ? 'tag--sage' : 'tag--hard'}">${esc(g.status)}</span>` : ''}</div>
        ${latest && latest.weightKg
          ? `<div class="stat" style="font-size:28px;margin:6px 0 4px">${latest.weightKg} kg<small>last recorded ${pretty(latest.date)}</small></div>
             <p style="margin:6px 0 0">${esc(g.message || '')}</p>`
          : '<p style="margin:0">Add a weight in the log and we will chart it against the usual range for this age.</p>'}
        <p class="muted" style="margin:8px 0 0">Usual range at this age: ${g.low}–${g.high} kg.</p>
      </div>

      <div class="card">
        <h3>${esc(T('feeding'))}</h3>
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
      <button class="btn btn--ghost" data-action="vaccine-record">${esc(T('vaccineRecord'))}</button>`;
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

      <h2>${esc(T('milestones'))}</h2>
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
      <h2>${esc(T('recentEntries'))}</h2>
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
      document.querySelectorAll('[data-age]').forEach(function (el) {
        el.addEventListener('input', function () {
          const box = document.querySelector('#guardianbox');
          if (box) box.style.display = (Number(el.value) && Number(el.value) < 18) ? 'block' : 'none';
        });
      });
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

  async 'toggle-agree'(el) {
    const on = el.getAttribute('aria-pressed') === 'true';
    el.setAttribute('aria-pressed', String(!on));
  },

  async activate() {
    const tick = $('#agreetick');
    if (!tick || tick.getAttribute('aria-pressed') !== 'true') {
      toast(T('mustAgree'), 'error');
      return;
    }
    const f = form('f-activate');
    f.agreed = true;
    const data = await api('/patient/activate', 'POST', f);
    setSession(data.token, 'patient', data.number);
    S.me = null; S.tab = 'home';
    await render();
    toast('Your account is ready.', 'ok');
  },

  async 'forget-device'() {
    localStorage.removeItem('trimestt_patient');
    S.knownPatient = '';
    S.authMode = 'patient';
    authScreen();
    toast('Cleared. Sign in with any patient ID.', 'ok');
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
      ${data.warning ? `<div class="card alert-card alert-card--t3"><p style="margin:0"><b>${esc(data.warning)}</b></p></div>`
        : `<p class="muted">${data.credits ? data.credits.balance + ' codes remaining.' : ''}</p>`}
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

  async 'close-data-request'(el) {
    const outcome = prompt('What did you do about it?') || '';
    await api('/hospital/data-requests/' + el.dataset.id + '/close', 'POST', { outcome });
    await render();
    toast('Recorded.', 'ok');
  },

  async 'home-listen-toggle'(el) {
    await api('/hospital/home-listening', 'POST', { enabled: el.dataset.on === 'yes' });
    await render();
    toast(el.dataset.on === 'yes' ? 'Home listening is on. Approve patients individually.' : 'Home listening is off.', 'ok');
  },

  async 'close-referral'(el) {
    await api('/hospital/referrals/' + el.dataset.id + '/close', 'POST');
    await render();
    toast('Marked as arranged.', 'ok');
  },

  async 'rx-open'(el) {
    S.rxPatient = { id: el.dataset.id, name: el.dataset.name };
    view().innerHTML = `
      <h1>Prescription — ${esc(S.rxPatient.name)}</h1>
      <p>What you add here appears in her daily log by name, so she ticks real medicines instead of guessing.</p>
      <form id="f-rx" onsubmit="return false">
        <div class="card">
          <div class="field"><label for="rxn">Medicine</label><input id="rxn" name="name"></div>
          <div class="field--split">
            <div class="field"><label for="rxd">Dose</label><input id="rxd" name="dose" placeholder="1 tablet"></div>
            <div class="field"><label for="rxt">When</label><input id="rxt" name="timing" placeholder="after dinner"></div>
          </div>
          <div class="chip-row" style="margin-bottom:12px">
            <button type="button" class="chip chip--warn" data-chip="rxcrit" data-value="critical" aria-pressed="false">Important — alert us if missed</button>
          </div>
          <button class="btn" data-action="rx-add">Add to her prescription</button>
        </div>
      </form>
      <button class="btn btn--soft" data-action="tab" data-tab="patients">Back to patients</button>`;
  },

  async 'rx-add'() {
    const f = form('f-rx');
    f.critical = pressedChips('rxcrit').length > 0;
    const data = await api('/hospital/patients/' + S.rxPatient.id + '/medicines', 'POST', f);
    toast(data.medicines.length + ' medicines on her list.', 'ok');
    await ACTIONS['rx-open']({ dataset: S.rxPatient });
  },

  async 'listen-approve'(el) {
    const data = await api('/hospital/departments');   // cheap way to confirm we are signed in
    S.listenPatient = { id: el.dataset.id, name: el.dataset.name };
    view().innerHTML = `
      <h1>Home listening — ${esc(S.listenPatient.name)}</h1>
      <div class="card alert-card alert-card--t3">
        <h3>Read before you approve</h3>
        <p style="margin:0">Hand-held Dopplers at home have been linked to women delaying care: they hear a heartbeat, feel reassured, and do not report reduced movements. Many units advise against them entirely. If you approve this, Trimestt asks her about movements <b>before</b> every reading, and reduced movements override whatever the device showed.</p>
      </div>
      <form id="f-listen-approve" onsubmit="return false">
        <div class="card">
          <div class="field"><label for="lan">Note for the record</label><input id="lan" name="note" placeholder="e.g. owns a Doppler, counselled on limits"></div>
          <div class="btn-row">
            <button class="btn" data-action="listen-set" data-id="${S.listenPatient.id}" data-approved="yes">Approve for this patient</button>
            <button class="btn btn--soft" data-action="listen-set" data-id="${S.listenPatient.id}" data-approved="no">Withdraw</button>
          </div>
        </div>
      </form>
      <button class="btn btn--soft" data-action="tab" data-tab="patients">Back to patients</button>`;
  },

  async 'listen-set'(el) {
    const f = form('f-listen-approve');
    try {
      await api('/hospital/patients/' + el.dataset.id + '/home-listening', 'POST',
        { approved: el.dataset.approved === 'yes', note: f.note });
      await render();
      toast(el.dataset.approved === 'yes' ? 'Approved for this patient.' : 'Withdrawn.', 'ok');
    } catch (err) {
      toast(err.message + ' Turn it on for the hospital under Privacy.', 'error');
    }
  },

  async 'fhr-open'(el) {
    S.fhrPatient = { id: el.dataset.id, name: el.dataset.name };
    view().innerHTML = `
      <h1>Heart rate — ${esc(S.fhrPatient.name)}</h1>
      <p>Record what you measured with a Doppler or on the scan. Normal is 110 to 160 beats a minute.</p>
      <form id="f-fhr" onsubmit="return false">
        <div class="card">
          <div class="field"><label for="fb">Beats per minute</label><input id="fb" name="bpm" type="number" inputmode="numeric"></div>
          <div class="field">
            <label for="fm">Measured with</label>
            <select id="fm" name="method"><option>Doppler at the hospital</option><option>Ultrasound scan</option><option>CTG</option></select>
          </div>
          <button class="btn" data-action="fhr-add">Save reading</button>
        </div>
      </form>
      <div class="card card--flat">
        <p style="margin:0">She sees this reading in her app, with a note that a phone cannot measure it and that movements change before the heart rate does.</p>
      </div>
      <button class="btn btn--soft" data-action="tab" data-tab="patients">Back to patients</button>`;
  },

  async 'fhr-add'() {
    const data = await api('/hospital/patients/' + S.fhrPatient.id + '/heartrate', 'POST', form('f-fhr'));
    await render();
    toast(data.entry.bpm + ' bpm saved' + (data.entry.normal ? '.' : ' — outside 110–160.'), data.entry.normal ? 'ok' : 'error');
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

  async 'lang-toggle'() {
    S.langOpen = !S.langOpen;
    if (!S.token) { authScreen(); return; }
    await render();
  },

  async 'set-lang'(el) {
    S.lang = el.dataset.lang;
    S.langOpen = false;
    localStorage.setItem('trimestt_lang', S.lang);
    document.documentElement.lang = S.lang;
    if (!S.token) { authScreen(); return; }
    await render();
  },

  async 'listen-open'() { S.tab = 'listen'; await render(); },

  async 'listen-save'() {
    const mv = pressedChips('mv');
    if (!mv.length) { toast('Tell us about movements first.', 'error'); return; }
    const f = form('f-listen');
    const data = await api('/patient/home-listening', 'POST', {
      movementsNormal: mv.includes('normal') && !mv.includes('reduced'),
      bpm: f.bpm,
      heard: !pressedChips('heard').includes('no')
    });
    if (data.override) {
      view().innerHTML = `
        <div class="card alert-card alert-card--t4">
          <h1 style="margin-top:6px">Call your hospital now</h1>
          <p style="font-size:16px;color:var(--ink)">${esc(data.message)}</p>
          <a class="btn btn--danger" href="tel:${esc(S.hospital.labourRoomPhone || S.hospital.phone)}" style="text-decoration:none">Call ${esc(S.hospital.labourRoomPhone || S.hospital.phone)}</a>
        </div>
        <button class="btn btn--soft" data-action="tab" data-tab="home">Back</button>`;
      return;
    }
    await render();
    toast(data.message, data.raised ? 'error' : 'ok');
  },

  async 'depts-open'() { S.tab = 'depts'; await render(); },

  async 'dept-request'() {
    const data = await api('/patient/departments/request', 'POST', form('f-dept'));
    await render();
    toast(data.message, 'ok');
  },

  async 'trust-open'() { S.tab = 'trust'; await render(); },

  async 'rights-open'() { S.tab = 'rights'; await render(); },

  async 'download-data'() {
    const data = await api('/patient/my-data');
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url; a.download = 'my-trimestt-records.json';
    document.body.appendChild(a); a.click(); document.body.removeChild(a);
    URL.revokeObjectURL(url);
    toast('Downloaded.', 'ok');
  },

  async 'data-request'(el) {
    const f = form('f-right');
    const data = await api('/patient/request', 'POST', { kind: el.dataset.kind, detail: f.detail });
    toast(data.message, 'ok');
  },

  async 'withdraw-consent'() {
    if (!confirm(T('withdrawWarn'))) return;
    const data = await api('/patient/withdraw-consent', 'POST');
    alert(data.message);
    signOut(true);
  },

  async 'kick-open'() { S.tab = 'kicks'; await render(); },

  async 'kick-start'() {
    S.kick = { startedAt: Date.now(), count: 0, timer: null };
    await render();
  },

  async 'kick-tap'() {
    if (!S.kick || !S.kick.startedAt) return;
    S.kick.count += 1;
    const btn = document.querySelector('.kick-tap span');
    if (btn) btn.textContent = S.kick.count;
    kickTick();
  },

  async 'kick-stop'() {
    if (!S.kick || !S.kick.startedAt) return;
    const seconds = Math.round((Date.now() - S.kick.startedAt) / 1000);
    const count = S.kick.count;
    clearInterval(S.kick.timer);
    const data = await api('/patient/kicks', 'POST', { count, seconds });
    S.kick = null;
    await render();
    toast(data.message, data.raised ? 'error' : 'ok');
  },

  async 'add-medicine'() {
    await api('/patient/medicines', 'POST', form('f-med'));
    await render();
    toast('Added to your list.', 'ok');
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
      medicinesTakenList: pressedChips('med'),
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
