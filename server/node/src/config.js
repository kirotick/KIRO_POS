'use strict';
const { loadKey } = require('./crypto');

function loadConfig(env = process.env) {
  const need = (k) => { if (!env[k]) throw new Error('Missing required env var ' + k); return env[k]; };
  const publicBaseUrl = need('PUBLIC_BASE_URL').replace(/\/+$/, '');
  if (env.NODE_ENV === 'production' && !publicBaseUrl.startsWith('https://')) throw new Error('PUBLIC_BASE_URL must be https in production');
  if (need('JWT_SECRET').length < 32) throw new Error('JWT_SECRET must be at least 32 characters');
  return {
    port: Number(env.PORT || 3000),
    databaseUrl: need('DATABASE_URL'),
    kek: loadKey(need('PHONEPE_KEK')),
    jwtSecret: env.JWT_SECRET,
    cfg: {
      baseUrl: need('PHONEPE_BASE_URL'),                    // no default on purpose: take it from PhonePe's docs
      qrPath: env.PHONEPE_QR_PATH || '/v3/qr/init',         // must be exactly the path PhonePe signs
      publicBaseUrl,
      qrExpirySeconds: Number(env.QR_EXPIRY_SECONDS || 600),
      maxBillPaise: Number(env.MAX_BILL_PAISE || 10000000), // Rs 1,00,000
    },
  };
}
module.exports = { loadConfig };
