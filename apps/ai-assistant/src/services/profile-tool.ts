import { Injectable } from '@nestjs/common';

import {
  type AssistantTool,
  EMPTY_TOOL_PARAMETERS,
  type ToolSession,
} from './tool-types';
import { UsersGrpcService } from './users-grpc.service';

export interface ProfileSnapshot {
  id: string;
  email: string;
  name: string;
  avatarUrl: string;
  accountTier: string;
}

export async function executeGetMyProfile(
  _args: unknown,
  session: ToolSession,
  readProfile: (
    userId: string,
    internalToken: string,
  ) => Promise<ProfileSnapshot>,
): Promise<string> {
  const profile = await readProfile(session.userId, session.internalToken);
  return JSON.stringify({
    id: profile.id,
    email: profile.email,
    name: profile.name,
    avatarUrl: profile.avatarUrl,
    accountTier: profile.accountTier,
  });
}

@Injectable()
export class ProfileTool implements AssistantTool {
  readonly name = 'get_my_profile';
  readonly description =
    'Профиль текущего пользователя сессии. Аргументы не принимаются: user id из текста модели игнорируется.';
  readonly parameters = EMPTY_TOOL_PARAMETERS;

  constructor(private readonly users: UsersGrpcService) {}

  execute(args: unknown, session: ToolSession): Promise<string> {
    return executeGetMyProfile(args, session, (userId, internalToken) =>
      this.users.getMe(userId, internalToken),
    );
  }
}
