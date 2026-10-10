import { Field, Int, ObjectType } from '@nestjs/graphql';

@ObjectType()
export class VideoAuthor {
  @Field()
  id!: string;

  @Field(() => String, { nullable: true })
  name!: string | null;

  @Field(() => String, { nullable: true })
  avatarUrl!: string | null;
}

@ObjectType()
export class Video {
  @Field()
  id!: string;

  @Field()
  title!: string;

  @Field()
  description!: string;

  @Field()
  url!: string;

  @Field()
  mimeType!: string;

  @Field(() => Int)
  size!: number;

  @Field()
  createdAt!: string;

  @Field(() => VideoAuthor)
  author!: VideoAuthor;
}
