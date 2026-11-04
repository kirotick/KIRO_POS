import React, { useState } from 'react';
import { View, Text, ScrollView, RefreshControl } from 'react-native';
import { Card, Chip, ErrorBox, H, Loading, Mute, Row, Stat, C } from '../ui/kit';
import { useLoad } from '../ui/useLoad';
import { inr, cap } from '../format';
const PERIODS = [['today', 'Today'], ['yesterday', 'Yesterday'], ['week', '7 days'], ['month', 'Month']];
export default function Home({ api, user, business, can, open }) {
  const [period, setPeriod] = useState('today');
  const mgr = can('reports:view');
  const { data: m, error, loading, reload } = useLoad(() => api.summary(period, !mgr), [period, mgr]);
  return (
    <ScrollView style={{ flex: 1 }} contentContainerStyle={{ padding: 14 }} refreshControl={<RefreshControl refreshing={false} onRefresh={reload} />}>
      <H>{business.name}</H><Mute style={{ marginBottom: 8 }}>Hello {user.name}</Mute>
      <View style={{ flexDirection: 'row', flexWrap: 'wrap' }}>{PERIODS.map(([k, l]) => <Chip key={k} label={l} active={period === k} onPress={() => setPeriod(k)} />)}</View>
      {error ? <ErrorBox message={error} onRetry={reload} /> : loading && !m ? <Loading /> : m ? (
        <View>
          <View style={{ flexDirection: 'row', flexWrap: 'wrap' }}>
            <Stat label="Sales" value={inr(m.totalPaise)} sub={m.bills + ' bill' + (m.bills === 1 ? '' : 's')} />
            <Stat label="Average bill" value={m.bills ? inr(Math.round(m.totalPaise / m.bills)) : '—'} />
            <Stat label="Invoice numbers" value={m.bills ? m.firstInvoice + ' → ' + m.lastInvoice : '—'} />
            {mgr ? <Stat label="GST included" value={inr(m.cgstPaise + m.sgstPaise)} sub={'CGST ' + inr(m.cgstPaise) + ' · SGST ' + inr(m.sgstPaise)} /> : null}
          </View>
          <Card><H>Payment modes</H>{m.byMode.length ? m.byMode.map((x) => <Row key={x.mode} left={cap(x.mode)} right={inr(x.amountPaise)} />) : <Mute>No sales.</Mute>}</Card>
          {mgr ? <Card><H>Sales by staff</H>{m.byStaff.length ? m.byStaff.map((x) => <Row key={x.userId} left={x.name} sub={x.bills + ' bills'} right={inr(x.totalPaise)} />) : <Mute>No sales.</Mute>}</Card> : null}
          <Card><H>Top items</H>{m.topItems.length ? m.topItems.map((x) => <Row key={x.name} left={x.name} sub={x.qty + ' sold'} right={inr(x.totalPaise)} />) : <Mute>No sales.</Mute>}</Card>
        </View>) : null}
    </ScrollView>
  );
}
