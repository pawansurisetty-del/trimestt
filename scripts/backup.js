#!/usr/bin/env node
'use strict';
/** Snapshot the database. Run daily:  node scripts/backup.js */
const fs = require('fs');
const path = require('path');

const DATA = process.env.TRIMESTT_DATA || path.join(__dirname, '..', 'data');
const SRC = path.join(DATA, 'db.json');
const DIR = path.join(DATA, 'backups');

if (!fs.existsSync(SRC)) {
  console.error('No database at ' + SRC);
  process.exit(1);
}
fs.mkdirSync(DIR, { recursive: true });

const stamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 16);
const dest = path.join(DIR, 'db-' + stamp + '.json');
fs.copyFileSync(SRC, dest);

// keep the last 30
const kept = fs.readdirSync(DIR).filter((f) => f.startsWith('db-')).sort();
kept.slice(0, Math.max(0, kept.length - 30)).forEach((f) => fs.unlinkSync(path.join(DIR, f)));

console.log('Backed up to ' + dest + ' (' + Math.min(kept.length, 30) + ' snapshots kept)');
