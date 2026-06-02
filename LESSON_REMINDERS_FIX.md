# Исправление проблемы сохранения напоминалок уроков

## 🐛 Проблема

При попытке сохранить структуру урока (напоминалки), время урока и дату уведомления - данные не сохранялись в базу данных.

## 🔍 Причина

В схеме Prisma (`schema.prisma`) **отсутствовали поля** для хранения этих данных:
- `lessonPlan` - структура урока с напоминалками
- `time` - время урока (формат HH:MM)
- `notificationDate` - дата уведомления (формат DD.MM)

Хотя frontend отправлял эти данные, а backend пытался их сохранить через raw SQL, **Prisma Client не знал о существовании этих полей**.

## ✅ Решение

### 1. Обновлена схема Prisma

Добавлены три новых поля в модель `Lesson`:

```prisma
model Lesson {
  id               String  @id @default(uuid())
  date             String
  topic            String
  homework         String?
  comment          String?
  lessonPlan       String? @map("lesson_plan") // ✨ НОВОЕ
  time             String? // ✨ НОВОЕ
  notificationDate String? @map("notification_date") // ✨ НОВОЕ
  teacherId        String
  groupId          String?
  // ... остальные поля
}
```

### 2. Применена миграция базы данных

Выполнена SQL миграция для добавления колонок:

```sql
ALTER TABLE lessons ADD COLUMN IF NOT EXISTS lesson_plan TEXT;
ALTER TABLE lessons ADD COLUMN IF NOT EXISTS time VARCHAR(255);
ALTER TABLE lessons ADD COLUMN IF NOT EXISTS notification_date VARCHAR(255);
```

### 3. Перегенерирован Prisma Client

```bash
npx prisma generate
```

### 4. Обновлен backend код

**До (raw SQL - проблемный подход):**
```typescript
await prisma.$executeRaw`
  INSERT INTO lessons (id, date, topic, homework, comment, lesson_plan, time, notification_date, ...)
  VALUES (${lessonId}, ${date}, ${topic}, ${homework || ''}, ${comment || ''}, ${lessonPlan || null}, ...)
`;
```

**После (типобезопасный Prisma):**
```typescript
const lesson = await prisma.lesson.create({
  data: {
    date,
    topic,
    homework: homework || null,
    comment: comment || null,
    lessonPlan: lessonPlan || null,  // ✅ Теперь работает
    time: time || null,              // ✅ Теперь работает
    notificationDate: notificationDate || null, // ✅ Теперь работает
    teacherId: user.userId,
    groupId: finalGroupId
  },
  include: { group: true }
});
```

## 📝 Что изменилось

### Файлы, которые были изменены:

1. **`backend/schema.prisma`** - добавлены поля `lessonPlan`, `time`, `notificationDate`
2. **`backend/api/lessons.ts`** - обновлены методы `POST` и `PUT` для использования Prisma ORM вместо raw SQL
3. **`backend/scripts/apply-lesson-migration.ts`** - скрипт для применения миграции (новый файл)
4. **База данных** - добавлены 3 колонки в таблицу `lessons`

### Frontend не требует изменений

Frontend уже правильно отправлял данные - проблема была только на стороне backend/database.

## 🚀 Как проверить, что все работает

### 1. Проверить наличие колонок в базе:

```bash
npx ts-node scripts/test-lesson-fields.ts
```

Должно показать:
```
✅ Prisma Client successfully recognizes new fields:
  - lessonPlan: string | null
  - time: string | null
  - notificationDate: string | null
```

### 2. Создать урок с напоминалками через интерфейс:

1. Откройте приложение
2. Перейдите в "Расписание и ДЗ"
3. Нажмите "+ Добавить урок"
4. Заполните поля:
   - **Время урока**: например, 14:30
   - **Дата уведомления**: например, 15.01
   - **Структура урока (напоминалки)**: напишите план урока
5. Нажмите "Добавить"
6. Откройте урок на редактирование - все данные должны сохраниться

### 3. Проверить через API:

```bash
# GET запрос для получения уроков
curl -H "Authorization: Bearer YOUR_TOKEN" \
  https://your-app.vercel.app/api/lessons
```

В ответе должны быть поля:
```json
{
  "id": "...",
  "date": "15.01",
  "topic": "Present Simple",
  "lessonPlan": "проверь дз и ссылка, открой этот ресурс...",
  "time": "14:30",
  "notificationDate": "15.01",
  ...
}
```

## 🎯 Результат

Теперь функция **"Структура урока с напоминаниями"** полностью работает:

✅ Данные сохраняются в базу данных
✅ Данные отображаются при редактировании урока
✅ Backend использует типобезопасный Prisma ORM
✅ Напоминания (через `LessonNotifications` компонент) могут читать сохраненные данные

## 📊 Технические детали

- **База данных**: PostgreSQL (Supabase)
- **ORM**: Prisma v6.18.0
- **Тип полей**: `TEXT` (lesson_plan) и `VARCHAR(255)` (time, notification_date)
- **Nullable**: Все три поля опциональные (`String?` в Prisma)

## 🔧 Если возникнут проблемы

### Проблема: "Column does not exist"

**Решение**: Запустите миграцию заново:
```bash
npx ts-node scripts/apply-lesson-migration.ts
```

### Проблема: Prisma не видит новые поля

**Решение**: Перегенерируйте Prisma Client:
```bash
npx prisma generate
```

### Проблема: Данные не сохраняются на продакшене (Vercel)

**Решение**:
1. Убедитесь, что миграция применена к production базе
2. Пересоберите и передеплойте:
```bash
cd backend && npm run build
# Или через Vercel CLI
vercel --prod
```

## ✨ Дополнительные улучшения (опционально)

Если захотите добавить валидацию:

```typescript
// В backend/api/lessons.ts
if (time && !/^\d{2}:\d{2}$/.test(time)) {
  return res.status(400).json({ error: 'Invalid time format. Use HH:MM' });
}

if (notificationDate && !/^\d{2}\.\d{2}$/.test(notificationDate)) {
  return res.status(400).json({ error: 'Invalid date format. Use DD.MM' });
}
```

---

**Дата исправления**: 11 января 2025
**Статус**: ✅ Исправлено и протестировано
