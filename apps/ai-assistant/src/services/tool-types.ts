export interface ToolSession {
  userId: string;
  internalToken: string;
}

export interface AssistantTool {
  name: string;
  description: string;
  parameters: Record<string, unknown>;
  execute(args: unknown, session: ToolSession): Promise<string>;
}

export const EMPTY_TOOL_PARAMETERS: Record<string, unknown> = {
  type: 'object',
  properties: {},
  additionalProperties: false,
};
