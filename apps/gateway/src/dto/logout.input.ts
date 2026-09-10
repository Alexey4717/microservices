import { Field, InputType } from '@nestjs/graphql';

import { IsString, MinLength } from 'class-validator';

@InputType()
export class LogoutInput {
  @Field()
  @IsString()
  @MinLength(1)
  refreshToken!: string;
}
