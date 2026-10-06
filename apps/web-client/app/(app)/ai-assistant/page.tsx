import { headers } from 'next/headers';
import { redirect } from 'next/navigation';

import { query } from '@/lib/apollo/server';
import { isPrefetchRequest } from '@/lib/auth/request-kind';
import { getSession } from '@/lib/auth/session';
import { AI_CONVERSATIONS_QUERY } from '@/lib/graphql/documents';
import type { AiConversation } from '@/lib/graphql/types';

import { AiAssistantChat } from './ai-assistant-chat';

export default async function AiAssistantPage() {
  const session = await getSession();
  if (!session) {
    if (isPrefetchRequest(await headers())) {
      return null;
    }
    redirect('/login');
  }

  const result = await query<{ aiConversations: AiConversation[] }>({
    query: AI_CONVERSATIONS_QUERY,
  }).catch(() => null);

  return (
    <AiAssistantChat
      accessToken={session.accessToken}
      initialConversations={result?.data?.aiConversations ?? []}
    />
  );
}
