function summarizeTestResults(testCaseResults) {
  const total = testCaseResults.length;
  const passed = testCaseResults.filter((item) => item.passed).length;
  const passRate = total === 0 ? 0 : Number(((passed / total) * 100).toFixed(2));

  return {
    total,
    passed,
    passRate,
    details: `共 ${total} 筆測資，通過 ${passed} 筆，通過率 ${passRate.toFixed(2)}%。`
  };
}

module.exports = {
  summarizeTestResults
};
