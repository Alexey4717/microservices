import { PrismaPg } from '@prisma/adapter-pg';
import { PrismaClient } from '@prisma/ai-assistant-client';
import { config } from 'dotenv';
import { readFileSync, readdirSync } from 'node:fs';
import { join } from 'node:path';
import OpenAI from 'openai';

import { embedText } from '../services/embeddings';
import { chunkText } from '../services/knowledge-chunk';
import { toVectorLiteral } from '../services/knowledge-search';

config();

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

  const prisma = new PrismaClient({
    adapter: new PrismaPg({ connectionString: databaseUrl }),
  });
  const client = new OpenAI({ baseURL, apiKey });
  const directory = join(process.cwd(), 'apps/ai-assistant/knowledge');
  const files = readdirSync(directory)
    .filter((name) => name.endsWith('.md'))
    .sort();

  try {
    for (const file of files) {
      const text = readFileSync(join(directory, file), 'utf8');
      const chunks = chunkText(text);
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
  } finally {
    await prisma.$disconnect();
  }
}

void main().catch((error: unknown) => {
  console.error(error instanceof Error ? error.message : error);
  process.exitCode = 1;
});
