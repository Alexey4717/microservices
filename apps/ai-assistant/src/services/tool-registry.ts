import { Injectable, Logger } from '@nestjs/common';

import type { ChatCompletionTool } from 'openai/resources/chat/completions';

import { PaymentsTool } from './payments-tool';
import { ProfileTool } from './profile-tool';
import type { AssistantTool, ToolSession } from './tool-types';

@Injectable()
export class ToolRegistry {
  private readonly logger = new Logger(ToolRegistry.name);

  constructor(
    private readonly profile: ProfileTool,
    private readonly payments: PaymentsTool,
  ) {}

  tools(): AssistantTool[] {
    return [this.profile, this.payments];
  }

  schemaText(): string {
    return this.tools()
      .map((tool) =>
        JSON.stringify({
          name: tool.name,
          description: tool.description,
          parameters: tool.parameters,
        }),
      )
      .join('\n');
  }

  openAiTools(): ChatCompletionTool[] {
    return this.tools().map((tool) => ({
      type: 'function',
      function: {
        name: tool.name,
        description: tool.description,
        parameters: tool.parameters,
      },
    }));
  }

  async execute(
    name: string,
    args: unknown,
    session: ToolSession,
  ): Promise<string> {
    const tool = this.tools().find((item) => item.name === name);
    if (!tool) {
      return `Неизвестный инструмент: ${name}`;
    }

    try {
      return await tool.execute(args, session);
    } catch (error) {
      this.logger.warn(
        `Инструмент ${name} не выполнился: ${
          error instanceof Error ? error.message : 'unknown'
        }`,
      );
      return 'Инструмент временно недоступен';
    }
  }
}
