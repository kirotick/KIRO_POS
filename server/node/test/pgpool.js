'use strict';
// Database access for the real-PostgreSQL tests. Two ways to enable them:
//  1. TEST_DATABASE_URL=postgres://...  (node-postgres; works with Neon, no psql needed)  <- preferred
//  2. TEST_PG_HOST/TEST_PG_PORT/TEST_PG_DB (+TEST_PG_USER): the original psql-CLI shim.
// These tests DROP and recreate every KIRO table, so they refuse to run against DATABASE_URL (production).
const fs = require('fs');
const { execFile } = require('child_process');
const { promisify } = require('util'); const run = promisify(execFile);
const E = process.env;

const url = E.TEST_DATABASE_URL;
if (url && E.DATABASE_URL && url.trim() === E.DATABASE_URL.trim()) {
  throw new Error('TEST_DATABASE_URL is the same as DATABASE_URL. These tests drop tables: point TEST_DATABASE_URL at a test database (Neon branch "qa").');
}

let enabled, pool, file, exec;
if (url) {
  const { Pool } = require('pg');
  const local = /@(localhost|127\.0\.0\.1)[:/]/.test(url);
  const p = new Pool({ connectionString: url, ssl: local ? undefined : { rejectUnauthorized: false }, max: 10, allowExitOnIdle: true });
  enabled = true;
  pool = { query: (text, params = []) => p.query(text, params) };
  file = (f) => p.query(fs.readFileSync(f, 'utf8'));
  exec = (sql) => p.query(sql);
} else {
  enabled = !!(E.TEST_PG_HOST && E.TEST_PG_PORT && E.TEST_PG_DB);
  const base = enabled ? ['-X', '-q', '-At', '-v', 'ON_ERROR_STOP=1', '-v', 'VERBOSITY=verbose', '-h', E.TEST_PG_HOST, '-p', E.TEST_PG_PORT, '-U', E.TEST_PG_USER || 'kiro', '-d', E.TEST_PG_DB] : [];
  const lit = (v) => v === null || v === undefined ? 'NULL' : v instanceof Date ? `'${v.toISOString()}'` : typeof v === 'boolean' ? String(v) : typeof v === 'number' ? String(v) : `'${String(v).replace(/'/g, "''")}'`;
  pool = { async query(text, params = []) {
    const sql = text.replace(/\$(\d+)/g, (_, n) => lit(params[Number(n) - 1]));
    try {
      if (/^\s*(INSERT|UPDATE|DELETE)\b/i.test(sql) && !/\bRETURNING\b/i.test(sql)) { await run('psql', [...base, '-c', sql]); return { rows: [] }; }
      const { stdout } = await run('psql', [...base, '-c', `WITH __q AS (${sql}) SELECT coalesce(json_agg(__q),'[]'::json) FROM __q`], { maxBuffer: 1 << 26 });
      return { rows: JSON.parse(stdout) };
    } catch (e) {
      const m = /ERROR:\s+(\w{5}):\s*(.*)/.exec(e.stderr || ''); const err = new Error(m ? m[2] : 'pg error'); err.code = m && m[1]; throw err;
    }
  } };
  file = (f) => run('psql', [...base, '-f', f]);
  exec = (sql) => run('psql', [...base, '-c', sql]);
}
module.exports = { enabled, pool, file, exec, viaUrl: !!url };
