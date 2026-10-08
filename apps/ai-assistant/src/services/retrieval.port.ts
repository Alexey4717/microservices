export interface RetrievedFragment {
  id?: string;
  source?: string;
  content: string;
}

export interface RetrievalQuery {
  userId: string;
  query: string;
}

export abstract class RetrievalPort {
  abstract retrieve(input: RetrievalQuery): Promise<RetrievedFragment[]>;
}

export function formatRetrieval(fragments: RetrievedFragment[]): string {
  if (fragments.length === 0) {
    return '';
  }

  const body = fragments
    .map((fragment, index) => {
      const id = fragment.id ? ` id=${fragment.id}` : '';
      const source = fragment.source ? ` source=${fragment.source}` : '';
      return `[${index + 1}${id}${source}] ${fragment.content}`;
    })
    .join('\n');
  return `Фрагменты справки приложения:\n${body}`;
}
