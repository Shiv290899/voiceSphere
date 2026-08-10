import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsEnum, IsNotEmpty, IsOptional, IsString } from 'class-validator';
import { MessageType } from '@voicesphere/types';

export class CreateMessageDto {
  @ApiProperty({ example: 'Hey, are you free tonight?', description: 'The text content of the message' })
  @IsString()
  @IsNotEmpty()
  content: string;

  @ApiProperty({ enum: ['TEXT', 'IMAGE', 'AUDIO', 'VIDEO', 'FILE', 'SYSTEM'], example: 'TEXT', description: 'Type of the message' })
  @IsEnum(['TEXT', 'IMAGE', 'AUDIO', 'VIDEO', 'FILE', 'SYSTEM'])
  @IsNotEmpty()
  messageType: MessageType;

  @ApiPropertyOptional({ example: 'https://example.com/uploads/image.png', description: 'Optional media file attachment URL' })
  @IsString()
  @IsOptional()
  mediaUrl?: string;

  @ApiPropertyOptional({ example: 'a1b2c3d4-e5f6-7a8b-9c0d-e1f2a3b4c5d6', description: 'Optional ID of message being replied to' })
  @IsString()
  @IsOptional()
  replyToMessageId?: string;
}
