# Web client

Браузерный клиент на Next.js. Ходит только на публичный GraphQL gateway (`http://localhost:3000/graphql`).

## Запуск

Сначала поднимите бэкенд из корня репозитория (`pnpm run start:all`), затем фронт:

```bash
pnpm run start:web
```

Или из каталога приложения: `pnpm --filter web-client dev`.

Откройте [http://localhost:4000](http://localhost:4000).

Шаблон переменных — `.env.example` (`NEXT_PUBLIC_GRAPHQL_URL`). Не коммитьте `.env`.

## Скрипты из корня

| Команда                   | Назначение            |
| ------------------------- | --------------------- |
| `pnpm run start:web`      | `next dev` на 4000    |
| `pnpm run build:web`      | `next build`          |
| `pnpm run start:web:prod` | `next start` на 4000  |
| `pnpm run lint:web`       | ESLint этого пакета   |
| `pnpm run format:web`     | Prettier этого пакета |

Корневые `pnpm lint` / `format` / тесты Nest `apps/web-client` не трогают.
