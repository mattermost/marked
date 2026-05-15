#!/usr/bin/env node

/**
 * Regression test for catastrophic backtracking (ReDoS) in the inline
 * link/reflink "_inside" grammar.
 *
 * Before the fix, a single ~4 KB message of balanced nested brackets
 * ("[[[[ ... x ... ]]]]") blocked the parser for ~2.6s, scaling
 * super-linearly (8 KB -> ~20s). marked runs synchronously on the
 * render thread in consumers such as the Mattermost web/desktop client,
 * so one such chat message froze every viewer's UI.
 *
 * This asserts the same payloads now render well under a strict time
 * budget. Run with: `node test/redos.js`
 */

var assert = require('assert');
var marked = require('../');

// Options used by the Mattermost webapp consumer.
var options = { sanitize: true, gfm: true, tables: true, mangle: false };

var BUDGET_MS = 250;

var cases = [
  ['balanced nested brackets (4 KB)',
    '['.repeat(2000) + 'x' + ']'.repeat(2000) + '(u)'],
  ['balanced nested brackets (8 KB)',
    '['.repeat(4000) + 'x' + ']'.repeat(4000) + '(u)'],
  ['reflink form',
    '['.repeat(3000) + 'x' + ']'.repeat(3000) + '][1]'],
  ['"a][" alternation',
    '[' + 'a]['.repeat(3000) + '](u)'],
  ['repeated nested pairs',
    '[a[b]'.repeat(2000) + '](u)']
];

var failed = 0;
cases.forEach(function(c) {
  var start = Date.now();
  marked(c[1], options);
  var elapsed = Date.now() - start;
  var ok = elapsed < BUDGET_MS;
  console.log((ok ? 'ok   ' : 'FAIL ') + c[0] + ' (' + c[1].length +
    ' chars) -> ' + elapsed + ' ms');
  if (!ok) failed++;
});

assert.strictEqual(failed, 0,
  failed + ' ReDoS case(s) exceeded the ' + BUDGET_MS + 'ms budget');
console.log('\nAll ReDoS regression cases rendered within ' + BUDGET_MS + 'ms.');
