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
const pages = require('./lib/pages');
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
  '.webmanifest': 'application/manifest+json',
  '.woff2': 'font/woff2',
  '.txt': 'text/plain; charset=utf-8'
};

function security(res) {
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('X-Frame-Options', 'DENY');
  res.setHeader('Referrer-Policy', 'same-origin');
  res.setHeader('Permissions-Policy', 'geolocation=(self), camera=(), microphone=()');
  res.setHeader('Content-Security-Policy', [
    "default-src 'self'",
    "img-src 'self' data:",
    "style-src 'self' 'unsafe-inline'",
    "font-src 'self'",
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

/**
 * Behind Railway, Render or nginx the real scheme arrives in a header.
 * Only redirect when the proxy explicitly reports plain HTTP. Internal traffic
 * — health checks, container-to-container calls — carries no such header, and
 * redirecting it fails every deploy.
 */
function shouldRedirectToHttps(req, pathname) {
  if (!PRODUCTION) return false;
  if (pathname === '/api/health') return false;          // never redirect the health check
  if (!req.headers.host) return false;
  const proto = (req.headers['x-forwarded-proto'] || '').split(',')[0].trim();
  return proto === 'http';
}

/* ---- simple in-memory rate limiting on the doors that matter ---- */
const attempts = new Map();
const WINDOW_MS = 15 * 60 * 1000;
const MAX_ATTEMPTS = 12;

/**
 * Who is knocking.
 *
 * This used to read the *first* entry of `x-forwarded-for`. That is the one
 * value in the whole request a client can choose for itself: Cloudflare appends
 * the true address to whatever the caller already sent, so a caller who sends
 * `X-Forwarded-For: 1.2.3.4` owns position zero and gets a fresh allowance on
 * every request. The limiter on /login was therefore bypassable by anyone who
 * thought to try it.
 *
 * `CF-Connecting-IP` is set by Cloudflare and cannot be spoofed through it —
 * any copy the client sends is overwritten. It is the only header here worth
 * trusting, so it is preferred outright.
 *
 * When it is absent the request did not come through Cloudflare. Today that is
 * true of `www`, which is unproxied. Rather than fall back to a value the
 * caller controls, we take the *last* entry of `x-forwarded-for` — appended by
 * the proxy we actually sit behind — and finally the socket address. A caller
 * can prepend to that list but cannot append to it.
 */
function clientIp(req) {
  const cf = (req.headers['cf-connecting-ip'] || '').trim();
  if (cf) return cf;
  const chain = (req.headers['x-forwarded-for'] || '')
    .split(',').map((s) => s.trim()).filter(Boolean);
  if (chain.length) return chain[chain.length - 1];
  return req.socket.remoteAddress || 'unknown';
}

function rateLimited(req, pathname) {
  const guarded = /\/(login|signup|activate)$/.test(pathname);
  if (!guarded) return false;
  const key = clientIp(req) + pathname;
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
      /* Only app routes fall back to the shell, and an app route has no file
         extension. Without this, a missing font or script returned 200 with the
         whole HTML shell in it — the browser downloaded 1.7 kB of markup,
         refused it as a font because of nosniff, and quietly used the fallback.
         It works, but it hides a missing file, and a missing file is exactly
         the thing you want to see in the network tab. */
      if (path.extname(rel)) {
        security(res);
        res.writeHead(404, { 'Content-Type': 'text/plain; charset=utf-8' });
        res.end('Not found');
        return;
      }
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

  if (shouldRedirectToHttps(req, pathname)) {
    res.writeHead(301, { Location: 'https://' + req.headers.host + req.url });
    res.end();
    return;
  }

  /* Both app stores require a live privacy policy, terms and a support page
     before they will accept a submission. */
  const PAGES = {
    '/privacy': () => pages.privacyPage(api.termsFor(null), api.GRIEVANCE),
    '/terms': () => pages.termsPage(),
    '/support': () => pages.supportPage(api.GRIEVANCE),
    '/help': () => pages.supportPage(api.GRIEVANCE)
  };
  if (PAGES[pathname]) {
    if (req.method !== 'GET' && req.method !== 'HEAD') { res.writeHead(405).end(); return; }
    security(res);
    const html = PAGES[pathname]();
    res.writeHead(200, {
      'Content-Type': 'text/html; charset=utf-8',
      'Content-Length': Buffer.byteLength(html),
      'Cache-Control': 'public, max-age=600'
    });
    res.end(req.method === 'HEAD' ? undefined : html);
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
  const token = header.startsWith('Bearer ') ? header.slice(7)
    : pathname.startsWith('/api/files/') ? (url.searchParams.get('t') || '')
    : '';
  const user = auth.userForToken(token);

  const ctx = {
    body, token, user, query: url.searchParams,
    apiKey: req.headers['x-api-key'] || '',
    ok: (payload) => sendJson(res, 200, payload),
    fail: (status, message) => sendJson(res, status, { error: message }),
    file: (buffer, mime) => {
      security(res);
      res.writeHead(200, { 'Content-Type': mime, 'Content-Length': buffer.length, 'Cache-Control': 'private, max-age=600' });
      res.end(buffer);
    }
  };

  try {
    api.handle(req.method, pathname, ctx);
  } catch (err) {
    console.error('API error:', err);
    sendJson(res, 500, { error: 'Something went wrong on the server.' });
  }
});

if (require.main === module) {
  /* Open the store before the first request. With the JSON file this resolves
     immediately; with Postgres it connects, creates the table if needed and
     reads the document into memory. Serving before that finishes would throw on
     the first load(), so the listen call waits. */
  Promise.resolve(require('./lib/store').init())
    .then(() => {
      // Railway's health check reaches the container over IPv4, so bind 0.0.0.0
      // explicitly rather than relying on Node's default dual-stack behaviour.
      server.listen(PORT, '0.0.0.0', () => {
        console.log('Trimestt running on http://localhost:' + PORT + (PRODUCTION ? ' (production)' : ''));
        console.log('Patients and hospitals both log in from the home screen.');
      });
    })
    .catch((err) => {
      console.error('[trimestt] could not open the database:', err.message);
      console.error('Refusing to start rather than serving with no storage.');
      process.exit(1);
    });
}

module.exports = server;
