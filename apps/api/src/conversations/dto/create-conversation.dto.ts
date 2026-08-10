import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsString } from 'class-validator';

export class CreateConversationDto {
  @ApiProperty({ example: 'a1b2c3d4-e5f6-7a8b-9c0d-e1f2a3b4c5d6', description: 'ID of target user' })
  @IsString()
  @IsNotEmpty()
  recipientId: string;
}
