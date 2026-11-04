import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { View, Text, Pressable, SafeAreaView, StyleSheet } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { API_URL } from './config';
import { createApi } from './api';
import { loadSession, saveSession, clearSession } from './session';
import { C, Btn, Card, H, Mute, Loading } from './ui/kit';
import Login from './screens/Login';
import Home from './screens/Home';
import Sales from './screens/Sales';
import Invoice from './screens/Invoice';
import Staff from './screens/Staff';
import Stock from './screens/Stock';
import Ask from './screens/Ask';

// Which tab each permission unlocks. The server enforces the same rules; hiding a tab is only for tidiness.
const TABS = [
  { k: 'home', t: 'Home', need: null }, { k: 'sales', t: 'Sales', need: 'sales:viewAll' }, { k: 'stock', t: 'Stock', need: 'insights:view' },
  { k: 'ask', t: 'Ask KIRO', need: 'ask:use' }, { k: 'staff', t: 'Staff', need: 'staff:manage' }, { k: 'more', t: 'More', need: null },
];

export default function App() {
  const [sess, setSess] = useState(undefined);        // undefined = still loading, null = signed out
  const [tab, setTab] = useState('home'), [invoiceId, setInvoiceId] = useState(null);
  const tokenRef = useRef(null);
  tokenRef.current = sess ? sess.token : null;
  const signOut = useCallback(async () => { await clearSession(); setSess(null); setTab('home'); setInvoiceId(null); }, []);
  const api = useMemo(() => createApi({ baseUrl: API_URL, getToken: async () => tokenRef.current, onUnauthorized: () => { signOut(); } }), [signOut]);
  useEffect(() => { loadSession().then((s) => setSess(s || null)); }, []);

  // Re-check the session once on start: picks up a changed role or a switched-off login straight away.
  useEffect(() => {
    if (!sess || sess.checked) return;
    api.me().then((d) => { const n = { ...sess, user: d.user, business: d.business, checked: true }; setSess(n); saveSession({ token: n.token, user: n.user, business: n.business }); }, () => {});
  }, [sess, api]);

  if (sess === undefined) return <SafeAreaView style={st.fill}><Loading /></SafeAreaView>;
  if (!sess) return <SafeAreaView style={st.fill}><StatusBar style="dark" /><Login api={api} onDone={async (s) => { await saveSession(s); setSess({ ...s, checked: true }); }} /></SafeAreaView>;

  const perms = sess.user.permissions || [];
  const can = (p) => perms.includes(p);
  const tabs = TABS.filter((x) => !x.need || can(x.need));
  const cur = tabs.some((x) => x.k === tab) ? tab : 'home';
  const open = (what, id) => { if (what === 'invoice') setInvoiceId(id); };
  let body;
  if (invoiceId) body = <Invoice api={api} id={invoiceId} back={() => setInvoiceId(null)} />;
  else if (cur === 'home') body = <Home api={api} user={sess.user} business={sess.business} can={can} open={open} />;
  else if (cur === 'sales') body = <Sales api={api} open={open} />;
  else if (cur === 'stock') body = <Stock api={api} />;
  else if (cur === 'ask') body = <Ask api={api} can={can} />;
  else if (cur === 'staff') body = <Staff api={api} />;
  else body = (
    <View style={{ padding: 14 }}>
      <H>More</H>
      <Card><Text style={{ fontWeight: '700', color: C.ink }}>{sess.user.name}</Text><Mute>{sess.user.role} · {sess.business.name}</Mute><Mute>Server: {API_URL || 'not set'}</Mute>
        <Btn testID="signOut" title="Sign out" kind="ghost" onPress={signOut} /></Card>
    </View>);
  return (
    <SafeAreaView style={st.fill}>
      <StatusBar style="dark" />
      <View style={{ flex: 1 }}>{body}</View>
      <View style={st.bar}>
        {tabs.map((x) => (
          <Pressable key={x.k} testID={'tab-' + x.k} accessibilityRole="tab" onPress={() => { setInvoiceId(null); setTab(x.k); }} style={st.tab}>
            <Text style={[st.tabT, cur === x.k && !invoiceId && { color: C.kate }]}>{x.t}</Text>
          </Pressable>))}
      </View>
    </SafeAreaView>
  );
}
const st = StyleSheet.create({ fill: { flex: 1, backgroundColor: C.mist },
  bar: { flexDirection: 'row', borderTopWidth: 1, borderTopColor: C.line, backgroundColor: C.white }, tab: { flex: 1, paddingVertical: 14, alignItems: 'center' }, tabT: { fontSize: 12, fontWeight: '700', color: C.mute } });
