// Thin client for the KIRO API. No secrets here: the token is the login session and is kept in secure storage.
// Every call times out, every failure becomes an Error with a message that is safe to show the user.
export class ApiError extends Error { constructor(message, status) { super(message); this.status = status; } }

export function createApi({ baseUrl, getToken, onUnauthorized, fetchImpl = (...a) => fetch(...a), timeoutMs = 15000 }) {
  async function call(method, path, body, { auth = true } = {}) {
    if (!baseUrl) throw new ApiError('The app has no server address. Set EXPO_PUBLIC_API_URL.', 0);
    const ctl = new AbortController(), timer = setTimeout(() => ctl.abort(), timeoutMs);
    const headers = { Accept: 'application/json' };
    if (body !== undefined) headers['Content-Type'] = 'application/json';
    if (auth) { const t = await getToken(); if (t) headers.Authorization = 'Bearer ' + t; }
    let res;
    try { res = await fetchImpl(baseUrl + '/api' + path, { method, headers, body: body === undefined ? undefined : JSON.stringify(body), signal: ctl.signal }); }
    catch (e) { throw new ApiError(e && e.name === 'AbortError' ? 'The server took too long. Try again.' : 'Cannot reach the server. Check your internet.', 0); }
    finally { clearTimeout(timer); }
    let data = null; try { data = await res.json(); } catch { /* non-JSON error page */ }
    if (res.status === 401 && auth) { if (onUnauthorized) onUnauthorized(); throw new ApiError((data && data.message) || 'Please sign in again.', 401); }
    if (!res.ok || !data || data.success === false) throw new ApiError((data && data.message) || 'Something went wrong. Try again.', res.status);
    return data;
  }
  const qs = (o) => { const p = Object.entries(o).filter(([, v]) => v !== undefined && v !== null && v !== '').map(([k, v]) => encodeURIComponent(k) + '=' + encodeURIComponent(v)); return p.length ? '?' + p.join('&') : ''; };
  return {
    login: (login, password) => call('POST', '/auth/login', { login, password }, { auth: false }),
    me: () => call('GET', '/me'),
    summary: (period, mine) => call('GET', '/reports/summary' + qs({ period, mine: mine ? '1' : '' })).then((d) => d.summary),
    insights: () => call('GET', '/reports/insights').then((d) => d.insights),
    sales: (o = {}) => call('GET', '/sales' + qs({ period: o.period || 'today', q: o.q, staff: o.staff, before: o.before, limit: o.limit })),
    lookup: (no) => call('GET', '/sales/lookup' + qs({ no })).then((d) => d.sale),
    sale: (id) => call('GET', '/sales/' + encodeURIComponent(id)).then((d) => d.sale),
    staff: () => call('GET', '/staff').then((d) => d.staff),
    ask: (question) => call('POST', '/ask', { question }),
    aiStatus: () => call('GET', '/ai/status'),
    aiAsk: (question) => call('POST', '/ai/ask', { question }),
  };
}
