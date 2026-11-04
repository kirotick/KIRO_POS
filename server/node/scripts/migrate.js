'use strict';
// Applies migrations/*.sql in order. Safe to run on every start: each file only creates what is missing.
// Usage: DATABASE_URL=postgres://... node scripts/migrate.js
const fs = require('fs'); const path = require('path'); const { Client } = require('pg');
(async () => {
  const url = process.env.DATABASE_URL; if (!url) { console.error('DATABASE_URL is not set'); process.exit(1); }
  const ssl = /localhost|127\.0\.0\.1/.test(url) || process.env.PGSSLMODE === 'disable' ? undefined : { rejectUnauthorized: false };
  const c = new Client({ connectionString: url, ssl }); await c.connect();
  try {
    const dir = path.join(__dirname, '../migrations');
    for (const f of fs.readdirSync(dir).filter((x) => /^\d+_.*\.sql$/.test(x)).sort()) {
      process.stdout.write('migration ' + f + ' ... '); await c.query(fs.readFileSync(path.join(dir, f), 'utf8')); console.log('ok');
    }
  } finally { await c.end(); }
})().catch((e) => { console.error('migration failed:', e.message); process.exit(1); });
