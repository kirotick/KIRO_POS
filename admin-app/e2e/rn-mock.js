// TEST-ONLY stand-in for react-native that draws the same component tree with DOM elements, so the real screens
// can run in a browser against the real API. It checks behaviour (data, taps, roles), not native look and feel.
import React from 'react';
const flat = (s) => (Array.isArray(s) ? s.reduce((a, x) => ({ ...a, ...flat(x) }), {}) : s || {});
const PX = ['padding', 'paddingVertical', 'paddingHorizontal', 'paddingTop', 'paddingBottom', 'paddingLeft', 'paddingRight', 'margin', 'marginTop', 'marginBottom', 'marginLeft', 'marginRight', 'marginVertical',
  'marginHorizontal', 'fontSize', 'borderRadius', 'borderWidth', 'minWidth', 'maxWidth', 'width', 'height', 'borderBottomWidth', 'borderTopWidth'];
const css = (s) => { const o = flat(s), r = { display: 'flex', flexDirection: 'column', boxSizing: 'border-box' };
  for (const [k, v] of Object.entries(o)) {
    if (k === 'paddingVertical') { r.paddingTop = r.paddingBottom = v + 'px'; continue; } if (k === 'paddingHorizontal') { r.paddingLeft = r.paddingRight = v + 'px'; continue; }
    if (k === 'marginVertical') { r.marginTop = r.marginBottom = v + 'px'; continue; } if (k === 'marginHorizontal') { r.marginLeft = r.marginRight = v + 'px'; continue; }
    if (k === 'borderWidth') { r.borderStyle = 'solid'; r.borderWidth = v + 'px'; continue; } if (k === 'borderBottomWidth' || k === 'borderTopWidth') { r[k.replace('Width','Style')] = 'solid'; r[k] = v + 'px'; continue; }
    r[k] = typeof v === 'number' && PX.includes(k) ? v + 'px' : v; } return r; };
const common = (p) => ({ style: css(p.style), 'data-testid': p.testID, 'aria-label': p.accessibilityLabel });
export const View = ({ children, ...p }) => <div {...common(p)}>{children}</div>;
export const Text = ({ children, ...p }) => <span {...common(p)} style={{ ...css(p.style), display: 'block', whiteSpace: 'pre-wrap' }}>{children}</span>;
export const ScrollView = React.forwardRef(({ children, contentContainerStyle, refreshControl, onContentSizeChange, ...p }, ref) =>
  <div ref={ref} {...common(p)} style={{ ...css(p.style), overflowY: 'auto' }}><div style={css(contentContainerStyle)}>{children}</div></div>);
export const Pressable = ({ children, onPress, disabled, style, ...p }) => {
  const st = typeof style === 'function' ? style({ pressed: false }) : style;
  return <div role="button" tabIndex={0} {...common({ ...p, style: st })} aria-disabled={!!disabled} onClick={() => { if (!disabled && onPress) onPress(); }}>{children}</div>; };
export const TextInput = ({ value, onChangeText, onSubmitEditing, secureTextEntry, placeholder, maxLength, ...p }) =>
  <input {...common(p)} type={secureTextEntry ? 'password' : 'text'} value={value} placeholder={placeholder} maxLength={maxLength}
    onChange={(e) => onChangeText && onChangeText(e.target.value)} onKeyDown={(e) => { if (e.key === 'Enter' && onSubmitEditing) onSubmitEditing(); }} />;
export const ActivityIndicator = () => <span data-testid="spinner">…</span>;
export const RefreshControl = () => null;
export const KeyboardAvoidingView = ({ children, ...p }) => <div {...common(p)}>{children}</div>;
export const SafeAreaView = View;
export const StyleSheet = { create: (o) => o };
export const Platform = { OS: 'web' };
