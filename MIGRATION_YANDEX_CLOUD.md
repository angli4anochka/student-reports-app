# 🚀 Инструкция по миграции в Yandex Cloud

## ✅ Что уже сделано:

1. ✅ **Экспортированы данные из Supabase**
   - Файл: `backend/exports/database-backup-2026-01-27.json`
   - Размер: 474.88 KB
   - 12 пользователей
   - 17 групп
   - 39 учеников
   - 47 оценок
   - 604 записи посещаемости
   - 123 урока
   - И другие данные

2. ✅ **Создан скрипт импорта** для Yandex Cloud

---

## 📋 План миграции (пошагово)

### Этап 1: Создание базы данных в Yandex Cloud

#### 1.1. Регистрация в Yandex Cloud
1. Перейти на https://cloud.yandex.ru/
2. Войти через Яндекс ID
3. Создать новый проект (или использовать существующий)

#### 1.2. Создание Managed Service for PostgreSQL
1. В консоли Yandex Cloud выбрать **Managed Service for PostgreSQL**
2. Нажать **"Создать кластер"**
3. Настройки:
   ```
   Имя: student-reports-db
   Версия PostgreSQL: 15 или 16
   Окружение: Production

   Конфигурация хоста:
   - Класс хоста: s2.micro (2 vCPU, 8 GB RAM) - достаточно для начала
   - Зона доступности: ru-central1-a
   - Тип хранилища: network-ssd
   - Размер хранилища: 10 GB (увеличить при необходимости)

   База данных:
   - Имя БД: student_reports
   - Владелец: admin (создастся автоматически)
   - Пароль: [ваш_надёжный_пароль]

   Пользователь:
   - Логин: admin
   - Пароль: [ваш_надёжный_пароль]
   ```

4. Включить **Публичный доступ** (чтобы подключаться из интернета)
5. Нажать **"Создать кластер"** (займёт 5-10 минут)

#### 1.3. Получение строки подключения
После создания кластера:
1. Открыть созданный кластер
2. Перейти в раздел **"Подключение"**
3. Скопировать строку подключения, она будет примерно такой:
   ```
   postgresql://admin:PASSWORD@c-xxxxx.rw.mdb.yandexcloud.net:6432/student_reports
   ```

---

### Этап 2: Подготовка к миграции

#### 2.1. Обновление .env файла
Создать файл `backend/.env.yandex`:
```bash
# Yandex Cloud PostgreSQL
DATABASE_URL="postgresql://admin:ВАШ_ПАРОЛЬ@c-xxxxx.rw.mdb.yandexcloud.net:6432/student_reports?sslmode=require"

# JWT Secret (тот же самый)
JWT_SECRET="your-super-secret-jwt-key-change-this-in-production"

# Environment
NODE_ENV="production"
PORT=3001
```

#### 2.2. Применение схемы Prisma к новой базе
```bash
cd backend

# Временно переключиться на Yandex Cloud
export DATABASE_URL="postgresql://admin:ВАШ_ПАРОЛЬ@c-xxxxx.rw.mdb.yandexcloud.net:6432/student_reports?sslmode=require"

# Применить схему (создать таблицы)
npx prisma db push

# Сгенерировать Prisma Client
npx prisma generate
```

---

### Этап 3: Импорт данных

#### 3.1. Запуск импорта
```bash
cd backend

# Убедиться, что DATABASE_URL указывает на Yandex Cloud
export DATABASE_URL="postgresql://admin:ВАШ_ПАРОЛЬ@c-xxxxx.rw.mdb.yandexcloud.net:6432/student_reports?sslmode=require"

# Запустить импорт
npx ts-node scripts/import-database.ts
```

Скрипт импортирует:
- ✅ 12 пользователей
- ✅ 17 групп
- ✅ 39 учеников
- ✅ 604 записи посещаемости
- ✅ 123 урока
- ✅ Все остальные данные

---

### Этап 4: Тестирование

#### 4.1. Проверка данных
```bash
cd backend

# Подключиться к новой базе
npx prisma studio
```

Проверить:
- Количество пользователей
- Наличие групп
- Наличие учеников
- Оценки

#### 4.2. Тестовый запуск backend
```bash
cd backend

# Использовать Yandex Cloud
export DATABASE_URL="postgresql://admin:ВАШ_ПАРОЛЬ@c-xxxxx.rw.mdb.yandexcloud.net:6432/student_reports?sslmode=require"

# Запустить сервер
npm run dev
```

Проверить:
- API отвечает
- Авторизация работает
- Данные загружаются

---

### Этап 5: Переключение на production

#### 5.1. Обновление .env на Vercel
В настройках проекта на Vercel:

1. **Environment Variables** → **Production**
2. Обновить `DATABASE_URL`:
   ```
   postgresql://admin:ВАШ_ПАРОЛЬ@c-xxxxx.rw.mdb.yandexcloud.net:6432/student_reports?sslmode=require
   ```
3. Сохранить

#### 5.2. Редеплой на Vercel
```bash
git add .
git commit -m "Переключение на Yandex Cloud PostgreSQL"
git push
```

Vercel автоматически пересоберёт приложение с новым DATABASE_URL.

---

### Этап 6: Проверка production

1. Открыть приложение на Vercel
2. Авторизоваться
3. Проверить:
   - ✅ Пользователи загружаются
   - ✅ Группы отображаются
   - ✅ Ученики видны
   - ✅ Оценки работают
   - ✅ Посещаемость сохраняется

---

## 💰 Стоимость Yandex Cloud

### Managed PostgreSQL (примерная стоимость)

**Конфигурация s2.micro (2 vCPU, 8 GB RAM):**
- Вычислительные ресурсы: ~2000₽/мес
- Хранилище (10 GB SSD): ~300₽/мес
- **Итого: ~2300₽/мес**

**Конфигурация s2.small (4 vCPU, 16 GB RAM) - на будущее:**
- Вычислительные ресурсы: ~4000₽/мес
- Хранилище (20 GB SSD): ~600₽/мес
- **Итого: ~4600₽/мес**

**Сравнение с Supabase Pro:**
- Supabase Pro: $25/мес (~2500₽)
- Yandex Cloud s2.micro: ~2300₽/мес

**Преимущества Yandex Cloud:**
- ✅ Российская юрисдикция
- ✅ Оплата в рублях
- ✅ Полный контроль над БД
- ✅ Масштабируемость
- ✅ Техподдержка на русском

---

## 🔄 Откат на Supabase (если нужно)

В случае проблем:

1. В `backend/.env` вернуть старый DATABASE_URL:
   ```bash
   DATABASE_URL="postgresql://postgres.xhvttzlrsetzxkkvgfvk:Obm@knut2@aws-1-eu-north-1.pooler.supabase.com:5432/postgres"
   ```

2. На Vercel вернуть старую переменную окружения

3. Редеплой

**Supabase продолжает работать с теми же данными!**

---

## 📊 Мониторинг после миграции

### Что отслеживать первую неделю:

1. **Производительность запросов**
   - Prisma Studio → Query logs
   - Yandex Cloud Console → Мониторинг

2. **Ошибки подключения**
   - Vercel logs
   - Backend logs

3. **Размер базы данных**
   - Yandex Cloud Console → Хранилище

---

## 🆘 Решение проблем

### Проблема: "Connection timeout"
**Решение:** Проверить Firewall в Yandex Cloud, разрешить доступ с IP Vercel

### Проблема: "SSL required"
**Решение:** Добавить `?sslmode=require` в конец DATABASE_URL

### Проблема: "Authentication failed"
**Решение:** Проверить пароль и имя пользователя

---

## ✅ Чек-лист миграции

- [ ] Создан кластер PostgreSQL в Yandex Cloud
- [ ] Получена строка подключения
- [ ] Применена схема Prisma (`npx prisma db push`)
- [ ] Запущен импорт данных
- [ ] Проверены данные через Prisma Studio
- [ ] Протестирован backend локально
- [ ] Обновлён DATABASE_URL на Vercel
- [ ] Сделан редеплой
- [ ] Проверена работа на production
- [ ] Можно отключить Supabase (через месяц для безопасности)

---

## 📞 Контакты поддержки

**Yandex Cloud:**
- Email: support@cloud.yandex.ru
- Телефон: 8 800 234-24-80
- Документация: https://cloud.yandex.ru/docs/managed-postgresql/

---

**Дата создания:** 27 января 2026
**Статус:** ✅ Готово к миграции
