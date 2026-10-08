import { Injectable, Logger } from '@nestjs/common';

import { queryKnowledgeChunks } from './knowledge-search';
import { LlmService } from './llm.service';
import { PrismaService } from './prisma.service';
import type { RetrievalQuery, RetrievedFragment } from './retrieval.port';
import { RetrievalPort } from './retrieval.port';

@Injectable()
export class VectorRetrieval extends RetrievalPort {
  private readonly logger = new Logger(VectorRetrieval.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly llm: LlmService,
  ) {
    super();
  }

  async retrieve(input: RetrievalQuery): Promise<RetrievedFragment[]> {
    try {
      const embedding = await this.llm.embed(input.query);
      if (!embedding) {
        return [];
      }
      const rows = await queryKnowledgeChunks(this.prisma, embedding);
      return rows.map((row) => ({
        id: row.id,
        source: row.source,
        content: row.content,
      }));
    } catch (error) {
      this.logger.warn(
        `Поиск по справке пропущен: ${
          error instanceof Error ? error.message : 'unknown'
        }`,
      );
      return [];
    }
  }
}
