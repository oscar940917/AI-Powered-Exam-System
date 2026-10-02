const { HttpError } = require('../lib/errors');

class MockSafeRunner {
  async run({ code, language, inputData, expectedOutput }) {
    const shouldPass = code.includes('PASS_ALL');
    const actualOutput = shouldPass ? expectedOutput : '';
    return {
      language,
      input: inputData,
      expectedOutput,
      actualOutput,
      passed: actualOutput.trim() === expectedOutput.trim(),
      runtimeMs: 1,
      memoryKb: 128,
      errorMessage: shouldPass ? null : 'mock runner 未執行不可信程式碼；請使用隔離 Judge 服務。'
    };
  }
}

class JudgeServiceRunner {
  constructor({ judgeServiceUrl, judgeServiceApiKey }) {
    this.judgeServiceUrl = judgeServiceUrl;
    this.judgeServiceApiKey = judgeServiceApiKey;
  }

  async run({ code, language, inputData, expectedOutput }) {
    if (!this.judgeServiceUrl) {
      throw new HttpError(500, '未設定 JUDGE_SERVICE_URL，無法呼叫隔離 Judge 服務');
    }

    const response = await fetch(`${this.judgeServiceUrl}/execute`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...(this.judgeServiceApiKey ? { 'X-API-Key': this.judgeServiceApiKey } : {})
      },
      body: JSON.stringify({ code, language, input: inputData, expectedOutput })
    });

    if (!response.ok) {
      throw new HttpError(502, `Judge 服務錯誤 (${response.status})`);
    }

    return response.json();
  }
}

function createCodeRunner(config) {
  if (config.codeRunnerAdapter === 'judge') {
    return new JudgeServiceRunner(config);
  }
  return new MockSafeRunner();
}

module.exports = {
  createCodeRunner
};
