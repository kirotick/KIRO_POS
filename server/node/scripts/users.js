'use strict';
// KIRO developer tool: shops and logins (developers only; it needs the database address from a git-ignored .env file).
//
//   npm run users -- list                         table of shops and their logins (never passwords)
//   npm run users -- add-shop  --name "Asha Stores" --type grocery --owner "Asha" --login 9876543210
//   npm run users -- add-login --shop 1 --name "Ravi" --login ravi --role pos|manager|accounts|owner
//   npm run users -- reset     --login ravi       new password, unlocks the login
//   npm run users -- off|on    --login ravi       switch a login off or back on
//
// Which database: --db dev (default: Neon branch "dev", developer logins), --db qa (wiped by every test run),
// --db production (needs --confirm-production too).
// Passwords: generated as Kiro-1234-5678 (numbers, plus the letters the login rules require), or give
// --password yourself. Only a scrypt hash is stored, so a password can never be read back later: the
// tool shows it ONCE (or writes it to --save <file>). A forgotten password is replaced with `reset`.
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const { Client } = require('pg');
const pw = require('../src/password');

const args = process.argv.slice(2);
const cmd = args[0];
const opt = (k) => { const i = args.indexOf('--' + k); return i > -1 ? args[i + 1] : undefined; };
const flag = (k) => args.includes('--' + k);
const die = (m) => { console.error('Error: ' + m); process.exit(1); };

function envFrom(file, key) {
  if (!fs.existsSync(file)) return undefined;
  for (const line of fs.readFileSync(file, 'utf8').split(/\r?\n/)) { const m = new RegExp(`^\\s*${key}\\s*=\\s*(.+?)\\s*$`).exec(line); if (m) return m[1]; }
}
const db = opt('db') || 'dev';
const URLS = {
  dev: () => process.env.DEV_DATABASE_URL || envFrom(path.join(__dirname, '../.env'), 'DEV_DATABASE_URL'),
  qa: () => process.env.TEST_DATABASE_URL || envFrom(path.join(__dirname, '../../../qa/.env'), 'TEST_DATABASE_URL'),
  production: () => process.env.DATABASE_URL || envFrom(path.join(__dirname, '../.env'), 'DATABASE_URL'),
};
if (!URLS[db]) die('--db must be dev, qa or production');
if (db === 'production' && !flag('confirm-production') && cmd !== 'list') die('changing production logins needs --confirm-production as well');

const newPassword = () => `Kiro-${crypto.randomInt(0, 10000).toString().padStart(4, '0')}-${crypto.randomInt(0, 10000).toString().padStart(4, '0')}`;
function givePassword(login, password, role, shop) {
  const save = opt('save');
  if (save) {
    fs.appendFileSync(save, `${shop}\t${role}\t${login}\t${password}\n`);
    console.log(`  password for ${login} written to ${save}`);
  } else {
    console.log(`  login: ${login}   password: ${password}   <- shown once; it cannot be looked up later`);
  }
}
function table(rows, cols) {
  if (!rows.length) return console.log('  (none)');
  const w = cols.map((c) => Math.max(c.length, ...rows.map((r) => String(r[c] ?? '').length)));
  const line = (vals) => '  ' + vals.map((v, i) => String(v ?? '').padEnd(w[i])).join('  ');
  console.log(line(cols)); console.log('  ' + w.map((n) => '-'.repeat(n)).join('  '));
  for (const r of rows) console.log(line(cols.map((c) => r[c])));
}

(async () => {
  const url = URLS[db]();
  if (!url) die(`no address for the "${db}" database in .env (see server/node/README.md, "Database: Neon")`);
  const c = new Client({ connectionString: url, ssl: /localhost|127\.0\.0\.1/.test(url) ? undefined : { rejectUnauthorized: false } });
  await c.connect();
  try {
    const exists = (await c.query("SELECT to_regclass('public.users') IS NOT NULL AS ok")).rows[0].ok;
    if (!exists) die(`the "${db}" database has no KIRO tables yet: run the migrations first (npm run migrate with that DATABASE_URL)`);
    console.log(`Database: ${db}`);
    if (cmd === 'list' || !cmd) {
      const rows = (await c.query(`SELECT b.id AS shop_id, b.name AS shop, u.id AS user_id, u.name, u.login, u.role,
          CASE WHEN NOT u.active THEN 'off' WHEN u.locked_until > now() THEN 'locked' ELSE 'on' END AS status,
          to_char(u.last_login_at AT TIME ZONE b.tz, 'YYYY-MM-DD HH24:MI') AS last_login, to_char(u.created_at AT TIME ZONE b.tz, 'YYYY-MM-DD') AS created
        FROM businesses b LEFT JOIN users u ON u.business_id = b.id ORDER BY b.id, u.role <> 'owner', u.id`)).rows;
      table(rows, ['shop_id', 'shop', 'user_id', 'name', 'login', 'role', 'status', 'last_login', 'created']);
    } else if (cmd === 'add-shop') {
      const name = opt('name'), owner = opt('owner'), login = opt('login'), type = opt('type') || 'general';
      if (!name || !owner || !login) die('add-shop needs --name, --owner and --login');
      const password = opt('password') || newPassword();
      const perr = pw.policyError(password); if (perr) die(perr);
      const r = (await c.query('SELECT create_business($1,$2,$3,$4,$5) AS r', [name, type, owner, login, await pw.hash(password)])).rows[0].r;
      console.log(`Shop created: ${name} (${type})`, typeof r === 'object' ? JSON.stringify(r) : r);
      givePassword(login, password, 'owner', name);
    } else if (cmd === 'add-login') {
      const shop = Number(opt('shop')), name = opt('name'), login = opt('login'), role = opt('role') || 'pos';
      if (!shop || !name || !login) die('add-login needs --shop <id>, --name and --login');
      if (!['owner', 'manager', 'accounts', 'pos'].includes(role)) die('--role must be owner, manager, accounts or pos');
      const b = (await c.query('SELECT name FROM businesses WHERE id = $1', [shop])).rows[0]; if (!b) die('no shop with id ' + shop);
      const password = opt('password') || newPassword();
      const perr = pw.policyError(password); if (perr) die(perr);
      try { await c.query('INSERT INTO users (business_id, login, name, role, pw_hash) VALUES ($1,$2,$3,$4,$5)', [shop, login, name, role, await pw.hash(password)]); }
      catch (e) { if (e.code === '23505') die(`the login "${login}" is already taken`); throw e; }
      console.log(`Login added to ${b.name}: ${name} (${role})`);
      givePassword(login, password, role, b.name);
    } else if (cmd === 'reset') {
      const login = opt('login'); if (!login) die('reset needs --login');
      const password = opt('password') || newPassword();
      const perr = pw.policyError(password); if (perr) die(perr);
      const r = await c.query(`UPDATE users u SET pw_hash = $2, failed_attempts = 0, locked_until = NULL FROM businesses b
        WHERE lower(u.login) = lower($1) AND b.id = u.business_id RETURNING u.role, b.name AS shop`, [login, await pw.hash(password)]);
      if (!r.rowCount) die('no login ' + login);
      console.log(`Password reset for ${login} (unlocked)`);
      givePassword(login, password, r.rows[0].role, r.rows[0].shop);
    } else if (cmd === 'off' || cmd === 'on') {
      const login = opt('login'); if (!login) die(`${cmd} needs --login`);
      const r = await c.query('UPDATE users SET active = $2 WHERE lower(login) = lower($1)', [login, cmd === 'on']);
      if (!r.rowCount) die('no login ' + login);
      console.log(`Login ${login} switched ${cmd}`);
    } else die(`unknown command "${cmd}". Commands: list, add-shop, add-login, reset, off, on`);
  } finally { await c.end(); }
})().catch((e) => die(e.message));
