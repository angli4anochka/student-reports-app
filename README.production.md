# 🚀 Student Reports - Production Deployment Guide

## Быстрый старт

### 1. Предварительные требования
```bash
# Установите Docker и Docker Compose
sudo apt update
sudo apt install docker.io docker-compose

# Добавьте пользователя в группу docker
sudo usermod -aG docker $USER
```

### 2. Клонирование и настройка
```bash
# Клонируйте репозиторий
git clone <your-repo>
cd student-reports-app

# Скопируйте и настройте production переменные
cp .env.production .env.production.local
nano .env.production.local
```

### 3. Настройка переменных окружения
Отредактируйте `.env.production.local`:
```env
# Database
POSTGRES_USER=student_reports
POSTGRES_PASSWORD=YOUR_SECURE_PASSWORD_HERE
POSTGRES_DB=student_reports_prod

# JWT (сгенерируйте случайную строку)
JWT_SECRET=your-super-secure-random-jwt-secret-at-least-32-characters-long

# Domain
CORS_ORIGIN=https://yourdomain.com
API_URL=https://yourdomain.com/api
DOMAIN=yourdomain.com
```

### 4. Развертывание
```bash
# Запустите развертывание
./deploy.sh
```

## 📋 Что создается

### Сервисы:
- **PostgreSQL** (порт 5432) - база данных
- **Backend API** (порт 3001) - Node.js сервер
- **Frontend** (порт 80) - React приложение с Nginx

### Тома Docker:
- `postgres_data` - данные PostgreSQL
- `uploads` - загруженные файлы

## 🔐 Безопасность

### Обязательные изменения:
1. **Смените пароли базы данных**
2. **Генерируйте уникальный JWT_SECRET**
3. **Настройте SSL/HTTPS**
4. **Настройте firewall**

### Генерация секретных ключей:
```bash
# JWT Secret
openssl rand -base64 32

# Database password
openssl rand -base64 24
```

## 🌐 SSL/HTTPS с Let's Encrypt

### 1. Установите Certbot
```bash
sudo apt install certbot python3-certbot-nginx
```

### 2. Получите сертификат
```bash
sudo certbot --nginx -d yourdomain.com
```

### 3. Обновите nginx.conf с SSL

## 📊 Мониторинг

### Логи контейнеров:
```bash
# Все сервисы
docker-compose -f docker-compose.prod.yml logs -f

# Только backend
docker-compose -f docker-compose.prod.yml logs -f backend

# Только database
docker-compose -f docker-compose.prod.yml logs -f postgres
```

### Состояние сервисов:
```bash
docker-compose -f docker-compose.prod.yml ps
```

## 🔄 Управление

### Запуск/остановка:
```bash
# Запуск
docker-compose -f docker-compose.prod.yml up -d

# Остановка
docker-compose -f docker-compose.prod.yml down

# Перезапуск
docker-compose -f docker-compose.prod.yml restart
```

### Обновление приложения:
```bash
# Остановить сервисы
docker-compose -f docker-compose.prod.yml down

# Обновить код
git pull

# Пересобрать и запустить
docker-compose -f docker-compose.prod.yml up -d --build
```

## 💾 Резервное копирование

### Backup базы данных:
```bash
docker-compose -f docker-compose.prod.yml exec postgres pg_dump -U student_reports student_reports_prod > backup.sql
```

### Restore базы данных:
```bash
docker-compose -f docker-compose.prod.yml exec -T postgres psql -U student_reports student_reports_prod < backup.sql
```

## 🔧 Troubleshooting

### Проверка подключения к базе:
```bash
docker-compose -f docker-compose.prod.yml exec postgres psql -U student_reports -d student_reports_prod -c "SELECT version();"
```

### Пересоздание базы данных:
```bash
docker-compose -f docker-compose.prod.yml down -v
docker-compose -f docker-compose.prod.yml up -d
```

### Миграции базы данных:
```bash
cd backend
npm run db:migrate:prod
```

## 📞 Поддержка

При проблемах с развертыванием:
1. Проверьте логи: `docker-compose logs`
2. Убедитесь, что все порты свободны
3. Проверьте переменные окружения
4. Убедитесь в наличии всех зависимостей