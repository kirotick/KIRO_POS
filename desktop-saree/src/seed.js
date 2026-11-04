// Demo data: `npm run db:init` creates data/kiro.db. Dates are relative to today so the dashboard always has something to show.
import { mkdirSync, rmSync } from 'node:fs';
import { openDb, root } from './db.js';
import path from 'node:path';
import { addProduct, addVariant, receiveStock, createInvoice, localDate } from './inventory.js';

export const daysAgo = (n, from = new Date()) => { const d = new Date(from); d.setDate(d.getDate() - n); return d; };

export function seed(db, today = new Date()) {
  const P = (name, fabric, gst = 5) => addProduct(db, { name, fabric, gstPercent: gst });
  const V = (productId, code, color, cost, sell, bc) => addVariant(db, { productId, designCode: code, color, barcode: bc, purchasePaise: cost * 100, sellingPaise: sell * 100 });
  const ban = P('Banarasi Silk Saree', 'Banarasi'), kan = P('Kanjivaram Silk Saree', 'Silk'), cot = P('Cotton Handloom Saree', 'Cotton'),
        geo = P('Georgette Party Saree', 'Georgette'), cha = P('Chanderi Saree', 'Chanderi'), lin = P('Linen Saree', 'Linen');
  const v = {
    ban1: V(ban, 'BN-101', 'Red', 3800, 5499, '8901000000011'), ban2: V(ban, 'BN-102', 'Green', 3900, 5799, '8901000000028'),
    kan1: V(kan, 'KS-201', 'Maroon', 6500, 8999, '8901000000035'), cot1: V(cot, 'CT-301', 'Blue', 800, 1299, '8901000000042'),
    cot2: V(cot, 'CT-302', 'Yellow', 820, 1299, '8901000000059'), geo1: V(geo, 'GT-401', 'Pink', 1400, 2199, '8901000000066'),
    cha1: V(cha, 'CH-501', 'Peach', 1900, 2799, '8901000000073'), lin1: V(lin, 'LN-601', 'Beige', 1200, 1899, '8901000000080'),
  };
  const buy = (id, qty, ago, cost) => receiveStock(db, { variantId: id, qty, date: localDate(daysAgo(ago, today)), unitCostPaise: cost * 100, supplier: 'Demo Supplier' });
  buy(v.ban1, 10, 140, 3800); buy(v.ban2, 8, 120, 3900); buy(v.kan1, 6, 100, 6500);   // these three never sell: dead stock
  buy(v.cot1, 40, 60, 800); buy(v.cot2, 30, 25, 820); buy(v.geo1, 20, 40, 1400); buy(v.cha1, 15, 10, 1900); buy(v.lin1, 12, 95, 1200);
  const sell = (id, qty, ago, mode = 'Cash') => createInvoice(db, { items: [{ variantId: id, qty }], paymentMode: mode, now: new Date(daysAgo(ago, today).setHours(12, 0, 0, 0)) });
  sell(v.lin1, 1, 93);                                   // Linen last sold 93 days ago => its 95-day-old lot is dead
  for (let d = 0; d < 13; d += 2) { sell(v.cot1, 2, d); sell(v.cot2, 1, d, 'UPI'); }
  sell(v.geo1, 2, 3); sell(v.geo1, 1, 8, 'Card'); sell(v.cha1, 1, 5);
  return v;
}

if (process.argv[1] === new URL(import.meta.url).pathname) {
  mkdirSync(path.join(root, 'data'), { recursive: true });
  const file = path.join(root, 'data/kiro.db');
  rmSync(file, { force: true });
  const db = openDb(file);
  seed(db);
  console.log('Demo database created at', file);
}
