# Files

Приватный gRPC-сервис файлов (аватары и видео). Метаданные — Prisma + PostgreSQL (логическая БД `files`). Бинарные объекты — MinIO/S3. HTTP только внутренний health на `FILES_HOST`:`FILES_PORT` (по умолчанию `127.0.0.1:3002`). Публичные API на `0.0.0.0` не биндить.

Исходники сгруппированы по типу (`controllers/`, `services/`). GraphQL нет: аватары идут через gateway (`uploadAvatar`), ролики — через `createVideoUpload` / `completeVideoUpload` / `videos` / `video`.

## Запуск

Из корня репозитория (после `docker compose up` и заполненного `.env`):

```bash
pnpm run prisma:generate
pnpm run prisma:migrate:files
pnpm run start:files
```

gRPC: `127.0.0.1:50052` (не `0.0.0.0`). Health: `http://127.0.0.1:3002/health`.

MinIO API: `http://localhost:9000`. Консоль: [http://localhost:9001](http://localhost:9001) (логин/пароль локально: `minioadmin` / `minioadmin`, см. `.env.example`). Образы MinIO и `mc` Compose собирает из `docker/minio` (бинарники последнего релиза на GitHub: с Docker Hub и Quay их анонимно уже не скачать). Бакеты `avatars` и `videos` создаёт sidecar `minio-init` (анонимное скачивание + CORS для `http://localhost:4000` и `http://localhost:3000`, в том числе `PUT` и заголовки Range). В `.env` сервиса files нужен `S3_VIDEOS_BUCKET` (шаблон — `.env.example`).

Если том Postgres уже существовал, `init.sql` не выполнится повторно. Создайте БД вручную:

```bash
docker compose exec postgres psql -U postgres -c "CREATE DATABASE files;"
```

## Методы FilesService (`package files`)

- `UploadFile` — `filename`, `mime_type`, `bytes content`. Владелец только из metadata `user-id`. Нужен `x-internal-token`.

Разрешены `image/jpeg`, `image/png`, `image/webp`, `image/gif`. Лимит **2MB**. Ключ объекта: `{userId}/{fileId}.{ext}` в бакете `avatars` (`S3_BUCKET`). Старые объекты MinIO в v1 не удаляются. Публичный URL: `{S3_PUBLIC_BASE_URL}/{bucket}/{key}`.

## Видео

Отдельная таблица `Video` (модель `File` не расширяется). Бакет `videos` (`S3_VIDEOS_BUCKET`) на том же S3-клиенте, что и аватары. Файл больше лимита gRPC, поэтому байты идут мимо `bytes content`: браузер делает `PUT` на presigned URL.

- `CreateVideoUpload` — `title` 1–120 символов, `description` до 2000 (пустое можно), `filename`, MIME только `video/mp4` или `video/webm`, размер от 1 байта до **100 МБ**. Владелец только из metadata `user-id`. Пишет строку `PENDING`, ключ `{userId}/{videoId}.ext`. Ответ: `videoId` и presigned PUT примерно на 15 минут, подпись включает `Content-Type`.
- `CompleteVideoUpload` — только владелец. `HeadObject`: размер объекта должен совпасть с заявленным, затем статус `READY` и публичный URL `{S3_PUBLIC_BASE_URL}/videos/{key}`. Повторный вызов для уже `READY` того же владельца возвращает запись. Чужие и не `READY` в каталог не попадают.
- `ListVideos` — только `READY`, новые сверху, не больше 50.
- `GetVideo` — один `READY` ролик или not-found.

Просмотр — прогрессивная отдача одного файла. Плеер берёт публичный URL и сам шлёт `Range`; MinIO отвечает `206 Partial Content`. Gateway байты не проксирует. HLS, DASH и ffmpeg нет: исходный mp4/webm отдаётся как есть.

## Безопасность

Глобальный interceptor отклоняет gRPC без `x-internal-token`. HTTP health не требует токен. Client user id из GraphQL не принимается.
