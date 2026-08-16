'use strict';
/**
 * Fetch the three fonts once, so patients never do.
 *
 * Run this on a developer machine and commit what it writes. It is not part of
 * the deploy — the point of the exercise is that no request leaves a patient's
 * phone for another origin, and a build step that downloads from Google would
 * still be a build step, not a runtime call.
 *
 *     node scripts/fetch-fonts.js
 *
 * It asks Google's CSS endpoint for the same families the app used to link,
 * pretending to be a browser that supports woff2, then saves each font file it
 * is pointed at. If it cannot reach the network it says so and changes
 * nothing; the app still runs, in the system font.
 *
 * The three families are all SIL Open Font License 1.1, which permits
 * self-hosting inside a commercial product and requires the licence text to
 * ship alongside. That text is written to public/fonts/LICENCES.txt.
 */

const fs = require('fs');
const path = require('path');
const https = require('https');

const LICENCE_NOTE = [
  'Fonts bundled with Trimestt',
  '===========================',
  '',
  'Plus Jakarta Sans  — SIL Open Font License 1.1 — Tokotype',
  'Fraunces           — SIL Open Font License 1.1 — Undercase Type',
  'IBM Plex Mono      — SIL Open Font License 1.1 — IBM',
  '',
  'All three are licensed under the SIL Open Font License, Version 1.1, which',
  'permits use, study, modification and redistribution — including bundled',
  'inside a commercial application — provided the fonts are not sold on their',
  'own and this notice travels with them.',
  '',
  'The full licence text is at https://scripts.sil.org/OFL',
  '',
  'If you replace any of these fonts, check the replacement\'s licence before',
  'shipping it. A font is software, and a commercial medical product is exactly',
  'the kind of thing a foundry audits.',
  ''
].join('\n');

const OUT = path.join(__dirname, '..', 'public', 'fonts');

/* A modern browser UA, so the CSS endpoint returns woff2 rather than the
   ancient truetype fallback it serves to unknown clients. */
const UA = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 ' +
           '(KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36';

const WANTED = [
  {
    file: 'plus-jakarta-sans-latin.woff2',
    css: 'https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400..800&display=swap'
  },
  {
    file: 'fraunces-latin.woff2',
    css: 'https://fonts.googleapis.com/css2?family=Fraunces:opsz,wght@9..144,500..600&display=swap'
  },
  {
    file: 'ibm-plex-mono-latin-400.woff2',
    css: 'https://fonts.googleapis.com/css2?family=IBM+Plex+Mono:wght@400&display=swap'
  },
  {
    file: 'ibm-plex-mono-latin-600.woff2',
    css: 'https://fonts.googleapis.com/css2?family=IBM+Plex+Mono:wght@600&display=swap'
  }
];

function get(url, binary) {
  return new Promise((resolve, reject) => {
    https.get(url, { headers: { 'User-Agent': UA } }, (res) => {
      if (res.statusCode >= 300 && res.statusCode < 400 && res.headers.location) {
        return resolve(get(res.headers.location, binary));
      }
      if (res.statusCode !== 200) {
        return reject(new Error(url + ' returned ' + res.statusCode));
      }
      const chunks = [];
      res.on('data', (c) => chunks.push(c));
      res.on('end', () => resolve(binary ? Buffer.concat(chunks) : Buffer.concat(chunks).toString('utf8')));
    }).on('error', reject);
  });
}

/**
 * Pull the latin subset out of the returned stylesheet. Google emits one
 * @font-face block per subset, each preceded by a comment naming it. We want
 * the block commented `/* latin *\/` — not `latin-ext`, which is larger and
 * carries accented characters the app does not use.
 */
function latinUrl(css) {
  const blocks = css.split('/*').map((b) => '/*' + b);
  const latin = blocks.find((b) => /^\/\*\s*latin\s*\*\//.test(b));
  const source = latin || css;
  const match = source.match(/src:\s*url\((https:\/\/[^)]+\.woff2)\)/);
  return match ? match[1] : null;
}

(async function main() {
  fs.mkdirSync(OUT, { recursive: true });

  let written = 0;
  for (const want of WANTED) {
    const target = path.join(OUT, want.file);
    try {
      const css = await get(want.css, false);
      const url = latinUrl(css);
      if (!url) {
        console.error('  ! could not find a woff2 for ' + want.file);
        continue;
      }
      const bytes = await get(url, true);
      fs.writeFileSync(target, bytes);
      console.log('  ok ' + want.file + '  (' + Math.round(bytes.length / 1024) + ' kB)');
      written += 1;
    } catch (err) {
      console.error('  ! ' + want.file + ': ' + err.message);
    }
  }

  if (!written) {
    console.error('\nNothing was downloaded. The app will fall back to the system');
    console.error('font, which is plainer but works. Re-run when you have a network.');
    process.exit(1);
  }

  fs.writeFileSync(path.join(OUT, 'LICENCES.txt'), LICENCE_NOTE);
  console.log('\n' + written + ' of ' + WANTED.length + ' fonts written to public/fonts');
  console.log('Commit them. They are then served from our own origin and no');
  console.log('request for a font ever leaves a patient\'s phone.');
}());
