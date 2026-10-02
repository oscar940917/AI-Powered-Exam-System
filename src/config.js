const path = require('path');
const dotenv = require('dotenv');

dotenv.config();

module.exports = {
  port: Number(process.env.PORT || 3000),
  databaseUrl: process.env.DATABASE_URL,
  codeRunnerAdapter: process.env.CODE_RUNNER_ADAPTER || 'mock',
  judgeServiceUrl: process.env.JUDGE_SERVICE_URL,
  judgeServiceApiKey: process.env.JUDGE_SERVICE_API_KEY,
  aiProvider: process.env.AI_PROVIDER || 'mock',
  openAiApiKey: process.env.OPENAI_API_KEY,
  openAiModel: process.env.OPENAI_MODEL || 'gpt-4.1-mini',
  aiSchemaPath: path.resolve(__dirname, '../schemas/ai_grading_result.schema.json')
};
