# 🇷🇺 Миграция проекта на российские серверы

## ✅ Краткий ответ: ДА, миграция возможна!

Ваш проект полностью независим от Supabase и Vercel. Это стандартное React + Node.js приложение с PostgreSQL базой данных, которое можно развернуть на любом хостинге.

---

## 📊 Анализ текущей инфраструктуры

### Что используется сейчас:

1. **Frontend**:
   - React 19 + TypeScript + Vite
   - Статические файлы (HTML/CSS/JS)
   - Размер: ~660 KB (после сборки)

2. **Backend**:
   - Node.js 20+ + Express
   - Prisma ORM
   - Serverless functions (Vercel)
   - API endpoints: `/api/*`

3. **База данных**:
   - PostgreSQL 15+
   - Размер: ~50-100 MB (оценка)
   - Без специфичных функций Supabase

4. **Текущий хостинг**:
   - Vercel (frontend + serverless backend) - США/Европа
   - Supabase PostgreSQL - AWS EU North (Stockholm)

### Зависимости от Supabase/Vercel:

❌ **НЕТ жестких зависимостей!**

✅ Используется только:
- PostgreSQL (любая версия 12+)
- Стандартный connection string
- Prisma ORM (работает с любым PostgreSQL)

---

## 🇷🇺 Варианты российских серверов

### Вариант 1: Timeweb (Рекомендуется) 🏆

**Почему:**
- ✅ Крупнейший российский хостер
- ✅ Дата-центры в РФ (Москва, Санкт-Петербург)
- ✅ Поддержка Node.js + PostgreSQL
- ✅ Простая панель управления
- ✅ Круглосуточная поддержка на русском

**Что нужно:**
- **VPS**: от 300₽/мес (1 CPU, 1GB RAM)
- **PostgreSQL**: встроенная или отдельная БД
- **SSL**: бесплатный Let's Encrypt

**Сайт**: [timeweb.cloud](https://timeweb.cloud)

---

### Вариант 2: Beget

**Почему:**
- ✅ Известный российский хостер
- ✅ Серверы в России
- ✅ Node.js хостинг
- ✅ PostgreSQL поддержка

**Что нужно:**
- **VPS**: от 250₽/мес
- **БД**: PostgreSQL включена

**Сайт**: [beget.com](https://beget.com)

---

### Вариант 3: Reg.ru

**Почему:**
- ✅ Один из старейших российских хостеров
- ✅ Дата-центры в РФ
- ✅ VPS с Node.js

**Что нужно:**
- **VPS**: от 350₽/мес

**Сайт**: [reg.ru](https://reg.ru)

---

### Вариант 4: Selectel

**Почему:**
- ✅ Профессиональный облачный провайдер РФ
- ✅ Дата-центры: Москва, Санкт-Петербург
- ✅ Гибкие облачные решения
- ✅ Managed PostgreSQL

**Что нужно:**
- **Облачный сервер**: от 400₽/мес
- **Managed PostgreSQL**: от 500₽/мес (опционально)

**Сайт**: [selectel.ru](https://selectel.ru)

---

### Вариант 5: Yandex Cloud

**Почему:**
- ✅ Российский облачный провайдер (Яндекс)
- ✅ Дата-центры в РФ
- ✅ Managed PostgreSQL
- ✅ Serverless Functions (аналог Vercel)

**Что нужно:**
- **Compute Cloud**: от 600₽/мес
- **Managed PostgreSQL**: от 1000₽/мес
- **Object Storage**: для статики

**Сайт**: [cloud.yandex.ru](https://cloud.yandex.ru)

---

## 🔧 Что нужно изменить в коде

### ✅ Минимальные изменения:

1. **Backend - один файл!**

   Файл: `backend/.env`
   ```bash
   # Было:
   DATABASE_URL="postgresql://postgres.xxx@aws-1-eu-north-1.pooler.supabase.com:5432/postgres"

   # Станет:
   DATABASE_URL="postgresql://user:password@your-russian-server.ru:5432/database"
   ```

2. **Frontend - один файл!**

   Файл: `frontend/src/services/api.ts` (скорее всего)
   ```typescript
   // Было:
   const API_URL = 'https://student-reports-app.vercel.app/api';

   // Станет:
   const API_URL = 'https://your-domain.ru/api';
   ```

3. **Структура проекта - БЕЗ изменений!**
   - Весь код остается таким же
   - Prisma работает с любым PostgreSQL
   - React собирается одинаково

---

## 📋 Пошаговая инструкция миграции

### Этап 1: Подготовка (30 минут)

1. **Экспорт базы данных**:
   ```bash
   # На локальной машине
   cd backend

   # Создать дамп через Prisma
   npx prisma db pull

   # Или через pg_dump (если есть доступ)
   pg_dump $DATABASE_URL > backup.sql
   ```

2. **Сборка проекта локально** (проверка):
   ```bash
   # Frontend
   cd frontend
   npm run build

   # Backend
   cd ../backend
   npm install
   npx prisma generate
   ```

---

### Этап 2: Выбор и настройка сервера (1-2 часа)

#### Рекомендация: Timeweb VPS

1. **Заказать VPS**:
   - Перейти на [timeweb.cloud](https://timeweb.cloud)
   - Выбрать "VPS" → "Заказать VPS"
   - Конфигурация: 1 CPU, 2GB RAM, 20GB SSD (~500₽/мес)
   - ОС: **Ubuntu 22.04 LTS**

2. **Подключиться к серверу**:
   ```bash
   ssh root@your-server-ip
   ```

3. **Установить необходимое ПО**:
   ```bash
   # Обновить систему
   apt update && apt upgrade -y

   # Установить Node.js 20
   curl -fsSL https://deb.nodesource.com/setup_20.x | bash -
   apt install -y nodejs

   # Установить PostgreSQL 15
   apt install -y postgresql postgresql-contrib

   # Установить Nginx (веб-сервер)
   apt install -y nginx

   # Установить PM2 (менеджер процессов)
   npm install -g pm2

   # Установить Git
   apt install -y git
   ```

---

### Этап 3: Настройка базы данных (30 минут)

1. **Создать базу данных**:
   ```bash
   # Войти в PostgreSQL
   sudo -u postgres psql

   # Создать пользователя
   CREATE USER student_app WITH PASSWORD 'your-secure-password';

   # Создать базу данных
   CREATE DATABASE student_reports OWNER student_app;

   # Выдать права
   GRANT ALL PRIVILEGES ON DATABASE student_reports TO student_app;

   # Выйти
   \q
   ```

2. **Импортировать данные**:

   **Вариант A: Через Prisma (рекомендуется)**
   ```bash
   # Скопировать schema.prisma на сервер
   # Применить миграции
   npx prisma db push
   ```

   **Вариант B: Через SQL дамп**
   ```bash
   psql -U student_app -d student_reports < backup.sql
   ```

---

### Этап 4: Деплой Backend (1 час)

1. **Клонировать проект**:
   ```bash
   cd /var/www
   git clone https://github.com/angli4anochka/student-reports-app.git
   cd student-reports-app/backend
   ```

2. **Настроить .env**:
   ```bash
   nano .env
   ```

   Содержимое:
   ```bash
   DATABASE_URL="postgresql://student_app:your-secure-password@localhost:5432/student_reports"
   JWT_SECRET="your-super-secret-jwt-key-change-this"
   NODE_ENV="production"
   PORT=3001
   ```

3. **Установить зависимости**:
   ```bash
   npm install
   npx prisma generate
   ```

4. **Запустить через PM2**:
   ```bash
   pm2 start src/server.ts --name "student-reports-api" --interpreter ts-node
   pm2 save
   pm2 startup
   ```

---

### Этап 5: Деплой Frontend (30 минут)

1. **Собрать frontend**:
   ```bash
   cd /var/www/student-reports-app/frontend
   npm install
   npm run build
   ```

2. **Настроить Nginx**:
   ```bash
   nano /etc/nginx/sites-available/student-reports
   ```

   Содержимое:
   ```nginx
   server {
       listen 80;
       server_name your-domain.ru www.your-domain.ru;

       # Frontend (статика)
       location / {
           root /var/www/student-reports-app/frontend/dist;
           try_files $uri $uri/ /index.html;
       }

       # Backend API
       location /api {
           proxy_pass http://localhost:3001;
           proxy_http_version 1.1;
           proxy_set_header Upgrade $http_upgrade;
           proxy_set_header Connection 'upgrade';
           proxy_set_header Host $host;
           proxy_cache_bypass $http_upgrade;
       }
   }
   ```

3. **Активировать сайт**:
   ```bash
   ln -s /etc/nginx/sites-available/student-reports /etc/nginx/sites-enabled/
   nginx -t
   systemctl restart nginx
   ```

---

### Этап 6: Настройка SSL (15 минут)

```bash
# Установить Certbot
apt install -y certbot python3-certbot-nginx

# Получить бесплатный SSL сертификат
certbot --nginx -d your-domain.ru -d www.your-domain.ru
```

---

## 💰 Сравнение стоимости

### Текущая (Vercel + Supabase):

| Сервис | Стоимость |
|--------|-----------|
| Vercel | $20/мес (Pro) или $0 (Hobby, с лимитами) |
| Supabase | $25/мес (Pro) или $0 (Free, с лимитами) |
| **Итого** | **$45/мес (~4500₽)** или **$0 с лимитами** |

### Российский хостинг:

| Вариант | Стоимость | Что входит |
|---------|-----------|------------|
| **Timeweb VPS** | **500₽/мес** | VPS + PostgreSQL + SSL |
| Beget VPS | 450₽/мес | VPS + PostgreSQL |
| Selectel Cloud | 900₽/мес | Cloud + Managed DB |
| Yandex Cloud | 1600₽/мес | Полный аналог Vercel+Supabase |

**Экономия**: От 4000₽/мес при переходе на Timeweb!

---

## ⚡ Альтернативный вариант: Быстрая миграция

Если нужно **срочно**, можно использовать **PaaS** (Platform as a Service) российские сервисы:

### Railway (через VPN) или российский аналог

1. **Регистрация** на платформе
2. **Подключение GitHub** репозитория
3. **Автоматический деплой** (как Vercel)
4. **Managed PostgreSQL** (как Supabase)

**Плюсы**: Деплой за 10 минут
**Минусы**: Дороже (~2000₽/мес)

---

## 🎯 Рекомендация

### Для вашего проекта лучше всего:

**Вариант 1: Timeweb VDS (500₽/мес)** 🏆

**Почему:**
- ✅ Дешевле текущего решения в 9 раз
- ✅ Полный контроль над сервером
- ✅ Российские серверы и поддержка
- ✅ Простая настройка
- ✅ Масштабируемость (можно увеличить ресурсы)

**Время миграции**: 3-4 часа

---

## 📚 Что нужно для начала

### Шаг 1: Подготовка (сделать сейчас)

1. ✅ Создать резервную копию БД
   ```bash
   cd backend
   npx prisma db pull
   ```

2. ✅ Зарегистрировать домен .ru (если нет)
   - Reg.ru: ~300₽/год
   - Timeweb: ~200₽/год

### Шаг 2: Выбрать хостинг

Рекомендую начать с **Timeweb**:
- Регистрация: [timeweb.cloud](https://timeweb.cloud)
- Выбрать VPS → Ubuntu 22.04 → 2GB RAM
- Оплатить на месяц (~500₽)

### Шаг 3: Следовать инструкции выше

Я могу помочь на каждом этапе! 🚀

---

## ❓ FAQ

**Q: Потеряются ли данные?**
A: Нет, если правильно экспортировать БД перед миграцией.

**Q: Будет ли работать как раньше?**
A: Да, абсолютно идентично. Код не меняется.

**Q: Сколько времени займет?**
A: Первая миграция: 3-4 часа. Последующие обновления: 5 минут.

**Q: Что если что-то сломается?**
A: Старый сервер (Vercel+Supabase) продолжит работать до тех пор, пока вы не отключите его.

**Q: Можно ли протестировать?**
A: Да! Можно развернуть на новом сервере параллельно и тестировать на поддомене (test.your-domain.ru).

---

## 🚀 Готовы начать?

Скажите, какой вариант хостинга вам интересен, и я создам **пошаговую инструкцию** специально для этого сервиса!

---

**Дата**: 14 января 2026
**Статус**: ✅ Миграция возможна и рекомендуется
