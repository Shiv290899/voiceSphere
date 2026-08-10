import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsString, Length } from 'class-validator';

export class CreateCommentDto {
  @ApiProperty({ example: 'Wow, great post!', description: 'The text content of the comment' })
  @IsString()
  @IsNotEmpty()
  @Length(1, 500)
  content: string;
}
