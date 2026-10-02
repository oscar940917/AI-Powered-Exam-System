CREATE DATABASE IF NOT EXISTS ai_powered_exam_system
  CHARACTER SET utf8mb4
  COLLATE utf8mb4_unicode_ci;

USE ai_powered_exam_system;

CREATE TABLE users (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT COMMENT '使用者流水號',
  email VARCHAR(255) NOT NULL COMMENT '登入帳號（唯一）',
  password_hash VARCHAR(255) NOT NULL COMMENT '密碼雜湊值（不可存明碼）',
  role ENUM('student', 'teacher') NOT NULL COMMENT '角色',
  status ENUM('active', 'inactive') NOT NULL DEFAULT 'active' COMMENT '帳號狀態',
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY uk_users_email (email),
  CHECK (email <> '')
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='使用者資料';

CREATE TABLE questions (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT COMMENT '題目流水號',
  title VARCHAR(255) NOT NULL COMMENT '題目標題',
  content TEXT NOT NULL COMMENT '題目描述',
  chapter_name VARCHAR(120) NOT NULL COMMENT '所屬單元名稱',
  chapter_id VARCHAR(64) NOT NULL COMMENT '單元代號',
  ppt_link VARCHAR(500) NOT NULL COMMENT '教材連結',
  created_by BIGINT UNSIGNED NOT NULL COMMENT '建立者（教師）',
  status ENUM('draft', 'published', 'archived') NOT NULL DEFAULT 'draft' COMMENT '題目狀態',
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  KEY idx_questions_status (status),
  KEY idx_questions_chapter (chapter_id),
  CONSTRAINT fk_questions_created_by FOREIGN KEY (created_by)
    REFERENCES users(id)
    ON UPDATE CASCADE
    ON DELETE RESTRICT,
  CHECK (title <> ''),
  CHECK (chapter_name <> ''),
  CHECK (chapter_id <> ''),
  CHECK (ppt_link <> '')
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='題庫';

CREATE TABLE test_cases (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT COMMENT '測資流水號',
  question_id BIGINT UNSIGNED NOT NULL COMMENT '所屬題目',
  is_hidden BOOLEAN NOT NULL DEFAULT FALSE COMMENT '是否為隱藏測資',
  input_data TEXT NOT NULL COMMENT '測資輸入',
  expected_output TEXT NOT NULL COMMENT '預期輸出',
  sort_order INT NOT NULL DEFAULT 0 COMMENT '顯示與執行順序',
  is_active BOOLEAN NOT NULL DEFAULT TRUE COMMENT '是否啟用',
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  KEY idx_test_cases_question_sort (question_id, sort_order),
  KEY idx_test_cases_question_visibility (question_id, is_hidden, is_active),
  CONSTRAINT fk_test_cases_question FOREIGN KEY (question_id)
    REFERENCES questions(id)
    ON UPDATE CASCADE
    ON DELETE CASCADE,
  CHECK (sort_order >= 0)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='題目測資';

CREATE TABLE exams (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT COMMENT '考試流水號',
  title VARCHAR(255) NOT NULL COMMENT '考試名稱',
  description TEXT NULL COMMENT '考試說明',
  starts_at DATETIME NULL COMMENT '開始時間',
  ends_at DATETIME NULL COMMENT '結束時間',
  status ENUM('draft', 'published', 'closed') NOT NULL DEFAULT 'draft' COMMENT '考試狀態',
  created_by BIGINT UNSIGNED NOT NULL COMMENT '建立者（教師）',
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  KEY idx_exams_status (status),
  KEY idx_exams_schedule (starts_at, ends_at),
  CONSTRAINT fk_exams_created_by FOREIGN KEY (created_by)
    REFERENCES users(id)
    ON UPDATE CASCADE
    ON DELETE RESTRICT,
  CHECK (title <> ''),
  CHECK (starts_at IS NULL OR ends_at IS NULL OR starts_at < ends_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='考試設定';

CREATE TABLE exam_records (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT COMMENT '考試作答紀錄流水號',
  exam_id BIGINT UNSIGNED NOT NULL COMMENT '所屬考試',
  student_id BIGINT UNSIGNED NOT NULL COMMENT '學生',
  question_id BIGINT UNSIGNED NOT NULL COMMENT '題目',
  submission_id BIGINT UNSIGNED NULL COMMENT '對應提交',
  score INT UNSIGNED NULL COMMENT '紀錄分數',
  started_at DATETIME NULL COMMENT '開始作答時間',
  submitted_at DATETIME NULL COMMENT '最後提交時間',
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY uk_exam_records_unique_attempt (exam_id, student_id, question_id),
  KEY idx_exam_records_student_exam (student_id, exam_id),
  KEY idx_exam_records_question (question_id),
  CONSTRAINT fk_exam_records_exam FOREIGN KEY (exam_id)
    REFERENCES exams(id)
    ON UPDATE CASCADE
    ON DELETE CASCADE,
  CONSTRAINT fk_exam_records_student FOREIGN KEY (student_id)
    REFERENCES users(id)
    ON UPDATE CASCADE
    ON DELETE RESTRICT,
  CONSTRAINT fk_exam_records_question FOREIGN KEY (question_id)
    REFERENCES questions(id)
    ON UPDATE CASCADE
    ON DELETE RESTRICT,
  CHECK (score IS NULL OR (score >= 0 AND score <= 100))
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='考試作答紀錄';

CREATE TABLE submissions (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT COMMENT '提交流水號',
  student_id BIGINT UNSIGNED NOT NULL COMMENT '提交學生',
  question_id BIGINT UNSIGNED NOT NULL COMMENT '題目',
  exam_id BIGINT UNSIGNED NULL COMMENT '若為考試模式則關聯考試',
  mode ENUM('practice', 'exam') NOT NULL COMMENT '提交模式',
  code LONGTEXT NOT NULL COMMENT '學生程式碼',
  language VARCHAR(50) NOT NULL COMMENT '程式語言',
  total_test_cases INT UNSIGNED NOT NULL DEFAULT 0 COMMENT '測資總數',
  passed_test_cases INT UNSIGNED NOT NULL DEFAULT 0 COMMENT '通過測資數',
  pass_rate DECIMAL(5,2) NOT NULL DEFAULT 0.00 COMMENT '通過率百分比',
  test_results JSON NOT NULL COMMENT '逐筆測資結果',
  ai_grading_result JSON NULL COMMENT 'AI 評分結果（需符合 schema）',
  status ENUM('pending', 'running', 'evaluated', 'failed', 'ai_validation_failed') NOT NULL DEFAULT 'pending' COMMENT '評分狀態',
  error_message VARCHAR(1000) NULL COMMENT '錯誤訊息',
  submitted_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  KEY idx_submissions_student_question (student_id, question_id),
  KEY idx_submissions_mode_status (mode, status),
  KEY idx_submissions_submitted_at (submitted_at),
  CONSTRAINT fk_submissions_student FOREIGN KEY (student_id)
    REFERENCES users(id)
    ON UPDATE CASCADE
    ON DELETE RESTRICT,
  CONSTRAINT fk_submissions_question FOREIGN KEY (question_id)
    REFERENCES questions(id)
    ON UPDATE CASCADE
    ON DELETE RESTRICT,
  CONSTRAINT fk_submissions_exam FOREIGN KEY (exam_id)
    REFERENCES exams(id)
    ON UPDATE CASCADE
    ON DELETE SET NULL,
  CHECK (language <> ''),
  CHECK (total_test_cases >= passed_test_cases),
  CHECK (pass_rate >= 0 AND pass_rate <= 100)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='提交與評分紀錄';

ALTER TABLE exam_records
  ADD CONSTRAINT fk_exam_records_submission FOREIGN KEY (submission_id)
  REFERENCES submissions(id)
  ON UPDATE CASCADE
  ON DELETE SET NULL;
