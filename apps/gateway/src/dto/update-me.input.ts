import { Field, InputType } from '@nestjs/graphql';

import {
  IsOptional,
  IsString,
  IsUrl,
  MaxLength,
  ValidateIf,
} from 'class-validator';

@InputType()
export class UpdateMeInput {
  @Field({ nullable: true })
  @IsOptional()
  @IsString()
  name?: string;

  @Field({ nullable: true })
  @IsOptional()
  @ValidateIf((_, value: unknown) => typeof value === 'string' && value !== '')
  @IsUrl({ require_tld: false, protocols: ['http', 'https'] })
  @MaxLength(2048)
  avatarUrl?: string;
}
