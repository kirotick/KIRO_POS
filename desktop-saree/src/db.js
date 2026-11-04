import { createRequire } from 'node:module';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

const require = createRequire(import.meta.url);
const here = path.dirname(fileURLToPath(import.meta.url));
export const root = path.join(here, '..');

// Production: better-sqlite3 (works inside Electron). Fallback: Node's built-in node:sqlite (Node >= 22.5), used by the tests.
export function openDb(file = ':memory:') {
  let db;
  try {
    const Better = require('better-sqlite3');
    db = new Better(file);
    db.pragma('journal_mode = WAL');
  } catch {
    const { DatabaseSync } = require('node:sqlite');
    db = new DatabaseSync(file);
    if (file !== ':memory:') db.exec('PRAGMA journal_mode = WAL');
  }
  db.exec('PRAGMA foreign_keys = ON; PRAGMA busy_timeout = 5000;');
  db.exec(readFileSync(path.join(root, 'db/schema.sql'), 'utf8'));
  return db;
}

// BEGIN IMMEDIATE ... COMMIT, rolled back on any error (all-or-nothing billing).
export function tx(db, fn) {
  db.exec('BEGIN IMMEDIATE');
  try { const r = fn(); db.exec('COMMIT'); return r; }
  catch (e) { try { db.exec('ROLLBACK'); } catch { /* already rolled back */ } throw e; }
}

const cache = new Map();
export const sqlFile = (name) => {
  if (!cache.has(name)) cache.set(name, readFileSync(path.join(root, 'db/queries', name + '.sql'), 'utf8'));
  return cache.get(name);
};
