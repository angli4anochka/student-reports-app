-- ========================================
-- MIGRATION: Add Telegram Homework System
-- ========================================

-- 1. Добавляем Telegram поля к студентам
ALTER TABLE "students"
ADD COLUMN IF NOT EXISTS "telegramChatId" VARCHAR(255),
ADD COLUMN IF NOT EXISTS "parentTelegramId" VARCHAR(255),
ADD COLUMN IF NOT EXISTS "telegramUsername" VARCHAR(255),
ADD COLUMN IF NOT EXISTS "parentTelegramUsername" VARCHAR(255),
ADD COLUMN IF NOT EXISTS "preferredContact" VARCHAR(50) DEFAULT 'both' CHECK ("preferredContact" IN ('student', 'parent', 'both')),
ADD COLUMN IF NOT EXISTS "telegramNotifications" BOOLEAN DEFAULT TRUE;

-- 2. Добавляем Telegram поля к преподавателям
ALTER TABLE "users"
ADD COLUMN IF NOT EXISTS "telegramChatId" VARCHAR(255),
ADD COLUMN IF NOT EXISTS "telegramUsername" VARCHAR(255),
ADD COLUMN IF NOT EXISTS "telegramNotifications" BOOLEAN DEFAULT TRUE;

-- 3. Таблица для логов отправки домашних заданий
CREATE TABLE IF NOT EXISTS "homework_logs" (
    "id" UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    "studentId" UUID REFERENCES "students"("id") ON DELETE CASCADE,
    "teacherId" UUID REFERENCES "users"("id") ON DELETE SET NULL,
    "homework" TEXT NOT NULL,
    "subject" VARCHAR(255),
    "lessonDate" TIMESTAMP NOT NULL,
    "dueDate" TIMESTAMP,
    "materials" TEXT[],
    "notes" TEXT,
    "sentAt" TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    "sentTo" TEXT[], -- Массив Telegram chat IDs
    "success" BOOLEAN DEFAULT FALSE,
    "errorMessage" TEXT,
    "metadata" JSONB DEFAULT '{}',

    CONSTRAINT "homework_logs_studentId_fkey" FOREIGN KEY ("studentId") REFERENCES "students"("id") ON DELETE CASCADE
);

-- 4. Таблица для отметок о выполнении ДЗ
CREATE TABLE IF NOT EXISTS "homework_completions" (
    "id" UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    "studentId" UUID REFERENCES "students"("id") ON DELETE CASCADE,
    "homeworkLogId" UUID REFERENCES "homework_logs"("id") ON DELETE CASCADE,
    "completedAt" TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    "telegramUserId" VARCHAR(255),
    "homeworkTimestamp" TIMESTAMP,
    "notes" TEXT,
    "attachments" TEXT[],
    "verified" BOOLEAN DEFAULT FALSE,
    "verifiedBy" UUID REFERENCES "users"("id") ON DELETE SET NULL,
    "verifiedAt" TIMESTAMP,

    CONSTRAINT "unique_homework_completion" UNIQUE ("studentId", "homeworkLogId")
);

-- 5. Таблица для регистрации Telegram аккаунтов
CREATE TABLE IF NOT EXISTS "telegram_registrations" (
    "id" UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    "studentId" UUID REFERENCES "students"("id") ON DELETE CASCADE,
    "registrationCode" VARCHAR(10) UNIQUE NOT NULL,
    "telegramChatId" VARCHAR(255),
    "telegramUsername" VARCHAR(255),
    "registeredAt" TIMESTAMP,
    "expiresAt" TIMESTAMP NOT NULL,
    "used" BOOLEAN DEFAULT FALSE,
    "createdAt" TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 6. Таблица для состояний диалога в боте
CREATE TABLE IF NOT EXISTS "telegram_states" (
    "chatId" VARCHAR(255) PRIMARY KEY,
    "state" VARCHAR(50),
    "studentId" UUID REFERENCES "students"("id") ON DELETE CASCADE,
    "data" JSONB DEFAULT '{}',
    "createdAt" TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 7. Таблица для шаблонов домашних заданий
CREATE TABLE IF NOT EXISTS "homework_templates" (
    "id" UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    "teacherId" UUID REFERENCES "users"("id") ON DELETE CASCADE,
    "name" VARCHAR(255) NOT NULL,
    "subject" VARCHAR(255),
    "content" TEXT NOT NULL,
    "materials" TEXT[],
    "tags" VARCHAR(50)[],
    "isActive" BOOLEAN DEFAULT TRUE,
    "usageCount" INTEGER DEFAULT 0,
    "createdAt" TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 8. Таблица для вопросов по ДЗ
CREATE TABLE IF NOT EXISTS "homework_questions" (
    "id" UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    "studentId" UUID REFERENCES "students"("id") ON DELETE CASCADE,
    "homeworkLogId" UUID REFERENCES "homework_logs"("id") ON DELETE CASCADE,
    "question" TEXT NOT NULL,
    "telegramUserId" VARCHAR(255),
    "askedAt" TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    "answer" TEXT,
    "answeredBy" UUID REFERENCES "users"("id") ON DELETE SET NULL,
    "answeredAt" TIMESTAMP,
    "status" VARCHAR(20) DEFAULT 'pending' CHECK ("status" IN ('pending', 'answered', 'closed'))
);

-- 9. Индексы для производительности
CREATE INDEX IF NOT EXISTS "idx_students_telegram" ON "students"("telegramChatId", "parentTelegramId");
CREATE INDEX IF NOT EXISTS "idx_homework_logs_student" ON "homework_logs"("studentId", "sentAt");
CREATE INDEX IF NOT EXISTS "idx_homework_logs_teacher" ON "homework_logs"("teacherId", "sentAt");
CREATE INDEX IF NOT EXISTS "idx_homework_completions_student" ON "homework_completions"("studentId", "completedAt");
CREATE INDEX IF NOT EXISTS "idx_telegram_registrations_code" ON "telegram_registrations"("registrationCode");
CREATE INDEX IF NOT EXISTS "idx_telegram_states_student" ON "telegram_states"("studentId");
CREATE INDEX IF NOT EXISTS "idx_homework_templates_teacher" ON "homework_templates"("teacherId", "isActive");

-- 10. Триггер для обновления updatedAt
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW."updatedAt" = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS update_telegram_states_updated_at ON "telegram_states";
CREATE TRIGGER update_telegram_states_updated_at
BEFORE UPDATE ON "telegram_states"
FOR EACH ROW
EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_homework_templates_updated_at ON "homework_templates";
CREATE TRIGGER update_homework_templates_updated_at
BEFORE UPDATE ON "homework_templates"
FOR EACH ROW
EXECUTE FUNCTION update_updated_at_column();

-- 11. Пример данных для тестирования (закомментировано)
/*
-- Добавляем тестовый Telegram ID к студенту
UPDATE students
SET "telegramChatId" = '123456789',
    "telegramUsername" = '@test_student',
    "preferredContact" = 'both'
WHERE email = 'test@example.com';

-- Создаем тестовый шаблон ДЗ
INSERT INTO homework_templates (
    "teacherId",
    "name",
    "subject",
    "content",
    "materials",
    "tags"
) VALUES (
    (SELECT id FROM users WHERE role = 'TEACHER' LIMIT 1),
    'Базовая грамматика Present Simple',
    'English',
    '1. Выучить правила Present Simple (стр. 45-47)
2. Выполнить упражнения 3.1 - 3.5
3. Написать 10 предложений о своем распорядке дня',
    ARRAY['https://example.com/grammar.pdf', 'Учебник стр. 45-47'],
    ARRAY['grammar', 'present_simple', 'beginner']
);
*/

-- 12. Статистика для мониторинга
CREATE OR REPLACE VIEW homework_statistics AS
SELECT
    DATE(sentAt) as date,
    COUNT(*) as total_sent,
    COUNT(*) FILTER (WHERE success = TRUE) as successful,
    COUNT(*) FILTER (WHERE success = FALSE) as failed,
    COUNT(DISTINCT studentId) as unique_students,
    COUNT(DISTINCT teacherId) as unique_teachers
FROM homework_logs
GROUP BY DATE(sentAt)
ORDER BY date DESC;

-- 13. View для активных домашних заданий
CREATE OR REPLACE VIEW active_homework AS
SELECT
    hl.*,
    s."fullName" as student_name,
    s."telegramChatId" as student_telegram,
    u.email as teacher_email,
    hc.id IS NOT NULL as is_completed,
    hc."completedAt"
FROM homework_logs hl
JOIN students s ON hl."studentId" = s.id
LEFT JOIN users u ON hl."teacherId" = u.id
LEFT JOIN homework_completions hc ON hl.id = hc."homeworkLogId"
WHERE hl."dueDate" IS NULL OR hl."dueDate" > CURRENT_TIMESTAMP
ORDER BY hl."sentAt" DESC;