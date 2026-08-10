import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsEnum, IsNotEmpty, IsOptional, IsString, IsArray, ValidateNested } from 'class-validator';
import { Type } from 'class-transformer';

export enum PostVisibility {
  PUBLIC = 'PUBLIC',
  FOLLOWERS = 'FOLLOWERS',
  PRIVATE = 'PRIVATE',
}

export class PostMediaDto {
  @ApiProperty({ example: 'IMAGE', description: 'Media type (IMAGE or VIDEO)' })
  @IsString()
  @IsNotEmpty()
  type: string;

  @ApiProperty({ example: 'https://example.com/media/photo.jpg', description: 'URL of uploaded file' })
  @IsString()
  @IsNotEmpty()
  url: string;

  @ApiPropertyOptional({ example: 'https://example.com/media/thumb.jpg', description: 'Optional thumbnail URL' })
  @IsString()
  @IsOptional()
  thumbnailUrl?: string;

  @ApiPropertyOptional({ example: '{}', description: 'JSON metadata string' })
  @IsString()
  @IsOptional()
  metadata?: string;
}

export class CreatePostDto {
  @ApiProperty({ example: 'Hello VoiceSphere community!', description: 'The text content of the post' })
  @IsString()
  @IsNotEmpty()
  content: string;

  @ApiProperty({ enum: PostVisibility, example: PostVisibility.PUBLIC, description: 'Post visibility scope' })
  @IsEnum(PostVisibility)
  @IsNotEmpty()
  visibility: PostVisibility;

  @ApiPropertyOptional({ type: [PostMediaDto], description: 'Optional list of media items attached to the post' })
  @IsArray()
  @IsOptional()
  @ValidateNested({ each: true })
  @Type(() => PostMediaDto)
  media?: PostMediaDto[];
}
