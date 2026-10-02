const express = require('express');
const { createSubmissionsRouter } = require('./routes/submissions');
const { HttpError } = require('./lib/errors');

function createApp({ pool, codeRunner, aiGrader }) {
  const app = express();
  app.use(express.json({ limit: '1mb' }));

  app.get('/health', (_req, res) => {
    res.json({ success: true });
  });

  app.use(createSubmissionsRouter({ pool, codeRunner, aiGrader }));

  app.use((_req, _res, next) => {
    next(new HttpError(404, '找不到 API 路由'));
  });

  app.use((error, _req, res, _next) => {
    const statusCode = error.statusCode || 500;
    const message = statusCode >= 500 ? '伺服器發生錯誤' : error.message;

    if (statusCode >= 500) {
      console.error('[server-error]', error.message);
    }

    res.status(statusCode).json({
      success: false,
      error: {
        message
      }
    });
  });

  return app;
}

module.exports = {
  createApp
};
