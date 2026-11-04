'use strict';
const fs = require('fs'); const path = require('path');
const { validate } = require('./validate'); const { parseRaw } = require('./parse'); const { createClaudeExtractor } = require('./claude');
const loadJson = (f) => JSON.parse(fs.readFileSync(f, 'utf8'));
// masters / rules default to the EXAMPLE files; pass your own objects (or file paths) in production.
function createValidator({ masters, rules, extractor } = {}) {
  const m = typeof masters === 'string' ? loadJson(masters) : masters || loadJson(path.join(__dirname, '../config/masters.example.json'));
  const r = typeof rules === 'string' ? loadJson(rules) : rules || loadJson(path.join(__dirname, '../config/rules.example.json'));
  return {
    validate: (moduleName, fields, opts = {}) => validate(moduleName, fields, { masters: m, rules: r, ...opts }),
    // Raw text in -> {status:'valid', record} or {status:'needs_clarification', message, issues}. Uses Claude when an extractor is given.
    async process(moduleName, text, opts = {}) {
      let fields; try { fields = extractor ? await extractor(text) : parseRaw(text); } catch (e) { fields = parseRaw(text); }
      if (!Object.keys(fields).length) return { status: 'needs_clarification', message: "I couldn't pick out any details from that. Please give the vendor, item, quantity and unit, for example: 25 kg MS Rod 12mm from Sharma Steels.", issues: [{ field: 'text', code: 'unreadable', message: 'No fields found' }] };
      return { ...this.validate(moduleName, fields, opts), fields };
    },
  };
}
module.exports = { createValidator, createClaudeExtractor, parseRaw, validate };
