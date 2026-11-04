'use strict';
const test = require('node:test'); const assert = require('node:assert/strict');
const { createValidator } = require('../src');
const { normalizeUom, convert } = require('../src/uom');
const { score } = require('../src/match');
const V = createValidator();
const po = (f, o) => V.validate('purchase_order', f, o);
const good = { vendor: 'Sharma Steels', item: 'MS Rod 12mm', quantity: '250', uom: 'kg' };
const codes = (r) => r.issues.map((i) => i.code);

test('clean purchase order becomes the exact strict record', () => {
  const r = po(good); assert.equal(r.status, 'valid');
  assert.deepEqual(r.record, { vendor_id: 'V001', item_code: 'RM-MS-12', quantity: 250, uom: 'KG' });
  assert.deepEqual(Object.keys(r.record), ['vendor_id', 'item_code', 'quantity', 'uom'], 'exact keys in schema order');
});
test('accepts ids, aliases, any case, "Pvt Ltd" noise, field-name variants and quantity with unit', () => {
  assert.equal(po({ vendor: 'v001', item: 'rm-ms-12', qty: '250 kgs' }).record.vendor_id, 'V001');
  assert.equal(po({ supplier: 'SHARMA STEELS PRIVATE LIMITED', material: 'ms rod', quantity: '250kg' }).record.item_code, 'RM-MS-12');
  assert.equal(po({ ...good, vendor: 'Sharma Steel' }).status, 'valid', 'registered alias');
  assert.equal(po({ ...good, quantity: '1,000' }).record.quantity, 1000, 'comma grouping');
  assert.equal(po({ ...good, quantity: '1,50,0' }).status, 'valid');
});
test('Error 1: wrong unit of measure (real checks)', () => {
  const a = po({ ...good, quantity: '250', uom: 'ton' }); assert.equal(a.status, 'needs_clarification'); assert.deepEqual(codes(a), ['quantity_out_of_range']);
  assert.match(a.message, /usual 10 to 5000 KG/); assert.match(a.message, /Did you mean 250 KG\?/); assert.deepEqual(a.issues[0].suggestions, [{ quantity: 250, uom: 'KG' }]);
  const b = po({ ...good, quantity: '3', uom: 'ton' }); assert.equal(b.status, 'valid', '3 MT = 3000 KG is normal'); assert.deepEqual([b.record.quantity, b.record.uom], [3000, 'KG']); assert.match(b.notes[0], /Converted 3 MT to 3000 KG/);
  const c = po({ ...good, quantity: '500', uom: 'gm' }); assert.equal(c.status, 'needs_clarification', '500 g = 0.5 kg is far too small'); assert.match(c.message, /much lower/);
  const d = po({ ...good, quantity: '250', uom: 'litre' }); assert.deepEqual(codes(d), ['uom_dimension']); assert.match(d.message, /counted in KG, but you entered L/);
  const e = po({ ...good, quantity: '250', uom: 'bundle' }); assert.deepEqual(codes(e), ['uom_unknown']); assert.match(e.message, /don't recognise the unit "bundle"/); assert.match(e.message, /KG, G, MT or QTL/);
  const f = po({ ...good, quantity: '250 kg', uom: 'ton' }); assert.deepEqual(codes(f), ['uom_conflict']);
  const g = po({ vendor: 'Sharma Steels', item: 'MS Bolt M10', quantity: '2.5', uom: 'nos' }); assert.deepEqual(codes(g), ['quantity_decimal']);
  assert.equal(po({ vendor: 'Sharma Steels', item: 'MS Bolt M10', quantity: '2', uom: 'dozen' }).status, 'needs_clarification', '24 NOS is below the usual 100');
  assert.deepEqual(po({ vendor: 'Sharma Steels', item: 'MS Bolt M10', quantity: '5', uom: 'dozen' }).issues.map((i) => i.code), ['quantity_out_of_range']);
  assert.equal(po({ vendor: 'Sharma Steels', item: 'MS Bolt M10', quantity: '10', uom: 'dozen' }).record.quantity, 120, '10 dozen = 120 NOS');
});
test('confirming a flagged-but-correct quantity lets it through', () => {
  const r = po({ ...good, quantity: '250', uom: 'ton' }, { confirm: ['quantity_range'] }); assert.equal(r.status, 'valid'); assert.equal(r.record.quantity, 250000);
});
test('quantity must be a positive number', () => {
  for (const q of ['abc', '0', '-5', '1e3', 'NaN']) assert.deepEqual(codes(po({ ...good, quantity: q, uom: '' })), ['quantity_invalid'], q);
  assert.deepEqual(codes(po({ ...good, quantity: '12x', uom: '' })), ['uom_unknown'], 'a number with a strange unit asks about the unit');
});
test('Error 2: similar vendor names are never silently picked', () => {
  const a = po({ ...good, vendor: 'Sharma Steal' }); assert.deepEqual(codes(a), ['vendor_similar']); assert.equal(a.issues[0].suggestions[0].vendor_id, 'V001'); assert.match(a.message, /Sharma Steels Pvt Ltd \(V001\)/);
  const b = po({ ...good, vendor: 'Sarma Steels' }); assert.equal(b.issues[0].code, 'vendor_similar'); assert.ok(b.issues[0].suggestions.map((s) => s.vendor_id).includes('V001'));
  const c = po({ vendor: 'Gupta', item: 'Hydraulic Oil 68', quantity: '100', uom: 'L' }); assert.equal(c.issues[0].code, 'vendor_similar'); assert.deepEqual(c.issues[0].suggestions.map((s) => s.vendor_id).sort(), ['V021', 'V022'], 'two Guptas: must ask');
  assert.equal(po({ vendor: 'Gupta Lubricants', item: 'Hydraulic Oil 68', quantity: '100', uom: 'L' }).record.vendor_id, 'V021', 'exact full name resolves');
  assert.equal(po({ vendor: 'V022', item: 'Hydraulic Oil 68', quantity: '100', uom: 'L' }).record.vendor_id, 'V022', 'the user can settle it with the ID');
  assert.deepEqual(codes(po({ ...good, vendor: 'Zenith Plastics' })), ['vendor_unknown']);
  assert.equal(po({ ...good, vendor: 'Steels Sharma' }).issues[0].code, 'vendor_similar', 'reordered words still ask, never auto-pick a payee');
});
test('vendor that does not supply the item is flagged, and can be confirmed', () => {
  const f = { vendor: 'Sarna Steels', item: 'MS Rod 16mm', quantity: '250', uom: 'kg' };
  const a = po(f); assert.deepEqual(codes(a), ['vendor_item_mismatch']); assert.match(a.message, /isn't set up to supply MS Rod 16mm/);
  assert.equal(po(f, { confirm: ['vendor_item_mismatch'] }).status, 'valid');
});
test('Error 3: missing mandatory fields are all listed at once, politely', () => {
  const a = po({}); assert.deepEqual(codes(a), ['missing']); assert.match(a.message, /couldn't find the vendor, item, quantity and unit of measure\. Could you add them\?/);
  const b = po({ vendor: 'Sharma Steels', item: 'MS Rod 12mm' }); assert.match(b.message, /the quantity and unit of measure/);
  const c = po({ vendor: 'Sharma Steels', item: 'MS Rod 12mm', quantity: '250' }); assert.match(c.message, /the unit of measure\. Could you add it\?/);
  for (const bl of ['', '   ', null, undefined]) assert.equal(po({ ...good, vendor: bl }).issues[0].code, 'missing');
  assert.equal(po({ ...good, quantity: 'abc' }).status, 'needs_clarification');
});
test('several problems come back as one numbered, plain-English message', () => {
  const r = po({ vendor: 'Sharma Steal', item: 'Mystery Part', quantity: '5', uom: 'bundle' }); assert.equal(r.status, 'needs_clarification');
  assert.match(r.message, /^Before I save this, I need to check a few things:\n1\. /); assert.ok(r.issues.length >= 2);
});
test('optional fields are added only when valid, never as null', () => {
  const r = po({ ...good, rate: '62.5', delivery_date: '2099-01-31' }); assert.deepEqual(r.record, { vendor_id: 'V001', item_code: 'RM-MS-12', quantity: 250, uom: 'KG', rate: 62.5, delivery_date: '2099-01-31' });
  assert.ok(!('rate' in po(good).record));
  assert.deepEqual(codes(po({ ...good, rate: 'cheap' })), ['rate_invalid']); assert.deepEqual(codes(po({ ...good, delivery_date: '31/01/2099' })), ['date_invalid']);
  assert.deepEqual(codes(po({ ...good, delivery_date: '2001-01-01' })), ['date_past']); assert.equal(po({ ...good, delivery_date: '2001-01-01' }, { confirm: ['date_past'] }).status, 'valid');
});
test('no valid record ever contains null, empty text, NaN or unexpected keys', () => {
  const inputs = [good, { ...good, rate: '10' }, { vendor: 'V021', item: 'OIL-HYD-68', quantity: '1,000', uom: 'ltr' }];
  for (const i of inputs) { const r = po(i); assert.equal(r.status, 'valid'); for (const v of Object.values(r.record)) { assert.ok(v !== null && v !== undefined && v !== '' && !(typeof v === 'number' && !Number.isFinite(v))); } assert.equal(JSON.stringify(r.record).includes('null'), false); }
});
test('inventory log: batch, location and movement type', () => {
  const inv = (f, o) => V.validate('inventory_log', f, o);
  const f = { item: 'RM-MS-12', batch: 'b 2410 a', quantity: '300', uom: 'kg', location: 'store a', movement: 'Receipt' };
  const r = inv(f); assert.equal(r.status, 'valid'); assert.deepEqual(r.record, { item_code: 'RM-MS-12', batch_no: 'B2410A', quantity: 300, uom: 'KG', location: 'STORE-A', movement_type: 'IN' });
  assert.equal(inv({ ...f, movement: 'issued' }).record.movement_type, 'OUT');
  const a = inv({ ...f, location: 'Stor B' }); assert.deepEqual(codes(a), ['location_unknown']); assert.match(a.message, /Did you mean STORE-[AB] or STORE-[AB]\?/);
  assert.deepEqual(codes(inv({ ...f, movement: 'sold' })), ['movement_unknown']);
  const m = inv({ item: 'RM-MS-12', quantity: '300', uom: 'kg' }); assert.match(m.message, /batch number, location and movement type/);
});
test('double entry within the window is caught', () => {
  const first = po(good).record, now = Date.now();
  assert.deepEqual(codes(po(good, { recent: [{ at: now - 60e3, record: first }], now })), ['possible_duplicate']);
  assert.equal(po(good, { recent: [{ at: now - 3600e3, record: first }], now }).status, 'valid', 'an hour ago is fine');
  assert.equal(po(good, { recent: [{ at: now - 60e3, record: first }], now, confirm: ['possible_duplicate'] }).status, 'valid');
});
test('unknown module is a programming error, not a user message', () => assert.throws(() => V.validate('nope', {}), /Unknown module/));
test('uom table and name scoring', () => {
  assert.equal(normalizeUom('Kgs.').code, 'KG'); assert.equal(normalizeUom(' M.T ').code, 'MT'); assert.equal(normalizeUom('bori').code, 'BAG'); assert.equal(normalizeUom('xyz'), null);
  assert.equal(convert(2, normalizeUom('MT'), normalizeUom('KG')), 2000); assert.equal(convert(500, normalizeUom('g'), normalizeUom('KG')), 0.5); assert.equal(convert(0.1, normalizeUom('KG'), normalizeUom('G')), 100, 'no float noise');
  assert.ok(score('Sharma Steels', 'Sharma Steal') > 0.8); assert.ok(score('Sharma Steels', 'Zenith Plastics') < 0.4); assert.equal(score('Sharma Steels Pvt Ltd', 'sharma steels'), 1);
});
