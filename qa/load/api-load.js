// k6 load test of the KIRO API: one test shop, users ramping 1 -> 10 -> 20 -> 50 -> 100, each doing what a
// shop does all day: look up items, make a sale, check the sales list and today's report.
// Run it through `npm run qa:load` (starts a local API server on the Neon "qa" test branch). Never point it at production.
import http from 'k6/http';
import { check, sleep } from 'k6';
import { Trend } from 'k6/metrics';

const BASE = __ENV.API_URL || 'http://127.0.0.1:3999';
const saleTime = new Trend('sale_ms', true);
const STAGES = [
  { duration: '20s', target: 1 }, { duration: '30s', target: 10 }, { duration: '30s', target: 20 },
  { duration: '30s', target: 50 }, { duration: '40s', target: 100 }, { duration: '10s', target: 0 },
];

export const options = {
  stages: STAGES,
  thresholds: {
    http_req_failed: ['rate<0.01'],             // under 1% errors
    'http_req_duration{kind:read}': ['p(95)<1500'],
    'http_req_duration{kind:sale}': ['p(95)<2500'],
  },
  summaryTrendStats: ['avg', 'med', 'p(95)', 'p(99)', 'max'],
};

const json = (token) => ({ headers: { 'Content-Type': 'application/json', ...(token ? { Authorization: 'Bearer ' + token } : {}) } });

export function setup() {
  const login = 'load' + Date.now();
  const r = http.post(`${BASE}/api/auth/signup`, JSON.stringify({ businessName: 'Load Test Shop', ownerName: 'Load', login, password: 'Passw0rdLoad1', bizType: 'grocery' }), json());
  if (r.status !== 201) throw new Error('signup failed: ' + r.status + ' ' + r.body);
  const token = r.json('token');
  const items = [];
  for (let i = 0; i < 5; i++) {
    const it = http.post(`${BASE}/api/items`, JSON.stringify({ name: `Load item ${i}`, category: 'Load', pricePaise: 1000 + i * 100, costPaise: 600, gstPct: 5, stock: { qty: 1000000 } }), json(token));
    items.push(it.json('id'));
  }
  return { token, items };
}

export default function (d) {
  const t = d.token;
  const list = http.get(`${BASE}/api/items`, { ...json(t), tags: { kind: 'read' } });
  check(list, { 'items 200': (r) => r.status === 200 });
  const item = d.items[Math.floor(Math.random() * d.items.length)];
  const qty = 1 + Math.floor(Math.random() * 3);
  const price = (http.get(`${BASE}/api/items`, { ...json(t), tags: { kind: 'read' } }).json('items') || []).find((x) => String(x.id) === String(item));
  const amount = (price ? (price.pricePaise ?? price.price_paise) : 1000) * qty;
  const s = http.post(`${BASE}/api/sales`, JSON.stringify({ lines: [{ itemId: item, qty }], payments: [{ mode: 'CASH', amountPaise: Number(amount) }] }), { ...json(t), tags: { kind: 'sale' } });
  check(s, { 'sale 201': (r) => r.status === 201 });
  saleTime.add(s.timings.duration);
  check(http.get(`${BASE}/api/sales?limit=20`, { ...json(t), tags: { kind: 'read' } }), { 'sales 200': (r) => r.status === 200 });
  check(http.get(`${BASE}/api/reports/summary?period=today`, { ...json(t), tags: { kind: 'read' } }), { 'summary 200': (r) => r.status === 200 });
  sleep(1 + Math.random()); // a cashier is not a robot: ~1-2 s between bills
}
