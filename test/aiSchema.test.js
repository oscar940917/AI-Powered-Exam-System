const test = require('node:test');
const assert = require('node:assert/strict');
const { assertAiResult } = require('../src/lib/aiSchema');

test('assertAiResult should accept valid schema data', () => {
  const result = assertAiResult({
    score: 80,
    test_cases_summary: {
      total: 10,
      passed: 8,
      details: '通過率良好'
    },
    code_quality: {
      completeness: '完整',
      feasibility: '可行',
      pros: ['結構清楚'],
      cons: ['未處理少數 edge cases']
    },
    feedback: '請加強邊界處理',
    recommended_chapter: {
      chapter_id: 'ch_01',
      chapter_name: '基本語法',
      ppt_link: 'uploads/ppt/ch1.pptx'
    }
  });

  assert.equal(result.score, 80);
});

test('assertAiResult should reject invalid schema data', () => {
  assert.throws(
    () => {
      assertAiResult({
        score: 80,
        feedback: 'invalid'
      });
    },
    /AI 評分格式驗證失敗/
  );
});
