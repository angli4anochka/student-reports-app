# 🏆 Функция "Очки и Бейджи" (Glasses)

## Описание

Добавлена новая функция для вкладки "Очки", которая позволяет:
- ✅ Создавать группы и учеников вручную (отдельно от основной системы)
- ✅ Начислять баллы ученикам
- ✅ Автоматически открывать бейджи при достижении определённого количества баллов
- ✅ Просматривать рейтинг топ-3 учеников
- ✅ Видеть лидера сезона
- ✅ Все данные сохраняются в базу данных

## Система бейджей

Бейджи открываются автоматически при достижении следующего количества баллов:

| Баллы | Бейдж | Описание |
|-------|-------|----------|
| 50+   | 🐱    | Первый бейдж |
| 100+  | 🧠    | Второй бейдж |
| 150+  | 📚    | Третий бейдж |
| 200+  | ⭐    | Четвёртый бейдж |
| 250+  | 🏆    | Пятый бейдж |

## Изменения в коде

### Backend

#### 1. База данных (Prisma Schema)
Добавлены две новые модели:
- `GlassesGroup` - группы для вкладки "Очки"
- `GlassesStudent` - ученики с баллами

**Файл:** `/backend/schema.prisma`

```prisma
model GlassesGroup {
  id        String @id @default(uuid())
  name      String
  teacherId String
  teacher  User             @relation(fields: [teacherId], references: [id], onDelete: Cascade)
  students GlassesStudent[]
  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt
  @@index([teacherId])
  @@map("glasses_groups")
}

model GlassesStudent {
  id       String @id @default(uuid())
  fullName String
  points   Int    @default(0)
  groupId  String
  group GlassesGroup @relation(fields: [groupId], references: [id], onDelete: Cascade)
  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt
  @@index([groupId])
  @@map("glasses_students")
}
```

#### 2. API Endpoints

**Созданы файлы:**
- `/backend/api/glasses-groups.ts` - управление группами
- `/backend/api/glasses-students.ts` - управление учениками и баллами

**Эндпоинты:**

**Группы:**
- `GET /api/glasses-groups` - получить все группы учителя
- `POST /api/glasses-groups` - создать новую группу
- `DELETE /api/glasses-groups?id={id}` - удалить группу

**Ученики:**
- `GET /api/glasses-students?groupId={id}` - получить учеников группы
- `POST /api/glasses-students` - создать нового ученика
- `PUT /api/glasses-students?id={id}` - обновить баллы ученика
- `DELETE /api/glasses-students?id={id}` - удалить ученика

#### 3. Роутинг (Vercel)
Добавлены rewrites в `/backend/vercel.json`

### Frontend

#### 1. API Service
Добавлены методы в `/frontend/src/services/api.ts`:
- `getGlassesGroups()`
- `createGlassesGroup(data)`
- `deleteGlassesGroup(id)`
- `getGlassesStudents(groupId)`
- `createGlassesStudent(data)`
- `updateGlassesStudent(id, data)`
- `deleteGlassesStudent(id)`

#### 2. Компонент Glasses
Полностью переделан `/frontend/src/components/Glasses.tsx`:
- ❌ Убрано использование localStorage
- ✅ Добавлена работа с API
- ✅ Автоматическое открытие бейджей
- ✅ Топ-3 рейтинг с реальными именами учеников
- ✅ Лидер сезона с именем и баллами
- ✅ Обработка ошибок и состояния загрузки

## Развёртывание

### Шаг 1: Применить миграцию базы данных

Выполните SQL миграцию для создания новых таблиц:

```bash
cd backend
# Если используете Prisma migrate
npx prisma migrate dev --name add-glasses-tables

# Или выполните SQL файл напрямую
# psql -d your_database -f migrations/add-glasses-tables.sql
```

### Шаг 2: Сгенерировать Prisma Client

```bash
cd backend
npx prisma generate
```

### Шаг 3: Деплой на Vercel

```bash
# Backend
cd backend
vercel --prod

# Frontend
cd frontend
npm run build
vercel --prod
```

### Для локальной разработки

**Backend:**
```bash
cd backend
npm install
npx prisma generate
npm run dev
```

**Frontend:**
```bash
cd frontend
npm install
npm run dev
```

## Использование

1. Войдите в систему
2. Перейдите на вкладку "🏆 Очки"
3. Создайте группу
4. Добавьте учеников в группу
5. Начисляйте баллы, меняя значение в поле со звёздочкой ⭐
6. Бейджи будут открываться автоматически при достижении порогов
7. Топ-3 рейтинг и лидер сезона обновляются в реальном времени

## Особенности

- **Изолированность**: Группы и ученики во вкладке "Очки" независимы от основной системы
- **Многопользовательность**: Каждый учитель видит только свои группы
- **Автоматизация**: Бейджи открываются автоматически без дополнительных действий
- **Рейтинг**: Ученики автоматически сортируются по баллам
- **Безопасность**: Все API эндпоинты защищены JWT токеном

## Технические детали

- **Frontend**: React + TypeScript
- **Backend**: Node.js + Express + Prisma
- **Database**: PostgreSQL
- **Deploy**: Vercel Serverless Functions
- **Auth**: JWT

## Поддержка

При возникновении проблем проверьте:
1. Применена ли миграция БД
2. Сгенерирован ли Prisma Client
3. Обновлён ли деплой на Vercel
4. Корректны ли переменные окружения (DATABASE_URL, JWT_SECRET)
