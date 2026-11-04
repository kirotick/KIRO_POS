'use strict';
// The gate. Everything the ERP receives passes through here, and it is plain code, not a language model, so the same
// input always gives the same verdict. Output is either a strict record (exact keys, no nulls) or polite questions.
const { normalizeUom, sameDim, convert, unitsOfDim } = require('./uom');
const { exact, candidates } = require('./match');

const ALIAS = {
  vendor: ['vendor', 'vendor_id', 'vendor_name', 'supplier'], item: ['item', 'item_code', 'item_name', 'material'], quantity: ['quantity', 'qty'], uom: ['uom', 'unit'],
  rate: ['rate', 'price'], delivery_date: ['delivery_date', 'date', 'due_date'], batch_no: ['batch_no', 'batch', 'lot'], location: ['location', 'loc', 'store', 'warehouse'], movement_type: ['movement_type', 'movement', 'type'],
};
const blank = (v) => v === undefined || v === null || (typeof v === 'string' && !v.trim()) || (typeof v === 'number' && !Number.isFinite(v));
function pick(input, field) { for (const k of ALIAS[field]) if (!blank(input[k])) return String(input[k]).trim(); return ''; }
const LABEL = { vendor_id: 'vendor', item_code: 'item', quantity: 'quantity', uom: 'unit of measure', rate: 'rate', delivery_date: 'delivery date', batch_no: 'batch number', location: 'location', movement_type: 'movement type' };
const FIELD_OF = { vendor_id: 'vendor', item_code: 'item', quantity: 'quantity', uom: 'uom', rate: 'rate', delivery_date: 'delivery_date', batch_no: 'batch_no', location: 'location', movement_type: 'movement_type' };
const list = (a, conj = 'or') => (a.length <= 1 ? a.join('') : a.slice(0, -1).join(', ') + ' ' + conj + ' ' + a[a.length - 1]);
const fmt = (n) => String(Math.round(n * 1e6) / 1e6);
// "1,50,000", "2.5", "5kg" -> {n, unit}. Returns null when it is not a number.
function parseQty(s) {
  const m = /^\s*([0-9][0-9,]*(?:\.[0-9]+)?|\.[0-9]+)\s*([a-zA-Z.]*)\s*$/.exec(String(s)); if (!m) return null;
  const n = Number(m[1].replace(/,/g, '')); return Number.isFinite(n) ? { n, unit: m[2] } : null;
}

function validate(moduleName, input, ctx = {}) {
  const { masters, rules } = ctx; const confirm = new Set(ctx.confirm || []);
  const mod = rules.modules[moduleName]; if (!mod) throw new Error('Unknown module: ' + moduleName);
  const issues = [], notes = [], rec = {};
  const bad = (field, code, message, suggestions) => issues.push({ field, code, message, ...(suggestions ? { suggestions } : {}) });
  const raw = {}; for (const f of Object.keys(ALIAS)) raw[f] = pick(input, f);

  // 1. Mandatory fields: report every gap in one go (a tired user should not be asked one thing at a time).
  const missing = mod.required.filter((k) => { const f = FIELD_OF[k]; if (!f) return false; if (f === 'quantity') return !raw.quantity; if (f === 'uom') return !raw.uom && !(parseQty(raw.quantity) || {}).unit && (!raw.quantity || ((parseQty(raw.quantity) || { n: 0 }).n > 0)); return !raw[f]; });
  if (missing.length) bad(missing.map((k) => FIELD_OF[k]).join(','), 'missing', `I couldn't find the ${list(missing.map((k) => LABEL[k]), 'and')}. Could you add ${missing.length > 1 ? 'them' : 'it'}?`);

  // 2. Vendor
  let vendor = null;
  if (mod.required.includes('vendor_id') && raw.vendor) {
    const vs = masters.vendors; vendor = vs.find((v) => v.id.toLowerCase() === raw.vendor.toLowerCase()) || exact(raw.vendor, vs, (v) => [v.name, ...(v.aliases || [])]);
    if (!vendor) {
      const c = candidates(raw.vendor, vs, (v) => [v.name, ...(v.aliases || [])]);
      const sug = c.map((x) => ({ vendor_id: x.r.id, name: x.r.name }));
      bad('vendor', c.length ? 'vendor_similar' : 'vendor_unknown', c.length
        ? `I couldn't find a vendor called "${raw.vendor}". Did you mean ${list(c.map((x) => `${x.r.name} (${x.r.id})`))}? Please pick one so the order doesn't go to the wrong supplier.`
        : `I couldn't find any vendor like "${raw.vendor}". Please check the name or enter the vendor ID.`, sug);
    } else {
      rec.vendor_id = vendor.id;
    }
  }

  // 3. Item
  let item = null;
  if (raw.item) {
    const its = masters.items; item = its.find((i) => i.code.toLowerCase() === raw.item.toLowerCase()) || exact(raw.item, its, (i) => [i.name, ...(i.aliases || [])]);
    if (!item) {
      const c = candidates(raw.item, its, (i) => [i.name, i.code, ...(i.aliases || [])]);
      bad('item', c.length ? 'item_similar' : 'item_unknown', c.length ? `I couldn't find an item called "${raw.item}". Did you mean ${list(c.map((x) => `${x.r.name} (${x.r.code})`))}?` : `I couldn't find any item like "${raw.item}". Please check the name or enter the item code.`, c.map((x) => ({ item_code: x.r.code, name: x.r.name })));
    } else rec.item_code = item.code;
  }
  if (vendor && item && rules.vendorMustSupplyItem && !(vendor.items || []).includes(item.code) && !confirm.has('vendor_item_mismatch'))
    bad('vendor', 'vendor_item_mismatch', `${vendor.name} isn't set up to supply ${item.name}. Please check the vendor or the item, or confirm that this is right.`);

  // 4. Quantity and unit of measure
  const q = raw.quantity ? parseQty(raw.quantity) : null;
  if (raw.quantity && !q) bad('quantity', 'quantity_invalid', `The quantity "${raw.quantity}" isn't a number I can read. Please enter a number above zero, for example 25 or 2.5.`);
  else if (q && !(q.n > 0)) bad('quantity', 'quantity_invalid', `The quantity must be more than zero (you entered ${raw.quantity}).`);
  else if (q) {
    const unitText = raw.uom || q.unit;
    if (raw.uom && q.unit && normalizeUom(raw.uom) && normalizeUom(q.unit) && normalizeUom(raw.uom).code !== normalizeUom(q.unit).code)
      bad('uom', 'uom_conflict', `The quantity says "${raw.quantity}" but the unit says "${raw.uom}". Which unit is correct?`);
    else if (unitText) {
      const u = normalizeUom(unitText);
      if (!u) bad('uom', 'uom_unknown', `I don't recognise the unit "${unitText}".${item ? ` For ${item.name} please use ${list(unitsOfDim(normalizeUom(item.base_uom).dim))}.` : ''}`);
      else if (item) {
        const base = normalizeUom(item.base_uom);
        if (!sameDim(u, base)) bad('uom', 'uom_dimension', `${item.name} is counted in ${base.code}, but you entered ${u.code}. Which did you mean?`, [{ uom: base.code }]);
        else {
          let n = q.n, code = u.code;
          if (rules.convertToBaseUom && u.code !== base.code) { n = convert(q.n, u, base); code = base.code; notes.push(`Converted ${fmt(q.n)} ${u.code} to ${fmt(n)} ${code}.`); }
          if (item.decimal === false && !Number.isInteger(n)) bad('quantity', 'quantity_decimal', `${item.name} is counted in whole pieces, but the quantity works out to ${fmt(n)}. Please enter a whole number.`);
          else {
            const t = item.typical; const out = t && (n > t.max || n < t.min);
            if (out && !confirm.has('quantity_range')) {
              // Would a different unit of the same kind explain it? ("5 MT" typed instead of "5 KG").
              const alt = unitsOfDim(base.dim).map((c) => normalizeUom(c)).filter((a) => a.code !== u.code).map((a) => ({ a, v: convert(q.n, a, base) })).filter((x) => x.v >= t.min && x.v <= t.max);
              const hint = alt.length ? ` Did you mean ${list(alt.map((x) => `${fmt(q.n)} ${x.a.code}`))}?` : '';
              bad('quantity', 'quantity_out_of_range', `${fmt(q.n)} ${u.code} of ${item.name}${u.code !== base.code ? ` (${fmt(n)} ${base.code})` : ''} is ${n > t.max ? 'much higher' : 'much lower'} than the usual ${t.min} to ${t.max} ${base.code}.${hint} If it is correct, please confirm.`, alt.map((x) => ({ quantity: q.n, uom: x.a.code })));
            } else { rec.quantity = n; rec.uom = code; }
          }
        }
      } else { rec.quantity = q.n; rec.uom = u.code; } // item unknown: unit alone cannot be checked yet
    }
  }

  // 5. Inventory fields
  if (mod.required.includes('batch_no') && raw.batch_no) rec.batch_no = raw.batch_no.toUpperCase().replace(/\s+/g, '');
  if (mod.required.includes('location') && raw.location) {
    const k = (x) => String(x).toLowerCase().replace(/[\s_-]/g, ''); const loc = masters.locations.find((l) => k(l) === k(raw.location));
    if (loc) rec.location = loc; else { const c = candidates(raw.location, masters.locations, (l) => [l], { min: 0.5 }); bad('location', 'location_unknown', `I don't know the location "${raw.location}".${c.length ? ` Did you mean ${list(c.map((x) => x.r))}?` : ` Known locations: ${list(masters.locations)}.`}`, c.map((x) => ({ location: x.r }))); }
  }
  if (mod.required.includes('movement_type') && raw.movement_type) {
    const k = raw.movement_type.toLowerCase(); const hit = Object.entries(rules.movementTypes).find(([code, al]) => code.toLowerCase() === k || al.includes(k));
    if (hit) rec.movement_type = hit[0]; else bad('movement_type', 'movement_unknown', `I don't recognise the movement type "${raw.movement_type}". Please use ${list(Object.keys(rules.movementTypes))}.`);
  }
  // 6. Optional fields: included only when given and valid (never as null).
  if ((mod.optional || []).includes('rate') && raw.rate) { const r = parseQty(raw.rate); if (r && r.n > 0 && !r.unit) rec.rate = r.n; else bad('rate', 'rate_invalid', `The rate "${raw.rate}" isn't a number above zero.`); }
  if ((mod.optional || []).includes('delivery_date') && raw.delivery_date) {
    const d = /^(\d{4})-(\d{2})-(\d{2})$/.exec(raw.delivery_date); const ok = d && !isNaN(Date.parse(raw.delivery_date));
    if (!ok) bad('delivery_date', 'date_invalid', `Please give the delivery date as YYYY-MM-DD (you entered "${raw.delivery_date}").`);
    else if (raw.delivery_date < (ctx.today || new Date().toISOString().slice(0, 10)) && !confirm.has('date_past')) bad('delivery_date', 'date_past', `The delivery date ${raw.delivery_date} is already in the past. Is that right?`);
    else rec.delivery_date = raw.delivery_date;
  }
  // 7. Possible double entry
  if (!issues.length && ctx.recent && !confirm.has('possible_duplicate')) {
    const win = (rules.duplicateWindowMinutes || 10) * 6e4, now = (ctx.now || Date.now());
    const dup = ctx.recent.find((r) => now - r.at <= win && ['vendor_id', 'item_code', 'quantity', 'uom', 'batch_no', 'movement_type'].every((k) => r.record[k] === rec[k]));
    if (dup) bad('record', 'possible_duplicate', `An identical entry was saved a few minutes ago. Is this a second one, or did it get entered twice?`);
  }

  if (issues.length) {
    const lines = issues.map((x, i) => (issues.length > 1 ? `${i + 1}. ` : '') + x.message);
    return { status: 'needs_clarification', message: (issues.length > 1 ? 'Before I save this, I need to check a few things:\n' : 'Before I save this: ') + lines.join('\n'), issues };
  }
  // Final guard: exact keys, in order, no nulls, no empty text. If this ever throws, a rule above has a bug and nothing reaches the ERP.
  const keys = [...mod.required, ...(mod.optional || []).filter((k) => k in rec)]; const out = {};
  for (const k of keys) out[k] = rec[k];
  assertStrict(out, mod);
  return { status: 'valid', record: out, notes };
}

function assertStrict(rec, mod) {
  const allowed = new Set([...mod.required, ...(mod.optional || [])]);
  for (const k of Object.keys(rec)) if (!allowed.has(k)) throw new Error('Unexpected key in record: ' + k);
  for (const k of mod.required) if (!(k in rec)) throw new Error('Missing required key in record: ' + k);
  for (const [k, v] of Object.entries(rec)) {
    if (v === null || v === undefined || (typeof v === 'string' && !v.trim()) || (typeof v === 'number' && !Number.isFinite(v))) throw new Error('Empty value for ' + k);
    if ((k === 'quantity' || k === 'rate') && typeof v !== 'number') throw new Error(k + ' must be a number');
  }
}
module.exports = { validate, assertStrict, parseQty };
