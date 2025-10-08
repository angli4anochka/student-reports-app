# 🚂 Деплой на Railway - Пошаговая инструкция

## 🎯 Быстрый способ размещения приложения

### Шаг 1: Подготовка GitHub репозитория

1. **Идите на GitHub.com** и создайте новый репозиторий:
   - Название: `student-reports-app`
   - Сделайте его публичным
   - НЕ добавляйте README (у нас уже есть файлы)

2. **Загрузите код в GitHub:**
   ```bash
   cd /mnt/c/Users/angli/student-reports-app
   git init
   git add .
   git commit -m "Initial commit: Student Reports App"
   git branch -M main
   git remote add origin https://github.com/ВАШ_USERNAME/student-reports-app.git
   git push -u origin main
   ```

### Шаг 2: Деплой на Railway

1. **Зайдите на [railway.app](https://railway.app)**
2. **Войдите через GitHub**
3. **Создайте новый проект:**
   - Нажмите "New Project"
   - Выберите "Deploy from GitHub repo"
   - Найдите свой репозиторий `student-reports-app`

### Шаг 3: Настройка Backend

1. **Railway автоматически обнаружит папку `backend`**
2. **Добавьте переменные окружения:**
   - `NODE_ENV` = `production`
   - `JWT_SECRET` = `your-random-32-character-secret-key`
   - `PORT` = `3001`

3. **Railway автоматически создаст PostgreSQL базу данных**

### Шаг 4: Настройка Frontend

1. **Создайте второй сервис для frontend:**
   - В том же проекте нажмите "New Service"
   - Выберите тот же GitHub репозиторий
   - Railway обнаружит папку `frontend`

2. **Добавьте переменные окружения для frontend:**
   - `VITE_API_URL` = `https://ваш-backend-домен.railway.app/api`

### Шаг 5: Подключение сервисов

1. **В настройках frontend добавьте:**
   - `VITE_API_URL` = URL вашего backend сервиса

## 🎉 Готово!

После деплоя вы получите:
- **Frontend URL:** `https://ваш-frontend.railway.app`
- **Backend URL:** `https://ваш-backend.railway.app`

### 🔐 Доступ к приложению:
- Email: `teacher@demo.com`
- Пароль: `demo123`

### 💡 Преимущества Railway:
- ✅ Автоматическое развертывание
- ✅ Встроенная PostgreSQL база
- ✅ SSL сертификаты
- ✅ Автоматические обновления из GitHub
- ✅ Бесплатный план (с ограничениями)

### 🔄 Обновления:
Просто делайте `git push` - Railway автоматически обновит приложение!

---

## 🆘 Если что-то не работает:

1. **Проверьте логи в Railway Dashboard**
2. **Убедитесь, что все переменные окружения установлены**
3. **Проверьте, что backend и frontend URL правильно связаны**

### 📞 Нужна помощь?
Railway имеет отличную документацию и поддержку!