// Bundles the real app with the DOM stand-ins (esbuild) -> e2e/out/app.js
const esbuild = require('/opt/npm-tools/node_modules/esbuild');
const path = require('path'), here = __dirname;
esbuild.buildSync({
  entryPoints: [path.join(here, 'entry.js')], bundle: true, outfile: path.join(here, 'out/app.js'), format: 'iife', platform: 'browser', logLevel: 'warning',
  loader: { '.js': 'jsx' }, jsx: 'automatic', nodePaths: ['/opt/npm-tools/node_modules'], define: { 'process.env.NODE_ENV': '"development"', 'process.env.EXPO_PUBLIC_API_URL': JSON.stringify(process.env.E2E_API || 'http://127.0.0.1:4777') },
  alias: { 'react-native': path.join(here, 'rn-mock.js'), 'expo-status-bar': path.join(here, 'shims.js'), 'expo-secure-store': path.join(here, 'shims.js') },
});
console.log('bundled');
