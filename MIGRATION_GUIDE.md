# Миграция с Vercel на Railway (для WebSockets/RTC)

## Зачем мигрировать?

- ✅ Vercel serverless НЕ поддерживает WebSockets
- ✅ Railway поддерживает долгоживущие соединения
- ✅ Railway дешевле для backend ($5-10/мес vs $20+ на Vercel Pro)
- ✅ Сохраняем Vercel для frontend (бесплатно)

## Шаг 1: Подготовка

### 1.1 Создайте аккаунт на Railway.app
```
https://railway.app/
```
- Войдите через GitHub
- Бесплатно $5 кредитов для старта

### 1.2 Установите Railway CLI (опционально)
```bash
npm install -g @railway/cli
railway login
```

## Шаг 2: Настройка проекта для Railway

### 2.1 Обновите backend/package.json
```json
{
  "scripts": {
    "start": "node server.js",
    "dev": "nodemon src/server.ts",
    "build": "npx prisma generate && tsc",
    "railway:start": "npx prisma migrate deploy && node dist/server.js"
  }
}
```

### 2.2 Создайте Procfile в корне backend/
```
web: npm run railway:start
```

### 2.3 Обновите backend/src/server.ts для Railway
```typescript
const PORT = process.env.PORT || 3001;

// Railway предоставляет DATABASE_URL автоматически
// Ничего менять не нужно в Prisma!
```

## Шаг 3: Деплой на Railway

### Вариант А: Через Web UI (проще)

1. Зайдите на https://railway.app/new
2. Выберите "Deploy from GitHub repo"
3. Выберите ваш репозиторий `student-reports-app`
4. Root Directory: `/backend`
5. Нажмите "Deploy"

### Вариант Б: Через CLI

```bash
cd backend
railway init
railway up
```

## Шаг 4: Добавьте PostgreSQL на Railway

1. В проекте Railway нажмите "New"
2. Выберите "Database" → "PostgreSQL"
3. Railway автоматически свяжет DATABASE_URL

ИЛИ используйте существующий Supabase:
1. Settings → Variables
2. Добавьте `DATABASE_URL` из вашего Supabase

## Шаг 5: Настройте переменные окружения

В Railway Settings → Variables добавьте:

```
DATABASE_URL=postgresql://... (из Supabase или Railway Postgres)
JWT_SECRET=your-super-secret-jwt-key-change-this-in-production
NODE_ENV=production
```

## Шаг 6: Обновите Frontend

### 6.1 Обновите frontend/.env
```
VITE_API_URL=https://your-app.up.railway.app/api
```

### 6.2 Обновите CORS в backend/src/server.ts
```typescript
app.use(cors({
  origin: [
    'http://localhost:5173',
    'https://student-reports-app.vercel.app',
    'https://your-frontend-domain.vercel.app'
  ],
  credentials: true
}));
```

## Шаг 7: Деплой frontend на Vercel

```bash
cd frontend
npm run build
# Vercel автоматически задеплоит через GitHub
```

## Шаг 8: Добавьте WebSockets (Socket.io)

### 8.1 Установите Socket.io
```bash
cd backend
npm install socket.io
npm install --save-dev @types/socket.io
```

### 8.2 Обновите backend/src/server.ts
```typescript
import { Server as SocketServer } from 'socket.io';
import http from 'http';

const app = express();
const server = http.createServer(app);

const io = new SocketServer(server, {
  cors: {
    origin: [
      'http://localhost:5173',
      'https://student-reports-app.vercel.app'
    ],
    credentials: true
  }
});

// WebSocket connections
io.on('connection', (socket) => {
  console.log('Client connected:', socket.id);

  // Пример: real-time обновления расписания
  socket.on('schedule:update', (data) => {
    io.emit('schedule:updated', data);
  });

  socket.on('disconnect', () => {
    console.log('Client disconnected:', socket.id);
  });
});

// Замените app.listen на server.listen
server.listen(PORT, () => {
  console.log(`🚀 Server running on port ${PORT}`);
});
```

### 8.3 Во frontend установите Socket.io client
```bash
cd frontend
npm install socket.io-client
```

### 8.4 Создайте frontend/src/services/socket.ts
```typescript
import { io } from 'socket.io-client';

const SOCKET_URL = import.meta.env.VITE_API_URL?.replace('/api', '') || 'http://localhost:3001';

export const socket = io(SOCKET_URL, {
  autoConnect: true,
  reconnection: true
});

socket.on('connect', () => {
  console.log('Connected to WebSocket');
});

socket.on('disconnect', () => {
  console.log('Disconnected from WebSocket');
});
```

### 8.5 Используйте в компонентах
```typescript
import { socket } from '../services/socket';
import { useEffect } from 'react';

function TeacherSchedule() {
  useEffect(() => {
    // Слушаем обновления
    socket.on('schedule:updated', (data) => {
      console.log('Schedule updated!', data);
      loadSchedule(); // Перезагрузить данные
    });

    return () => {
      socket.off('schedule:updated');
    };
  }, []);

  const saveSchedule = async (data) => {
    await api.saveSchedule(data);
    // Уведомить всех клиентов
    socket.emit('schedule:update', data);
  };
}
```

## Шаг 9: Добавьте WebRTC (Livekit)

### 9.1 Зарегистрируйтесь на Livekit Cloud
```
https://livekit.io/
```

### 9.2 Установите Livekit SDK
```bash
cd frontend
npm install @livekit/components-react livekit-client

cd backend
npm install livekit-server-sdk
```

### 9.3 Backend API для создания токенов
```typescript
// backend/src/routes/video.ts
import { AccessToken } from 'livekit-server-sdk';

router.post('/token', async (req, res) => {
  const { roomName, participantName } = req.body;

  const at = new AccessToken(
    process.env.LIVEKIT_API_KEY,
    process.env.LIVEKIT_API_SECRET,
    {
      identity: participantName,
    }
  );

  at.addGrant({ roomJoin: true, room: roomName });

  const token = at.toJwt();
  res.json({ token });
});
```

### 9.4 Frontend компонент видео
```typescript
import { LiveKitRoom, VideoConference } from '@livekit/components-react';
import '@livekit/components-styles';

function VideoLesson() {
  const [token, setToken] = useState('');

  const joinRoom = async () => {
    const response = await api.post('/video/token', {
      roomName: 'lesson-123',
      participantName: user.fullName
    });
    setToken(response.token);
  };

  return (
    <LiveKitRoom
      token={token}
      serverUrl={import.meta.env.VITE_LIVEKIT_URL}
    >
      <VideoConference />
    </LiveKitRoom>
  );
}
```

## Стоимость

### Railway (Backend + DB):
- **Hobby Plan**: $5/мес (512MB RAM, включает PostgreSQL)
- **Pro Plan**: $20/мес (8GB RAM, автоскейлинг)

### Supabase (только Storage):
- **Free**: 1GB storage
- **Pro**: $25/мес (100GB storage, real-time)

### Livekit (Видео):
- **Free**: 50 участников одновременно
- **Cloud**: $0.01/мин после бесплатного лимита

### Vercel (Frontend):
- **Free**: Unlimited для personal проектов

**ИТОГО для старта: $5-10/мес** (Railway Hobby + Supabase Free)

## Преимущества новой архитектуры

✅ WebSockets для real-time обновлений
✅ WebRTC для видео уроков
✅ Масштабируемость
✅ Меньше ограничений чем на Vercel Serverless
✅ Полный контроль над backend
✅ Легко добавить новые фичи

## Поддержка

- Railway Discord: https://discord.gg/railway
- Livekit Docs: https://docs.livekit.io/
- Socket.io Guide: https://socket.io/docs/v4/

---

Создано с ❤️ и Claude Code
