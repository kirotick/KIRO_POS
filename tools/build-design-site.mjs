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
// Pinned with Subresource Integrity, so browsers refuse a changed copy from the CDN (qa/scripts/security.mjs).
const REACT = [
  ['https://cdnjs.cloudflare.com/ajax/libs/react/18.3.1/umd/react.production.min.js', 'sha384-DGyLxAyjq0f9SPpVevD6IgztCFlnMF6oW/XQGmfe+IsZ8TqEiDrcHkMLKI6fiB/Z'],
  ['https://cdnjs.cloudflare.com/ajax/libs/react-dom/18.3.1/umd/react-dom.production.min.js', 'sha384-gTGxhz21lVGYNMcdJOyq01Edg0jhn/c22nsx0kyqP0TxaV5WVdsSH1fSDUf5YJj1']
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
  'https://claude.ai/artifact/M2PJVfCTPsDaXaq59zy9qT': 'lux/'  // KIRO LUX shop     -> web/site/lux/
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

// Home page hero photo cards, as the owner asked: smaller, all four the same size, scaled to the screen's
// width AND height (so wide, short and tall screens all fit), never touching each other, the text or the
// stats bar, and all four moving up and down together. Motion stops when the visitor's device asks for
// reduced motion. Laptops and desktops (over 900px): two cards each side. Phones and tablets: one row of four.
const HERO_FIX = `<style id="kiro-hero-fix">
@keyframes khBob{0%,100%{transform:translateY(0)}50%{transform:translateY(-10px)}}
@media (min-width:901px){
  #kiro-hero-cards{--kh-w:clamp(88px,min(9.5vw,14.5vh),170px);--kh-edge:clamp(20px,3vw,56px);--kh-top:max(6%,36px);--kh-above-bar:calc(clamp(20px,4vh,40px) + 132px)}
  #kiro-hero-cards .kh-card.kh-a,#kiro-hero-cards .kh-card.kh-b,#kiro-hero-cards .kh-card.kh-c,#kiro-hero-cards .kh-card.kh-d{width:var(--kh-w);height:auto;aspect-ratio:.66;border-radius:18px}
  #kiro-hero-cards .kh-card.kh-a{left:var(--kh-edge);right:auto;top:var(--kh-top);bottom:auto}
  #kiro-hero-cards .kh-card.kh-c{left:var(--kh-edge);right:auto;top:auto;bottom:var(--kh-above-bar)}
  #kiro-hero-cards .kh-card.kh-b{left:auto;right:var(--kh-edge);top:var(--kh-top);bottom:auto}
  #kiro-hero-cards .kh-card.kh-d{left:auto;right:var(--kh-edge);top:auto;bottom:var(--kh-above-bar)}
}
@media (max-width:900px){
  #kiro-hero-cards{grid-template-columns:repeat(4,minmax(0,1fr)) !important;gap:clamp(8px,2.5vw,14px) !important;max-width:480px;margin-left:auto !important;margin-right:auto !important;margin-bottom:20px !important;padding:14px 16px 0 !important}
  #kiro-hero-cards .kh-card{aspect-ratio:.66 !important;border-radius:14px !important}
}
@media (prefers-reduced-motion:no-preference){
  #kiro-hero-cards .kh-card{animation:khBob 6s ease-in-out infinite !important;animation-delay:0s !important}
}
/* Found by qa/tests/motion: the tilted cards (.tilt, inline "kiroBob" animation) kept bobbing for visitors who
   asked their device to reduce motion. Every other looping animation on the page already stops. */
@media (prefers-reduced-motion:reduce){
  .tilt{animation:none !important}
}
</style>`;

// Small layout fixes found by qa/tests/responsive (pages scrolled sideways by a few pixels).
// Each is an exact text swap in the canvas source; the build stops if the canvas changed and one no longer applies.
const LAYOUT_FIXES = {
  Main: [
    // 320px phones: the "Billing Kitchen Tables Reports" pill row could not wrap.
    ['<span style="display: flex; gap: 6px; font-size: 13px; font-weight: 700">', '<span style="display: flex; flex-wrap: wrap; gap: 6px; font-size: 13px; font-weight: 700">'],
    // 320px phones: the two feature cards (Reservations, Day close...) refused to shrink below their text width.
    ['flex:1 1 300px;min-width:0;display:grid;grid-template-columns:1fr 1fr;gap:12px', 'flex:1 1 300px;min-width:0;display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:12px'],
    // 1280px laptops: the floating "KOT #12" badge sat 6px past the screen edge.
    ['position: absolute; right: -6px; top: 40px;', 'position: absolute; right: 0; top: 40px;'],
    // Accessibility (qa/tests/accessibility, axe "critical"): the theme switcher is a tablist, so its buttons are tabs.
    ['<button type="button" class="th-btn" data-i=', '<button type="button" class="th-btn" role="tab" data-i='],
  ],
  Login: [
    // 320px phones: the sign-in card was wider than the screen.
    ['<section aria-labelledby="signin-title" style="', '<section aria-labelledby="signin-title" style="min-width:0;max-width:100%;box-sizing:border-box;'],
  ],
};
function applyLayoutFixes(name, t) {
  for (const [from, to] of LAYOUT_FIXES[name] || []) {
    if (!t.includes(from)) throw new Error(`${name}: layout fix no longer applies (canvas changed?): ${from.slice(0, 60)}`);
    t = t.split(from).join(to);
  }
  return t;
}

// Browser-tab icon and link-preview picture: the red KIRO logo from the site header (owner's choice, not the
// POS app's blue/orange icon). Without an icon browsers ask for /favicon.ico and get a 404 (found by QA in Edge).
const SITE = 'https://kiro-pos.netlify.app';
const ICON = [
  '<link rel="icon" type="image/png" sizes="192x192" href="favicon.png">',
  '<link rel="apple-touch-icon" href="apple-touch-icon.png">',
  '<meta name="theme-color" content="#E30B1C">',
].join('\n');
const addIcon = (t, file) => {
  if (!/rel="icon"/.test(t)) t = t.replace('</head>', ICON + '\n</head>');
  if (!/property="og:image"/.test(t)) {
    const title = ((t.match(/<title>([^<]*)<\/title>/) || [])[1] || 'KIRO').replace(/"/g, '&quot;');
    const desc = ((t.match(/<meta name="description" content="([^"]*)"/) || [])[1]) || 'Billing, kitchen screen, UPI and day close for restaurants, cafés, bars and food counters.';
    const url = SITE + '/' + (file === 'index.html' ? '' : file);
    t = t.replace('</head>', [
      `<meta property="og:type" content="website">`, `<meta property="og:site_name" content="KIRO">`,
      `<meta property="og:title" content="${title}">`, `<meta property="og:description" content="${desc}">`,
      `<meta property="og:url" content="${url}">`, `<meta property="og:image" content="${SITE}/og-image.png">`,
      `<meta property="og:image:width" content="1200">`, `<meta property="og:image:height" content="630">`,
      `<meta name="twitter:card" content="summary_large_image">`, `<meta name="twitter:image" content="${SITE}/og-image.png">`,
    ].join('\n') + '\n</head>');
  }
  return t;
};

function rewriteLinks(t) {
  t = t.replace(/([A-Za-z0-9_-]+)\.dc\.html/g, (m, name) => LINK_TO[name] || PAGES[name] || m);
  for (const [from, to] of Object.entries(HOSTED)) t = t.split(from).join(to);
  // The shop was renamed from KKC to KIRO LUX. Base64 image data is skipped (no letter, digit, + or / beside it).
  return t.replace(/(?<![A-Za-z0-9+\/])KKC(?![A-Za-z0-9+\/])/g, 'KIRO LUX');
}

for (const [name, file] of Object.entries(PAGES)) {
  let t = fs.readFileSync(path.join(src, name + '.dc.html'), 'utf8');
  t = addIcon(applyLayoutFixes(name, rewriteLinks(t)), file);
  if (name === 'Main') t = removeLaunchScreen(t).replace('</head>', HERO_FIX + '\n</head>');
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
    REACT.map(([u, sri]) => `<script src="${u}" integrity="${sri}" crossorigin="anonymous" referrerpolicy="no-referrer"></script>`).join('\n') + '\n' +
    `<script src="dc-lite.js"></script>\n` +
    `<script>\n${code}\nDCLite.mount(Component);\n</script>\n`;

  const page = before +
    `<div id="dc-root" style="display:contents"></div>\n<template id="dc-tpl">${inner}</template>\n` +
    after.replace('</body>', boot + '</body>');
  fs.writeFileSync(path.join(out, file), page);
  console.log(file.padEnd(18), 'design page,', (page.length / 1024).toFixed(0), 'KB');
}
