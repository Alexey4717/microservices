import { Field, InputType } from '@nestjs/graphql';

import { IsOptional, IsString, MinLength } from 'class-validator';

@InputType()
export class LogoutInput {
  @Field({ nullable: true })
  @IsOptional()
  @IsString()
  @MinLength(1)
  refreshToken?: string;
}
