import { ConfigService } from '@nestjs/config';

import { PrismaPg } from '@prisma/adapter-pg';
import { PrismaClient } from '@prisma/ai-assistant-client';
import { config } from 'dotenv';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import type { ChatCompletionMessageParam } from 'openai/resources/chat/completions';

import { queryKnowledgeChunks } from '../services/knowledge-search';
import { LlmService } from '../services/llm.service';
import { normalizeAppPagePath } from '../services/propose-actions';
import { formatRetrieval } from '../services/retrieval.port';
import { buildSystemPrompt } from '../services/system-prompt';
import { ASSISTANT_TOOL_DEFINITIONS } from '../services/tool-definitions';
import { toOpenAiTools } from '../services/tool-registry';
import type { StoredToolCall } from '../services/transcript';

config();

interface EvalCase {
  id: string;
  question: string;
  pagePath?: string;
  expectTool?: string;
  expectPath?: string;
  expectProvider?: string;
  expectName?: string;
  expectSource?: string;
}

async function main(): Promise<void> {
  const cases = JSON.parse(
    readFileSync(
      join(process.cwd(), 'apps/ai-assistant/eval/cases.json'),
      'utf8',
    ),
  ) as EvalCase[];
  const llm = new LlmService(new ConfigService());
  const tools = toOpenAiTools(ASSISTANT_TOOL_DEFINITIONS);
  const prisma = openPrisma();
  let passed = 0;

  try {
    for (const item of cases) {
      const sources = await retrieveSources(prisma, llm, item.question);
      const retrievalText = formatRetrieval(
        sources.map((source) => ({
          id: source.id,
          source: source.source,
          content: source.content,
        })),
      );
      const turn = await llm.createTurn({
        messages: promptMessages(item, retrievalText),
        tools,
        temperature: 0,
      });
      const ok = matches(
        item,
        turn.toolCalls,
        sources.map((source) => source.source),
      );
      if (ok) {
        passed += 1;
      }
      console.log(
        `${ok ? 'OK' : 'FAIL'} ${item.id}: ${describe(
          item,
          turn.toolCalls,
          sources.map((source) => source.source),
        )}`,
      );
      if (!ok) {
        console.log(`  content: ${JSON.stringify(turn.content)}`);
        console.log(`  tool_calls: ${JSON.stringify(turn.toolCalls)}`);
      }
    }
  } finally {
    await prisma?.$disconnect();
  }

  console.log(`${passed}/${cases.length} совпадений`);
  if (passed !== cases.length) {
    process.exitCode = 1;
  }
}

function openPrisma(): PrismaClient | null {
  const databaseUrl = process.env.AI_ASSISTANT_DATABASE_URL;
  if (!databaseUrl) {
    return null;
  }
  return new PrismaClient({
    adapter: new PrismaPg({ connectionString: databaseUrl }),
  });
}

async function retrieveSources(
  prisma: PrismaClient | null,
  llm: LlmService,
  query: string,
): Promise<Array<{ id: string; source: string; content: string }>> {
  if (!prisma) {
    return [];
  }
  try {
    const embedding = await llm.embed(query);
    if (!embedding) {
      return [];
    }
    return await queryKnowledgeChunks(prisma, embedding);
  } catch (error) {
    console.error(
      `Поиск пропущен: ${error instanceof Error ? error.message : 'unknown'}`,
    );
    return [];
  }
}

function promptMessages(
  item: EvalCase,
  retrievalText: string,
): ChatCompletionMessageParam[] {
  const messages: ChatCompletionMessageParam[] = [
    {
      role: 'system',
      content: buildSystemPrompt({
        pagePath: normalizeAppPagePath(item.pagePath),
        summary: null,
      }),
    },
  ];
  if (retrievalText) {
    messages.push({ role: 'system', content: retrievalText });
  }
  messages.push({ role: 'user', content: item.question });
  return messages;
}

function matches(
  item: EvalCase,
  calls: StoredToolCall[],
  sources: string[],
): boolean {
  const names = calls.map((call) => call.name);
  if (item.expectTool && !names.includes(item.expectTool)) {
    return false;
  }
  const args = readArgs(
    calls.find((call) => call.name === item.expectTool)?.arguments ??
      calls[0]?.arguments,
  );
  if (item.expectPath && args.path !== item.expectPath) {
    return false;
  }
  if (
    item.expectProvider &&
    readString(args.provider).toUpperCase() !== item.expectProvider
  ) {
    return false;
  }
  if (item.expectName && args.name !== item.expectName) {
    return false;
  }
  if (item.expectSource && !sources.includes(item.expectSource)) {
    return false;
  }
  return true;
}

function describe(
  item: EvalCase,
  calls: StoredToolCall[],
  sources: string[],
): string {
  const names = calls.map((call) => call.name).join(', ') || 'без инструмента';
  const sourceText = sources.length > 0 ? sources.join(', ') : 'без статей';
  const expected = [
    item.expectTool,
    item.expectPath,
    item.expectProvider,
    item.expectName,
    item.expectSource,
  ]
    .filter(Boolean)
    .join(' ');
  return `ожидали ${expected}; инструменты: ${names}; статьи: ${sourceText}`;
}

function readString(value: unknown): string {
  return typeof value === 'string' ? value : '';
}

function readArgs(raw: string | undefined): Record<string, unknown> {
  if (!raw) {
    return {};
  }
  try {
    const parsed = JSON.parse(raw) as unknown;
    if (parsed && typeof parsed === 'object' && !Array.isArray(parsed)) {
      return parsed as Record<string, unknown>;
    }
  } catch {
    return {};
  }
  return {};
}

void main().catch((error: unknown) => {
  console.error(error instanceof Error ? error.message : error);
  process.exitCode = 1;
});
