// Builds the Netlify website (web/site) from the "KIRO website" Claude Design canvas.
// Usage: node tools/build-design-site.mjs <folder holding the canvas's *.dc.html files>
// Re-run it after downloading the canvas files again whenever the design changes, then commit and push.
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const src = process.argv[2];
if (!src || !fs.existsSync(src)) { console.error('Give the folder that holds the .dc.html files.'); process.exit(1); }
const out = path.join(path.dirname(fileURLToPath(import.meta.url)), '..', 'web', 'site');

// Canvas artboard -> website file name.
const PAGES = {
  Main: 'index.html', Blog: 'blog.html', Downloads: 'downloads.html', Contact: 'contact.html',
  Login: 'login.html', Features: 'features.html', Pricing: 'pricing.html', Marketplace: 'marketplace.html'
};
const REACT = [
  'https://cdnjs.cloudflare.com/ajax/libs/react/18.3.1/umd/react.production.min.js',
  'https://cdnjs.cloudflare.com/ajax/libs/react-dom/18.3.1/umd/react-dom.production.min.js'
];
const HANDLE = 'kiro.pos'; // default Instagram handle from the Home page's settings

const decode = (s) => s.replace(/&#39;/g, "'").replace(/&quot;/g, '"').replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&amp;/g, '&');
const safeJson = (s) => s.replace(/<\//g, '<\\/');

// The KIRO POS app lives at web/site/app/. Every "Log in" and "Start free trial" button opens it,
// and so does the Log in page's own link to the app (which pointed at its claude.ai address).
const APP = 'app/';
const LINK_TO = { Login: APP };
// Claude artifacts the pages link to, now hosted on the website itself.
const HOSTED = {
  'https://claude.ai/artifact/6uMQobCLzLjnhBckcGXr6e': APP,    // KIRO POS app      -> web/site/app/
  'https://claude.ai/artifact/M2PJVfCTPsDaXaq59zy9qT': 'kkc/'  // KKC shop          -> web/site/kkc/
};

// Removes the element with this id (and everything inside it) by counting nested tags of the same name.
function removeElementById(t, id) {
  const start = t.search(new RegExp(`<([a-zA-Z][\\w-]*)[^>]*\\sid="${id}"`));
  if (start < 0) return t;
  const tag = /^<([a-zA-Z][\w-]*)/.exec(t.slice(start))[1];
  const re = new RegExp(`<${tag}\\b[^>]*>|</${tag}>`, 'g');
  re.lastIndex = start;
  let depth = 0, m;
  while ((m = re.exec(t))) {
    depth += m[0][1] === '/' ? -1 : 1;
    if (depth === 0) return t.slice(0, start) + t.slice(re.lastIndex);
  }
  return t;
}

// Removed from the Home page on the owner's request: the launch screen with the pink flower photo.
function removeLaunchScreen(t) {
  t = removeElementById(t, 'kiro-launch');
  return t.replace(/<script>\(function\(\)\{var el=document\.getElementById\("kiro-launch"\)[\s\S]*?<\/script>/, '');
}

function rewriteLinks(t) {
  t = t.replace(/([A-Za-z0-9_-]+)\.dc\.html/g, (m, name) => LINK_TO[name] || PAGES[name] || m);
  for (const [from, to] of Object.entries(HOSTED)) t = t.split(from).join(to);
  return t;
}

for (const [name, file] of Object.entries(PAGES)) {
  let t = fs.readFileSync(path.join(src, name + '.dc.html'), 'utf8');
  t = rewriteLinks(t);
  if (name === 'Main') t = removeLaunchScreen(t);
  t = t.replace(/<script src="\.\/support\.js"><\/script>\s*/g, '');

  const xs = t.indexOf('<x-dc>'), xe = t.lastIndexOf('</x-dc>');
  if (xs < 0) {
    // Already plain HTML: only fill in the Instagram handle.
    fs.writeFileSync(path.join(out, file), t.replace(/\{\{\s*handle\s*\}\}/g, HANDLE));
    console.log(file.padEnd(18), 'plain page');
    continue;
  }

  const dcRe = /<script type="text\/x-dc" data-dc-script(?: data-props='([^']*)')?>([\s\S]*?)<\/script>/;
  const m = dcRe.exec(t);
  if (!m) throw new Error(name + ': no logic script found');
  const propsJson = m[1] ? decode(m[1]) : '{}';
  JSON.parse(propsJson); // fail the build early on a broken settings block
  const code = m[2];

  const inner = t.slice(xs + '<x-dc>'.length, xe);
  let before = t.slice(0, xs);
  let after = t.slice(xe + '</x-dc>'.length).replace(m[0], '');
  // Plain page scripts after the template wait until the page has been drawn.
  after = after.replace(/<script>/g, '<script type="text/dc-after">');

  const boot =
    `<script id="dc-props" type="application/json">${safeJson(propsJson)}</script>\n` +
    REACT.map((u) => `<script src="${u}" crossorigin="anonymous"></script>`).join('\n') + '\n' +
    `<script src="dc-lite.js"></script>\n` +
    `<script>\n${code}\nDCLite.mount(Component);\n</script>\n`;

  const page = before +
    `<div id="dc-root" style="display:contents"></div>\n<template id="dc-tpl">${inner}</template>\n` +
    after.replace('</body>', boot + '</body>');
  fs.writeFileSync(path.join(out, file), page);
  console.log(file.padEnd(18), 'design page,', (page.length / 1024).toFixed(0), 'KB');
}
