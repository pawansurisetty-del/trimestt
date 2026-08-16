'use strict';
/**
 * Exercise lib/store-pg.js without a Postgres server.
 *
 *     node scripts/check-postgres.js
 *
 * The real thing cannot be tested in CI without provisioning a database, and an
 * untested store is how the TRIMEST_DATA typo destroyed the database on every
 * deploy. So this drives the store against an in-memory stand-in that
 * implements the only three statements it issues — the select, the insert and
 * the conditional update — and checks the behaviour that actually matters:
 * that a write lands, that rev advances, and above all that a *stale* write is
 * refused and reported rather than silently overwriting another instance.
 *
 * It does not prove the SQL is valid against real Postgres. Run
 * scripts/migrate-to-postgres.js against a scratch database for that.
 */
process.env.DATABASE_URL = process.env.DATABASE_URL || 'postgres://user@localhost:5432/trimestt';

const path = require('path');
const Module = require('module');
const STUB = path.join(__dirname, 'testsupport', 'pg-stub.js');
const origResolve = Module._resolveFilename;
Module._resolveFilename = function (request, ...rest) {
  if (request === 'pg') return STUB;
  return origResolve.call(this, request, ...rest);
};

const pgstub = require(STUB);
const pg = require('../lib/store-pg');

let pass = 0; const failures = [];
function ok(cond, msg) {
  if (cond) { pass += 1; } else { failures.push(msg); }
}

(async () => {
  ok(pg.available() === true, 'available() is true when DATABASE_URL is set and pg resolves');

  const s = pg.create();
  await s.init();
  ok(Object.keys(s.load()).length === 10, 'a fresh database has all ten collections');

  s.load().hospitals.push({ id: 'h1', name: 'Sunrise' });
  await s.saveNow();
  ok(pgstub.__peek().doc.hospitals.length === 1, 'a write reaches the row');
  ok(pgstub.__peek().rev === 1, 'rev advances on write');

  s.load().patients.push({ id: 'p1' });
  await s.saveNow();
  ok(pgstub.__peek().rev === 2, 'rev advances again');

  const other = pg.create();
  await other.init();
  other.load().logs.push({ id: 'l1' });
  await other.saveNow();
  ok(pgstub.__peek().rev === 3, 'a second instance can write');

  const errs = [];
  const realErr = console.error;
  console.error = (...a) => errs.push(a.join(' '));
  s.load().hospitals.push({ id: 'h2' });
  await s.saveNow();                       // s still believes rev is 2
  console.error = realErr;
  ok(pgstub.__peek().rev === 3, 'the stale write did not land');
  ok(errs.some((e) => /REFUSED a stale write/.test(e)), 'the stale write was reported, not swallowed');
  ok(pgstub.__peek().doc.logs.length === 1, "the other instance's data survived the stale write");

  const before = pgstub.__peek().rev;
  for (let i = 0; i < 50; i += 1) { other.load().logs.push({ id: 'x' + i }); other.save(); }
  await new Promise((r) => setTimeout(r, 120));
  ok(pgstub.__peek().rev === before + 1, 'fifty saves debounce into one write');
  ok(pgstub.__peek().doc.logs.length === 51, 'all fifty records are in that one write');

  pgstub.__reset();
  const cold = pg.create();
  let threw = false;
  try { cold.load(); } catch (e) { threw = /before it was opened/.test(e.message); }
  ok(threw, 'load() before init() throws a clear error instead of returning nothing');

  console.log((pass + failures.length) + ' checks run');
  if (failures.length) {
    failures.forEach((f) => console.log('  x ' + f));
    console.log('FAILED');
    process.exit(1);
  }
  console.log('All checks passed.');
})().catch((err) => { console.error('crashed:', err); process.exit(1); });
