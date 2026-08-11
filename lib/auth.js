'use strict';
/** Auth: scrypt password hashing + signed session tokens. Node built-ins only. */
const crypto = require('crypto');
const store = require('./store');

const STAFF_SESSION_HOURS = 12;   // shared desk machines should not stay open

function hashPassword(password) {
  const salt = crypto.randomBytes(16).toString('hex');
  const hash = crypto.scryptSync(password, salt, 64).toString('hex');
  return salt + ':' + hash;
}

function verifyPassword(password, stored) {
  if (!stored || !stored.includes(':')) return false;
  const [salt, hash] = stored.split(':');
  const attempt = crypto.scryptSync(password, salt, 64);
  const known = Buffer.from(hash, 'hex');
  if (attempt.length !== known.length) return false;
  return crypto.timingSafeEqual(attempt, known);
}

function passwordProblem(password) {
  if (!password || password.length < 8) return 'Password needs at least 8 characters.';
  if (!/[a-zA-Z]/.test(password) || !/[0-9]/.test(password)) {
    return 'Use at least one letter and one number.';
  }
  return null;
}

/**
 * Patient sessions never expire — she stays signed in on her own phone until
 * she taps sign out. Staff sessions expire, because desk machines are shared.
 */
function createSession(userId, role) {
  const db = store.load();
  const token = crypto.randomBytes(32).toString('hex');
  db.sessions[token] = {
    userId,
    expires: role === 'patient' ? null : Date.now() + STAFF_SESSION_HOURS * 60 * 60 * 1000
  };
  store.save();
  return token;
}

function userForToken(token) {
  if (!token) return null;
  const db = store.load();
  const session = db.sessions[token];
  if (!session) return null;
  if (session.expires !== null && session.expires < Date.now()) {
    delete db.sessions[token];
    store.save();
    return null;
  }
  return db.users.find((u) => u.id === session.userId) || null;
}

function destroySession(token) {
  const db = store.load();
  if (token && db.sessions[token]) {
    delete db.sessions[token];
    store.save();
  }
}

/** Six-character code the hospital hands over — for activation or a reset. */
function activationCode() {
  const alphabet = 'ACDEFHJKLMNPQRTUVWXY349';   // no 0/O/1/I/S5/B8 confusion
  let out = '';
  for (let i = 0; i < 6; i++) {
    out += alphabet[crypto.randomInt(alphabet.length)];
  }
  return out;
}

module.exports = {
  hashPassword, verifyPassword, passwordProblem,
  createSession, userForToken, destroySession, activationCode
};
