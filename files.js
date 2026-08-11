'use strict';
/**
 * File storage for the records locker. Files live on disk beside the database
 * (so they sit on the same mounted volume); only metadata goes in the store.
 * Swap this for object storage later without touching anything else.
 */
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

const DATA_DIR = process.env.TRIMESTT_DATA || path.join(__dirname, '..', 'data');
const FILE_DIR = path.join(DATA_DIR, 'uploads');
const MAX_BYTES = 4 * 1024 * 1024;

const ALLOWED = {
  'image/jpeg': 'jpg',
  'image/png': 'png',
  'image/webp': 'webp',
  'image/heic': 'heic',
  'application/pdf': 'pdf'
};

/** Accepts a data URL, writes it, returns metadata for the caller to store. */
function save(dataUrl, ownerKey) {
  const match = /^data:([^;]+);base64,(.+)$/.exec(String(dataUrl || ''));
  if (!match) throw Object.assign(new Error('That file could not be read.'), { status: 400 });

  const mime = match[1].toLowerCase();
  if (!ALLOWED[mime]) {
    throw Object.assign(new Error('Only images and PDF files can be uploaded.'), { status: 415 });
  }

  const buffer = Buffer.from(match[2], 'base64');
  if (buffer.length > MAX_BYTES) {
    throw Object.assign(new Error('That file is over 4 MB. Please use a smaller one.'), { status: 413 });
  }

  fs.mkdirSync(FILE_DIR, { recursive: true });
  const id = 'f_' + crypto.randomBytes(12).toString('hex');
  const name = id + '.' + ALLOWED[mime];
  fs.writeFileSync(path.join(FILE_DIR, name), buffer);

  return { id, file: name, mime, bytes: buffer.length, ownerKey, uploadedAt: new Date().toISOString() };
}

function read(name) {
  const file = path.join(FILE_DIR, path.basename(name));
  if (!file.startsWith(FILE_DIR) || !fs.existsSync(file)) return null;
  return fs.readFileSync(file);
}

function remove(name) {
  try { fs.unlinkSync(path.join(FILE_DIR, path.basename(name))); } catch (err) { /* already gone */ }
}

module.exports = { save, read, remove, ALLOWED, MAX_BYTES, FILE_DIR };
