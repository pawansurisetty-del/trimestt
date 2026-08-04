'use strict';
/**
 * Trimestt server. Node built-ins only — no npm install.
 *   node server.js            (defaults to port 3006)
 *   PORT=8080 node server.js
 */
const http = require('http');
const fs = require('fs');
const path = require('path');
const api = require('./lib/api');
const auth = require('./lib/auth');

const PORT = Number(process.env.PORT) || 3006;
const PRODUCTION = process.env.NODE_ENV === 'production';
const PUBLIC = path.join(__dirname, 'public');
const MAX_BODY = 1.5 * 1024 * 1024;   // logo uploads travel as data URLs

const TYPES = {
  '.html': 'text/html; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.webmanifest': 'application/manifest+json'
};

function security(res) {
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('X-Frame-Options', 'DENY');
  res.setHeader('Referrer-Policy', 'same-origin');
  res.setHeader('Permissions-Policy', 'geolocation=(self), camera=(), microphone=()');
  res.setHeader('Content-Security-Policy', [
    "default-src 'self'",
    "img-src 'self' data:",
    "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
    "font-src 'self' https://fonts.gstatic.com",
    "script-src 'self'",
    "connect-src 'self'",
    "frame-ancestors 'none'",
    "base-uri 'self'",
    "form-action 'self'"
  ].join('; '));
  if (PRODUCTION) {
    res.setHeader('Strict-Transport-Security', 'max-age=31536000; includeSubDomains');
  }
}

/** Behind Railway, Render or nginx the real scheme arrives in a header. */
function isSecure(req) {
  const proto = (req.headers['x-forwarded-proto'] || '').split(',')[0].trim();
  return proto ? proto === 'https' : !!req.socket.encrypted;
}

/* ---- simple in-memory rate limiting on the doors that matter ---- */
const attempts = new Map();
const WINDOW_MS = 15 * 60 * 1000;
const MAX_ATTEMPTS = 12;

function rateLimited(req, pathname) {
  const guarded = /\/(login|signup|activate)$/.test(pathname);
  if (!guarded) return false;
  const ip = (req.headers['x-forwarded-for'] || '').split(',')[0].trim() ||
             req.socket.remoteAddress || 'unknown';
  const key = ip + pathname;
  const now = Date.now();
  const record = attempts.get(key) || { count: 0, until: now + WINDOW_MS };
  if (record.until < now) { record.count = 0; record.until = now + WINDOW_MS; }
  record.count += 1;
  attempts.set(key, record);
  if (attempts.size > 5000) attempts.clear();       // keep memory bounded
  return record.count > MAX_ATTEMPTS;
}

function sendJson(res, status, payload) {
  const body = JSON.stringify(payload);
  security(res);
  res.writeHead(status, { 'Content-Type': 'application/json; charset=utf-8', 'Content-Length': Buffer.byteLength(body) });
  res.end(body);
}

function readBody(req) {
  return new Promise((resolve, reject) => {
    let size = 0;
    const chunks = [];
    req.on('data', (chunk) => {
      size += chunk.length;
      if (size > MAX_BODY) {
        reject(Object.assign(new Error('Body too large'), { status: 413 }));
        req.destroy();
        return;
      }
      chunks.push(chunk);
    });
    req.on('end', () => {
      if (!chunks.length) return resolve({});
      try {
        resolve(JSON.parse(Buffer.concat(chunks).toString('utf8')));
      } catch (err) {
        reject(Object.assign(new Error('Body is not valid JSON'), { status: 400 }));
      }
    });
    req.on('error', reject);
  });
}

function serveStatic(req, res, pathname) {
  const rel = pathname === '/' ? 'index.html' : pathname.replace(/^\/+/, '');
  const file = path.join(PUBLIC, rel);
  if (!file.startsWith(PUBLIC)) {            // no climbing out of public/
    res.writeHead(403).end('Forbidden');
    return;
  }
  fs.readFile(file, (err, data) => {
    if (err) {
      // single-page app: unknown paths fall back to the shell
      fs.readFile(path.join(PUBLIC, 'index.html'), (err2, shell) => {
        if (err2) { res.writeHead(404).end('Not found'); return; }
        security(res);
        res.writeHead(200, { 'Content-Type': TYPES['.html'] });
        res.end(shell);
      });
      return;
    }
    security(res);
    res.writeHead(200, {
      'Content-Type': TYPES[path.extname(file)] || 'application/octet-stream',
      'Cache-Control': path.extname(file) === '.html' ? 'no-cache' : 'public, max-age=300'
    });
    res.end(data);
  });
}

const server = http.createServer(async (req, res) => {
  const url = new URL(req.url, 'http://' + (req.headers.host || 'localhost'));
  const pathname = url.pathname;

  if (PRODUCTION && !isSecure(req) && req.headers.host) {
    res.writeHead(301, { Location: 'https://' + req.headers.host + req.url });
    res.end();
    return;
  }

  if (!pathname.startsWith('/api/')) {
    if (req.method !== 'GET' && req.method !== 'HEAD') { res.writeHead(405).end(); return; }
    return serveStatic(req, res, pathname);
  }

  if (rateLimited(req, pathname)) {
    return sendJson(res, 429, { error: 'Too many attempts. Wait fifteen minutes and try again.' });
  }

  let body = {};
  try {
    if (req.method === 'POST' || req.method === 'PUT') body = await readBody(req);
  } catch (err) {
    return sendJson(res, err.status || 400, { error: err.message });
  }

  const header = req.headers.authorization || '';
  const token = header.startsWith('Bearer ') ? header.slice(7) : '';
  const user = auth.userForToken(token);

  const ctx = {
    body, token, user, query: url.searchParams,
    ok: (payload) => sendJson(res, 200, payload),
    fail: (status, message) => sendJson(res, status, { error: message })
  };

  try {
    api.handle(req.method, pathname, ctx);
  } catch (err) {
    console.error('API error:', err);
    sendJson(res, 500, { error: 'Something went wrong on the server.' });
  }
});

if (require.main === module) {
  server.listen(PORT, () => {
    console.log('Trimestt running on http://localhost:' + PORT + (PRODUCTION ? ' (production)' : ''));
    console.log('Patients and hospitals both log in from the home screen.');
  });
}

module.exports = server;
