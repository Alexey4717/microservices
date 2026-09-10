# Users

Приватный gRPC-сервис. HTTP наружу не слушает. Данные — Prisma + PostgreSQL (логическая БД `users`). События — RabbitMQ. Исходники сгруппированы по типу (`controllers/`, `services/`, `interceptors/`), а не по фичам.

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

- `user.created` — после регистрации и после создания пользователя через OAuth
- `user.authenticated` — после login и OAuth

## Безопасность

Глобальный interceptor отклоняет вызовы без `x-internal-token`. `GetMe` берёт id только из metadata `user-id`. Refresh-токены хранятся в виде SHA-256 хеша.
