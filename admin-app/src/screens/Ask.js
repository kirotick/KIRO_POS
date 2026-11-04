import React, { useEffect, useRef, useState } from 'react';
import { View, Text, TextInput, ScrollView } from 'react-native';
import { Btn, C, Chip, Mute } from '../ui/kit';
const IDEAS = ["Today's sales", 'Forecast next week', 'Anything unusual?', 'ABC analysis', 'What sells together?', 'Customer segments', 'What should I reorder?', 'Last 5 invoices', 'Sales by staff this week', 'Who is using KIRO?', 'GST collected this month', 'Top items this week', 'Give me a summary'];
export default function Ask({ api, can }) {
  const [msgs, setMsgs] = useState([{ from: 'bot', text: 'Ask me about sales, invoice numbers, staff, GST, stock and more. I answer from your own data. I am a keyword assistant, not a chatbot, so keep questions short.' }]);
  const [q, setQ] = useState(''), [busy, setBusy] = useState(false), ref = useRef(null), [smart, setSmart] = useState(false);
  // Newer servers have the analytics + AI endpoint; older ones only have /ask. Ask once and remember.
  useEffect(() => { let on = true; api.aiStatus().then((d) => { if (on) setSmart(!!d.analytics); }, () => {}); return () => { on = false; }; }, [api]);
  const send = async (text) => {
    const t = String(text || '').trim(); if (!t || busy) return;
    setQ(''); setBusy(true); setMsgs((m) => [...m, { from: 'me', text: t }]);
    try { const d = smart ? await api.aiAsk(t) : await api.ask(t); setMsgs((m) => [...m, { from: 'bot', text: d.answer, tag: d.source === 'ai' ? 'AI wording · numbers checked against your data' : d.topic && smart ? 'Calculated from your data' : '', note: d.note || '' }]); }
    catch (e) { setMsgs((m) => [...m, { from: 'bot', text: e.message, err: true }]); }
    setBusy(false);
  };
  return (
    <View style={{ flex: 1 }}>
      <ScrollView ref={ref} style={{ flex: 1 }} contentContainerStyle={{ padding: 14 }} onContentSizeChange={() => ref.current && ref.current.scrollToEnd && ref.current.scrollToEnd({ animated: true })}>
        {msgs.map((m, i) => (
          <View key={i} testID={m.from === 'bot' ? 'botMsg' : 'myMsg'} style={{ alignSelf: m.from === 'me' ? 'flex-end' : 'flex-start', maxWidth: '88%', marginBottom: 8, padding: 10, borderRadius: 14,
            backgroundColor: m.from === 'me' ? C.ink : C.white, borderWidth: m.from === 'me' ? 0 : 1, borderColor: m.err ? C.kate : C.line }}>
            <Text selectable style={{ color: m.from === 'me' ? C.white : m.err ? C.kate : C.ink, fontSize: 15 }}>{m.text}</Text>
            {m.tag ? <Mute style={{ marginTop: 6, fontSize: 11 }}>{m.tag}</Mute> : null}{m.note ? <Mute style={{ marginTop: 2, fontSize: 11 }}>{m.note}</Mute> : null}
          </View>))}
        {busy ? <Mute>Thinking…</Mute> : null}
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', marginTop: 8 }}>{IDEAS.map((x) => <Chip key={x} label={x} onPress={() => send(x)} />)}</View>
      </ScrollView>
      <View style={{ flexDirection: 'row', padding: 10, borderTopWidth: 1, borderTopColor: C.line, backgroundColor: C.white, alignItems: 'center' }}>
        <TextInput testID="askIn" value={q} onChangeText={setQ} onSubmitEditing={() => send(q)} placeholder="Ask KIRO…" maxLength={200}
          style={{ flex: 1, borderWidth: 1, borderColor: C.line, borderRadius: 10, padding: 10, marginRight: 8 }} />
        <Btn testID="askGo" title="Ask" onPress={() => send(q)} disabled={busy} />
      </View>
    </View>
  );
}
