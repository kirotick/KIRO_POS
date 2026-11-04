import React, { useState } from 'react';
import { View, Text, TextInput, ScrollView } from 'react-native';
import { Btn, Card, Chip, ErrorBox, H, Loading, Mute, Row, C } from '../ui/kit';
import { useLoad } from '../ui/useLoad';
import { inr, when } from '../format';
const PERIODS = [['today', 'Today'], ['yesterday', 'Yesterday'], ['week', '7 days'], ['month', 'Month'], ['all', 'All']];
export default function Sales({ api, open }) {
  const [period, setPeriod] = useState('today'), [q, setQ] = useState(''), [applied, setApplied] = useState('');
  const { data, error, loading, reload } = useLoad(() => api.sales({ period, q: applied, limit: 50 }), [period, applied]);
  return (
    <ScrollView style={{ flex: 1 }} contentContainerStyle={{ padding: 14 }}>
      <H>Sales and invoices</H>
      <View style={{ flexDirection: 'row', alignItems: 'center' }}>
        <TextInput testID="salesSearch" value={q} onChangeText={setQ} onSubmitEditing={() => setApplied(q.trim())} placeholder="Invoice number, customer name or mobile" autoCapitalize="none"
          style={{ flex: 1, borderWidth: 1, borderColor: C.line, borderRadius: 10, padding: 10, backgroundColor: C.white }} />
      </View>
      <Btn testID="salesGo" title="Search" kind="ghost" onPress={() => setApplied(q.trim())} />
      <View style={{ flexDirection: 'row', flexWrap: 'wrap', marginTop: 10 }}>{PERIODS.map(([k, l]) => <Chip key={k} label={l} active={period === k} onPress={() => setPeriod(k)} />)}</View>
      {error ? <ErrorBox message={error} onRetry={reload} /> : loading && !data ? <Loading /> : data ? (
        <Card>{data.sales.length ? data.sales.map((x) => (
          <Row key={x.id} testID={'sale-' + x.invoiceNo} left={x.invoiceNo} sub={when(x.createdAt) + ' · ' + x.billedBy.name + (x.customer && x.customer.name ? ' · ' + x.customer.name : '')}
            right={inr(x.totalPaise)} onPress={() => open('invoice', x.id)} />)) : <Mute>No bills found.</Mute>}</Card>) : null}
    </ScrollView>
  );
}
