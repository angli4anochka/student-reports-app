# ✅ Чеклист деплоя Frontend на Vercel

## 🎯 Готовность к деплою
✅ Backend работает на Vercel
✅ vercel.json обновлен с правильным backend URL
✅ .env настроен с правильным API URL
✅ package.json настроен для Vite build

---

## 📝 Пошаговая инструкция деплоя

### Шаг 1: Залить изменения на GitHub
```bash
cd /mnt/c/Users/angli/student-reports-app

# Добавить обновленный vercel.json
git add frontend/vercel.json

# Создать коммит
git commit -m "Update frontend vercel.json with correct backend URL"

# Отправить на GitHub
git push
```

---

### Шаг 2: Создать проект на Vercel для Frontend

1. Откройте [vercel.com](https://vercel.com)
2. Войдите через **GitHub** (если еще не вошли)
3. Нажмите **"Add New..." → Project**
4. Найдите репозиторий **`student-reports-app`**
5. Нажмите **"Import"**

---

### Шаг 3: Настройки проекта

#### 3.1 Основные настройки:
- **Project Name**: `student-reports-frontend` (или любое другое имя)
- **Framework Preset**: `Vite` (должно определиться автоматически)
- **Root Directory**: ⚠️ **ВАЖНО!** Нажмите **"Edit"** и выберите **`frontend`**

#### 3.2 Build Settings (должны автоматически заполниться):
- **Build Command**: `npm run build`
- **Output Directory**: `dist`
- **Install Command**: `npm install`

---

### Шаг 4: Environment Variables (Переменные окружения)

Нажмите **"Environment Variables"** и добавьте:

```
Name: VITE_API_URL
Value: https://backend2-xdwts1eql-angli4anochkas-projects.vercel.app/api
```

**⚠️ ВАЖНО**: Убедитесь, что URL заканчивается на `/api`!

---

### Шаг 5: Deploy

1. Проверьте все настройки еще раз:
   - ✅ Root Directory = `frontend`
   - ✅ Framework = Vite
   - ✅ Environment Variable добавлена

2. Нажмите **"Deploy"**

3. ⏳ Подождите 1-2 минуты пока идет сборка

4. После успешного деплоя вы увидите:
   - 🎉 **Congratulations!**
   - URL вашего приложения (например: `https://student-reports-frontend.vercel.app`)

---

### Шаг 6: Проверка работы

1. Откройте URL вашего frontend в браузере
2. Откройте DevTools (F12) → Console
3. Попробуйте войти в систему
4. Проверьте, что запросы идут к вашему backend

---

## 🔧 Настройки после первого деплоя

### Автоматические обновления
Теперь при каждом `git push` в ветку `main`:
- Vercel автоматически пересоберет frontend
- Изменения будут онлайн через 1-2 минуты

### Проверка логов
Если что-то не работает:
1. В Vercel перейдите в **Deployments**
2. Выберите ваш деплой
3. Нажмите **"View Function Logs"** или **"Build Logs"**

---

## 🐛 Возможные проблемы и решения

### Проблема: "Build failed"
**Решение**:
1. Проверьте Build Logs
2. Убедитесь, что `Root Directory = frontend`
3. Проверьте, что все зависимости установлены в `package.json`

### Проблема: "Cannot connect to backend"
**Решение**:
1. Проверьте Environment Variable `VITE_API_URL`
2. Убедитесь, что backend URL правильный
3. Проверьте CORS настройки в backend
4. Откройте backend URL в браузере и убедитесь, что он работает

### Проблема: Белый экран после деплоя
**Решение**:
1. Откройте DevTools → Console
2. Проверьте ошибки
3. Проверьте Network tab - идут ли запросы к API
4. Убедитесь, что `outputDirectory = dist`

### Проблема: 404 при переходе по страницам
**Решение**:
- Это нормально! `vercel.json` должен решить проблему с роутингом
- Если проблема осталась, добавьте в `vercel.json`:
```json
{
  "rewrites": [
    { "source": "/(.*)", "destination": "/index.html" }
  ]
}
```

---

## 📊 Текущая конфигурация

### Backend URL:
```
https://backend2-xdwts1eql-angli4anochkas-projects.vercel.app/api
```

### Frontend настройки:
- **Build**: `npm run build` (Vite)
- **Output**: `dist`
- **Environment**: `VITE_API_URL` настроен
- **Rewrites**: Настроены для проксирования к backend

### Файлы готовы:
- ✅ `frontend/vercel.json` - обновлен
- ✅ `frontend/.env` - настроен
- ✅ `frontend/package.json` - корректный

---

## 🎯 После деплоя

### Получите ссылки:
- **Frontend**: `https://ваш-frontend.vercel.app`
- **Backend**: `https://backend2-xdwts1eql-angli4anochkas-projects.vercel.app/api`

### Поделитесь с другими:
- Отправьте frontend URL кому нужно
- Все будут видеть актуальную версию
- Автоматические обновления при git push

---

## 💡 Дополнительные возможности

### Подключение домена
1. **Settings → Domains**
2. Нажмите **"Add"**
3. Введите ваш домен
4. Настройте DNS согласно инструкциям

### Preview деплои
- Каждый pull request создает preview URL
- Можно тестировать изменения перед merge

### Откат версии
1. **Deployments** → выберите старый деплой
2. Нажмите **"Promote to Production"**

---

## 🎉 Готово!

После деплоя у вас будет:
- ✅ Frontend на Vercel
- ✅ Backend на Vercel
- ✅ База данных на Supabase
- ✅ Автоматические обновления
- ✅ HTTPS сертификаты
- ✅ Глобальная CDN

**Полностью бесплатно!** 🚀

---

## 📞 Если нужна помощь

1. Проверьте логи в Vercel
2. Проверьте Console в браузере (F12)
3. Убедитесь, что все Environment Variables правильные
4. Проверьте, что Root Directory = `frontend`

**Удачи с деплоем! 🚀**
