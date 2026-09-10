import { Field, InputType } from '@nestjs/graphql';

import { IsString, MinLength } from 'class-validator';

@InputType()
export class RefreshInput {
  @Field()
  @IsString()
  @MinLength(1)
  refreshToken!: string;
}
