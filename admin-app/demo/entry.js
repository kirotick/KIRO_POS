import React from 'react';
import { createRoot } from 'react-dom/client';
import App from '../src/App';
import { installDemoFetch, demoSession } from './shim';
// Some viewers block localStorage; fall back to an in-memory one so the demo still works.
try { window.localStorage.getItem('x'); } catch { const m = {}; Object.defineProperty(window, 'localStorage', { value: { getItem: (k) => (k in m ? m[k] : null), setItem: (k, v) => { m[k] = String(v); }, removeItem: (k) => { delete m[k]; } } }); }
installDemoFetch('https://demo.kiro.invalid');
const root = createRoot(document.getElementById('root'));
let n = 0;
window.__demoSignIn = (key) => { try { if (key) window.localStorage.setItem('kiro_session_v1', JSON.stringify(demoSession(key))); else window.localStorage.removeItem('kiro_session_v1'); } catch (e) { /* ignore */ } root.render(<App key={++n} />); };
window.__demoSignIn('owner');
