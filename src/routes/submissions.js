const express = require('express');
const rateLimit = require('express-rate-limit');
const { HttpError } = require('../lib/errors');
const { summarizeTestResults } = require('../services/scoring');

function toBoolean(value) {
  return value === true || value === 1;
}

function validateRequestBody(body) {
  const { userId, mode, code, language } = body;
  if (!Number.isInteger(userId) || userId <= 0) {
    throw new HttpError(400, 'userId 必須為正整數');
  }
  if (!['practice', 'exam'].includes(mode)) {
    throw new HttpError(400, 'mode 必須為 practice 或 exam');
  }
  if (typeof code !== 'string' || !code.trim()) {
    throw new HttpError(400, 'code 為必填字串');
  }
  if (typeof language !== 'string' || !language.trim()) {
    throw new HttpError(400, 'language 為必填字串');
  }
}

function createSubmissionsRouter({ pool, codeRunner, aiGrader }) {
  const router = express.Router();
  const submissionRateLimiter = rateLimit({
    windowMs: 60 * 1000,
    max: 30,
    standardHeaders: true,
    legacyHeaders: false,
    message: {
      success: false,
      error: {
        message: '請稍後再試，提交過於頻繁'
      }
    }
  });

  router.post('/api/questions/:questionId/submissions', submissionRateLimiter, async (req, res, next) => {
    try {
      validateRequestBody(req.body);

      const questionId = Number(req.params.questionId);
      if (!Number.isInteger(questionId) || questionId <= 0) {
        throw new HttpError(400, 'questionId 必須為正整數');
      }

      const { userId, mode, code, language } = req.body;

      const conn = await pool.getConnection();
      try {
        await conn.beginTransaction();

        const [userRows] = await conn.query(
          'SELECT id, role, status FROM users WHERE id = ? FOR UPDATE',
          [userId]
        );
        const user = userRows[0];
        if (!user || user.role !== 'student' || user.status !== 'active') {
          throw new HttpError(400, '無效學生帳號或帳號未啟用');
        }

        const [questionRows] = await conn.query(
          `SELECT id, title, content, chapter_id, chapter_name, ppt_link, status
           FROM questions
           WHERE id = ? FOR UPDATE`,
          [questionId]
        );
        const question = questionRows[0];
        if (!question || question.status !== 'published') {
          throw new HttpError(404, '題目不存在或尚未發佈');
        }

        const [testCaseRows] = await conn.query(
          `SELECT id, is_hidden, input_data, expected_output, sort_order
           FROM test_cases
           WHERE question_id = ? AND is_active = 1
           ORDER BY sort_order ASC, id ASC`,
          [questionId]
        );

        if (testCaseRows.length === 0) {
          throw new HttpError(400, '此題尚未設定可用測資');
        }

        const results = [];
        for (const testCase of testCaseRows) {
          const execution = await codeRunner.run({
            code,
            language,
            inputData: testCase.input_data,
            expectedOutput: testCase.expected_output
          });

          results.push({
            testCaseId: testCase.id,
            isHidden: toBoolean(testCase.is_hidden),
            inputData: testCase.input_data,
            expectedOutput: testCase.expected_output,
            actualOutput: execution.actualOutput ?? null,
            passed: Boolean(execution.passed),
            runtimeMs: execution.runtimeMs ?? null,
            memoryKb: execution.memoryKb ?? null,
            errorMessage: execution.errorMessage ?? null
          });
        }

        const summary = summarizeTestResults(results);

        let aiResult = null;
        let status = 'evaluated';
        let errorMessage = null;

        try {
          aiResult = await aiGrader.grade({
            questionTitle: question.title,
            questionContent: question.content,
            chapterId: question.chapter_id,
            chapterName: question.chapter_name,
            pptLink: question.ppt_link,
            code,
            language,
            results,
            total: summary.total,
            passed: summary.passed,
            passRate: Math.round(summary.passRate),
            summaryDetails: summary.details
          });
        } catch (error) {
          status = 'ai_validation_failed';
          errorMessage = 'AI 評分失敗，請稍後再試';
        }

        const [submissionResult] = await conn.query(
          `INSERT INTO submissions (
             student_id,
             question_id,
             mode,
             code,
             language,
             total_test_cases,
             passed_test_cases,
             pass_rate,
             test_results,
             ai_grading_result,
             status,
             error_message
           ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
          [
            userId,
            questionId,
            mode,
            code,
            language,
            summary.total,
            summary.passed,
            summary.passRate,
            JSON.stringify(results),
            aiResult ? JSON.stringify(aiResult) : null,
            status,
            errorMessage
          ]
        );

        await conn.commit();

        res.status(201).json({
          success: true,
          data: {
            submissionId: submissionResult.insertId,
            questionId,
            studentId: userId,
            mode,
            language,
            totalTestCases: summary.total,
            passedTestCases: summary.passed,
            passRate: summary.passRate,
            testResults: results,
            aiGradingResult: aiResult,
            status,
            errorMessage
          }
        });
      } catch (error) {
        await conn.rollback();
        throw error;
      } finally {
        conn.release();
      }
    } catch (error) {
      next(error);
    }
  });

  return router;
}

module.exports = {
  createSubmissionsRouter
};
