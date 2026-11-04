/*
 * dc-lite.js: renders the KIRO website pages that were designed on a Claude Design canvas.
 * Each page keeps its template in <template id="dc-tpl"> and its logic class (Component extends DCLogic).
 * Supports {{holes}}, <sc-for>, <sc-if>, <helmet>, event attributes and setState, using React 18.
 * Plain page scripts are stored as <script type="text/dc-after"> and run once the page is on screen.
 */
(function () {
  'use strict';
  var R = window.React, h = R.createElement;
  var HOLE = /\{\{\s*([^}]+?)\s*\}\}/g, WHOLE = /^\s*\{\{\s*([^}]+?)\s*\}\}\s*$/;

  function lookup(path, scope) {
    path = path.trim();
    if (path === 'true') return true;
    if (path === 'false') return false;
    if (path === 'null') return null;
    if (/^-?\d+(\.\d+)?$/.test(path)) return +path;
    var q = /^(['"])(.*)\1$/.exec(path);
    if (q) return q[2];
    var parts = path.split('.'), v = scope;
    for (var i = 0; i < parts.length; i++) { if (v == null) return undefined; v = v[parts[i]]; }
    return v;
  }
  function interp(str, scope) {
    return str.replace(HOLE, function (_, p) { var v = lookup(p, scope); return v == null ? '' : String(v); });
  }
  function attrVal(str, scope) {
    var m = WHOLE.exec(str);
    if (m) return lookup(m[1], scope);
    return str.indexOf('{{') < 0 ? str : interp(str, scope);
  }
  function camel(s) { return s.replace(/-([a-z])/g, function (_, c) { return c.toUpperCase(); }); }

  // Split CSS declarations on ; and : that are not inside quotes or parentheses (data: URIs contain both).
  function styleObj(css) {
    var out = {}, decl = '', depth = 0, quote = null, list = [];
    for (var i = 0; i < css.length; i++) {
      var c = css[i];
      if (quote) { if (c === quote) quote = null; }
      else if (c === '"' || c === "'") quote = c;
      else if (c === '(') depth++;
      else if (c === ')') depth--;
      else if (c === ';' && depth === 0) { list.push(decl); decl = ''; continue; }
      decl += c;
    }
    list.push(decl);
    list.forEach(function (d) {
      var i = d.indexOf(':');
      if (i < 0) return;
      var k = d.slice(0, i).trim(), v = d.slice(i + 1).trim();
      if (!k || !v) return;
      if (k.indexOf('--') !== 0) k = camel(k.toLowerCase());
      out[k] = v;
    });
    return out;
  }

  var ATTR = {
    'class': 'className', 'for': 'htmlFor', tabindex: 'tabIndex', readonly: 'readOnly', maxlength: 'maxLength',
    minlength: 'minLength', colspan: 'colSpan', rowspan: 'rowSpan', autocomplete: 'autoComplete', autofocus: 'autoFocus',
    srcset: 'srcSet', crossorigin: 'crossOrigin', contenteditable: 'contentEditable', enterkeyhint: 'enterKeyHint',
    inputmode: 'inputMode', spellcheck: 'spellCheck', novalidate: 'noValidate', allowfullscreen: 'allowFullScreen',
    playsinline: 'playsInline', referrerpolicy: 'referrerPolicy', fetchpriority: 'fetchPriority', datetime: 'dateTime',
    accesskey: 'accessKey', enctype: 'encType', hreflang: 'hrefLang', formnovalidate: 'formNoValidate', charset: 'charSet'
  };
  var BOOL = ' disabled checked selected hidden required readonly multiple autofocus autoplay controls loop muted playsinline open defer async novalidate reversed allowfullscreen inert ';
  var EVENTS = {};
  ('Click DoubleClick Input Change Submit Reset KeyDown KeyUp KeyPress Focus Blur MouseEnter MouseLeave MouseOver MouseOut ' +
   'MouseDown MouseUp MouseMove PointerDown PointerUp PointerEnter PointerLeave PointerMove TouchStart TouchEnd TouchMove ' +
   'Scroll Wheel Load Error ContextMenu Toggle Play Pause Ended').split(' ').forEach(function (n) {
    EVENTS['on' + n.toLowerCase()] = 'on' + n;
  });
  EVENTS.ondblclick = 'onDoubleClick';
  var VOID = ' area base br col embed hr img input link meta source track wbr ';

  function kids(node, scope) {
    var out = [], c = node.firstChild, i = 0;
    while (c) {
      var r = conv(c, scope, i++);
      if (r != null && r !== '') { if (Array.isArray(r)) out.push.apply(out, r); else out.push(r); }
      c = c.nextSibling;
    }
    return out;
  }

  function conv(node, scope, key) {
    if (node.nodeType === 3) { var t = node.nodeValue; return t.indexOf('{{') < 0 ? t : interp(t, scope); }
    if (node.nodeType !== 1) return null;
    var tag = node.localName;
    if (tag === 'sc-for') {
      var list = attrVal(node.getAttribute('list') || '', scope) || [];
      var as = node.getAttribute('as') || 'item';
      return [].slice.call(list).map(function (it, i) {
        var s = Object.create(scope); s[as] = it; s.$index = i;
        return h(R.Fragment, { key: key + '.' + i }, kids(node, s));
      });
    }
    if (tag === 'sc-if') {
      return attrVal(node.getAttribute('value') || '', scope) ? h(R.Fragment, { key: key }, kids(node, scope)) : null;
    }
    if (tag === 'helmet' || tag === 'script') return null;
    if (tag === 'style') return h('style', { key: key, dangerouslySetInnerHTML: { __html: interp(node.textContent, scope) } });

    var props = { key: key }, formField = tag === 'input' || tag === 'textarea' || tag === 'select';
    for (var i = 0; i < node.attributes.length; i++) {
      var a = node.attributes[i], name = a.name, raw = a.value;
      if (name.indexOf('hint-') === 0) continue;
      var lname = name.toLowerCase();
      if (EVENTS[lname]) {
        var fn = attrVal(raw, scope);
        if (typeof fn === 'function') props[EVENTS[lname]] = fn;
        continue;
      }
      var v = attrVal(raw, scope);
      if (v === undefined || v === null || v === false) continue;
      if (lname === 'style') { props.style = typeof v === 'string' ? styleObj(v) : v; continue; }
      if (BOOL.indexOf(' ' + lname + ' ') >= 0 && v === '') v = true;
      if (formField && lname === 'value') { props.defaultValue = v; continue; }
      if (formField && lname === 'checked') { props.defaultChecked = !!v; continue; }
      if (tag === 'option' && lname === 'selected') continue;
      props[ATTR[lname] || name] = typeof v === 'function' ? undefined : v;
    }
    if (tag === 'select' && props.defaultValue === undefined) {
      var sel = node.querySelector('option[selected]');
      if (sel) props.defaultValue = sel.hasAttribute('value') ? sel.getAttribute('value') : sel.textContent;
    }
    if (tag === 'textarea') { props.defaultValue = interp(node.textContent, scope); return h(tag, props); }
    if (VOID.indexOf(' ' + tag + ' ') >= 0) return h(tag, props);
    var src = tag === 'template' ? node.content : node;
    var ch = kids(src, scope);
    return ch.length ? h.apply(null, [tag, props].concat(ch)) : h(tag, props);
  }

  var TPL = null;

  class DCLogic extends R.Component {
    constructor(props) { super(props); this.state = {}; }
    renderVals() { return {}; }
    render() {
      var vals = this.renderVals() || {};
      var scope = Object.create(this.props || {});
      Object.keys(vals).forEach(function (k) { scope[k] = vals[k]; });
      return h(R.Fragment, null, kids(TPL, scope));
    }
  }
  window.DCLogic = DCLogic;

  function runScripts(list) {
    list.forEach(function (old) {
      var s = document.createElement('script');
      if (old.src) { s.src = old.src; s.async = false; } else s.textContent = old.textContent;
      document.body.appendChild(s);
    });
  }

  // Elements that appear later (an opened FAQ answer, the form's thank-you panel) are shown at once.
  function revealLateNodes(root) {
    if (!('MutationObserver' in window)) return;
    new MutationObserver(function (muts) {
      muts.forEach(function (m) {
        [].forEach.call(m.addedNodes, function (n) {
          if (n.nodeType !== 1) return;
          if (n.classList.contains('reveal')) n.classList.add('in');
          [].forEach.call(n.querySelectorAll('.reveal'), function (e) { e.classList.add('in'); });
        });
      });
    }).observe(root, { childList: true, subtree: true });
  }

  window.DCLite = {
    mount: function (Component) {
      var tpl = document.getElementById('dc-tpl');
      TPL = tpl.content;
      [].slice.call(TPL.querySelectorAll('helmet')).forEach(function (hel) {
        [].slice.call(hel.childNodes).forEach(function (n) { document.head.appendChild(document.importNode(n, true)); });
      });
      var later = [].slice.call(TPL.querySelectorAll('script'))
        .concat([].slice.call(document.querySelectorAll('script[type="text/dc-after"]')));
      var propsEl = document.getElementById('dc-props');
      var defaults = {};
      try {
        var spec = JSON.parse(propsEl ? propsEl.textContent : '{}');
        Object.keys(spec).forEach(function (k) {
          if (k.charAt(0) !== '$' && spec[k] && 'default' in spec[k]) defaults[k] = spec[k]['default'];
        });
      } catch (e) { /* no tweakable defaults */ }
      var rootEl = document.getElementById('dc-root');
      class Root extends R.Component {
        componentDidMount() { runScripts(later); setTimeout(function () { revealLateNodes(rootEl); }, 0); }
        render() { return h(Component, defaults); }
      }
      window.ReactDOM.createRoot(rootEl).render(h(Root));
    }
  };
})();
