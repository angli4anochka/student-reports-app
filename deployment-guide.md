# 🌐 Размещение приложения для публичного доступа

## 🎯 Быстрый деплой на DigitalOcean

### Шаг 1: Создание сервера
1. Зарегистрируйтесь на [DigitalOcean](https://digitalocean.com)
2. Создайте новый Droplet:
   - **OS:** Ubuntu 22.04
   - **Plan:** Basic $6/month (1GB RAM, 1 vCPU)
   - **Region:** выберите ближайший к вам
   - **Authentication:** SSH ключи (рекомендуется)

### Шаг 2: Подготовка сервера
```bash
# Подключитесь к серверу
ssh root@your-server-ip

# Обновите систему
apt update && apt upgrade -y

# Установите Docker
curl -fsSL https://get.docker.com -o get-docker.sh
sh get-docker.sh

# Установите Docker Compose
curl -L "https://github.com/docker/compose/releases/latest/download/docker-compose-$(uname -s)-$(uname -m)" -o /usr/local/bin/docker-compose
chmod +x /usr/local/bin/docker-compose

# Установите Git
apt install git -y
```

### Шаг 3: Загрузка кода
```bash
# Клонируйте репозиторий (замените на ваш)
git clone https://github.com/your-username/student-reports-app.git
cd student-reports-app

# Скопируйте конфигурацию
cp .env.production .env.production.local
```

### Шаг 4: Настройка для production
```bash
# Отредактируйте конфигурацию
nano .env.production.local
```

Измените на:
```env
POSTGRES_USER=student_reports
POSTGRES_PASSWORD=SuperSecurePassword123!
POSTGRES_DB=student_reports_prod
JWT_SECRET=your-32-character-random-secret-key
CORS_ORIGIN=http://your-server-ip
API_URL=http://your-server-ip:3001/api
DOMAIN=your-server-ip
```

### Шаг 5: Деплой
```bash
# Запустите деплой
chmod +x deploy.sh
./deploy.sh
```

### Шаг 6: Настройка файрвола
```bash
# Откройте нужные порты
ufw enable
ufw allow ssh
ufw allow 80
ufw allow 443
ufw allow 3001
```

## 🎉 Готово!
Ваше приложение доступно по адресу: `http://your-server-ip`

---

## 🌍 Настройка домена (опционально)

### Если у вас есть домен:
1. В настройках домена добавьте A-запись:
   ```
   Type: A
   Name: @
   Value: your-server-ip
   ```

2. Обновите `.env.production.local`:
   ```env
   CORS_ORIGIN=https://yourdomain.com
   API_URL=https://yourdomain.com/api
   DOMAIN=yourdomain.com
   ```

3. Настройте SSL:
   ```bash
   # Установите Certbot
   apt install certbot python3-certbot-nginx -y
   
   # Получите сертификат
   certbot --nginx -d yourdomain.com
   ```

---

## 💰 Альтернативы (бесплатные для тестирования)

### Railway (простой и быстрый)
1. Зайдите на [railway.app](https://railway.app)
2. Подключите GitHub репозиторий
3. Railway автоматически развернет приложение

### Render
1. Зайдите на [render.com](https://render.com)
2. Создайте Web Service из GitHub
3. Настройте переменные окружения

---

## 📋 Чек-лист для production

### Безопасность:
- [ ] Смените все пароли по умолчанию
- [ ] Настройте SSL сертификат
- [ ] Настройте файрвол
- [ ] Ограничьте SSH доступ

### Мониторинг:
- [ ] Настройте логирование
- [ ] Настройте мониторинг сервера
- [ ] Настройте резервное копирование базы

### Производительность:
- [ ] Настройте CDN (Cloudflare)
- [ ] Оптимизируйте изображения
- [ ] Настройте кэширование

---

## 🆘 Нужна помощь?

**Самый простой вариант:** Railway или Render
**Самый гибкий:** DigitalOcean + Docker
**Для России:** Yandex Cloud или VK Cloud

Выберите провайдера и я помогу с настройкой!