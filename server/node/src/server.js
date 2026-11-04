'use strict';
const { Pool } = require('pg');
const { loadConfig } = require('./config');
const makeStore = require('./store');
const makeCoreStore = require('./core-store');
const { createHandlers } = require('./handlers');
const { createCoreHandlers } = require('./core-handlers');
const { createAi } = require('./ai');
const { createNightly } = require('./nightly');
const { requireAuth, requireLiveUser } = require('./auth');
const { buildApp } = require('./app');

const c = loadConfig();
const pool = new Pool({ connectionString: c.databaseUrl, max: 10 });
const coreStore = makeCoreStore(pool);
const handlers = createHandlers({ store: makeStore(pool), kek: c.kek, cfg: c.cfg, fetchImpl: fetch });
const core = createCoreHandlers({ store: coreStore, jwtSecret: c.jwtSecret, ai: createAi({ store: coreStore }) });
buildApp({ handlers, core, authMiddleware: requireAuth(c.jwtSecret), liveUser: requireLiveUser(coreStore), corsOrigins: process.env.CORS_ORIGINS })
  .listen(c.port, () => console.log('KIRO API listening on', c.port));

// Nightly 10 PM owner report: check every 5 minutes; the database makes sure each business gets it once per day.
const nightly = createNightly({ store: coreStore });
if (nightly.sendReady) { const tick = () => nightly.run().catch((e) => console.error('nightly tick failed:', e.message)); setInterval(tick, 5 * 60_000); tick(); console.log('Nightly owner report: on (10 PM local time)'); }
else console.log('Nightly owner report: off (WA_TOKEN, WA_PHONE_NUMBER_ID and WA_TEMPLATE not set)');
