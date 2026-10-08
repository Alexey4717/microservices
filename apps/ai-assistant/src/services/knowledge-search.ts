import type { PrismaClient } from '@prisma/ai-assistant-client';

export const KNOWLEDGE_TOP_K = 4;

export interface KnowledgeHit {
  id: string;
  source: string;
  content: string;
}

export function toVectorLiteral(values: number[]): string {
  return `[${values
    .map((value) => {
      if (!Number.isFinite(value)) {
        throw new Error('Некорректный вектор');
      }
      return String(value);
    })
    .join(',')}]`;
}

export async function queryKnowledgeChunks(
  prisma: Pick<PrismaClient, '$queryRaw'>,
  embedding: number[],
): Promise<KnowledgeHit[]> {
  const literal = toVectorLiteral(embedding);
  return prisma.$queryRaw<KnowledgeHit[]>`
    SELECT "id", "source", "content"
    FROM "KnowledgeChunk"
    WHERE "embedding" IS NOT NULL
    ORDER BY "embedding" <=> CAST(${literal} AS vector)
    LIMIT ${KNOWLEDGE_TOP_K}
  `;
}
