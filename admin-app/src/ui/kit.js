import React from 'react';
import { View, Text, Pressable, ActivityIndicator, StyleSheet } from 'react-native';
export const C = { ink: '#0E1A2B', kate: '#E8472B', mist: '#F6F5F2', line: '#E5E2DB', mute: '#6B7280', ok: '#15803D', warn: '#B45309', white: '#fff' };
export const Card = ({ children, style }) => <View style={[s.card, style]}>{children}</View>;
export const H = ({ children }) => <Text style={s.h} accessibilityRole="header">{children}</Text>;
export const Mute = ({ children, style }) => <Text style={[s.mute, style]}>{children}</Text>;
export const Btn = ({ title, onPress, kind = 'primary', disabled, testID }) => (
  <Pressable testID={testID} accessibilityRole="button" disabled={disabled} onPress={onPress}
    style={({ pressed }) => [s.btn, kind === 'ghost' && s.ghost, disabled && { opacity: 0.5 }, pressed && { opacity: 0.8 }]}>
    <Text style={[s.btnT, kind === 'ghost' && { color: C.ink }]}>{title}</Text>
  </Pressable>
);
export const Chip = ({ label, active, onPress }) => (
  <Pressable accessibilityRole="button" onPress={onPress} style={[s.chip, active && { backgroundColor: C.ink, borderColor: C.ink }]}>
    <Text style={[s.chipT, active && { color: C.white }]}>{label}</Text>
  </Pressable>
);
export const Stat = ({ label, value, sub }) => (
  <View style={s.stat}><Mute>{label}</Mute><Text style={s.statV}>{value}</Text>{sub ? <Mute>{sub}</Mute> : null}</View>
);
export const Row = ({ left, right, sub, onPress, testID }) => (
  <Pressable testID={testID} accessibilityRole={onPress ? 'button' : undefined} onPress={onPress} style={s.row}>
    <View style={{ flex: 1, paddingRight: 8 }}><Text style={s.rowL}>{left}</Text>{sub ? <Mute>{sub}</Mute> : null}</View>
    <Text style={s.rowR}>{right}</Text>
  </Pressable>
);
export const Loading = () => <View style={{ padding: 24 }}><ActivityIndicator color={C.kate} /></View>;
export const ErrorBox = ({ message, onRetry }) => (
  <Card style={{ borderColor: C.kate }}><Text style={{ color: C.kate, fontWeight: '700' }}>{message}</Text>{onRetry ? <Btn title="Try again" kind="ghost" onPress={onRetry} /> : null}</Card>
);
export const s = StyleSheet.create({
  card: { backgroundColor: C.white, borderRadius: 16, borderWidth: 1, borderColor: C.line, padding: 14, marginBottom: 12 },
  h: { fontSize: 20, fontWeight: '800', color: C.ink, marginBottom: 10 },
  mute: { color: C.mute, fontSize: 13 },
  btn: { backgroundColor: C.kate, borderRadius: 12, paddingVertical: 12, paddingHorizontal: 16, alignItems: 'center', marginTop: 8 },
  ghost: { backgroundColor: C.white, borderWidth: 1, borderColor: C.line },
  btnT: { color: C.white, fontWeight: '700', fontSize: 15 },
  chip: { borderWidth: 1, borderColor: C.line, borderRadius: 999, paddingVertical: 6, paddingHorizontal: 12, marginRight: 8, marginBottom: 8, backgroundColor: C.white },
  chipT: { color: C.ink, fontSize: 13, fontWeight: '600' },
  stat: { flex: 1, minWidth: 140, backgroundColor: C.white, borderRadius: 16, borderWidth: 1, borderColor: C.line, padding: 12, margin: 4 },
  statV: { fontSize: 22, fontWeight: '800', color: C.ink, marginVertical: 2 },
  row: { flexDirection: 'row', alignItems: 'center', paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: C.line },
  rowL: { color: C.ink, fontWeight: '600', fontSize: 15 }, rowR: { color: C.ink, fontWeight: '700', fontSize: 15 },
});
