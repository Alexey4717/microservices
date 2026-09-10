import { execFile, spawn, spawnSync } from 'node:child_process';
import { createConnection } from 'node:net';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { promisify } from 'node:util';
import waitOnPkg from 'wait-on';
import { WAIT_TIMEOUT_MS, services } from './services.mjs';

const waitOn = waitOnPkg?.default ?? waitOnPkg;
const execFileAsync = promisify(execFile);
const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const DEFAULT_HOST = '127.0.0.1';
const PORT_FREE_TIMEOUT_MS = 10_000;

const RESET = '\x1b[0m';
const COLORS = {
  blue: '\x1b[34m',
  magenta: '\x1b[35m',
  cyan: '\x1b[36m',
  yellow: '\x1b[33m',
  green: '\x1b[32m',
  red: '\x1b[31m',
};
const PALETTE = ['blue', 'magenta', 'cyan', 'yellow', 'green', 'red'];

const children = [];
let shuttingDown = false;
let exitCode = 0;

function colorsEnabled() {
  return Boolean(process.stdout.isTTY) && !process.env.NO_COLOR;
}

function resolveColorName(service, index) {
  const requested = service.color;
  if (typeof requested === 'string' && Object.hasOwn(COLORS, requested)) {
    return requested;
  }
  return PALETTE[index % PALETTE.length];
}

function buildPrefixMap() {
  const width = Math.max(0, ...services.map((service) => service.name.length));
  const enabled = colorsEnabled();
  const map = new Map();
  services.forEach((service, index) => {
    const label = `[${service.name.padEnd(width)}]`;
    if (!enabled) {
      map.set(service.name, label);
      return;
    }
    map.set(service.name, `${COLORS[resolveColorName(service, index)]}${label}${RESET}`);
  });
  return map;
}

const prefixes = buildPrefixMap();

function parseArgs(argv) {
  const rest = argv.filter((arg) => arg !== '--');
  const killPorts =
    rest.includes('--kill-ports') ||
    ['1', 'true', 'yes'].includes(String(process.env.KILL_PORTS ?? '').toLowerCase());
  const modeArg = rest.find((arg) => arg === 'dev' || arg === 'prod');
  const unknown = rest.filter(
    (arg) => arg !== '--kill-ports' && arg !== 'dev' && arg !== 'prod',
  );
  return { mode: modeArg ?? 'dev', killPorts, unknown };
}

function byName() {
  return new Map(services.map((service) => [service.name, service]));
}

function serviceHost(service) {
  return service.host ?? DEFAULT_HOST;
}

function tcpResource(service) {
  return `tcp:${serviceHost(service)}:${service.port}`;
}

function localAddressHasPort(local, port) {
  return local.endsWith(`:${port}`);
}

function topoSort(list) {
  const map = byName();
  const visited = new Set();
  const visiting = new Set();
  const ordered = [];

  function visit(name) {
    if (visited.has(name)) {
      return;
    }
    if (visiting.has(name)) {
      throw new Error(`Циклическая зависимость waitFor: ${name}`);
    }
    const service = map.get(name);
    if (!service) {
      throw new Error(`Неизвестный сервис в waitFor: ${name}`);
    }
    visiting.add(name);
    for (const dep of service.waitFor ?? []) {
      visit(dep);
    }
    visiting.delete(name);
    visited.add(name);
    ordered.push(service);
  }

  for (const service of list) {
    visit(service.name);
  }
  return ordered;
}

function isPortListening(host, port) {
  return new Promise((resolve) => {
    const socket = createConnection({ host, port });
    socket.setTimeout(400);
    const done = (inUse) => {
      socket.removeAllListeners();
      socket.destroy();
      resolve(inUse);
    };
    socket.on('connect', () => done(true));
    socket.on('timeout', () => done(false));
    socket.on('error', () => done(false));
  });
}

async function findPidsOnPort(port) {
  if (process.platform === 'win32') {
    try {
      const { stdout } = await execFileAsync('netstat', ['-ano'], {
        windowsHide: true,
      });
      const pids = new Set();
      for (const line of stdout.split(/\r?\n/)) {
        const parts = line.trim().split(/\s+/);
        if (parts.length < 5 || parts[0] !== 'TCP' || parts[3] !== 'LISTENING') {
          continue;
        }
        const pid = Number(parts[4]);
        if (localAddressHasPort(parts[1], port) && Number.isInteger(pid) && pid > 0) {
          pids.add(pid);
        }
      }
      return [...pids];
    } catch {
      return [];
    }
  }

  try {
    const { stdout } = await execFileAsync('lsof', [
      '-nP',
      `-iTCP:${port}`,
      '-sTCP:LISTEN',
      '-t',
    ]);
    return [
      ...new Set(
        stdout
          .trim()
          .split(/\s+/)
          .map(Number)
          .filter((pid) => Number.isInteger(pid) && pid > 0),
      ),
    ];
  } catch {
    return [];
  }
}

function formatPids(pids) {
  return pids.length ? pids.join(', ') : 'неизвестен';
}

function killPidTree(pid) {
  if (!pid || pid === process.pid || pid === 4) {
    return;
  }
  if (process.platform === 'win32') {
    spawnSync('taskkill', ['/PID', String(pid), '/T', '/F'], {
      stdio: 'ignore',
      windowsHide: true,
    });
    return;
  }
  try {
    process.kill(-pid, 'SIGTERM');
  } catch {
    try {
      process.kill(pid, 'SIGTERM');
    } catch {
      // already gone
    }
  }
}

function killChild(child) {
  if (!child?.pid) {
    return;
  }
  killPidTree(child.pid);
  if (process.platform !== 'win32') {
    setTimeout(() => {
      try {
        process.kill(-child.pid, 'SIGKILL');
      } catch {
        try {
          process.kill(child.pid, 'SIGKILL');
        } catch {
          // already gone
        }
      }
    }, 2000).unref?.();
  }
}

function killAllChildren() {
  for (const { child } of children) {
    killChild(child);
  }
}

function prefixStream(stream, prefix, dest) {
  let buffer = '';
  stream.on('data', (chunk) => {
    buffer += chunk.toString();
    const lines = buffer.split(/\r?\n/);
    buffer = lines.pop() ?? '';
    for (const line of lines) {
      dest.write(`${prefix} ${line}\n`);
    }
  });
  stream.on('end', () => {
    if (buffer.length > 0) {
      dest.write(`${prefix} ${buffer}\n`);
      buffer = '';
    }
  });
}

function spawnService(service, command) {
  const child = spawn(command, {
    cwd: root,
    env: process.env,
    shell: true,
    windowsHide: true,
    detached: process.platform !== 'win32',
    stdio: ['ignore', 'pipe', 'pipe'],
  });

  const prefix = prefixes.get(service.name) ?? `[${service.name}]`;
  prefixStream(child.stdout, prefix, process.stdout);
  prefixStream(child.stderr, prefix, process.stderr);

  child.on('error', (error) => {
    if (shuttingDown) {
      return;
    }
    console.error(`[start-all] Не удалось запустить ${service.name}: ${error.message}`);
    exitCode = 1;
    void shutdown(1);
  });

  child.on('exit', (code, signal) => {
    if (shuttingDown) {
      return;
    }
    const status = code ?? (signal ? 1 : 0);
    if (status !== 0) {
      console.error(
        `[start-all] ${service.name} завершился с кодом ${status}. Останавливаю остальные процессы.`,
      );
      exitCode = status;
      void shutdown(status);
    }
  });

  children.push({ name: service.name, child });
  return child;
}

async function waitForTcp(service, timeout = WAIT_TIMEOUT_MS) {
  await waitOn({
    resources: [tcpResource(service)],
    timeout,
    interval: 250,
    window: 250,
  });
}

async function waitUntilPortFree(service) {
  await waitOn({
    resources: [tcpResource(service)],
    reverse: true,
    timeout: PORT_FREE_TIMEOUT_MS,
    interval: 200,
    window: 200,
  });
}

function busyPortMessage(occupancy) {
  const lines = occupancy.map(({ service, pids }) => {
    const addr = `${serviceHost(service)}:${service.port}`;
    return `  ${service.name} (${addr}), PID: ${formatPids(pids)}`;
  });
  return [
    '[start-all] Порты уже заняты — похоже, предыдущий стек ещё работает (EADDRINUSE).',
    ...lines,
    'Остановите предыдущий `pnpm run start:all` / `start:all:dev` или завершите эти PID.',
    'Чтобы освободить порты стека: `pnpm run start:all -- --kill-ports`',
  ].join('\n');
}

async function ensurePorts({ killPorts }) {
  const occupancy = [];
  for (const service of services) {
    const inUse = await isPortListening(serviceHost(service), service.port);
    if (!inUse) {
      continue;
    }
    const pids = await findPidsOnPort(service.port);
    occupancy.push({ service, pids });
  }

  if (occupancy.length === 0) {
    return;
  }

  if (!killPorts) {
    throw new Error(busyPortMessage(occupancy));
  }

  for (const { service, pids } of occupancy) {
    console.log(
      `[start-all] --kill-ports: освобождаю ${serviceHost(service)}:${service.port} (${service.name}), PID: ${formatPids(pids)}`,
    );
    const targets = pids.length > 0 ? pids : [];
    for (const pid of targets) {
      killPidTree(pid);
    }
    if (targets.length === 0) {
      throw new Error(
        `[start-all] Порт ${serviceHost(service)}:${service.port} занят, но PID не найден. Освободите его вручную.`,
      );
    }
  }

  for (const { service } of occupancy) {
    try {
      await waitUntilPortFree(service);
    } catch {
      throw new Error(
        `[start-all] Не удалось освободить ${serviceHost(service)}:${service.port} после --kill-ports.`,
      );
    }
  }
}

function runBuild(service) {
  if (!service.build) {
    return;
  }
  console.log(`[start-all] Сборка ${service.name}: ${service.build}`);
  const result = spawnSync(service.build, {
    cwd: root,
    env: process.env,
    shell: true,
    stdio: 'inherit',
    windowsHide: true,
  });
  if (result.status !== 0) {
    throw new Error(
      `Сборка ${service.name} завершилась с кодом ${result.status ?? 1}`,
    );
  }
}

function commandFor(service, mode) {
  if (mode === 'prod') {
    return service.prodCommand ?? service.command;
  }
  return service.command;
}

async function shutdown(code = 0) {
  if (shuttingDown) {
    return;
  }
  shuttingDown = true;
  exitCode = code !== 0 ? code : exitCode;
  killAllChildren();
  process.exitCode = exitCode;
  setTimeout(() => process.exit(exitCode), 500).unref?.();
}

async function main() {
  const { mode, killPorts, unknown } = parseArgs(process.argv.slice(2));
  if (unknown.length > 0) {
    console.error(
      `Использование: node scripts/start-all.mjs [dev|prod] [--kill-ports]\nНеизвестные аргументы: ${unknown.join(' ')}`,
    );
    process.exit(1);
  }

  const ordered = topoSort(services);
  const lookup = byName();

  await ensurePorts({ killPorts });

  if (mode === 'prod') {
    for (const service of ordered) {
      runBuild(service);
    }
  }

  process.on('SIGINT', () => void shutdown(130));
  process.on('SIGTERM', () => void shutdown(143));

  for (const service of ordered) {
    for (const depName of service.waitFor ?? []) {
      const dep = lookup.get(depName);
      console.log(
        `[start-all] Жду ${depName} (${tcpResource(dep)}), таймаут ${WAIT_TIMEOUT_MS / 1000} с`,
      );
      try {
        await waitForTcp(dep);
      } catch (error) {
        console.error(
          `[start-all] Таймаут ожидания ${depName} на ${tcpResource(dep)}.`,
        );
        throw error;
      }
    }

    const command = commandFor(service, mode);
    console.log(`[start-all] Старт ${service.name}: ${command}`);
    spawnService(service, command);
  }

  await new Promise(() => {
    // Держим процесс, пока сервисы живут или не придёт сигнал.
  });
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  killAllChildren();
  process.exit(1);
});
