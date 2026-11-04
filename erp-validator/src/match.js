'use strict';
// Name matching for vendors and items: normalise, then score by edit distance and by how the words sound.
const STOP = new Set(['pvt', 'private', 'ltd', 'limited', 'llp', 'co', 'company', 'and', 'the', 'of', 'm', 's', 'ms']);
const norm = (s) => String(s == null ? '' : s).toLowerCase().replace(/&/g, ' and ').replace(/[^a-z0-9\s]/g, ' ').split(/\s+/).filter((t) => t && !STOP.has(t));
const normKey = (s) => norm(s).join(' ');
function lev(a, b) {
  const m = a.length, n = b.length; if (!m) return n; if (!n) return m;
  let prev = Array.from({ length: n + 1 }, (_, j) => j);
  for (let i = 1; i <= m; i++) { const cur = [i]; for (let j = 1; j <= n; j++) cur[j] = Math.min(prev[j] + 1, cur[j - 1] + 1, prev[j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1)); prev = cur; }
  return prev[n];
}
const ratio = (a, b) => { const L = Math.max(a.length, b.length); return L ? 1 - lev(a, b) / L : 1; };
// Classic Soundex per word. Catches "Sharma / Sarma / Shrama" style spelling differences.
function soundex(w) {
  const c = { b: 1, f: 1, p: 1, v: 1, c: 2, g: 2, j: 2, k: 2, q: 2, s: 2, x: 2, z: 2, d: 3, t: 3, l: 4, m: 5, n: 5, r: 6 };
  const s = String(w).toLowerCase().replace(/[^a-z]/g, ''); if (!s) return String(w);
  let out = s[0].toUpperCase(), last = c[s[0]] || 0;
  for (let i = 1; i < s.length && out.length < 4; i++) { const ch = s[i], d = c[ch] || 0; if (d && d !== last) out += d; if (ch !== 'h' && ch !== 'w') last = d; }
  return (out + '000').slice(0, 4);
}
const phon = (s) => norm(s).map(soundex).sort().join(' ');
// 0..1. Word order does not matter ("Steels Sharma" ~ "Sharma Steels").
function score(a, b) {
  const na = normKey(a), nb = normKey(b); if (!na || !nb) return 0; if (na === nb) return 1;
  const sa = norm(a).sort().join(' '), sb = norm(b).sort().join(' ');
  let s = Math.max(ratio(na, nb), ratio(sa, sb));
  if (phon(a) === phon(b)) s = Math.max(s, 0.88);
  // A short query whose words all appear in the candidate ("Gupta" in "Gupta Lubricants") is a plausible partial name.
  const ta = norm(a), tb = norm(b); if (ta.length && ta.every((t) => tb.includes(t))) s = Math.max(s, 0.75);
  return s;
}
// Exact = same words after normalisation (case, punctuation, "Pvt Ltd" ignored). Returns the record or null.
const exact = (q, list, names) => list.find((r) => names(r).some((n) => normKey(n) === normKey(q))) || null;
function candidates(q, list, names, { min = 0.6, limit = 3 } = {}) {
  return list.map((r) => ({ r, s: Math.max(...names(r).map((n) => score(q, n))) })).filter((x) => x.s >= min).sort((a, b) => b.s - a.s).slice(0, limit);
}
module.exports = { norm, normKey, score, exact, candidates, soundex };
