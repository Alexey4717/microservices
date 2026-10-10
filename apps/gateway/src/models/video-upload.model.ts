import { Field, ObjectType } from '@nestjs/graphql';

@ObjectType()
export class VideoUpload {
  @Field()
  videoId!: string;

  @Field()
  uploadUrl!: string;
}
