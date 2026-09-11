# Users

Приватный gRPC-сервис. HTTP наружу не слушает. Данные — Prisma + PostgreSQL (логическая БД `users`). События — RabbitMQ (публикация в topic-exchange `users.events`, не в общую work-queue). Исходники сгруппированы по типу (`controllers/`, `services/`, `interceptors/`), а не по фичам.

## Запуск

```bash
docker compose up -d
pnpm run prisma:generate
pnpm run prisma:migrate
pnpm run start:users
```

gRPC: `127.0.0.1:50051` (не `0.0.0.0`). Postgres с хоста: порт **5433** (`DATABASE_URL` в `.env.example`).

## Методы AuthService (`package auth`)

- `Register` / `Login` / `OauthUpsert` / `Refresh` / `Logout` / `GetMe`

`OauthUpsert` создаёт или обновляет `User` + `OAuthAccount`. Если пользователь с таким email уже есть, аккаунт привязывается к нему. `passwordHash` может быть `null` (только OAuth).

## События

Публикация в exchange `users.events` (topic):

- `user.created` — после регистрации и после создания пользователя через OAuth. Payload: публичный профиль (`userId`, `email`, `name`, `avatarUrl`, `occurredAt`). Mailer берёт только `email`; gateway пишет полную проекцию.
- `user.updated` — когда пользователя не создают, а обновляют профиль (повторный OAuth / привязка аккаунта). Очередь gateway: `gateway.user-projections`, binding `user.#`.
- `user.authenticated` — после login и OAuth (отдельные очереди на этот ключ не подписаны)

## Безопасность

Глобальный interceptor отклоняет вызовы без `x-internal-token`. `GetMe` берёт id только из metadata `user-id`. Refresh-токены хранятся в виде SHA-256 хеша.
