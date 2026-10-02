# AI-Powered-Exam-System

## 專題名稱
AI 智慧化程式線上評量與練習系統（含多維度測資與 AI 語意評分）

## 專案目標
本專案提供一套線上程式練習與考試平台，整合「測資驗證」與「AI 語意評分」，避免只以 AC/WA 判斷學習成效，並在作答後提供可行的補強教材建議。

## 功能需求整理

### 學生端
- 帳號登入與身分驗證
- 練習模式：可即時執行公開測資、查看結果、取得 AI 回饋
- 考試模式：限時作答、提交後執行公開/隱藏測資並紀錄成績
- 線上程式編輯與提交
- 題後智慧推薦教材（PPT/章節）

### 教師端
- 教師帳號登入與身分驗證
- 題庫管理：建立/編輯/刪除題目
- 測資管理：可分別設定公開測資與隱藏測資（輸入與預期輸出）
- 題目單元標籤與教材關聯（PPT/章節）
- 成績儀表板：檢視學生測資通過率、AI 評分細節與常見錯誤型態

## 評分設計
最終成績由兩部分組成：
1. **測資通過率**：公開 + 隱藏測資執行結果
2. **AI 深度評分**：完整性、可行性、邏輯架構、可讀性與邊界條件

## AI 回傳 JSON 規格
為確保前後端可穩定解析，LLM 回應需符合以下 JSON Schema：
- Schema：`schemas/ai_grading_result.schema.json`
- 範例：`examples/ai_grading_result.example.json`

### 欄位重點
- `score`：0~100 整數
- `test_cases_summary`：測資總數、通過數與摘要
- `code_quality`：完整性、可行性、優缺點
- `feedback`：整體質化建議
- `recommended_chapter`：推薦單元與教材連結

## 後續實作建議
- 後端在呼叫 LLM 後，務必使用 `schemas/ai_grading_result.schema.json` 做結構驗證
- 若驗證失敗，需觸發重試或格式修復流程，避免不合法 JSON 直接進入資料庫
- 前端可直接使用 `recommended_chapter.ppt_link` 提供教材跳轉入口

---

## 後端核心範例（Node.js + Express）

> 本 repo 目前提供可執行的最小後端範例，示範「提交程式碼 → 測資評估 → AI 評分格式驗證 → 寫入資料庫」流程。

### 目錄
- MySQL Schema：`database/schema.sql`
- 伺服器入口：`src/server.js`
- 提交 API：`src/routes/submissions.js`
- 測資統計：`src/services/scoring.js`
- 程式執行 adapter：`src/adapters/codeRunner.js`
- AI 評分 adapter：`src/adapters/aiGrader.js`
- AI JSON Schema 驗證：`src/lib/aiSchema.js`
- 測試：`test/*.test.js`

## MySQL 初始化

1. 建立資料庫與資料表：
```bash
mysql -u <user> -p < /absolute/path/to/database/schema.sql
```

2. 確認 `DATABASE_URL` 指向同一個資料庫。

## 環境變數設定

請先複製範例：
```bash
cp .env.example .env
```

主要變數：
- `PORT`：API 服務埠號
- `DATABASE_URL`：MySQL 連線字串
- `CODE_RUNNER_ADAPTER`：`mock` 或 `judge`
- `JUDGE_SERVICE_URL`：隔離 Judge 服務 URL（`judge` 模式需要）
- `JUDGE_SERVICE_API_KEY`：Judge 服務 API Key（可選）
- `AI_PROVIDER`：`mock` 或 `openai`
- `OPENAI_API_KEY`：OpenAI 金鑰（`openai` 模式需要）
- `OPENAI_MODEL`：OpenAI 模型名稱

## 安裝與啟動

```bash
npm install
npm start
```

健康檢查：
```bash
GET /health
```

## API：提交作答

### Request
`POST /api/questions/:questionId/submissions`

```json
{
  "userId": 1,
  "mode": "practice",
  "language": "javascript",
  "code": "// PASS_ALL\nfunction solve() {}"
}
```

### Response（成功）

```json
{
  "success": true,
  "data": {
    "submissionId": 101,
    "questionId": 12,
    "studentId": 1,
    "mode": "practice",
    "language": "javascript",
    "totalTestCases": 10,
    "passedTestCases": 10,
    "passRate": 100,
    "testResults": [],
    "aiGradingResult": {},
    "status": "evaluated",
    "errorMessage": null
  }
}
```

### Response（AI 格式驗證失敗）

```json
{
  "success": true,
  "data": {
    "status": "ai_validation_failed",
    "errorMessage": "AI 評分失敗，請稍後再試"
  }
}
```

## 安全限制與 production 注意事項

- **禁止在 API 服務內直接執行不可信學生程式碼**。本範例預設 `mock` runner，不執行真實程式。
- 正式環境必須改接隔離執行層（如 Docker sandbox、獨立 Judge service、VM runner）。
- OpenAI 回應使用 JSON Schema structured output（`response_format.json_schema`）限制格式，並在 server 端再用 Ajv 驗證；驗證失敗不會視為成功評分。
- 伺服器錯誤回應不包含 API key；程式僅記錄必要錯誤訊息。

## 測試

本範例包含基本測試（不呼叫外部 LLM）：

```bash
npm test
```

覆蓋重點：
- 測資通過率計算
- AI JSON Schema 驗證（合法/不合法案例）
