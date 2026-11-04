// Shared by the Electron main process AND the React screens, so the cashier sees exactly the
// numbers that get saved. All amounts are integer paise.
export const rupees = (paise) =>
  '₹' + (paise / 100).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

const sum = (a) => a.reduce((x, y) => x + y, 0);

// Split `total` across lines in proportion to `weights` with no paise lost (largest remainder).
export function allocate(total, weights) {
  const w = sum(weights);
  if (!(w > 0) || total <= 0) return weights.map(() => 0);
  const raw = weights.map((x) => (total * x) / w);
  const base = raw.map(Math.floor);
  let rem = total - sum(base);
  raw.map((r, i) => [r - Math.floor(r), i]).sort((a, b) => b[0] - a[0] || a[1] - b[1])
    .forEach(([, i]) => { if (rem > 0) { base[i]++; rem--; } });
  return base;
}

// Price INCLUDES GST (shelf price). Returns taxable value and the CGST/SGST halves.
export function gstInclusive(lineTotalPaise, ratePercent) {
  const taxable = Math.round((lineTotalPaise * 100) / (100 + ratePercent));
  const tax = lineTotalPaise - taxable;
  const cgst = Math.floor(tax / 2);
  return { taxable, cgst, sgst: tax - cgst, tax };
}

// lines: [{ unitPaise, qty, gst }]  ->  per-line and total breakdown, discount spread across lines first.
export function priceCart(lines, discountPaise = 0) {
  const gross = lines.map((l) => l.unitPaise * l.qty);
  const subtotal = sum(gross);
  const discount = Math.min(Math.max(0, Math.trunc(discountPaise) || 0), subtotal);
  const d = allocate(discount, gross);
  const out = lines.map((l, i) => {
    const total = gross[i] - d[i];
    return { gross: gross[i], discount: d[i], total, gst: l.gst, ...gstInclusive(total, l.gst) };
  });
  return {
    lines: out, subtotal, discount, total: subtotal - discount,
    taxable: sum(out.map((x) => x.taxable)), cgst: sum(out.map((x) => x.cgst)), sgst: sum(out.map((x) => x.sgst)),
  };
}
