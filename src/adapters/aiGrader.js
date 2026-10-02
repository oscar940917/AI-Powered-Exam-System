const { HttpError } = require('../lib/errors');
const { assertAiResult, schema } = require('../lib/aiSchema');

class MockAiGrader {
  async grade(payload) {
    return assertAiResult({
      score: payload.passRate,
      test_cases_summary: {
        total: payload.total,
        passed: payload.passed,
        details: payload.summaryDetails
      },
      code_quality: {
        completeness: '範例模式：未分析完整程式邏輯。',
        feasibility: '範例模式：未實際呼叫 LLM。',
        pros: ['已完成基本提交流程'],
        cons: ['請在正式環境改接真實 LLM']
      },
      feedback: '本回覆由 mock AI 產生，正式環境請設定 OpenAI API。',
      recommended_chapter: {
        chapter_id: payload.chapterId,
        chapter_name: payload.chapterName,
        ppt_link: payload.pptLink
      }
    });
  }
}

class OpenAiGrader {
  constructor({ openAiApiKey, openAiModel }) {
    this.openAiApiKey = openAiApiKey;
    this.openAiModel = openAiModel;
  }

  async grade(payload) {
    if (!this.openAiApiKey) {
      throw new HttpError(500, '未設定 OPENAI_API_KEY，無法呼叫 OpenAI');
    }

    const userPrompt = [
      `題目：${payload.questionTitle}`,
      `題目內容：${payload.questionContent}`,
      `教材單元：${payload.chapterName} (${payload.chapterId})`,
      `語言：${payload.language}`,
      `學生程式碼：\n${payload.code}`,
      `測資摘要：${payload.summaryDetails}`,
      `測資明細：${JSON.stringify(payload.results, null, 2)}`
    ].join('\n\n');

    const authHeaderValue = ['Bearer', this.openAiApiKey].join(' ');

    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: authHeaderValue
      },
      body: JSON.stringify({
        model: this.openAiModel,
        temperature: 0,
        messages: [
          {
            role: 'system',
            content: '你是程式作答評分助教，必須只輸出符合 JSON Schema 的物件，不可輸出其他文字。'
          },
          { role: 'user', content: userPrompt }
        ],
        response_format: {
          type: 'json_schema',
          json_schema: {
            name: 'ai_grading_result',
            strict: true,
            schema
          }
        }
      })
    });

    if (!response.ok) {
      throw new HttpError(502, `OpenAI API 錯誤 (${response.status})`);
    }

    const completion = await response.json();
    const rawContent = completion.choices?.[0]?.message?.content;

    if (!rawContent) {
      throw new HttpError(502, 'OpenAI 回應缺少內容');
    }

    let parsed;
    try {
      parsed = JSON.parse(rawContent);
    } catch (error) {
      throw new HttpError(502, 'OpenAI 回應不是合法 JSON');
    }

    return assertAiResult(parsed);
  }
}

function createAiGrader(config) {
  if (config.aiProvider === 'openai') {
    return new OpenAiGrader(config);
  }
  return new MockAiGrader();
}

module.exports = {
  createAiGrader
};
