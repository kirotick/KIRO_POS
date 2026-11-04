import { tx, sqlFile } from './db.js';
import { priceCart } from './money.js';

const MODES = new Set(['Cash', 'UPI', 'Card', 'Credit']);
const pad = (n) => String(n).padStart(2, '0');
export const localDate = (d = new Date()) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
export const localStamp = (d = new Date()) => `${localDate(d)} ${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}`;
const isDate = (s) => /^\d{4}-\d{2}-\d{2}$/.test(s) && !isNaN(Date.parse(s));
const posInt = (n, max = 100000) => Number.isInteger(n) && n > 0 && n <= max;

export function addProduct(db, { name, fabric, gstPercent = 5, hsn = null }) {
  if (!name || !fabric) throw new Error('Name and fabric are required');
  return Number(db.prepare('INSERT INTO products (name, fabric, gst_percent, hsn_code) VALUES (?,?,?,?)').run(name, fabric, gstPercent, hsn).lastInsertRowid);
}
export function addVariant(db, { productId, color = '', designCode, barcode = null, purchasePaise, sellingPaise }) {
  return Number(db.prepare(`INSERT INTO product_variants (product_id,color,design_code,barcode,purchase_price_paise,selling_price_paise)
    VALUES (?,?,?,?,?,?)`).run(productId, color, designCode, barcode, purchasePaise, sellingPaise).lastInsertRowid);
}

export function receiveStock(db, { variantId, qty, date, unitCostPaise, supplier = null }) {
  if (!posInt(qty)) throw new Error('Quantity must be a whole number above zero');
  if (!isDate(date)) throw new Error('Purchase date must be YYYY-MM-DD');
  if (date > localDate()) throw new Error('Purchase date cannot be in the future');
  return tx(db, () => {
    const v = db.prepare('SELECT purchase_price_paise FROM product_variants WHERE id=?').get(variantId);
    if (!v) throw new Error('Unknown variant');
    const cost = unitCostPaise ?? v.purchase_price_paise;
    const id = db.prepare('INSERT INTO stock_batches (variant_id,quantity_received,remaining_qty,purchase_date,unit_cost_paise,supplier) VALUES (?,?,?,?,?,?)')
      .run(variantId, qty, qty, date, cost, supplier).lastInsertRowid;
    if (unitCostPaise != null) db.prepare('UPDATE product_variants SET purchase_price_paise=? WHERE id=?').run(unitCostPaise, variantId);
    return Number(id);
  });
}

export function findVariants(db, text, limit = 8) {
  const q = String(text || '').trim();
  if (!q) return [];
  const qn = q.toUpperCase().replace(/[\s-]/g, '');
  return db.prepare(sqlFile('find_variant')).all({ q, qn, limit });
}

// Sell: validates stock, spreads discount, splits GST, takes pieces from the OLDEST lot first, all in one transaction.
export function createInvoice(db, { items, discountPaise = 0, paymentMode, customerName = null, customerPhone = null, now = new Date() }) {
  if (!Array.isArray(items) || !items.length || items.length > 100) throw new Error('Add at least one item');
  if (!MODES.has(paymentMode)) throw new Error('Invalid payment mode');
  const want = new Map();
  for (const it of items) {
    if (!posInt(it.variantId, 1e12) || !posInt(it.qty, 1000)) throw new Error('Invalid item or quantity');
    want.set(it.variantId, (want.get(it.variantId) || 0) + it.qty);
  }
  return tx(db, () => {
    const getV = db.prepare(`SELECT v.id, v.selling_price_paise, v.current_stock, p.gst_percent, p.name
      FROM product_variants v JOIN products p ON p.id=v.product_id WHERE v.id=?`);
    const lines = [...want].map(([variantId, qty]) => {
      const v = getV.get(variantId);
      if (!v) throw new Error('Unknown item');
      if (v.current_stock < qty) throw new Error(`Only ${v.current_stock} of ${v.name} in stock`);
      return { variantId, qty, unitPaise: v.selling_price_paise, gst: v.gst_percent };
    });
    const priced = priceCart(lines, discountPaise);
    const no = `INV-${now.getFullYear()}-${String(db.prepare('SELECT COALESCE(MAX(id),0)+1 AS n FROM sales_invoices').get().n).padStart(6, '0')}`;
    const invId = Number(db.prepare(`INSERT INTO sales_invoices (invoice_no,invoice_date,customer_name,customer_phone,subtotal_paise,discount_paise,taxable_paise,cgst_paise,sgst_paise,total_paise,payment_mode)
      VALUES (?,?,?,?,?,?,?,?,?,?,?)`).run(no, localStamp(now), customerName, customerPhone, priced.subtotal, priced.discount, priced.taxable, priced.cgst, priced.sgst, priced.total, paymentMode).lastInsertRowid);
    const insItem = db.prepare(`INSERT INTO sales_items (invoice_id,variant_id,quantity,unit_price_paise,discount_paise,gst_percent,taxable_paise,cgst_paise,sgst_paise,line_total_paise) VALUES (?,?,?,?,?,?,?,?,?,?)`);
    const lots = db.prepare('SELECT id, remaining_qty FROM stock_batches WHERE variant_id=? AND remaining_qty>0 ORDER BY purchase_date, id');
    const take = db.prepare('UPDATE stock_batches SET remaining_qty = remaining_qty - ? WHERE id=?');
    const alloc = db.prepare('INSERT INTO sale_item_batches (sale_item_id,batch_id,qty) VALUES (?,?,?)');
    lines.forEach((l, i) => {
      const p = priced.lines[i];
      const itemId = Number(insItem.run(invId, l.variantId, l.qty, l.unitPaise, p.discount, l.gst, p.taxable, p.cgst, p.sgst, p.total).lastInsertRowid);
      let need = l.qty;
      for (const lot of lots.all(l.variantId)) {
        if (!need) break;
        const k = Math.min(need, lot.remaining_qty);
        take.run(k, lot.id); alloc.run(itemId, lot.id, k); need -= k;
      }
      if (need) throw new Error('Stock lots do not add up for this item'); // would mean current_stock and lots disagree
    });
    return { invoiceId: invId, invoiceNo: no, ...priced };
  });
}

// Customer returns pieces: they go back into the lots they came from (newest-consumed first).
export function returnItem(db, { saleItemId, qty }) {
  if (!posInt(qty)) throw new Error('Invalid quantity');
  return tx(db, () => {
    const si = db.prepare('SELECT quantity, returned_qty FROM sales_items WHERE id=?').get(saleItemId);
    if (!si) throw new Error('Unknown sale item');
    if (qty > si.quantity - si.returned_qty) throw new Error('Cannot return more than was sold');
    let need = qty;
    for (const a of db.prepare('SELECT batch_id, qty, returned_qty FROM sale_item_batches WHERE sale_item_id=? ORDER BY batch_id DESC').all(saleItemId)) {
      if (!need) break;
      const k = Math.min(need, a.qty - a.returned_qty);
      if (k <= 0) continue;
      db.prepare('UPDATE sale_item_batches SET returned_qty=returned_qty+? WHERE sale_item_id=? AND batch_id=?').run(k, saleItemId, a.batch_id);
      db.prepare('UPDATE stock_batches SET remaining_qty=remaining_qty+? WHERE id=?').run(k, a.batch_id);
      need -= k;
    }
    db.prepare('UPDATE sales_items SET returned_qty=returned_qty+? WHERE id=?').run(qty, saleItemId);
    return { returned: qty };
  });
}

export function dashboard(db, { today = localDate() } = {}) {
  const inv = db.prepare(sqlFile('inventory_value')).get();
  const dead = db.prepare(sqlFile('dead_stock')).all({ today });
  const total = db.prepare(sqlFile('dead_stock_total')).get({ today });
  const fast = db.prepare(sqlFile('fast_movers')).all({ today, days_back: 13, limit: 5 });
  const week = db.prepare(sqlFile('fast_movers')).all({ today, days_back: 6, limit: 1 });
  const ages = db.prepare(sqlFile('stock_age')).all({ today });
  return {
    today, inventoryPaise: inv.inventory_paise, pieces: inv.pieces,
    stuckPaise: total.stuck_paise, deadLots: total.lots, deadStock: dead,
    topCategoryWeek: week[0] ? { fabric: week[0].fabric, units: week[0].units_sold } : null,
    fastMovers: fast, stockAge: ages,
  };
}

export function createDiscountAlert(db, { variantId, percent, shopName = 'our shop' }) {
  if (!Number.isInteger(percent) || percent < 1 || percent > 90) throw new Error('Discount must be 1 to 90 percent');
  const v = db.prepare(`SELECT p.name, v.design_code, v.selling_price_paise FROM product_variants v JOIN products p ON p.id=v.product_id WHERE v.id=?`).get(variantId);
  if (!v) throw new Error('Unknown item');
  const now = Math.round(v.selling_price_paise * (100 - percent) / 100 / 100);
  const message = `Special offer at ${shopName}: ${v.name} (${v.design_code}) now ${percent}% off, only ₹${now.toLocaleString('en-IN')} (was ₹${Math.round(v.selling_price_paise / 100).toLocaleString('en-IN')}). Limited pieces. Visit us today!`;
  db.prepare('INSERT INTO discount_alerts (variant_id,percent,message) VALUES (?,?,?)').run(variantId, percent, message);
  return { message, whatsappUrl: 'https://wa.me/?text=' + encodeURIComponent(message) };
}
