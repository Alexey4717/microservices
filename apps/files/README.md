# Files

Приватный gRPC-сервис файлов (аватары). Метаданные — Prisma + PostgreSQL (логическая БД `files`). Бинарные объекты — MinIO/S3. HTTP только внутренний health на `FILES_HOST`:`FILES_PORT` (по умолчанию `127.0.0.1:3002`). Публичные API на `0.0.0.0` не биндить.

Исходники сгруппированы по типу (`controllers/`, `services/`, `interceptors/`). GraphQL нет: загрузка идёт через gateway (`uploadAvatar`).

## Запуск

Из корня репозитория (после `docker compose up` и заполненного `.env`):

```bash
pnpm run prisma:generate
pnpm run prisma:migrate:files
pnpm run start:files
```

gRPC: `127.0.0.1:50052` (не `0.0.0.0`). Health: `http://127.0.0.1:3002/health`.

MinIO API: `http://localhost:9000`. Консоль: [http://localhost:9001](http://localhost:9001) (логин/пароль локально: `minioadmin` / `minioadmin`, см. `.env.example`). Образы в compose — `quay.io/minio/minio` и `quay.io/minio/mc` (Docker Hub `minio/minio` без логина часто недоступен). Бакет `avatars` создаёт sidecar `minio-init` (анонимное скачивание + CORS для `http://localhost:4000` и `http://localhost:3000`).

Если том Postgres уже существовал, `init.sql` не выполнится повторно. Создайте БД вручную:

```bash
docker compose exec postgres psql -U postgres -c "CREATE DATABASE files;"
```

## Методы FilesService (`package files`)

- `UploadFile` — `filename`, `mime_type`, `bytes content`. Владелец только из metadata `user-id`. Нужен `x-internal-token`.

Разрешены `image/jpeg`, `image/png`, `image/webp`, `image/gif`. Лимит **2MB**. Ключ объекта: `{userId}/{fileId}.{ext}` в бакете `avatars`. Старые объекты MinIO в v1 не удаляются. Публичный URL: `{S3_PUBLIC_BASE_URL}/{bucket}/{key}`.

## Безопасность

Глобальный interceptor отклоняет gRPC без `x-internal-token`. HTTP health не требует токен. Client user id из GraphQL не принимается.
