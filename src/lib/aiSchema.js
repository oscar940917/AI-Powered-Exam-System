const fs = require('fs');
const Ajv2020 = require('ajv/dist/2020');
const config = require('../config');

const schema = JSON.parse(fs.readFileSync(config.aiSchemaPath, 'utf8'));
const ajv = new Ajv2020({ allErrors: true, strict: false });
const validateAiResult = ajv.compile(schema);

function assertAiResult(data) {
  const isValid = validateAiResult(data);
  if (!isValid) {
    const message = ajv.errorsText(validateAiResult.errors, { separator: '; ' });
    const error = new Error(`AI 評分格式驗證失敗: ${message}`);
    error.validationErrors = validateAiResult.errors;
    throw error;
  }
  return data;
}

module.exports = {
  schema,
  assertAiResult
};
