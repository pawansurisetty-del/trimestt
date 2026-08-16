'use strict';
/**
 * Postgres behind the same door the JSON store uses.
 *
 * Why it looks like this
 * ---------------------
 * `store.load()` hands `api.js` the whole database as one plain object, and
 * `api.js` then mutates it directly — `db.patients.push(...)`,
 * `db.logs.filter(...)` — in 243 places. A normal repository layer, one table
 * per collection with a method per query, means rewriting all of them. That is
 * a real piece of work and it is not what the app needs first.
 *
 * What the app needs first is to stop being one file on one disk. So this keeps
 * the document model exactly as it is and puts the document in Postgres:
 *
 *     create table trimestt_db (id int primary key, doc jsonb, rev bigint)
 *
 * One row. `load()` reads it, `save()` writes it back. `api.js` does not
 * change, the JSON store still works when no database is configured, and you
 * get the three things the JSON file cannot give you:
 *
 *   - the data outlives the container and the volume
 *   - a managed provider takes real backups you can restore to a point in time
 *   - a write is a transaction, so a crash mid-write cannot leave a torn file
 *
 * What this does NOT give you
 * ---------------------------
 * It is still one document, so it is still **one writer**. Two instances would
 * overwrite each other's changes wholesale. The `rev` column detects that and
 * refuses the stale write rather than silently losing it, but detection is not
 * concurrency — if you need two instances, that is when the collections have to
 * become tables and `api.js` has to be rewritten. Do not read this file as
 * "Postgres, done".
 *
 * It also rewrites the whole document on every save. At a few hundred
 * pregnancies that is a document in the low megabytes and completely fine. At
 * ten thousand it is not. The debounce keeps it to one write per burst.
 *
 * Turning it on
 * -------------
 * Set `DATABASE_URL` and `npm install pg`. Without either, the app falls
 * straight back to the JSON file and says so at startup, so a missing variable
 * degrades to the old behaviour instead of failing to boot.
 *
 * Migrating the existing data: `node scripts/migrate-to-postgres.js`
 */

const EMPTY = {
  hospitals: [],
  users: [],
  patients: [],
  children: [],
  visits: [],
  logs: [],
  alerts: [],
  payments: [],
  sessions: {},
  counters: {}
};

const ROW_ID = 1;

function available() {
  if (!process.env.DATABASE_URL) return false;
  try { require.resolve('pg'); return true; } catch (err) { return false; }
}

function create() {
  const { Pool } = require('pg');
  const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    /* Managed Postgres almost always terminates TLS with a certificate the
       container does not have a root for. This is the standard setting for
       Railway, Supabase, Neon and RDS. Set PGSSL_STRICT=1 if you have loaded a
       CA and want it verified properly. */
    ssl: /localhost|127\.0\.0\.1/.test(process.env.DATABASE_URL)
      ? false
      : { rejectUnauthorized: process.env.PGSSL_STRICT === '1' },
    max: 4,
    idleTimeoutMillis: 30000
  });

  let db = null;
  let rev = 0;
  let ready = null;

  async function ensure() {
    await pool.query(
      'create table if not exists trimestt_db (' +
      '  id int primary key,' +
      '  doc jsonb not null,' +
      '  rev bigint not null default 0,' +
      '  updated_at timestamptz not null default now()' +
      ')'
    );
  }

  /**
   * Must be awaited once before `load()` is used, because `load()` itself is
   * synchronous — that is the shape `api.js` expects and changing it would mean
   * touching every call site, which is the thing this file exists to avoid.
   * server.js awaits this at boot; after that the document is in memory.
   */
  async function init() {
    if (ready) return ready;
    ready = (async () => {
      await ensure();
      const res = await pool.query('select doc, rev from trimestt_db where id = $1', [ROW_ID]);
      if (res.rows.length) {
        db = res.rows[0].doc;
        rev = Number(res.rows[0].rev);
        for (const key of Object.keys(EMPTY)) if (!(key in db)) db[key] = EMPTY[key];
      } else {
        db = JSON.parse(JSON.stringify(EMPTY));
        await pool.query(
          'insert into trimestt_db (id, doc, rev) values ($1, $2, 0) on conflict (id) do nothing',
          [ROW_ID, JSON.stringify(db)]
        );
      }
      console.log('[trimestt] storage: postgres (document row ' + ROW_ID + ', rev ' + rev + ')');
    })();
    return ready;
  }

  function load() {
    if (!db) {
      throw new Error(
        'The Postgres store was read before it was opened. server.js must await ' +
        'store.init() before serving a request.'
      );
    }
    return db;
  }

  let pending = null;
  let writing = false;
  let again = false;

  async function writeNow() {
    if (writing) { again = true; return; }
    writing = true;
    try {
      /* The rev check is what turns "last write wins" into "the stale write is
         refused". If another instance moved the row on, we find out here rather
         than after the data is gone. */
      const next = rev + 1;
      const res = await pool.query(
        'update trimestt_db set doc = $1, rev = $2, updated_at = now() ' +
        'where id = $3 and rev = $4 returning rev',
        [JSON.stringify(db), next, ROW_ID, rev]
      );
      if (!res.rows.length) {
        console.error(
          '[trimestt] REFUSED a stale write: the database row moved on without us. ' +
          'Another instance is running against the same database. This store is ' +
          'single-writer — scale to one instance, or move the collections to tables.'
        );
        return;
      }
      rev = next;
    } catch (err) {
      console.error('[trimestt] could not write to Postgres:', err.message);
    } finally {
      writing = false;
      if (again) { again = false; writeNow(); }
    }
  }

  function save() {
    if (pending) clearTimeout(pending);
    pending = setTimeout(() => { pending = null; writeNow(); }, 25);
  }

  function saveNow() {
    if (pending) { clearTimeout(pending); pending = null; }
    return writeNow();
  }

  function nextSeq(name) {
    const d = load();
    d.counters[name] = (d.counters[name] || 0) + 1;
    save();
    return d.counters[name];
  }

  function id(prefix) {
    return prefix + '_' + Date.now().toString(36) + Math.random().toString(36).slice(2, 8);
  }

  function reset() {
    db = JSON.parse(JSON.stringify(EMPTY));
    saveNow();
    return db;
  }

  /** Used by the migration script and by scripts/backup.js. */
  async function replaceAll(doc) {
    await init();
    db = doc;
    for (const key of Object.keys(EMPTY)) if (!(key in db)) db[key] = EMPTY[key];
    await saveNow();
    return db;
  }

  async function close() {
    await saveNow();
    await pool.end();
  }

  return { init, load, save, saveNow, nextSeq, id, reset, replaceAll, close,
           DB_FILE: '(postgres)', pool };
}

module.exports = { available, create, EMPTY };
