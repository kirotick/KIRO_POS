// Money arrives from the API as integer paise. Format only at the edge, never do arithmetic on formatted text.
export const inr = (paise) => {
  const n = Number(paise) || 0, neg = n < 0, a = Math.abs(n), r = Math.floor(a / 100), p = a % 100;
  let s = String(r);
  if (s.length > 3) { const last3 = s.slice(-3); s = s.slice(0, -3).replace(/\B(?=(\d{2})+(?!\d))/g, ',') + ',' + last3; }
  return (neg ? '-' : '') + '₹' + s + (p ? '.' + String(p).padStart(2, '0') : '');
};
const MON = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
// Shows the phone's local time. iso is an ISO string from the API.
export const when = (iso) => {
  const d = new Date(iso); if (isNaN(d)) return '—';
  let h = d.getHours(); const ap = h >= 12 ? 'pm' : 'am'; h = h % 12 || 12;
  return `${String(d.getDate()).padStart(2, '0')} ${MON[d.getMonth()]}, ${h}:${String(d.getMinutes()).padStart(2, '0')} ${ap}`;
};
export const ago = (iso, now = Date.now()) => {
  if (!iso) return 'never';
  const m = Math.max(0, Math.round((now - new Date(iso).getTime()) / 60000));
  if (m < 1) return 'just now'; if (m < 60) return m + ' min ago'; if (m < 1440) return Math.floor(m / 60) + ' h ago'; return Math.floor(m / 1440) + ' d ago';
};
export const cap = (s) => String(s || '').charAt(0).toUpperCase() + String(s || '').slice(1).toLowerCase();
export const ROLE = { owner: 'Owner', manager: 'Manager', accounts: 'Accounts', pos: 'POS cashier' };
