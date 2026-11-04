import React from 'react';
import { createRoot } from 'react-dom/client';
import App from '../src/App';
window.__mount = () => createRoot(document.getElementById('root')).render(<App />);
window.__mount();
