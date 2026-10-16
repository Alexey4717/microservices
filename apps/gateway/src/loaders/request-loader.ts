import DataLoader from 'dataloader';

import type { GqlContext } from '../types/gql-context';

/**
 * Один объект контекста — один DataLoader.
 * Ключ — ссылка на GqlContext запроса, не user id.
 */
export class RequestLoader<K, V> {
  private readonly loaders = new WeakMap<GqlContext, DataLoader<K, V>>();

  constructor(private readonly factory: () => DataLoader<K, V>) {}

  get(context: GqlContext): DataLoader<K, V> {
    const existing = this.loaders.get(context);
    if (existing) {
      return existing;
    }

    const loader = this.factory();
    this.loaders.set(context, loader);
    return loader;
  }
}
