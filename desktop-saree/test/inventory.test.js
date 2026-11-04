// Saree desktop app: money maths and inventory/billing on a real SQLite database (in memory).
// Uses Node's built-in node:sqlite when better-sqlite3 is not installed, so no Electron is needed.
import test from 'node:test';
import assert from 'node:assert/strict';
import { allocate, gstInclusive, priceCart, rupees } from '../src/money.js';
import { openDb } from '../src/db.js';
import { addProduct, addVariant, receiveStock, findVariants, createInvoice, returnItem, dashboard, createDiscountAlert, localDate } from '../src/inventory.js';

const days = (n) => localDate(new Date(Date.now() - n * 86400000));

test('allocate: splits a discount by weight without losing a paisa', () => {
  assert.deepEqual(allocate(100, [1, 1, 1]), [34, 33, 33]);
  assert.deepEqual(allocate(0, [5, 5]), [0, 0]);
  assert.deepEqual(allocate(10, [0, 0]), [0, 0]);
  for (const [t, w] of [[999, [3, 7, 11]], [1, [1, 1, 1, 1]], [12345, [100, 1, 1]]]) assert.equal(allocate(t, w).reduce((a, b) => a + b), t);
});

test('gstInclusive: shelf price includes GST, CGST + SGST = tax, odd paisa goes to SGST', () => {
  assert.deepEqual(gstInclusive(10500, 5), { taxable: 10000, cgst: 250, sgst: 250, tax: 500 });
  const g = gstInclusive(10001, 12);
  assert.equal(g.taxable + g.tax, 10001);
  assert.equal(g.cgst + g.sgst, g.tax);
  assert.ok(g.sgst - g.cgst <= 1 && g.sgst >= g.cgst);
  assert.deepEqual(gstInclusive(500, 0), { taxable: 500, cgst: 0, sgst: 0, tax: 0 });
});

test('priceCart: discount spread over lines, totals add up, discount capped at subtotal', () => {
  const c = priceCart([{ unitPaise: 150000, qty: 2, gst: 5 }, { unitPaise: 99900, qty: 1, gst: 12 }], 10000);
  assert.equal(c.subtotal, 399900);
  assert.equal(c.discount, 10000);
  assert.equal(c.total, 389900);
  assert.equal(c.lines.reduce((s, l) => s + l.total, 0), c.total);
  assert.equal(c.taxable + c.cgst + c.sgst, c.total);
  assert.equal(priceCart([{ unitPaise: 100, qty: 1, gst: 5 }], 99999).total, 0);
  assert.equal(priceCart([{ unitPaise: 100, qty: 1, gst: 5 }], -50).discount, 0);
  assert.match(rupees(1234567), /^₹12,345\.67$/);
});

function shop() {
  const db = openDb(':memory:');
  const p = addProduct(db, { name: 'Kanjivaram silk', fabric: 'Silk', gstPercent: 5, hsn: '5007' });
  const v = addVariant(db, { productId: p, color: 'Red', designCode: 'KJ-101', barcode: '8901000000011', purchasePaise: 600000, sellingPaise: 1050000 });
  return { db, p, v };
}

test('stock: validation, FIFO from the oldest lot, current stock follows the lots', () => {
  const { db, v } = shop();
  assert.throws(() => receiveStock(db, { variantId: v, qty: 0, date: days(1) }), /whole number/);
  assert.throws(() => receiveStock(db, { variantId: v, qty: 1, date: '2026-13-45' }), /YYYY-MM-DD/);
  assert.throws(() => receiveStock(db, { variantId: v, qty: 1, date: days(-3) }), /future/);
  assert.throws(() => receiveStock(db, { variantId: 999, qty: 1, date: days(1) }), /Unknown variant/);
  const old = receiveStock(db, { variantId: v, qty: 2, date: days(200), unitCostPaise: 550000, supplier: 'A' });
  const fresh = receiveStock(db, { variantId: v, qty: 3, date: days(5), unitCostPaise: 600000, supplier: 'B' });
  assert.equal(db.prepare('SELECT current_stock s FROM product_variants WHERE id=?').get(v).s, 5);
  const inv = createInvoice(db, { items: [{ variantId: v, qty: 3 }], paymentMode: 'UPI' });
  const lot = (id) => db.prepare('SELECT remaining_qty r FROM stock_batches WHERE id=?').get(id).r;
  assert.equal(lot(old), 0, 'oldest lot used first');
  assert.equal(lot(fresh), 2);
  assert.equal(db.prepare('SELECT current_stock s FROM product_variants WHERE id=?').get(v).s, 2);
  assert.match(inv.invoiceNo, /^INV-\d{4}-000001$/);
  assert.equal(inv.total, 3 * 1050000);
});

test('billing: bad input refused, short stock rolls back everything, invoice numbers stay in order', () => {
  const { db, v } = shop();
  receiveStock(db, { variantId: v, qty: 2, date: days(10) });
  assert.throws(() => createInvoice(db, { items: [], paymentMode: 'Cash' }), /at least one/);
  assert.throws(() => createInvoice(db, { items: [{ variantId: v, qty: 1 }], paymentMode: 'Bitcoin' }), /payment mode/);
  assert.throws(() => createInvoice(db, { items: [{ variantId: v, qty: -1 }], paymentMode: 'Cash' }), /Invalid item/);
  assert.throws(() => createInvoice(db, { items: [{ variantId: v, qty: 3 }], paymentMode: 'Cash' }), /Only 2/);
  assert.equal(db.prepare('SELECT count(*) n FROM sales_invoices').get().n, 0, 'nothing saved after a failed bill');
  assert.equal(db.prepare('SELECT current_stock s FROM product_variants WHERE id=?').get(v).s, 2, 'stock untouched');
  const a = createInvoice(db, { items: [{ variantId: v, qty: 1 }], paymentMode: 'Cash', discountPaise: 50000 });
  const b = createInvoice(db, { items: [{ variantId: v, qty: 1 }], paymentMode: 'Card' });
  assert.match(a.invoiceNo, /000001$/); assert.match(b.invoiceNo, /000002$/);
  assert.equal(a.total, 1000000);
  assert.equal(a.taxable + a.cgst + a.sgst, a.total);
});

test('returns: back into the lots they came from, never more than sold', () => {
  const { db, v } = shop();
  const l1 = receiveStock(db, { variantId: v, qty: 1, date: days(60) });
  const l2 = receiveStock(db, { variantId: v, qty: 2, date: days(3) });
  createInvoice(db, { items: [{ variantId: v, qty: 3 }], paymentMode: 'Cash' });
  const item = db.prepare('SELECT id FROM sales_items').get().id;
  assert.throws(() => returnItem(db, { saleItemId: item, qty: 4 }), /more than was sold/);
  returnItem(db, { saleItemId: item, qty: 2 });
  const lot = (id) => db.prepare('SELECT remaining_qty r FROM stock_batches WHERE id=?').get(id).r;
  assert.equal(lot(l2), 2, 'newest lot refilled first');
  assert.equal(lot(l1), 0);
  assert.throws(() => returnItem(db, { saleItemId: item, qty: 2 }), /more than was sold/);
  returnItem(db, { saleItemId: item, qty: 1 });
  assert.equal(db.prepare('SELECT current_stock s FROM product_variants WHERE id=?').get(v).s, 3);
});

test('search, dashboard and WhatsApp discount alert', () => {
  const { db, v } = shop();
  receiveStock(db, { variantId: v, qty: 4, date: days(400), unitCostPaise: 500000 });
  assert.equal(findVariants(db, '').length, 0);
  assert.ok(findVariants(db, 'kj 101').length >= 1, 'design code found with space instead of dash');
  assert.ok(findVariants(db, '8901000000011').length >= 1, 'barcode');
  const d = dashboard(db);
  assert.equal(d.pieces, 4);
  assert.equal(d.inventoryPaise, 4 * 500000);
  assert.ok(d.deadLots >= 1, 'a 400-day-old lot counts as dead stock');
  assert.throws(() => createDiscountAlert(db, { variantId: v, percent: 95 }), /1 to 90/);
  const a = createDiscountAlert(db, { variantId: v, percent: 20, shopName: 'Test Sarees' });
  assert.match(a.message, /20% off, only ₹8,400 \(was ₹10,500\)/);
  assert.ok(a.whatsappUrl.startsWith('https://wa.me/?text='));
});
