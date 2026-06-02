# VK Mini App — настройка

Студенческое мини-приложение ВКонтакте поверх готового бэкенда `/api/vk/*`.
Запускается внутри vk.com, показывает студенту его ДЗ и позволяет сдавать ответы.

## Что добавлено во фронт

| Файл | Назначение |
|---|---|
| `src/vk/launchParams.ts` | Захват и проброс подписанных launch-параметров VK (`vk_*` + `sign`) |
| `src/services/vkApi.ts` | API-клиент VK (форвардит launch-параметры в query, без редиректа на /login) |
| `src/components/vk/VKMiniApp.tsx` | Сам мини-апп: init → auth → привязка по Student ID → список ДЗ → сдача |
| роут `/vk` в `src/App.tsx` | Точка входа (без AuthProvider-логина — это студенты, не преподаватели) |

Зависимость: `@vkontakte/vk-bridge`.

## Поток работы

1. VK открывает iframe по адресу `https://tutorsdesk.ru/vk?vk_user_id=…&sign=…`.
2. `vk-bridge` шлёт `VKWebAppInit`, фронт зовёт `POST /api/vk/auth` (с launch-параметрами в query).
3. Бэкенд проверяет `sign` секретным ключом приложения и ищет студента по `vk_user_id`:
   - **привязан** → отдаём студента → показываем ДЗ (`GET /api/vk/homework`);
   - **не привязан** (404) → экран привязки → `POST /api/vk/link` со Student ID.
4. Сдача: `POST /api/vk/homework/:lessonId/submit` (пока текстовый ответ).

## Настройка в dev.vk.com

1. Создать **Mini App** (или взять существующий App ID).
2. В настройках приложения:
   - **Базовый URL / адрес iframe** → `https://tutorsdesk.ru/vk`
   - тип отображения — мобильное/десктоп по необходимости.
3. Скопировать **Защищённый ключ** (secret key) приложения.

## Настройка бэкенда

В `backend/.env` ключ `VK_SECRET_KEY` должен равняться **Защищённому ключу** того же приложения:

```
VK_SECRET_KEY=<защищённый ключ из dev.vk.com>
```

После изменения — перезапустить `pm2 restart student-reports-api`.

## Деплой фронта

```bash
cd frontend
npm install            # подтянуть @vkontakte/vk-bridge
npm run build          # dist/
# выложить dist/ туда, откуда nginx отдаёт фронт tutorsdesk.ru
```

⚠️ **SPA-фолбэк:** `/vk` — клиентский роут (BrowserRouter). В nginx-конфиге фронта
должен быть `try_files $uri /index.html;`, иначе прямой заход на `/vk` даст 404.

## TODO / на потом

- Загрузка файлов из VK (фото/документы) — сейчас только текст. Нужен flow
  `VKWebAppGetFile` / загрузка через VK API, поле `fileUrl` в `submit` уже готово.
- **Безопасность:** `GET /api/vk/homework/:lessonId/submissions` (сдачи для препода)
  сейчас БЕЗ авторизации — закрыть до публичного запуска.
