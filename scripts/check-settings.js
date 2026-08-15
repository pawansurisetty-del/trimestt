/* Drive the real click path: change a setting, re-render, and check that the
   attribute the stylesheet keys on is still the new value afterwards. */
const fs = require('fs');
const path = require('path');
process.chdir(__dirname);
const server = require('../server.js');

let docAttrs = {};
function El(id) {
  const el = { id, innerHTML: '', _kids: [], _cls: new Set(),
    classList: { add: (c) => el._cls.add(c), remove: (c) => el._cls.delete(c), contains: (c) => el._cls.has(c), toggle() {} },
    appendChild(c) { el._kids.push(c); }, removeChild() {},
    setAttribute() {}, getAttribute: () => 'false', addEventListener() {}, removeEventListener() {},
    querySelector: () => null, querySelectorAll: () => [], focus() {}, click() {},
    dataset: {}, textContent: '', className: '', files: [], style: {}, clientWidth: 398, clientHeight: 620 };
  return el;
}
const nodes = { '#screen': El('s'), '#chrome': El('c'), '#tabs': El('t'), '#toast': El('to'),
  '#app': El('a'), '#stage': El('st'), '#pageof': El('p'), '#termsheet': El('ts') };

global.window = { addEventListener() {}, location: { href: '' }, matchMedia: () => ({ matches: false, addEventListener() {} }) };
global.document = {
  body: { classList: { add() {}, remove() {} }, appendChild() {} },
  documentElement: {
    style: { setProperty() {} }, lang: 'en',
    setAttribute: (k, v) => { docAttrs[k] = v; },
    getAttribute: (k) => docAttrs[k] || null
  },
  createElement: () => El('tmp'),
  querySelector: (s) => nodes[s] || null,
  querySelectorAll: () => [], addEventListener() {}
};
const store = {};
global.localStorage = { getItem: (k) => store[k] || null, setItem: (k, v) => { store[k] = v; }, removeItem: (k) => { delete store[k]; } };
global.navigator = {};

server.listen(3700, async () => {
  const base = 'http://127.0.0.1:3700';
  global.fetch = ((orig) => (url, opts) => orig(url.startsWith('http') ? url : base + url, opts))(fetch);

  eval(fs.readFileSync('../public/art.js', 'utf8'));
  eval(fs.readFileSync('../public/glossary.js', 'utf8'));
  eval(fs.readFileSync('../public/references.js', 'utf8'));
  eval(fs.readFileSync('../public/i18n.js', 'utf8'));
  eval(fs.readFileSync('../public/guides.js', 'utf8'));

  const login = await (await fetch('/api/patient/login', { method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ patientId: 'TRM-SUN01-0001', password: 'demo1234' }) })).json();
  store.trimestt_token = login.token; store.trimestt_role = 'patient';

  const src = fs.readFileSync('../public/app.js', 'utf8');
  const app = new Function(src + '\n;return { S: S, render: render, actions: ACTIONS };')();
  const { S, render, actions } = app;
  S.token = login.token; S.role = 'patient'; S.tab = 'profile';

  await render();
  console.log('after first render   data-text =', docAttrs['data-text']);

  await actions['set-textsize']({ dataset: { size: 'largest' } });
  console.log('after choosing largest data-text =', docAttrs['data-text']);

  await render();
  console.log('after a further render data-text =', docAttrs['data-text']);

  // and it should survive a fresh sign-in, as if she reopened the app
  S.me = null;
  await render();
  console.log('after reloading record data-text =', docAttrs['data-text']);

  const ok = docAttrs['data-text'] === 'largest';
  console.log(ok ? '\nPASS — a settings change survives a re-render and a record reload'
                 : '\nFAIL — the change was reverted');
  server.close(); process.exit(ok ? 0 : 1);
});
