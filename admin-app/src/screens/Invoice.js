import React from 'react';
import { View, ScrollView } from 'react-native';
import { Btn, Card, ErrorBox, H, Loading, Mute, Row } from '../ui/kit';
import { useLoad } from '../ui/useLoad';
import { inr, when, cap } from '../format';
export default function Invoice({ api, id, back }) {
  const { data: s, error, reload } = useLoad(() => api.sale(id), [id]);
  return (
    <ScrollView style={{ flex: 1 }} contentContainerStyle={{ padding: 14 }}>
      <Btn title="‹ Back" kind="ghost" onPress={back} testID="back" />
      {error ? <ErrorBox message={error} onRetry={reload} /> : !s ? <Loading /> : (
        <View style={{ marginTop: 10 }}>
          <H>{s.invoiceNo}</H>
          <Card>
            <Row left="Date" right={when(s.createdAt)} />
            <Row left="Billed by" right={s.billedBy.name} />
            <Row left="Customer" right={s.customer ? [s.customer.name, s.customer.phone].filter(Boolean).join(' · ') : 'Walk-in'} />
            <Row left="Status" right={cap(s.status)} />
          </Card>
          <Card><H>Items</H>{s.lines.map((l, i) => <Row key={i} left={l.name} sub={l.qty + ' × ' + inr(l.unitPricePaise)} right={inr(l.lineTotalPaise)} />)}</Card>
          <Card>
            <Row left="Subtotal" right={inr(s.subtotalPaise)} />
            {s.discountPaise ? <Row left="Discount" right={'-' + inr(s.discountPaise)} /> : null}
            <Row left="CGST" right={inr(s.cgstPaise)} /><Row left="SGST" right={inr(s.sgstPaise)} />
            <Row left="Total" right={inr(s.totalPaise)} />
            {(s.payments || []).map((p, i) => <Row key={i} left={'Paid by ' + cap(p.mode)} right={inr(p.amountPaise)} />)}
          </Card>
        </View>)}
    </ScrollView>
  );
}
