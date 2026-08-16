'use strict';
/**
 * The pages both app stores require before they will accept a submission:
 * a privacy policy, terms, and somewhere to get help.
 *
 * The privacy text is the same notice a patient agrees to inside the app, so
 * the two can never drift apart — it is generated from the same source.
 */

const SHELL = (title, body) => `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>${title} · Trimestt</title>
<meta name="description" content="${title} for Trimestt, the pregnancy and child care app provided by hospitals.">
<meta name="theme-color" content="#B04766">
<link rel="icon" href="/favicon.svg" type="image/svg+xml">
<link rel="stylesheet" href="/fonts/fonts.css">
<style>
  :root { --brand:#B04766; --ink:#2E1A22; --soft:#7A6169; --line:rgba(46,26,34,.10); --wash:#FDF6F8; }
  * { box-sizing:border-box; }
  body { margin:0; background:var(--wash); color:var(--ink);
    font:16px/1.66 "Plus Jakarta Sans",-apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif; }
  .wrap { max-width:720px; margin:0 auto; padding:32px 22px 80px; }
  header { display:flex; align-items:center; gap:12px; padding-bottom:22px; border-bottom:1px solid var(--line); }
  header img { width:44px; height:44px; border-radius:12px; }
  header b { font-size:18px; font-weight:800; letter-spacing:-.02em; }
  header span { display:block; font-size:12px; color:var(--soft); }
  h1 { font-size:30px; font-weight:800; letter-spacing:-.03em; margin:30px 0 6px; }
  .updated { font-family:"IBM Plex Mono",monospace; font-size:11px; letter-spacing:.1em;
    text-transform:uppercase; color:var(--brand); margin-bottom:26px; }
  h2 { font-size:18px; font-weight:800; letter-spacing:-.02em; margin:30px 0 8px; }
  p, li { color:var(--soft); font-size:15px; }
  li { margin-bottom:7px; }
  strong { color:var(--ink); }
  .box { background:#fff; border:1px solid var(--line); border-radius:18px; padding:20px 22px; margin:18px 0; }
  .box p:last-child { margin-bottom:0; }
  table { width:100%; border-collapse:collapse; margin:16px 0; font-size:14px; }
  th, td { text-align:left; padding:10px 12px 10px 0; border-bottom:1px solid var(--line); vertical-align:top; color:var(--soft); }
  th { color:var(--ink); font-weight:800; font-size:13px; }
  a { color:var(--brand); }
  footer { margin-top:44px; padding-top:22px; border-top:1px solid var(--line); font-size:13px; color:var(--soft); }
  footer a { margin-right:16px; }
</style>
</head>
<body>
  <div class="wrap">
    <header>
      <img src="/app-icon-192.png" alt="">
      <div><b>Trimestt</b><span>Pregnancy and child care, from your hospital</span></div>
    </header>
    ${body}
    <footer>
      <a href="/privacy">Privacy</a><a href="/terms">Terms</a><a href="/support">Support</a><a href="/">Open the app</a>
      <p style="margin-top:12px">Trimestt supports your care. It does not diagnose, and it does not replace your doctor.</p>
    </footer>
  </div>
</body>
</html>`;

function privacyPage(terms, grievance) {
  const items = terms.items.map((i) =>
    `<tr><td><strong>${i.what}</strong></td><td>${i.why}</td></tr>`).join('');
  const sections = terms.sections.map((s) =>
    `<h2>${s.h}</h2><p>${s.p}</p>`).join('');

  return SHELL('Privacy Policy', `
    <h1>Privacy Policy</h1>
    <div class="updated">Version ${terms.version} · India</div>

    <div class="box">
      <p><strong>The short version.</strong> Your hospital gives you Trimestt. Your hospital holds
      your records and decides how they are used; we keep them safe on their behalf. Only you and
      your hospital can see them. We do not sell your information, we show no advertising, and we
      do not use your data to train machine learning models.</p>
    </div>

    <h2>Who is responsible</h2>
    <p>Under the Digital Personal Data Protection Act, 2023, your hospital is the <strong>Data
    Fiduciary</strong> — it decides why and how your information is used. Trimestt is a
    <strong>Data Processor</strong> acting on your hospital's instructions.</p>

    <h2>What we collect, and why</h2>
    <table><thead><tr><th>What</th><th>Why</th></tr></thead><tbody>${items}</tbody></table>

    ${sections}

    <h2>Children</h2>
    <p>A patient under eighteen may only be enrolled once her parent or lawful guardian has agreed
    on her behalf, and her hospital has recorded their identity. We do not knowingly collect
    information from a child without that consent.</p>

    <h2>How to reach us</h2>
    <p>${grievance.name}<br><a href="mailto:${grievance.email}">${grievance.email}</a>${grievance.phone ? '<br>' + grievance.phone : ''}</p>
    <p>We answer requests within ninety days. If we do not resolve your concern, you may complain to
    the Data Protection Board of India.</p>

    <h2>Changes</h2>
    <p>If this policy changes in a way that affects you, we will ask you to read and agree to it
    again inside the app. The version number above tells you which one you agreed to.</p>
  `);
}

function termsPage() {
  return SHELL('Terms of Use', `
    <h1>Terms of Use</h1>
    <div class="updated">India · Last updated August 2026</div>

    <div class="box">
      <p><strong>Trimestt is not an emergency service.</strong> Alerts go to your hospital, but if
      you are unwell, telephone them or go in. Do not wait for the app.</p>
    </div>

    <h2>What Trimestt is</h2>
    <p>Trimestt is software provided to you by your hospital. It builds your antenatal plan from
    your dates, records readings you and your hospital enter, keeps your documents, reminds you what
    is due, and tells your hospital when a reading falls outside the range your doctor has set.</p>

    <h2>What Trimestt is not</h2>
    <ul>
      <li>It does not diagnose any condition.</li>
      <li>It does not prescribe, and no doctor treats you through this app.</li>
      <li>It does not provide consultations. Asking to see another department is a request for an
      appointment, not a consultation.</li>
      <li>It does not replace your hospital's own medical records.</li>
      <li>It is not a substitute for your doctor's judgement at any point.</li>
    </ul>

    <h2>Getting access</h2>
    <p>You need a patient ID and an activation code from your hospital. You choose your own password
    and nobody at the hospital should know it. Keep it to yourself, and tell your hospital if you
    think someone else has it.</p>

    <h2>What you put in</h2>
    <p>The readings you enter are used to care for you, so please enter them accurately. Do not
    upload anything that identifies the sex of an unborn baby — that is prohibited by the PC-PNDT
    Act, 1994, and Trimestt records no such information anywhere.</p>

    <h2>Payment</h2>
    <p>Your hospital bills you for Trimestt as part of your care. There is nothing to pay inside the
    app, and we never ask you for payment details.</p>

    <h2>Availability</h2>
    <p>We work to keep Trimestt running at all times, but we cannot guarantee it will always be
    available. Nothing in the app should ever delay you contacting your hospital.</p>

    <h2>Ending your use</h2>
    <p>You may withdraw your agreement at any time from inside the app. Your hospital keeps your
    medical records, as medical record rules require.</p>

    <h2>Governing law</h2>
    <p>These terms are governed by the laws of India, and the courts at Hyderabad, Telangana have
    exclusive jurisdiction.</p>
  `);
}

function supportPage(grievance) {
  return SHELL('Support', `
    <h1>Support</h1>
    <div class="updated">We answer the same working day</div>

    <div class="box">
      <p><strong>If you are unwell, telephone your hospital or go in.</strong> Do not use this page
      for anything urgent, and do not wait for a reply.</p>
    </div>

    <h2>I cannot sign in</h2>
    <p>Your patient ID and password come from your hospital. If you have forgotten your password,
    ask at the hospital reception — they can issue a new code in a few seconds, and nothing in your
    records changes.</p>

    <h2>I have a new phone</h2>
    <p>Download Trimestt, sign in with your patient ID and password. If the app shows someone else's
    ID, tap "Not you? Use a different ID" first.</p>

    <h2>I do not have a code yet</h2>
    <p>Trimestt is given to you by your hospital. Ask at reception at your next visit. It takes about
    two minutes to set up.</p>

    <h2>My due date looks wrong</h2>
    <p>Tell your hospital. Changing the date rebuilds your whole plan, so it is corrected carefully
    rather than through the app.</p>

    <h2>I want a copy of my information, or I want it deleted</h2>
    <p>Open the app, go to <strong>Privacy</strong>, then <strong>Your rights</strong>. You can
    download everything we hold, ask for a correction, ask for deletion, or raise a complaint. Your
    hospital answers within ninety days.</p>

    <h2>Something is wrong with the app</h2>
    <p>Write to <a href="mailto:${grievance.email}">${grievance.email}</a> and tell us what screen
    you were on and what happened. If it concerns one patient, include the patient ID — never a
    password.</p>

    <h2>For hospitals</h2>
    <p>If you are a hospital using Trimestt, contact us at
    <a href="mailto:${grievance.email}">${grievance.email}</a> or through your WhatsApp support
    group.</p>

    <h2>Contact</h2>
    <p>${grievance.name}<br><a href="mailto:${grievance.email}">${grievance.email}</a>${grievance.phone ? '<br>' + grievance.phone : ''}</p>
  `);
}

module.exports = { privacyPage, termsPage, supportPage };
