import React, { useState } from 'react';
import { View, Text, TextInput, StyleSheet, KeyboardAvoidingView, Platform } from 'react-native';
import { Btn, C, Card, Mute } from '../ui/kit';
export default function Login({ api, onDone }) {
  const [login, setLogin] = useState(''), [pw, setPw] = useState(''), [busy, setBusy] = useState(false), [err, setErr] = useState('');
  const go = async () => {
    if (!login.trim() || !pw) { setErr('Enter your login and password'); return; }
    setBusy(true); setErr('');
    try { const d = await api.login(login.trim(), pw); await onDone({ token: d.token, user: d.user, business: d.business }); }
    catch (e) { setErr(e.message); setBusy(false); }
  };
  return (
    <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={{ flex: 1, justifyContent: 'center', padding: 20, backgroundColor: C.mist }}>
      <Text style={st.logo}>KIRO</Text><Mute style={{ marginBottom: 16 }}>Owner and manager app</Mute>
      <Card>
        <Text style={st.lab}>Login (mobile number or staff ID)</Text>
        <TextInput testID="login" value={login} onChangeText={setLogin} autoCapitalize="none" autoCorrect={false} style={st.in} />
        <Text style={st.lab}>Password</Text>
        <TextInput testID="password" value={pw} onChangeText={setPw} secureTextEntry style={st.in} onSubmitEditing={go} />
        {err ? <Text testID="loginErr" style={{ color: C.kate, marginTop: 8, fontWeight: '600' }}>{err}</Text> : null}
        <Btn testID="loginGo" title={busy ? 'Signing in…' : 'Sign in'} onPress={go} disabled={busy} />
      </Card>
    </KeyboardAvoidingView>
  );
}
const st = StyleSheet.create({ logo: { fontSize: 36, fontWeight: '900', color: C.kate }, lab: { color: C.ink, fontWeight: '600', marginTop: 8, marginBottom: 4 },
  in: { borderWidth: 1, borderColor: C.line, borderRadius: 10, padding: 10, fontSize: 16, backgroundColor: C.white } });
