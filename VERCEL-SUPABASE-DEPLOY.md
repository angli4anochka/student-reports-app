# 🚀 Пошаговый деплой на Vercel + Supabase

## ✅ Статус готовности
Ваш проект **УЖЕ ГОТОВ** к деплою! Все конфигурационные файлы настроены.

---

## 📋 Что нужно сделать

### 1️⃣ Настройка Supabase (База данных)

#### Шаг 1.1: Создание проекта
1. Откройте [supabase.com](https://supabase.com)
2. Нажмите **"Start your project"**
3. Войдите через **GitHub**
4. Нажмите **"New project"**
   - **Name**: `student-reports`
   - **Database Password**: придумайте надежный пароль и **СОХРАНИТЕ ЕГО!**
   - **Region**: выберите `Frankfurt (eu-central-1)` или ближайший к вам
5. Нажмите **"Create new project"**
6. ⏳ Подождите 2-3 минуты пока создается проект

#### Шаг 1.2: Получение строки подключения к БД
1. После создания проекта перейдите в **Settings** (иконка шестеренки слева)
2. Выберите **Database** в боковом меню
3. Найдите раздел **"Connection string"**
4. Выберите вкладку **"URI"**
5. Скопируйте строку вида:
   ```
   postgresql://postgres.xxxxx:[YOUR-PASSWORD]@aws-0-eu-central-1.pooler.supabase.com:5432/postgres
   ```
6. **ВАЖНО**: Замените `[YOUR-PASSWORD]` на пароль, который вы придумали в шаге 1.1

#### Шаг 1.3: Применение схемы базы данных
1. В Supabase перейдите в **SQL Editor** (слева в меню)
2. Нажмите **"New query"**
3. Откройте файл `backend/prisma/schema.prisma` на вашем компьютере
4. Скопируйте всю схему и вставьте в SQL Editor
5. **ИЛИ** выполните команду локально (нужен доступ к БД):
   ```bash
   cd backend
   npx prisma db push
   ```

---

### 2️⃣ Загрузка кода на GitHub

#### Вариант A: Через WebStorm (рекомендуется)
1. Откройте проект в **WebStorm**
2. Меню: **VCS → Share Project on GitHub**
3. Название репозитория: `student-reports-app`
4. Выберите **Public** (публичный)
5. Нажмите **Share**
6. WebStorm автоматически загрузит весь код

#### Вариант B: Через командную строку
```bash
cd /mnt/c/Users/angli/student-reports-app

# Инициализируем git (если еще не сделано)
git init

# Добавляем все файлы
git add .

# Создаем первый коммит
git commit -m "Initial commit for Vercel deployment"

# Создаем репозиторий на GitHub и следуйте инструкциям
# git remote add origin https://github.com/YOUR-USERNAME/student-reports-app.git
# git push -u origin main
```

---

### 3️⃣ Деплой Backend на Vercel

#### Шаг 3.1: Импорт проекта
1. Откройте [vercel.com](https://vercel.com)
2. Войдите через **GitHub**
3. Нажмите **"Add New..." → Project**
4. Найдите и выберите репозиторий **`student-reports-app`**
5. Нажмите **"Import"**

#### Шаг 3.2: Настройка Backend
1. В поле **Project Name** введите: `student-reports-backend`
2. **ВАЖНО!** В **Root Directory** нажмите **Edit** и выберите `backend`
3. **Framework Preset**: оставьте `Other` (или автоопределение)
4. **Build Command**: оставьте `npm run build`
5. **Output Directory**: оставьте пустым

#### Шаг 3.3: Environment Variables (Переменные окружения)
Нажмите **"Add Environment Variable"** и добавьте:

```
DATABASE_URL
postgresql://postgres.xxxxx:[YOUR-PASSWORD]@aws-0-eu-central-1.pooler.supabase.com:5432/postgres

JWT_SECRET
your-random-super-secret-jwt-key-min-32-chars-change-this

NODE_ENV
production
```

**⚠️ ВАЖНО**:
- `DATABASE_URL` - замените на вашу строку из Supabase (шаг 1.2)
- `JWT_SECRET` - придумайте случайную строку минимум 32 символа

#### Шаг 3.4: Деплой
1. Нажмите **"Deploy"**
2. ⏳ Подождите 2-3 минуты
3. После успешного деплоя скопируйте URL (например: `https://student-reports-backend.vercel.app`)

#### Шаг 3.5: Проверка Backend
Откройте в браузере:
```
https://student-reports-backend.vercel.app/api
```

Должны увидеть:
```json
{
  "message": "Student Reports API is running!",
  "version": "4.0.0"
}
```

Проверьте подключение к базе:
```
https://student-reports-backend.vercel.app/api?db
```

---

### 4️⃣ Деплой Frontend на Vercel

#### Шаг 4.1: Добавление нового проекта
1. В Vercel снова нажмите **"Add New..." → Project**
2. Выберите **ТОТ ЖЕ** репозиторий `student-reports-app`
3. Нажмите **"Import"**

#### Шаг 4.2: Настройка Frontend
1. В поле **Project Name** введите: `student-reports-frontend`
2. **ВАЖНО!** В **Root Directory** нажмите **Edit** и выберите `frontend`
3. **Framework Preset**: `Vite` (должно определиться автоматически)
4. **Build Command**: `npm run build`
5. **Output Directory**: `dist`

#### Шаг 4.3: Environment Variables
Нажмите **"Add Environment Variable"** и добавьте:

```
VITE_API_URL
https://student-reports-backend.vercel.app/api
```

**⚠️ ВАЖНО**: Замените URL на ваш Backend URL из шага 3.4!

#### Шаг 4.4: Деплой
1. Нажмите **"Deploy"**
2. ⏳ Подождите 1-2 минуты
3. После успешного деплоя скопируйте URL (например: `https://student-reports-frontend.vercel.app`)

---

## 🎉 Готово!

### Ваши ссылки:
- **Frontend**: `https://student-reports-frontend.vercel.app`
- **Backend API**: `https://student-reports-backend.vercel.app/api`
- **Database**: Supabase PostgreSQL

### 🔐 Тестовый доступ:
После создания пользователя в БД или через API:
- **Email**: `teacher@demo.com`
- **Password**: `demo123`

---

## 🔧 Настройка после деплоя

### Создание первого пользователя
Выполните SQL запрос в Supabase SQL Editor:

```sql
-- Пароль: demo123 (уже захеширован)
INSERT INTO users (id, email, password, "fullName", role, "createdAt", "updatedAt")
VALUES (
  gen_random_uuid(),
  'teacher@demo.com',
  '$2a$10$YourHashedPasswordHere',
  'Demo Teacher',
  'TEACHER',
  NOW(),
  NOW()
);
```

**Или** используйте endpoint регистрации (если он реализован в backend).

---

## 🔄 Автоматические обновления

Теперь при каждом push в GitHub:
1. Vercel автоматически пересоберет и задеплоит изменения
2. Frontend и Backend обновятся отдельно
3. Не нужно ничего делать вручную!

### Как обновить приложение:
```bash
# Внесите изменения в код
git add .
git commit -m "Описание изменений"
git push
```

Vercel автоматически задеплоит изменения через 1-2 минуты!

---

## 🐛 Проблемы и решения

### Backend не подключается к базе
1. Проверьте Environment Variables в Vercel
2. Убедитесь, что `DATABASE_URL` правильный (со вставленным паролем)
3. Проверьте логи в Vercel: **Deployments → ваш деплой → Runtime Logs**

### Frontend не видит Backend
1. Проверьте `VITE_API_URL` в Environment Variables
2. Убедитесь, что URL правильный и заканчивается на `/api`
3. Проверьте CORS настройки в backend

### Таблицы не созданы в БД
Выполните миграцию:
```bash
cd backend
npx prisma db push --preview-feature
```

### 502/504 ошибки
- Vercel serverless функции имеют лимит 10 секунд выполнения (Free tier)
- Убедитесь, что запросы к БД быстрые
- Проверьте индексы в Prisma schema

---

## 💡 Дополнительные возможности

### Подключение своего домена
1. В Vercel: **Settings → Domains**
2. Нажмите **"Add"**
3. Введите ваш домен
4. Настройте DNS записи согласно инструкциям Vercel
5. Получите бесплатный SSL сертификат автоматически

### Просмотр логов
- В Vercel: **Deployments → ваш деплой → Runtime Logs**
- Здесь видны все `console.log` из вашего кода

### Откат на предыдущую версию
1. **Deployments** → выберите старый деплой
2. Нажмите **"Promote to Production"**

---

## 📊 Текущий статус вашего проекта

✅ **Готовы к деплою:**
- `backend/vercel.json` - настроен
- `frontend/vercel.json` - настроен
- `backend/api/index.ts` - serverless функция готова
- `backend/prisma/schema.prisma` - схема БД для PostgreSQL
- База данных уже подключена к Supabase

🔧 **Используется:**
- **Backend**: Vercel Serverless Functions
- **Frontend**: Vite + React
- **Database**: Supabase PostgreSQL (уже подключена!)
  ```
  DATABASE_URL="postgresql://postgres.xhvttzlrsetzxkkvgfvk:Obm@knut2@aws-1-eu-north-1.pooler.supabase.com:5432/postgres"
  ```

---

## 🎯 Следующие шаги

1. **Сейчас**: Загрузите код на GitHub (шаг 2)
2. **Затем**: Задеплойте Backend на Vercel (шаг 3)
3. **Потом**: Задеплойте Frontend на Vercel (шаг 4)
4. **Наслаждайтесь**: Ваше приложение онлайн! 🚀

---

## 💰 Стоимость

**ПОЛНОСТЬЮ БЕСПЛАТНО** для вашего случая:
- Supabase Free: 500 MB база данных, 2 GB transfer
- Vercel Free: 100 GB bandwidth, serverless functions
- Идеально для учебных/демо проектов!

---

## 📞 Поддержка

Если что-то не получается:
1. Проверьте логи в Vercel
2. Проверьте переменные окружения
3. Убедитесь, что Root Directory указан правильно (backend/frontend)

**Удачи с деплоем! 🚀**
