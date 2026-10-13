import { PrismaPg } from '@prisma/adapter-pg';
import { PrismaClient } from '@prisma/ai-assistant-client';
import { config } from 'dotenv';
import { readFileSync, readdirSync } from 'node:fs';
import { join } from 'node:path';
import OpenAI from 'openai';
import { Pool } from 'pg';

import { embedText } from '../services/embeddings';
import { chunkText } from '../services/knowledge-chunk';
import { toVectorLiteral } from '../services/knowledge-search';

config();

const DB_CONNECT_TIMEOUT_MS = 5_000;

async function main(): Promise<void> {
  const databaseUrl = process.env.AI_ASSISTANT_DATABASE_URL;
  const baseURL = process.env.LLM_BASE_URL;
  const apiKey = process.env.LLM_API_KEY;
  const model = process.env.LLM_EMBED_MODEL || 'nomic-embed-text';
  const dimensions = Number(process.env.LLM_EMBED_DIMENSIONS || 768);
  if (!databaseUrl || !baseURL || !apiKey) {
    throw new Error(
      'Нужны AI_ASSISTANT_DATABASE_URL, LLM_BASE_URL и LLM_API_KEY',
    );
  }
  if (!Number.isFinite(dimensions) || dimensions <= 0) {
    throw new Error('Некорректный LLM_EMBED_DIMENSIONS');
  }

  const pool = new Pool({
    connectionString: databaseUrl,
    connectionTimeoutMillis: DB_CONNECT_TIMEOUT_MS,
  });
  const prisma = new PrismaClient({
    adapter: new PrismaPg(pool),
  });
  const client = new OpenAI({
    baseURL,
    apiKey,
    timeout: 60_000,
    maxRetries: 1,
  });
  const directory = join(process.cwd(), 'apps/ai-assistant/knowledge');
  const files = readdirSync(directory)
    .filter((name) => name.endsWith('.md'))
    .sort();

  console.log(`Файлов: ${files.length}, модель: ${model}`);

  try {
    console.log('Проверка подключения к БД...');
    await prisma.$queryRaw`SELECT 1`;
    for (const file of files) {
      const text = readFileSync(join(directory, file), 'utf8');
      const chunks = chunkText(text);
      console.log(
        `${file}: удаление старых чанков, затем ${chunks.length} эмбеддинг(ов)...`,
      );
      await prisma.knowledgeChunk.deleteMany({ where: { source: file } });
      for (const content of chunks) {
        const embedding = await embedText(client, model, dimensions, content);
        if (!embedding) {
          throw new Error(`Не удалось построить эмбеддинг для ${file}`);
        }
        const literal = toVectorLiteral(embedding);
        await prisma.$executeRaw`
          INSERT INTO "KnowledgeChunk" ("id", "source", "content", "embedding")
          VALUES (${crypto.randomUUID()}, ${file}, ${content}, CAST(${literal} AS vector))
        `;
      }
      console.log(`${file}: ${chunks.length}`);
    }
    console.log('Готово.');
  } finally {
    await prisma.$disconnect();
    await pool.end();
  }
}

void main().catch((error: unknown) => {
  const message = error instanceof Error ? error.message : String(error);
  if (/timeout|ECONNREFUSED|ENOTFOUND/i.test(message)) {
    console.error(
      `Нет доступа к PostgreSQL (${message}). Проверьте, что Docker Desktop запущен и контейнер postgres слушает порт 5433: docker compose up -d postgres`,
    );
  } else {
    console.error(message);
  }
  process.exitCode = 1;
});
