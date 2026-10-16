import { Injectable } from '@nestjs/common';

import DataLoader from 'dataloader';

import type { UserResponse } from '@libs/proto';

import { UserProjectionService } from '../services/user-projection.service';
import type { GqlContext } from '../types/gql-context';
import { RequestLoader } from './request-loader';

@Injectable()
export class VideoAuthorLoader {
  private readonly requests: RequestLoader<string, UserResponse | null>;

  constructor(private readonly userProjection: UserProjectionService) {
    this.requests = new RequestLoader(() => this.createLoader());
  }

  get(context: GqlContext): DataLoader<string, UserResponse | null> {
    return this.requests.get(context);
  }

  private createLoader(): DataLoader<string, UserResponse | null> {
    return new DataLoader(async (ids: readonly string[]) => {
      const projections = await this.userProjection.findByIds(ids);
      const byId = new Map(
        projections.map((projection) => [projection.id, projection]),
      );
      return ids.map((id) => byId.get(id) ?? null);
    });
  }
}
