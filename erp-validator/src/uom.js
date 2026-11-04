'use strict';
// Units of measure. `dim` groups units that can be converted into each other; `f` is the factor to that dimension's base unit.
// Units with their own dimension (BOX, BAG...) are never converted. Add your own units here.
const UNITS = {
  KG: { dim: 'mass', f: 1, al: ['kg', 'kgs', 'kilo', 'kilos', 'kilogram', 'kilograms'] },
  G: { dim: 'mass', f: 0.001, al: ['g', 'gm', 'gms', 'gram', 'grams', 'gr'] },
  MT: { dim: 'mass', f: 1000, al: ['mt', 'ton', 'tons', 'tonne', 'tonnes', 'metricton', 'metrictons'] },
  QTL: { dim: 'mass', f: 100, al: ['qtl', 'quintal', 'quintals'] },
  L: { dim: 'volume', f: 1, al: ['l', 'ltr', 'ltrs', 'lt', 'litre', 'litres', 'liter', 'liters'] },
  ML: { dim: 'volume', f: 0.001, al: ['ml', 'mls', 'millilitre', 'milliliter'] },
  M: { dim: 'length', f: 1, al: ['m', 'mtr', 'mtrs', 'meter', 'meters', 'metre', 'metres'] },
  MM: { dim: 'length', f: 0.001, al: ['mm', 'millimetre', 'millimeter'] },
  CM: { dim: 'length', f: 0.01, al: ['cm', 'centimetre', 'centimeter'] },
  FT: { dim: 'length', f: 0.3048, al: ['ft', 'feet', 'foot'] },
  NOS: { dim: 'count', f: 1, al: ['nos', 'no', 'pcs', 'pc', 'piece', 'pieces', 'unit', 'units', 'each', 'number'] },
  DOZ: { dim: 'count', f: 12, al: ['doz', 'dozen'] },
  BOX: { dim: 'box', f: 1, al: ['box', 'boxes', 'carton', 'cartons'] },
  BAG: { dim: 'bag', f: 1, al: ['bag', 'bags', 'bori', 'sack', 'sacks'] },
  DRUM: { dim: 'drum', f: 1, al: ['drum', 'drums', 'barrel', 'barrels'] },
  ROLL: { dim: 'roll', f: 1, al: ['roll', 'rolls'] },
  SET: { dim: 'set', f: 1, al: ['set', 'sets'] },
};
const INDEX = new Map();
for (const [code, u] of Object.entries(UNITS)) { INDEX.set(code.toLowerCase(), code); u.al.forEach((a) => INDEX.set(a, code)); }
const key = (s) => String(s == null ? '' : s).toLowerCase().replace(/[.\s_-]/g, '');
function normalizeUom(s) { const c = INDEX.get(key(s)); return c ? { code: c, ...UNITS[c] } : null; }
const sameDim = (a, b) => !!a && !!b && a.dim === b.dim;
// Convert a quantity between two units of the same dimension. Rounded to 6 places to hide float noise.
function convert(q, from, to) { return Math.round((q * from.f / to.f) * 1e6) / 1e6; }
const unitsOfDim = (dim) => Object.keys(UNITS).filter((c) => UNITS[c].dim === dim);
module.exports = { UNITS, normalizeUom, sameDim, convert, unitsOfDim };
