export interface ToolSession {
  userId: string;
  internalToken: string;
  conversationId?: string;
}

export interface ActionProposal {
  id: string;
  type: string;
  title: string;
}

export interface ToolEffect {
  content: string;
  action?: ActionProposal;
}

export interface AssistantTool {
  name: string;
  description: string;
  parameters: Record<string, unknown>;
  execute(args: unknown, session: ToolSession): Promise<string | ToolEffect>;
}

export const EMPTY_TOOL_PARAMETERS: Record<string, unknown> = {
  type: 'object',
  properties: {},
  additionalProperties: false,
};
