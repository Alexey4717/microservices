import { Injectable } from '@nestjs/common';

export interface RetrievedFragment {
  content: string;
}

export interface RetrievalQuery {
  userId: string;
  query: string;
}

export abstract class RetrievalPort {
  abstract retrieve(input: RetrievalQuery): Promise<RetrievedFragment[]>;
}

@Injectable()
export class EmptyRetrieval extends RetrievalPort {
  retrieve(): Promise<RetrievedFragment[]> {
    return Promise.resolve([]);
  }
}

export function formatRetrieval(fragments: RetrievedFragment[]): string {
  if (fragments.length === 0) {
    return '';
  }

  const body = fragments
    .map((fragment, index) => `[${index + 1}] ${fragment.content}`)
    .join('\n');
  return `Фрагменты по запросу текущего пользователя:\n${body}`;
}
