/**
 * Список Node-сервисов для `scripts/start-all.mjs`.
 *
 * Новый микросервис: `pnpm exec nest generate app <name>`, затем запись сюда
 * (port + waitFor, `build` — prod-скрипт). Отдельный npm-скрипт wait/start:after-* не нужен.
 * Поле `build` используется только в `start:all:prod`.
 * Опционально `color`: blue | magenta | cyan | yellow | green | red.
 * Если не задан — оркестратор берёт следующий цвет из этой палитры.
 */
export const WAIT_TIMEOUT_MS = 60_000;

export const services = [
  {
    name: 'users',
    command: 'pnpm exec nest start users --watch',
    prodCommand: 'node dist/apps/users/src/main.js',
    build: 'pnpm run build:users:prod',
    port: 50051,
    host: '127.0.0.1',
  },
  {
    name: 'gateway',
    command: 'pnpm exec nest start gateway --watch',
    prodCommand: 'node dist/apps/gateway/src/main.js',
    build: 'pnpm run build:gateway:prod',
    port: 3000,
    waitFor: ['users'],
  },
];
