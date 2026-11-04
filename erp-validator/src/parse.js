'use strict';
// Offline fallback that pulls fields out of what a person typed. It only splits text; it never guesses a missing value.
// Handles "vendor: X / item: Y / qty: 5 kg" lines and the one-liner "5 kg MS Rod 12mm from Sharma Steels".
const KEYS = { vendor: 'vendor', supplier: 'vendor', item: 'item', material: 'item', qty: 'quantity', quantity: 'quantity', uom: 'uom', unit: 'uom', rate: 'rate', price: 'rate',
  date: 'delivery_date', 'delivery date': 'delivery_date', delivery_date: 'delivery_date', batch: 'batch_no', 'batch no': 'batch_no', batch_no: 'batch_no', lot: 'batch_no',
  location: 'location', store: 'location', movement: 'movement_type', type: 'movement_type', movement_type: 'movement_type' };
function parseRaw(text) {
  const out = {}; const t = String(text || '').slice(0, 2000);
  let keyed = false;
  for (const line of t.split(/\n|;/)) {
    const m = /^\s*([A-Za-z_ ]{2,20})\s*[:=]\s*(.+?)\s*$/.exec(line); const k = m && KEYS[m[1].trim().toLowerCase()];
    if (k) { out[k] = m[2].slice(0, 200); keyed = true; }
  }
  if (!keyed) {
    const m = /^\s*([0-9][0-9,]*(?:\.[0-9]+)?)\s*([A-Za-z.]{1,12})?\s+(.+?)\s+(?:from|by|vendor|supplier)\s+(.+?)\s*$/i.exec(t.replace(/\s+/g, ' '));
    if (m) { out.quantity = m[1]; if (m[2] && /^(kg|kgs|g|gm|gms|mt|ton|tons|tonne|tonnes|qtl|l|ltr|ltrs|litre|litres|ml|m|mtr|mm|cm|ft|nos|no|pcs|pc|doz|dozen|box|boxes|bag|bags|bori|drum|drums|roll|rolls|set|sets)$/i.test(m[2])) out.uom = m[2]; else out.item = (m[2] ? m[2] + ' ' : '') + m[3]; if (!out.item) out.item = m[3]; out.vendor = m[4]; }
  }
  return out;
}
module.exports = { parseRaw };
