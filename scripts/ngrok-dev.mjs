import { spawn } from 'node:child_process';
import { createRequire } from 'node:module';
import { existsSync } from 'node:fs';
import net from 'node:net';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { config } from 'dotenv';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
config({ path: join(root, '.env') });

const port = process.env.PORT || '3000';
const upstream = `127.0.0.1:${port}`;
const token = (process.env.NGROK_AUTHTOKEN ?? '').trim();

if (!token) {
  console.error(
    'NGROK_AUTHTOKEN не задан. Возьмите токен на https://dashboard.ngrok.com/get-started/your-authtoken и добавьте в .env (см. .env.example). Глобальный `ngrok config` для бинарника из node_modules не используется.',
  );
  process.exit(1);
}

function resolveNgrokBin() {
  const require = createRequire(import.meta.url);
  const pkgDir = dirname(require.resolve('ngrok', { paths: [root] }));
  const exe = join(
    pkgDir,
    'bin',
    process.platform === 'win32' ? 'ngrok.exe' : 'ngrok',
  );
  if (!existsSync(exe)) {
    console.error(
      `Бинарник ngrok не найден: ${exe}. Выполните pnpm install.`,
    );
    process.exit(1);
  }
  return exe;
}

function portListening(portNum) {
  return new Promise((resolve) => {
    const socket = net.connect(
      { host: '127.0.0.1', port: Number(portNum) },
      () => {
        socket.end();
        resolve(true);
      },
    );
    socket.setTimeout(1000, () => {
      socket.destroy();
      resolve(false);
    });
    socket.on('error', () => resolve(false));
  });
}

async function printPublicUrl() {
  for (let i = 0; i < 40; i += 1) {
    try {
      const res = await fetch('http://127.0.0.1:4040/api/tunnels');
      if (res.ok) {
        const data = await res.json();
        const tunnel = data.tunnels?.find((t) =>
          t.public_url?.startsWith('https://'),
        );
        if (tunnel?.public_url) {
          const url = tunnel.public_url.replace(/\/$/, '');
          process.stderr.write(
            `\nПубличный URL (копируйте целиком, включая .ngrok-free.app):\n${url}\nGraphQL: ${url}/graphql\nЛокально: ${tunnel.config?.addr ?? `http://${upstream}`}\nWeb Interface: http://127.0.0.1:4040\n\n`,
          );
          return;
        }
      }
    } catch {
      // inspector ещё не поднялся
    }
    await new Promise((r) => setTimeout(r, 250));
  }
}

if (!(await portListening(port))) {
  console.warn(
    `На 127.0.0.1:${port} никто не слушает. Сначала запустите gateway: pnpm run start:all (или pnpm run start:gateway). Туннель всё равно будет создан.`,
  );
}

const child = spawn(resolveNgrokBin(), ['http', upstream, `--authtoken=${token}`], {
  cwd: root,
  env: process.env,
  stdio: 'inherit',
});

printPublicUrl();

const forward = (signal) => {
  if (child.exitCode === null && !child.killed) {
    child.kill(signal);
  }
};

process.on('SIGINT', () => forward('SIGINT'));
process.on('SIGTERM', () => forward('SIGTERM'));

child.on('error', (err) => {
  console.error(err.message);
  process.exit(1);
});

child.on('close', (code, signal) => {
  if (signal) {
    process.exit(1);
  }
  process.exit(code ?? 0);
});
