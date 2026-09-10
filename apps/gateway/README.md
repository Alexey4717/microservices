# Gateway

Публичный GraphQL API (Apollo, code-first). База данных отсутствует. Пользователи ходятся в `users` по gRPC.

Исходники в `src/` сгруппированы по типу (`resolvers/`, `controllers/`, `services/`, `guards/` и т.д.), а не по фичам. Новые GraphQL-резолверы кладите в `resolvers/`.

## Запуск

Из корня репозитория (после `docker compose up` и `pnpm run start:users`):

```bash
pnpm run start:gateway
```

Порт: `3000` (`PORT` в `.env`). GraphQL Playground в development: `/graphql`.

## GraphQL

Мутации: `register`, `login`, `refresh`, `logout`.  
Запрос: `me` — только с `Authorization: Bearer`, иначе 401.

## OAuth HTTP

Это единственный публичный REST на gateway:

- `GET /auth/google`, `GET /auth/google/callback`
- `GET /auth/github`, `GET /auth/github/callback`

Секреты Google/GitHub опциональны при старте. Без них парольный логин работает, OAuth-провайдер отклонит запрос.

Для туннеля (ngrok) задайте `OAUTH_CALLBACK_BASE_URL`.

## gRPC-клиент

`USERS_GRPC_URL` (по умолчанию `127.0.0.1:50051`). Каждый вызов:

- metadata `x-internal-token` = `INTERNAL_SERVICE_TOKEN`
- после JWT — metadata `user-id` (не из тела запроса клиента)

JWT проверяется на gateway тем же `JWT_SECRET`, что и в `users`.
