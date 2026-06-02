# Стратегия хранения для 100GB+ данных

## 🎯 Главный вопрос: Что именно 100GB?

### Сценарий A: Файлы (видео, материалы, презентации) - 95GB
**База данных**: 2-5GB (пользователи, оценки, расписания)
**Файлы**: 95-100GB (видео уроки, PDF, презентации)

✅ **Это самый вероятный вариант для образовательной платформы**

### Сценарий B: База данных - 100GB
**База данных**: 100GB (миллионы записей)
**Файлы**: небольшие

❌ Маловероятно для вашего случая, но рассмотрим

---

## 💾 Решение для Сценария A (рекомендуется)

### Архитектура "Hybrid Storage"

```
┌─────────────────────────────────────────────┐
│           Frontend (Vercel - FREE)          │
│   React + Upload to Cloudflare R2 direct   │
└─────────────────────────────────────────────┘
                    ↓
┌─────────────────────────────────────────────┐
│        Backend (Railway - $5-20/мес)        │
│  Node.js + WebSockets + Auth + Metadata    │
└─────────────────────────────────────────────┘
         ↓                           ↓
┌──────────────────┐      ┌──────────────────────┐
│  Database (БД)   │      │   Files (Файлы)      │
│  Supabase/Neon   │      │   Cloudflare R2      │
│  5-10GB          │      │   100GB              │
│  $25/мес         │      │   $1.50/мес          │
└──────────────────┘      └──────────────────────┘
                                   ↓
                          ┌──────────────────────┐
                          │   CDN (Cloudflare)   │
                          │   Раздача файлов     │
                          │   БЕСПЛАТНО          │
                          └──────────────────────┘

ИТОГО: ~$26.50-46.50/мес
```

### Что где хранить:

**PostgreSQL Database (5-10GB):**
- ✅ Пользователи (users)
- ✅ Группы (groups)
- ✅ Студенты (students)
- ✅ Оценки (grades)
- ✅ Посещаемость (attendance)
- ✅ Расписания (schedules)
- ✅ **Метаданные файлов** (file_metadata)
  - ID файла
  - URL в R2
  - Название
  - Размер
  - Дата загрузки
  - Кто загрузил

**Cloudflare R2 (100GB):**
- ✅ Видео уроков
- ✅ PDF материалы
- ✅ Презентации (PPT, Google Slides)
- ✅ Изображения
- ✅ Домашние задания студентов
- ✅ Записи уроков

### Настройка Cloudflare R2

#### 1. Создайте R2 Bucket

```bash
# Зайдите на Cloudflare Dashboard
# R2 Object Storage → Create bucket
# Имя: student-materials
```

#### 2. Создайте API токен

```
R2 → Manage R2 API Tokens → Create API Token
Permissions: Object Read & Write
```

#### 3. Установите AWS SDK (R2 совместим с S3)

```bash
cd backend
npm install @aws-sdk/client-s3 @aws-sdk/s3-request-presigner
```

#### 4. Настройте backend/src/services/storage.ts

```typescript
import { S3Client, PutObjectCommand, GetObjectCommand } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';

const s3Client = new S3Client({
  region: 'auto',
  endpoint: process.env.R2_ENDPOINT, // https://account-id.r2.cloudflarestorage.com
  credentials: {
    accessKeyId: process.env.R2_ACCESS_KEY_ID,
    secretAccessKey: process.env.R2_SECRET_ACCESS_KEY,
  },
});

const BUCKET_NAME = 'student-materials';

export async function uploadFile(
  file: Buffer,
  fileName: string,
  contentType: string
): Promise<string> {
  const key = `${Date.now()}-${fileName}`;

  await s3Client.send(
    new PutObjectCommand({
      Bucket: BUCKET_NAME,
      Key: key,
      Body: file,
      ContentType: contentType,
    })
  );

  // Публичный URL через Cloudflare CDN
  return `https://cdn.yourdomain.com/${key}`;
}

export async function getDownloadUrl(key: string): Promise<string> {
  // Временный signed URL (expires in 1 hour)
  const command = new GetObjectCommand({
    Bucket: BUCKET_NAME,
    Key: key,
  });

  return await getSignedUrl(s3Client, command, { expiresIn: 3600 });
}
```

#### 5. API endpoint для загрузки файлов

```typescript
// backend/src/routes/files.ts
import multer from 'multer';
import { uploadFile } from '../services/storage';

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 100 * 1024 * 1024 } // 100MB max
});

router.post('/upload', upload.single('file'), async (req, res) => {
  try {
    const file = req.file;
    if (!file) {
      return res.status(400).json({ error: 'No file uploaded' });
    }

    // Upload to R2
    const fileUrl = await uploadFile(
      file.buffer,
      file.originalname,
      file.mimetype
    );

    // Save metadata to PostgreSQL
    const fileMetadata = await prisma.fileMetadata.create({
      data: {
        fileName: file.originalname,
        fileUrl: fileUrl,
        fileSize: file.size,
        mimeType: file.mimetype,
        uploadedBy: req.user.id,
        groupId: req.body.groupId, // optional
      }
    });

    res.json(fileMetadata);
  } catch (error) {
    console.error('File upload error:', error);
    res.status(500).json({ error: 'Upload failed' });
  }
});
```

#### 6. Frontend upload компонент

```typescript
// frontend/src/components/FileUpload.tsx
import { useState } from 'react';
import { api } from '../services/api';

export function FileUpload({ groupId }: { groupId?: string }) {
  const [uploading, setUploading] = useState(false);
  const [progress, setProgress] = useState(0);

  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const formData = new FormData();
    formData.append('file', file);
    if (groupId) formData.append('groupId', groupId);

    setUploading(true);

    try {
      const response = await fetch(
        `${import.meta.env.VITE_API_URL}/files/upload`,
        {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${localStorage.getItem('token')}`,
          },
          body: formData,
        }
      );

      const data = await response.json();
      console.log('File uploaded:', data);
      alert('Файл загружен успешно!');
    } catch (error) {
      console.error('Upload error:', error);
      alert('Ошибка загрузки');
    } finally {
      setUploading(false);
    }
  };

  return (
    <div>
      <input
        type="file"
        onChange={handleUpload}
        disabled={uploading}
        accept="video/*,application/pdf,image/*,.ppt,.pptx"
      />
      {uploading && <div>Загрузка... {progress}%</div>}
    </div>
  );
}
```

### Добавьте модель в schema.prisma

```prisma
model FileMetadata {
  id          String   @id @default(uuid())
  fileName    String
  fileUrl     String   // URL in R2
  fileSize    Int      // bytes
  mimeType    String
  uploadedBy  String
  groupId     String?

  uploader    User     @relation(fields: [uploadedBy], references: [id])
  group       Group?   @relation(fields: [groupId], references: [id])

  createdAt   DateTime @default(now())
  updatedAt   DateTime @updatedAt

  @@index([uploadedBy])
  @@index([groupId])
  @@map("file_metadata")
}
```

### Стоимость для 100GB файлов

**Cloudflare R2:**
- Хранение: $0.015/GB/мес × 100GB = **$1.50/мес**
- Egress (скачивание): **$0** (бесплатно!)
- Операции: 10M Class A бесплатно
- **Итого: ~$1.50-2/мес**

**Сравнение с другими:**
- AWS S3: $2.30/мес хранение + $9/100GB скачивания = **$11.30/мес**
- Supabase Storage: $0.021/GB × 100GB = **$2.10/мес** + bandwidth
- Backblaze B2: $0.006/GB × 100GB = **$0.60/мес** (тоже хорошо!)

---

## 💽 Решение для Сценария B (если действительно 100GB в БД)

### Если у вас миллионы записей в PostgreSQL:

**Лучшие варианты:**

1. **Neon PostgreSQL** - $69/мес
   - 200GB включено
   - Serverless autoscaling
   - Branch для dev/staging
   - ⭐ Рекомендую

2. **DigitalOcean Managed PostgreSQL** - $60/мес
   - 2 CPU, 2GB RAM, 100GB SSD
   - Automatic backups
   - Connection pooling

3. **AWS RDS PostgreSQL** - $85/мес
   - db.t3.small (2GB RAM)
   - 100GB storage
   - + $30 для backups

### Оптимизация большой БД:

```sql
-- Партиционирование по датам
CREATE TABLE grades_2024 PARTITION OF grades
FOR VALUES FROM ('2024-01-01') TO ('2025-01-01');

CREATE TABLE grades_2025 PARTITION OF grades
FOR VALUES FROM ('2025-01-01') TO ('2026-01-01');

-- Архивирование старых данных
-- Переместить старые оценки в дешевую БД
```

**Гибридный подход:**
- **Активная БД** (10-20GB): Supabase/Railway ($25/мес)
  - Текущий год
  - Часто используемые данные
- **Архивная БД** (80GB): Cheap PostgreSQL ($15/мес)
  - Прошлые годы
  - Редко используется
- **Итого: $40/мес** вместо $69

---

## 📊 Итоговые рекомендации

### Для образовательной платформы (наиболее вероятно):

```
Frontend: Vercel (FREE)
Backend: Railway ($5-20)
Database: Supabase Pro ($25) - 10GB
  └── Пользователи, оценки, расписания
Files: Cloudflare R2 ($2) - 100GB
  └── Видео, PDF, презентации
CDN: Cloudflare (FREE)
WebSockets: Socket.io на Railway
Video Calls: Livekit ($0.01/мин при использовании)

ИТОГО: $32-47/мес базовая стоимость
+ видео звонки по факту использования
```

### Распределение данных:

| Тип данных | Размер | Где хранить | Цена |
|------------|--------|-------------|------|
| Users, Groups, Students | 100MB | PostgreSQL | $25 |
| Grades, Attendance | 2-5GB | PostgreSQL | включено |
| Schedules, Lessons | 100MB | PostgreSQL | включено |
| **Метаданные файлов** | 50MB | PostgreSQL | включено |
| **Видео уроки** | 70GB | R2 | $1.05 |
| **PDF материалы** | 20GB | R2 | $0.30 |
| **Презентации** | 10GB | R2 | $0.15 |
| **ИТОГО** | ~100GB | | **~$26.50/мес** |

---

## 🚀 План действий

### Этап 1: Анализ (сейчас)
```bash
# Проверьте текущий размер БД
cd backend
npx prisma studio
# или подключитесь к Supabase Dashboard → Database → Tables

# Посмотрите размеры таблиц
```

### Этап 2: Настройка R2 (1-2 часа)
1. Создать Cloudflare R2 bucket
2. Получить API токены
3. Настроить upload в backend
4. Добавить FileMetadata модель в Prisma

### Этап 3: Миграция (если нужно)
1. Если файлов мало - оставайтесь на Supabase Storage
2. Если много - переезжайте на R2
3. Скрипт для миграции файлов

### Этап 4: Мониторинг
- Следите за ростом данных
- Оптимизируйте по мере роста
- Архивируйте старые данные

---

## 💰 Калькулятор стоимости

### Текущее использование (оценка):
- Студентов: ____ × 10KB = ____
- Оценок в месяц: ____ × 1KB = ____
- Видео в месяц: ____ × 500MB = ____
- PDF в месяц: ____ × 5MB = ____

### При росте до 1000 студентов:
- БД: ~15-20GB → Supabase Pro $25 или Neon $69
- Файлы: ~200-300GB → R2 $3-4.50/мес
- **Итого: $28-73/мес**

---

## ❓ Вопросы для принятия решения

1. **Сколько видео планируете загружать в месяц?**
   - 10 видео × 500MB = 5GB → $0.075/мес
   - 100 видео × 500MB = 50GB → $0.75/мес

2. **Сколько студентов планируете?**
   - 100 студентов = ~5GB БД → Supabase Free/Pro
   - 1000+ студентов = ~20GB БД → Neon $69

3. **Нужны ли видео звонки?**
   - Да → добавьте Livekit
   - Нет → экономьте

4. **Хранить записи уроков?**
   - Да → нужен R2
   - Нет → можно обойтись меньшим

---

Создано с ❤️ и Claude Code
