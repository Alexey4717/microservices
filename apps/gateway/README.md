# Gateway

Публичный GraphQL API (Apollo, code-first). Есть только read-model публичного профиля (Prisma, логическая БД `gateway`) — не source of truth. Команды аутентификации ходят в `users` по gRPC. Проекция синхронизируется write-through после успешного gRPC и событиями RabbitMQ: `user.created` пишет полный публичный профиль, `user.updated` — последующие oauth-update.

Исходники в `src/` сгруппированы по типу (`resolvers/`, `controllers/`, `services/`, `guards/` и т.д.), а не по фичам. Новые GraphQL-резолверы кладите в `resolvers/`.

## Запуск

Из корня репозитория (после `docker compose up`, `pnpm run prisma:migrate:gateway` и `pnpm run start:users`):

```bash
pnpm run start:gateway
```

Порт: `3000` (`PORT` в `.env`). GraphQL Playground в development: `/graphql`. Нужны `GATEWAY_DATABASE_URL` и `RABBITMQ_URL`. CORS: `CORS_ORIGIN` (по умолчанию `http://localhost:4000` для `apps/web-client`), с `credentials: true`, чтобы браузер мог принять cookie сессии.

## GraphQL

Мутации: `register`, `login`, `refresh`, `logout`, `updateMe`, `uploadAvatar`.  
Запрос: `me` — только с `Authorization: Bearer`, иначе 401. Если `users` временно недоступен, `me` отдаёт проекцию при уже записанном профиле.

`updateMe(input: UpdateMeInput!)` меняет `name` и/или `avatarUrl` текущего пользователя (id из JWT). `uploadAvatar(file: Upload!)` — multipart, лимит 2MB; затем gateway ставит `avatarUrl` через `UpdateMe`. Пример curl — в корневом README. Нужны `FILES_GRPC_URL` и `USERS_GRPC_URL`.

После успешного `register` / `login` / `refresh` gateway пишет httpOnly-cookie `refresh-token` (`Path=/`, `SameSite=Lax`, `Secure` только в production, `maxAge` из `JWT_REFRESH_TTL`). `Domain` не задаётся. `refresh` ротирует токен: старый отзывается, в Set-Cookie приходит новый. `logout` вызывает `clearCookie` для `refresh-token`.

`refresh` и `logout` читают токен из cookie; поле `input.refreshToken` опционально (для Playground). Если нет ни cookie, ни input — 401. Access token по-прежнему возвращается в теле ответа; cookie — источник refresh-токена для веб-клиента.

## OAuth HTTP

Это единственный публичный REST на gateway:

- `GET /auth/google`, `GET /auth/google/callback`
- `GET /auth/github`, `GET /auth/github/callback`

Секреты Google/GitHub опциональны при старте. Без них парольный логин работает, OAuth-провайдер отклонит запрос.

После успеха, если задан `OAUTH_SUCCESS_REDIRECT_URL` (для веб-клиента: `http://localhost:4000/auth/callback`), gateway редиректит туда с токенами в hash. Отмена согласия на callback уводит на `{origin}/login?error=oauth`.

Для туннеля запустите `pnpm run ngrok:dev` в отдельном терминале и задайте `OAUTH_CALLBACK_BASE_URL` на публичный **https**-URL ngrok целиком, включая `.ngrok-free.app`.

## gRPC-клиент

`USERS_GRPC_URL` (по умолчанию `127.0.0.1:50051`) и `FILES_GRPC_URL` (`127.0.0.1:50052`). Каждый вызов:

- metadata `x-internal-token` = `INTERNAL_SERVICE_TOKEN`
- после JWT — metadata `user-id` (не из тела запроса клиента) для `GetMe`, `UpdateMe`, `UploadFile`

JWT проверяется на gateway тем же `JWT_SECRET`, что и в `users`.
