'use strict';
// All SQL lives here. `pool` is a node-postgres Pool (anything with query(text, params) -> {rows}).
// Every query is parameterised and every tenant-scoped query filters on business_id.
module.exports = (pool) => {
  const one = async (text, params) => (await pool.query(text, params)).rows[0] || null;
  return {
    upsertGateway: (businessId, mid, saltEnc, saltIndex) => one(
      `INSERT INTO merchant_payment_gateways (business_id, phonepe_mid, phonepe_salt_key, phonepe_salt_index)
       VALUES ($1,$2,$3,$4)
       ON CONFLICT (business_id) DO UPDATE SET phonepe_mid=EXCLUDED.phonepe_mid,
         phonepe_salt_key=EXCLUDED.phonepe_salt_key, phonepe_salt_index=EXCLUDED.phonepe_salt_index,
         is_active=TRUE, updated_at=now()
       RETURNING id`, [businessId, mid, saltEnc, saltIndex]),
    getGateway: (businessId) => one(
      `SELECT business_id, phonepe_mid, phonepe_salt_key, phonepe_salt_index FROM merchant_payment_gateways
       WHERE business_id=$1 AND is_active`, [businessId]),
    getGatewayByMid: (mid) => one(
      `SELECT business_id, phonepe_mid, phonepe_salt_key, phonepe_salt_index FROM merchant_payment_gateways
       WHERE phonepe_mid=$1 AND is_active`, [mid]),
    createBill: (businessId, invoiceNo, amountPaise) => one(
      `INSERT INTO bills (business_id, invoice_no, amount_paise) VALUES ($1,$2,$3)
       RETURNING id, invoice_no, amount_paise, status`, [businessId, invoiceNo, amountPaise]),
    getBill: (businessId, id) => one(
      `SELECT id, business_id, invoice_no, amount_paise, status, phonepe_txn_id, qr_string, qr_expires_at, paid_at
       FROM bills WHERE business_id=$1 AND id=$2`, [businessId, id]),
    getBillByTxn: (businessId, txnId) => one(
      `SELECT id, amount_paise, status FROM bills WHERE business_id=$1 AND phonepe_txn_id=$2`, [businessId, txnId]),
    setQr: (businessId, id, txnId, qrString, expiresAt) => one(
      `UPDATE bills SET phonepe_txn_id=$3, qr_string=$4, qr_expires_at=$5, updated_at=now()
       WHERE business_id=$1 AND id=$2 AND status='Pending' RETURNING id`, [businessId, id, txnId, qrString, expiresAt]),
    // Atomic and idempotent: only the first successful callback flips Pending -> Paid.
    markPaid: (businessId, txnId) => one(
      `UPDATE bills SET status='Paid', paid_at=now(), updated_at=now()
       WHERE business_id=$1 AND phonepe_txn_id=$2 AND status='Pending' RETURNING id`, [businessId, txnId]),
    markReview: (businessId, txnId) => one(
      `UPDATE bills SET status='Review', updated_at=now()
       WHERE business_id=$1 AND phonepe_txn_id=$2 AND status='Pending' RETURNING id`, [businessId, txnId]),
    logEvent: (businessId, txnId, code, outcome, payload) => one(
      `INSERT INTO phonepe_webhook_events (business_id, phonepe_txn_id, code, outcome, payload)
       VALUES ($1,$2,$3,$4,$5::jsonb) RETURNING id`, [businessId, txnId, code, outcome, JSON.stringify(payload)]),
  };
};
