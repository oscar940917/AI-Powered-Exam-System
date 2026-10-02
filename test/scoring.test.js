const test = require('node:test');
const assert = require('node:assert/strict');
const { summarizeTestResults } = require('../src/services/scoring');

test('summarizeTestResults should calculate total, passed and pass rate', () => {
  const summary = summarizeTestResults([
    { passed: true },
    { passed: false },
    { passed: true }
  ]);

  assert.equal(summary.total, 3);
  assert.equal(summary.passed, 2);
  assert.equal(summary.passRate, 66.67);
});

test('summarizeTestResults should handle no test case', () => {
  const summary = summarizeTestResults([]);

  assert.equal(summary.total, 0);
  assert.equal(summary.passed, 0);
  assert.equal(summary.passRate, 0);
});
