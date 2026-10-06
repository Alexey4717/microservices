import { existsSync, readFileSync } from 'node:fs';
import path from 'node:path';

const LIBS_IMPORT = /^@libs\/([^/]+)(?:\/.*)?$/;

const packageNameCache = new Map();
const consumersCache = new Map();

/** @type {import('eslint').Rule.RuleModule} */
const allowedConsumersRule = {
  meta: {
    type: 'problem',
    docs: {
      description:
        'Импорт @libs/<name> разрешён только пакетам из consumers этой библиотеки',
    },
    schema: [],
    messages: {
      closed:
        'Библиотека @libs/{{name}} закрыта: в её package.json нет поля consumers.',
      denied:
        'Пакет {{importer}} не входит в consumers @libs/{{name}} ({{consumers}}).',
      unknownImporter:
        'Не найден package.json импортёра для {{source}} ({{filename}}).',
    },
  },
  create(context) {
    return {
      ImportDeclaration(node) {
        checkSource(context, node.source);
      },
      ExportAllDeclaration(node) {
        checkSource(context, node.source);
      },
      ExportNamedDeclaration(node) {
        checkSource(context, node.source);
      },
      ImportExpression(node) {
        checkSource(context, node.source);
      },
      CallExpression(node) {
        if (
          node.callee.type === 'Identifier' &&
          node.callee.name === 'require' &&
          node.arguments.length > 0
        ) {
          checkSource(context, node.arguments[0]);
        }
      },
    };
  },
};

/**
 * @param {import('eslint').Rule.RuleContext} context
 * @param {import('estree').Node | null | undefined} sourceNode
 */
function checkSource(context, sourceNode) {
  if (!sourceNode || sourceNode.type !== 'Literal') {
    return;
  }
  if (typeof sourceNode.value !== 'string') {
    return;
  }

  const match = LIBS_IMPORT.exec(sourceNode.value);
  if (!match) {
    return;
  }

  const libName = match[1];
  const filename = context.filename;
  if (!filename || filename === '<input>') {
    return;
  }

  const importer = packageNameOfFile(filename);
  if (!importer) {
    context.report({
      node: sourceNode,
      messageId: 'unknownImporter',
      data: { source: sourceNode.value, filename },
    });
    return;
  }

  const consumers = consumersOf(libName, filename);
  if (!consumers) {
    context.report({
      node: sourceNode,
      messageId: 'closed',
      data: { name: libName },
    });
    return;
  }

  if (consumers.some((pattern) => matchesConsumer(importer, pattern))) {
    return;
  }

  context.report({
    node: sourceNode,
    messageId: 'denied',
    data: {
      importer,
      name: libName,
      consumers: consumers.join(', '),
    },
  });
}

/**
 * @param {string} packageName
 * @param {string} pattern
 */
function matchesConsumer(packageName, pattern) {
  if (pattern === packageName) {
    return true;
  }
  const escaped = pattern
    .replace(/[.+?^${}()|[\]\\]/g, '\\$&')
    .replace(/\*/g, '[^/]*');
  return new RegExp(`^${escaped}$`).test(packageName);
}

/**
 * @param {string} filename
 */
function packageNameOfFile(filename) {
  let dir = path.dirname(filename);
  while (true) {
    const cached = packageNameCache.get(dir);
    if (cached !== undefined) {
      return cached || null;
    }

    const manifestPath = path.join(dir, 'package.json');
    const manifest = readJson(manifestPath);
    if (manifest && typeof manifest.name === 'string' && manifest.name) {
      packageNameCache.set(dir, manifest.name);
      return manifest.name;
    }

    const parent = path.dirname(dir);
    if (parent === dir) {
      packageNameCache.set(dir, '');
      return null;
    }
    dir = parent;
  }
}

/**
 * @param {string} libName
 * @param {string} filename
 * @returns {string[] | null}
 */
function consumersOf(libName, filename) {
  const root = workspaceRoot(filename);
  if (!root) {
    return null;
  }

  const manifestPath = path.join(root, 'libs', libName, 'package.json');
  if (consumersCache.has(manifestPath)) {
    return consumersCache.get(manifestPath) ?? null;
  }

  const manifest = readJson(manifestPath);
  const consumers = manifest?.consumers;
  if (!Array.isArray(consumers) || consumers.length === 0) {
    consumersCache.set(manifestPath, null);
    return null;
  }

  const patterns = consumers.filter((item) => typeof item === 'string');
  if (patterns.length === 0) {
    consumersCache.set(manifestPath, null);
    return null;
  }

  consumersCache.set(manifestPath, patterns);
  return patterns;
}

/**
 * @param {string} filename
 */
function workspaceRoot(filename) {
  let dir = path.dirname(filename);
  while (true) {
    if (existsSync(path.join(dir, 'pnpm-workspace.yaml'))) {
      return dir;
    }
    const parent = path.dirname(dir);
    if (parent === dir) {
      return null;
    }
    dir = parent;
  }
}

/**
 * @param {string} filePath
 * @returns {Record<string, unknown> | undefined}
 */
function readJson(filePath) {
  try {
    return JSON.parse(readFileSync(filePath, 'utf8'));
  } catch {
    return undefined;
  }
}

export const libsConsumersPlugin = {
  rules: {
    allowed: allowedConsumersRule,
  },
};

export const libsConsumersConfig = {
  plugins: {
    'libs-consumers': libsConsumersPlugin,
  },
  rules: {
    'libs-consumers/allowed': 'error',
  },
};
