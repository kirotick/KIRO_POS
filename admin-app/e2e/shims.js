// Test-only replacements for native modules.
export const StatusBar = () => null;
const mem = (() => { try { return window.localStorage; } catch { return null; } })();
export const getItemAsync = async (k) => (mem ? mem.getItem(k) : null);
export const setItemAsync = async (k, v) => { if (mem) mem.setItem(k, v); };
export const deleteItemAsync = async (k) => { if (mem) mem.removeItem(k); };
