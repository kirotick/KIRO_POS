import React from 'react';
import { View, ScrollView } from 'react-native';
import { Card, ErrorBox, H, Loading, Mute, Row, Stat } from '../ui/kit';
import { useLoad } from '../ui/useLoad';
import { inr } from '../format';
export default function Stock({ api }) {
  const { data: i, error, reload } = useLoad(() => api.insights(), []);
  return (
    <ScrollView style={{ flex: 1 }} contentContainerStyle={{ padding: 14 }}>
      <H>Stock insights</H>
      {error ? <ErrorBox message={error} onRetry={reload} /> : !i ? <Loading /> : (
        <View>
          <View style={{ flexDirection: 'row', flexWrap: 'wrap' }}>
            <Stat label="Inventory at cost" value={inr(i.inventoryPaise)} />
            <Stat label="Stuck in dead stock" value={inr(i.stuckPaise)} sub="older than 90 days, unsold" />
            <Stat label="Expired" value={inr(i.expiredPaise)} />
          </View>
          <Card><H>Dead stock</H>{i.dead.length ? i.dead.map((d, k) => <Row key={k} left={d.name} sub={d.qty + ' left · ' + d.ageDays + ' days old'} right={inr(d.lockedPaise)} />) : <Mute>None. Nothing is stuck.</Mute>}</Card>
          <Card><H>Fast movers (14 days)</H>{i.fastMovers.length ? i.fastMovers.map((f, k) => <Row key={k} left={f.category || 'Uncategorised'} right={f.qty + ' sold'} />) : <Mute>No sales yet.</Mute>}</Card>
          <Card><H>Expired or expiring (90 days)</H>{i.expiring.length ? i.expiring.map((e, k) => <Row key={k} left={e.name} sub={(e.batchNo ? 'Batch ' + e.batchNo + ' · ' : '') + e.qty + ' left'} right={e.expiry + (e.expired ? ' ✗' : '')} />) : <Mute>None.</Mute>}</Card>
          <Card><H>Low stock</H>{i.lowStock.length ? i.lowStock.map((l, k) => <Row key={k} left={l.name} sub={'minimum ' + l.min} right={l.stock + ' left'} />) : <Mute>Nothing is low.</Mute>}</Card>
        </View>)}
    </ScrollView>
  );
}
