'use strict';
// pg-Pool-compatible shim over the psql CLI, for running the real SQL when node-postgres is not installed.
// Substitutes $n as safely quoted literals and returns rows as JSON. Enabled by TEST_PG_HOST/PORT/DB.
const { execFile } = require('child_process');
const { promisify } = require('util'); const run = promisify(execFile);
const E = process.env;
const enabled = !!(E.TEST_PG_HOST && E.TEST_PG_PORT && E.TEST_PG_DB);
const base = enabled ? ['-X', '-q', '-At', '-v', 'ON_ERROR_STOP=1', '-v', 'VERBOSITY=verbose', '-h', E.TEST_PG_HOST, '-p', E.TEST_PG_PORT, '-U', E.TEST_PG_USER || 'kiro', '-d', E.TEST_PG_DB] : [];
const lit = (v) => v === null || v === undefined ? 'NULL' : v instanceof Date ? `'${v.toISOString()}'` : typeof v === 'boolean' ? String(v) : typeof v === 'number' ? String(v) : `'${String(v).replace(/'/g, "''")}'`;
const pool = { async query(text, params = []) {
  const sql = text.replace(/\$(\d+)/g, (_, n) => lit(params[Number(n) - 1]));
  try {
    if (/^\s*(INSERT|UPDATE|DELETE)\b/i.test(sql) && !/\bRETURNING\b/i.test(sql)) { await run('psql', [...base, '-c', sql]); return { rows: [] }; }
    const { stdout } = await run('psql', [...base, '-c', `WITH __q AS (${sql}) SELECT coalesce(json_agg(__q),'[]'::json) FROM __q`], { maxBuffer: 1 << 26 });
    return { rows: JSON.parse(stdout) };
  } catch (e) {
    const m = /ERROR:\s+(\w{5}):\s*(.*)/.exec(e.stderr || ''); const err = new Error(m ? m[2] : 'pg error'); err.code = m && m[1]; throw err;
  }
} };
const file = (f) => run('psql', [...base, '-f', f]);
const exec = (sql) => run('psql', [...base, '-c', sql]);
module.exports = { enabled, pool, file, exec };
