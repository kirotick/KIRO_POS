import React from 'react';
import { ScrollView } from 'react-native';
import { Card, ErrorBox, H, Loading, Mute, Row } from '../ui/kit';
import { useLoad } from '../ui/useLoad';
import { inr, ago, ROLE } from '../format';
export default function Staff({ api }) {
  const { data, error, reload } = useLoad(() => api.staff(), []);
  return (
    <ScrollView style={{ flex: 1 }} contentContainerStyle={{ padding: 14 }}>
      <H>Who is using KIRO</H>
      {error ? <ErrorBox message={error} onRetry={reload} /> : !data ? <Loading /> : (
        <Card>{data.map((u) => (
          <Row key={u.id} testID={'staff-' + u.login} left={u.name + (u.active ? '' : ' (off)')}
            sub={(ROLE[u.role] || u.role) + ' · login ' + u.login + ' · last active ' + ago(u.lastLoginAt)}
            right={u.billsToday + ' · ' + inr(u.totalTodayPaise)} />))}
          <Mute style={{ marginTop: 8 }}>Right column: bills and sales today.</Mute></Card>)}
    </ScrollView>
  );
}
