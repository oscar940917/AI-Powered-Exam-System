const config = require('./config');
const { pool } = require('./lib/db');
const { createCodeRunner } = require('./adapters/codeRunner');
const { createAiGrader } = require('./adapters/aiGrader');
const { createApp } = require('./app');

const app = createApp({
  pool,
  codeRunner: createCodeRunner(config),
  aiGrader: createAiGrader(config)
});

app.listen(config.port, () => {
  console.log(`Server listening on http://localhost:${config.port}`);
});
