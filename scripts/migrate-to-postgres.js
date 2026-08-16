'use strict';
/**
 * Move the JSON database into Postgres.
 *
 *     npm install pg
 *     DATABASE_URL=postgres://... TRIMESTT_DATA=/data node scripts/migrate-to-postgres.js
 *
 * Reads the file, writes it into the Postgres row, reads it back and compares.
 * It does not delete the file — keep it until you have watched the app run on
 * Postgres for a few days, and keep a copy off the server besides.
 *
 * Running it twice is safe as long as the app is stopped: it overwrites the row
 * with the file's contents. That is also its danger. **Stop the app first.** If
 * the app is live on Postgres and you run this against an old file, you will
 * write the old data over the new.
 */

const fs = require('fs');
const path = require('path');

async function main() {
  if (!process.env.DATABASE_URL) {
    console.error('DATABASE_URL is not set. Nothing to migrate into.');
    process.exit(1);
  }
  try {
    require.resolve('pg');
  } catch (err) {
    console.error('The "pg" package is not installed. Run: npm install pg');
    process.exit(1);
  }

  const dataDir = process.env.TRIMESTT_DATA || process.env.TRIMEST_DATA
    || path.join(__dirname, '..', 'data');
  const file = path.join(dataDir, 'db.json');

  if (!fs.existsSync(file)) {
    console.error('No database at ' + file);
    console.error('Set TRIMESTT_DATA to the directory holding db.json.');
    process.exit(1);
  }

  const raw = fs.readFileSync(file, 'utf8');
  let doc;
  try {
    doc = JSON.parse(raw);
  } catch (err) {
    console.error('db.json will not parse, so there is nothing safe to migrate.');
    console.error(err.message);
    process.exit(1);
  }

  const counts = {};
  for (const key of Object.keys(doc)) {
    counts[key] = Array.isArray(doc[key]) ? doc[key].length : Object.keys(doc[key] || {}).length;
  }
  console.log('Read ' + file + ' (' + Math.round(raw.length / 1024) + ' kB)');
  for (const key of Object.keys(counts)) console.log('  ' + key + ': ' + counts[key]);

  console.log('\nThis will overwrite whatever is in the Postgres row.');
  console.log('Stop the app before continuing, or a live write will race this one.\n');
  await pause(5);

  const pg = require('../lib/store-pg');
  const store = pg.create();
  await store.init();
  await store.replaceAll(doc);
  console.log('Written.');

  /* Read it back through a fresh connection rather than trusting the copy we
     still hold in memory — the point of verifying is to prove the round trip. */
  const check = pg.create();
  await check.init();
  const back = check.load();
  let bad = 0;
  for (const key of Object.keys(counts)) {
    const got = Array.isArray(back[key]) ? back[key].length : Object.keys(back[key] || {}).length;
    const same = got === counts[key];
    if (!same) bad += 1;
    console.log('  ' + (same ? 'ok  ' : 'BAD ') + key + ': ' + got + ' / ' + counts[key]);
  }

  await store.close();
  await check.close();

  if (bad) {
    console.error('\n' + bad + ' collection(s) did not survive the round trip. Do not switch over.');
    process.exit(1);
  }
  console.log('\nEverything matched. Set DATABASE_URL on the service and redeploy.');
  console.log('The startup line should read: [trimestt] storage: postgres');
  console.log('Keep ' + file + ' until you are sure.');
}

function pause(seconds) {
  return new Promise((resolve) => {
    let left = seconds;
    process.stdout.write('Starting in ' + left + '... ');
    const timer = setInterval(() => {
      left -= 1;
      if (left <= 0) {
        clearInterval(timer);
        process.stdout.write('\n');
        resolve();
      } else {
        process.stdout.write(left + '... ');
      }
    }, 1000);
  });
}

main().catch((err) => {
  console.error('Migration failed:', err.message);
  process.exit(1);
});
