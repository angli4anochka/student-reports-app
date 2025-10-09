# 🚀 Деплой на Supabase + Vercel (БЕСПЛАТНО)

## 📋 План развертывания:
- **Supabase** - PostgreSQL база данных (бесплатно)
- **Vercel** - хостинг frontend + backend (бесплатно)

## Шаг 1: Настройка Supabase

### 1.1 Создание проекта
1. Зайдите на [supabase.com](https://supabase.com)
2. "Start your project" → войдите через GitHub
3. "New project":
   - Name: `student-reports`
   - Database Password: (запомните!)
   - Region: ближайший к вам

### 1.2 Получение данных подключения
После создания проекта:
- Settings → Database → Connection string
- Скопируйте URL вида: `postgresql://postgres:password@db.xxx.supabase.co:5432/postgres`

## Шаг 2: Загрузка на GitHub (через WebStorm)

1. Откройте проект в WebStorm
2. `VCS → Share Project on GitHub`
3. Название: `student-reports-app`
4. Сделайте публичным
5. WebStorm загрузит весь код

## Шаг 3: Деплой Backend на Vercel

### 3.1 Деплой backend
1. Зайдите на [vercel.com](https://vercel.com)
2. Войдите через GitHub
3. "New Project" → выберите `student-reports-app`
4. **ВАЖНО**: В Root Directory выберите `backend`
5. Добавьте Environment Variables:
   ```
   DATABASE_URL=postgresql://postgres:ВАШ_ПАРОЛЬ@db.xxx.supabase.co:5432/postgres
   JWT_SECRET=your-random-32-character-secret
   NODE_ENV=production
   ```
6. Deploy

### 3.2 Деплой frontend
1. Снова "New Project" → тот же репозиторий
2. **ВАЖНО**: В Root Directory выберите `frontend`
3. Добавьте Environment Variables:
   ```
   VITE_API_URL=https://ваш-backend.vercel.app/api
   ```
4. Deploy

## 🎉 Готово!

### Результат:
- **Frontend**: `https://student-reports-frontend.vercel.app`
- **Backend**: `https://student-reports-backend.vercel.app` 
- **База данных**: Supabase PostgreSQL

### 🔐 Доступ:
- Email: `teacher@demo.com`
- Пароль: `demo123`

### ✅ Преимущества:
- **100% бесплатно** для малых проектов
- **Автоматические обновления** из GitHub
- **SSL сертификаты**
- **Глобальная CDN**
- **Надежные платформы**

## 🔄 Обновления:
Просто делайте commit в WebStorm → push → Vercel автоматически обновит!

---

## 💡 Бонус: Настройка домена (опционально)

В Vercel можете подключить свой домен:
1. Domains → Add domain
2. Настройте DNS записи
3. Получите бесплатный SSL