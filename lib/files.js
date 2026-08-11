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

/**
 * Files are encrypted at rest with AES-256-GCM when TRIMESTT_FILE_KEY is set.
 * Older, unencrypted files are still readable, so nothing breaks on upgrade.
 */
const MAGIC = Buffer.from('TRM1');

function key() {
  const raw = process.env.TRIMESTT_FILE_KEY || '';
  if (!raw) return null;
  return crypto.createHash('sha256').update(raw).digest();   // 32 bytes, whatever they set
}

function encrypt(buffer) {
  const k = key();
  if (!k) return buffer;
  const iv = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv('aes-256-gcm', k, iv);
  const body = Buffer.concat([cipher.update(buffer), cipher.final()]);
  return Buffer.concat([MAGIC, iv, cipher.getAuthTag(), body]);
}

function decrypt(buffer) {
  if (buffer.length < 32 || !buffer.subarray(0, 4).equals(MAGIC)) return buffer;  // stored before encryption
  const k = key();
  if (!k) throw new Error('This file is encrypted but TRIMESTT_FILE_KEY is not set.');
  const iv = buffer.subarray(4, 16);
  const tag = buffer.subarray(16, 32);
  const decipher = crypto.createDecipheriv('aes-256-gcm', k, iv);
  decipher.setAuthTag(tag);
  return Buffer.concat([decipher.update(buffer.subarray(32)), decipher.final()]);
}

function encryptionOn() { return !!key(); }

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
  fs.writeFileSync(path.join(FILE_DIR, name), encrypt(buffer));

  return {
    id, file: name, mime, bytes: buffer.length, ownerKey,
    encrypted: encryptionOn(), uploadedAt: new Date().toISOString()
  };
}

function read(name) {
  const file = path.join(FILE_DIR, path.basename(name));
  if (!file.startsWith(FILE_DIR) || !fs.existsSync(file)) return null;
  return decrypt(fs.readFileSync(file));
}

function remove(name) {
  try { fs.unlinkSync(path.join(FILE_DIR, path.basename(name))); } catch (err) { /* already gone */ }
}

module.exports = { save, read, remove, encryptionOn, ALLOWED, MAX_BYTES, FILE_DIR };
