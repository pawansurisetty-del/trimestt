'use strict';
/**
 * Tiny JSON-file store. Zero dependencies so the app runs with `node server.js`
 * and nothing installed. Every read/write goes through here, so replacing this
 * file with Postgres or Supabase later touches nothing else.
 */
const fs = require('fs');
const path = require('path');

/* TRIMESTT_DATA is the documented name. TRIMEST_DATA was a typo that shipped,
   so it is still honoured — without it, a deployment using the old spelling
   would silently start writing to a fresh, empty database. */
const DATA_DIR = process.env.TRIMESTT_DATA || process.env.TRIMEST_DATA
  || path.join(__dirname, '..', 'data');
const DB_FILE = path.join(DATA_DIR, 'db.json');

/* Printed once at startup. If this is not the mounted volume, every deploy
   destroys the database — which is exactly what happened before. */
console.log('[trimestt] storage: ' + DATA_DIR +
  (process.env.TRIMESTT_DATA ? '' : '  <-- WARNING: TRIMESTT_DATA is not set, this is not a volume'));

const EMPTY = {
  hospitals: [],
  users: [],        // { id, role: 'hospital'|'patient', hospitalId, email, patientId, passwordHash, name }
  patients: [],     // clinical record for a mother
  children: [],
  visits: [],
  logs: [],
  alerts: [],
  payments: [],
  sessions: {},
  counters: {}
};

let db = null;

function load() {
  if (db) return db;
  if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true });
  if (fs.existsSync(DB_FILE)) {
    try {
      db = JSON.parse(fs.readFileSync(DB_FILE, 'utf8'));
      for (const key of Object.keys(EMPTY)) if (!(key in db)) db[key] = EMPTY[key];
    } catch (err) {
      throw new Error('data/db.json is corrupt. Move it aside and restart. ' + err.message);
    }
  } else {
    db = JSON.parse(JSON.stringify(EMPTY));
    saveNow();
  }
  return db;
}

let pending = null;
function save() {
  if (pending) clearTimeout(pending);
  pending = setTimeout(() => {
    pending = null;
    try {
      if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true });
      const tmp = DB_FILE + '.tmp';
      fs.writeFileSync(tmp, JSON.stringify(db, null, 2));
      fs.renameSync(tmp, DB_FILE);   // atomic, so a crash never leaves half a file
    } catch (err) {
      console.error('Could not write ' + DB_FILE + ':', err.message);
    }
  }, 25);
}

function saveNow() {
  if (pending) { clearTimeout(pending); pending = null; }
  if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true });
  fs.writeFileSync(DB_FILE, JSON.stringify(db, null, 2));
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

module.exports = { load, save, saveNow, nextSeq, id, reset, DB_FILE };
