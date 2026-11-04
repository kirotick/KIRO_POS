'use strict';
// Read-only: prints the PostgreSQL version and every table with its row count. Never prints the connection string.
// Usage: DATABASE_URL=postgres://... node scripts/db-info.js
const { Client } = require('pg');
(async () => {
  const url = process.env.DATABASE_URL; if (!url) { console.error('DATABASE_URL is not set'); process.exit(1); }
  const c = new Client({ connectionString: url, ssl: /localhost|127\.0\.0\.1/.test(url) ? undefined : { rejectUnauthorized: false } });
  await c.connect();
  try {
    const v = await c.query('select version()');
    console.log(v.rows[0].version.split(',')[0]);
    const t = await c.query(`select table_schema s, table_name n from information_schema.tables
      where table_type = 'BASE TABLE' and table_schema not in ('pg_catalog','information_schema') order by 1, 2`);
    if (!t.rows.length) console.log('no tables');
    for (const r of t.rows) {
      const n = await c.query(`select count(*)::int n from "${r.s.replace(/"/g, '""')}"."${r.n.replace(/"/g, '""')}"`);
      console.log(`${r.s}.${r.n}: ${n.rows[0].n} rows`);
    }
  } finally { await c.end(); }
})().catch((e) => { console.error('db-info failed:', e.message); process.exit(1); });
