import { Injectable, Logger } from '@nestjs/common';

import type { ChatCompletionTool } from 'openai/resources/chat/completions';

import { PaymentsTool } from './payments-tool';
import { ProfileTool } from './profile-tool';
import {
  ProposeCheckoutTool,
  ProposeNavigationTool,
  ProposeUpdateNameTool,
} from './propose-tools';
import type { AssistantTool, ToolEffect, ToolSession } from './tool-types';

export function toOpenAiTools(
  tools: ReadonlyArray<
    Pick<AssistantTool, 'name' | 'description' | 'parameters'>
  >,
): ChatCompletionTool[] {
  return tools.map((tool) => ({
    type: 'function',
    function: {
      name: tool.name,
      description: tool.description,
      parameters: tool.parameters,
    },
  }));
}

@Injectable()
export class ToolRegistry {
  private readonly logger = new Logger(ToolRegistry.name);

  constructor(
    private readonly profile: ProfileTool,
    private readonly payments: PaymentsTool,
    private readonly proposeCheckout: ProposeCheckoutTool,
    private readonly proposeNavigation: ProposeNavigationTool,
    private readonly proposeUpdateName: ProposeUpdateNameTool,
  ) {}

  tools(): AssistantTool[] {
    return [
      this.profile,
      this.payments,
      this.proposeCheckout,
      this.proposeNavigation,
      this.proposeUpdateName,
    ];
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
    return toOpenAiTools(this.tools());
  }

  async execute(
    name: string,
    args: unknown,
    session: ToolSession,
  ): Promise<ToolEffect> {
    const tool = this.tools().find((item) => item.name === name);
    if (!tool) {
      return { content: `Неизвестный инструмент: ${name}` };
    }

    try {
      const result = await tool.execute(args, session);
      if (typeof result === 'string') {
        return { content: result };
      }
      return result;
    } catch (error) {
      this.logger.warn(
        `Инструмент ${name} не выполнился: ${
          error instanceof Error ? error.message : 'unknown'
        }`,
      );
      return { content: 'Инструмент временно недоступен' };
    }
  }
}
