import { headers } from 'next/headers';
import { redirect } from 'next/navigation';

import { AiConversationsDocument } from '@libs/graphql/operations/ai-assistant/ai-conversations.generated';

import { query } from '@/lib/apollo/server';
import { isPrefetchRequest } from '@/lib/auth/request-kind';
import { getSession } from '@/lib/auth/session';

import { AiAssistantChat } from './ai-assistant-chat';

export default async function AiAssistantPage() {
  const session = await getSession();
  if (!session) {
    if (isPrefetchRequest(await headers())) {
      return null;
    }
    redirect('/login');
  }

  const result = await query({ query: AiConversationsDocument }).catch(
    () => null,
  );

  return (
    <AiAssistantChat
      initialConversations={result?.data?.aiConversations ?? []}
    />
  );
}
