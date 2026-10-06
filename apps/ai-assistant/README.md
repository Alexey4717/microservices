# AI Assistant

Приватный сервис чата с моделью. Публичный GraphQL — только на gateway: `aiConversations`, `aiConversation`, `createAiConversation`, подписка `aiAssistantReply`. Между gateway и сервисом — gRPC, ответ модели идёт server stream. Браузер получает токены через graphql-sse, не через WebSocket.

HTTP на ai-assistant — только `GET /health`. gRPC слушает `127.0.0.1:50054`. Публичные API на `0.0.0.0` не биндить.

Исходники сгруппированы по типу (`controllers/`, `services/`, `interceptors/`). User id берётся из metadata `user-id`, не из текста клиента и не из аргументов модели.

## После внедрения

Если том Postgres уже существовал, `init.sql` не создаст БД повторно:

```bash
docker compose exec postgres psql -U postgres -c "CREATE DATABASE ai_assistant;"
```

Дальше:

```bash
pnpm run prisma:generate
pnpm run prisma:migrate:ai-assistant
pnpm run start:all
```

Скопируйте новые ключи из `.env.example` в локальный `.env` (не коммитьте `.env`). `AI_ASSISTANT_DAILY_TOKEN_LIMIT=0` снимает дневной лимит. Модель по умолчанию — локальная Ollama: `LLM_BASE_URL=http://127.0.0.1:11434/v1`, `LLM_MODEL=gemma4:12b`.

Проверка: login → страница `/ai-assistant` → новый диалог → сообщение. Ответ дописывается в последнюю реплику ассистента.

## Методы AiAssistantService (`package ai_assistant`)

- `CreateConversation` / `ListConversations` / `GetConversation` — unary. Чужой `conversationId` не читается и не пишется.
- `SendMessage` — server stream `{ conversationId, messageId, delta, done }`. Сначала сохраняется реплика пользователя, затем вызывается модель. Промежуточные `tool_calls` в поток не попадают. После `done` сохраняется сообщение ассистента.

Инструменты только на чтение: `get_my_profile` (users `GetMe`) и `list_my_payments` (payments `ListMyPayments`, не больше 20 последних). Запись оплат и смена профиля модели недоступны.

gRPC требует `x-internal-token`. Health HTTP — нет.
