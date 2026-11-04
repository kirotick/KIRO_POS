// Phone: the login token lives in secure storage (Keychain / Keystore).
// Website: browsers have no secure store, so it is kept in localStorage for this site only. On a shared computer, always sign out.
import { Platform } from 'react-native';
import * as SecureStore from 'expo-secure-store';
const KEY = 'kiro_session_v1';
const web = () => { try { return Platform.OS === 'web' && typeof window !== 'undefined' ? window.localStorage : null; } catch { return null; } };
export const loadSession = async () => { try { const w = web(); const v = w ? w.getItem(KEY) : await SecureStore.getItemAsync(KEY); return v ? JSON.parse(v) : null; } catch { return null; } };
export const saveSession = async (s) => { try { const w = web(); if (w) w.setItem(KEY, JSON.stringify(s)); else await SecureStore.setItemAsync(KEY, JSON.stringify(s)); } catch { /* stay signed in for this run only */ } };
export const clearSession = async () => { try { const w = web(); if (w) w.removeItem(KEY); else await SecureStore.deleteItemAsync(KEY); } catch { /* nothing to clear */ } };
