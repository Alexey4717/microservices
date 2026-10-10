import { Field, InputType, Int } from '@nestjs/graphql';

import { Transform } from 'class-transformer';
import {
  IsIn,
  IsInt,
  IsString,
  Max,
  MaxLength,
  Min,
  MinLength,
} from 'class-validator';

const VIDEO_MAX_BYTES = 100 * 1024 * 1024;

function trimString({ value }: { value: unknown }): unknown {
  return typeof value === 'string' ? value.trim() : value;
}

function normalizeMime({ value }: { value: unknown }): unknown {
  return typeof value === 'string' ? value.trim().toLowerCase() : value;
}

@InputType()
export class CreateVideoUploadInput {
  @Field()
  @Transform(trimString)
  @IsString()
  @MinLength(1, {
    message: 'Название должно содержать от 1 до 120 символов',
  })
  @MaxLength(120, {
    message: 'Название должно содержать от 1 до 120 символов',
  })
  title!: string;

  @Field()
  @Transform(trimString)
  @IsString()
  @MaxLength(2000, { message: 'Описание не длиннее 2000 символов' })
  description!: string;

  @Field()
  @Transform(trimString)
  @IsString()
  @MinLength(1)
  @MaxLength(255)
  filename!: string;

  @Field()
  @Transform(normalizeMime)
  @IsIn(['video/mp4', 'video/webm'], {
    message: 'Неподдерживаемый тип видео',
  })
  mimeType!: string;

  @Field(() => Int)
  @IsInt()
  @Min(1, { message: 'Файл пустой' })
  @Max(VIDEO_MAX_BYTES, { message: 'Файл слишком большой' })
  size!: number;
}
