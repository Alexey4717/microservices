import { AiConversationsDocument } from '@libs/graphql/operations/ai-assistant/ai-conversations.generated';

import { query } from '@/lib/apollo/server';

import { AiAssistantChat } from './ai-assistant-chat';

export default async function AiAssistantPage() {
  const result = await query({ query: AiConversationsDocument }).catch(
    () => null,
  );

  return (
    <AiAssistantChat
      initialConversations={result?.data?.aiConversations ?? []}
    />
  );
}
