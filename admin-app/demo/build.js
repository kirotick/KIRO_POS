const esbuild = require('/opt/npm-tools/node_modules/esbuild'); const path = require('path'), e2e = path.join(__dirname, '../e2e');
const r = esbuild.buildSync({ entryPoints: [path.join(__dirname, 'entry.js')], bundle: true, write: false, minify: true, format: 'iife', platform: 'browser', logLevel: 'warning', loader: { '.js': 'jsx' }, jsx: 'automatic',
  nodePaths: ['/opt/npm-tools/node_modules'], define: { 'process.env.NODE_ENV': '"production"', 'process.env.EXPO_PUBLIC_API_URL': '"https://demo.kiro.invalid"' },
  alias: { 'react-native': path.join(e2e, 'rn-mock.js'), 'expo-status-bar': path.join(e2e, 'shims.js'), 'expo-secure-store': path.join(e2e, 'shims.js') } });
require('fs').writeFileSync(path.join(__dirname, 'out.js'), r.outputFiles[0].text); console.log('demo bundle', r.outputFiles[0].text.length);
