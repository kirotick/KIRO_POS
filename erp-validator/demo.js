// Try it: node demo.js "25 kg MS Rod 12mm from Sharma Steels"
const { createValidator } = require('./src');
const v = createValidator();
const text = process.argv.slice(2).join(' ') || '5 ton MS Rod 12mm from Sharma Steal';
v.process(process.env.MODULE || 'purchase_order', text).then((r) => console.log(JSON.stringify(r, null, 2)));
