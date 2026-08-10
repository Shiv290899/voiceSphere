import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsNotEmpty, IsOptional, IsString } from 'class-validator';

export class CreateReportDto {
  @ApiPropertyOptional({ example: 'a1b2c3d4-e5f6-7a8b-9c0d-e1f2a3b4c5d6', description: 'ID of target user' })
  @IsString()
  @IsOptional()
  targetUserId?: string;

  @ApiPropertyOptional({ example: 'a1b2c3d4-e5f6-7a8b-9c0d-e1f2a3b4c5d6', description: 'ID of target content (post or comment)' })
  @IsString()
  @IsOptional()
  targetContentId?: string;

  @ApiPropertyOptional({ example: 'a1b2c3d4-e5f6-7a8b-9c0d-e1f2a3b4c5d6', description: 'ID of target voice room' })
  @IsString()
  @IsOptional()
  targetRoomId?: string;

  @ApiProperty({ example: 'Harassment', description: 'Category/Reason for the report' })
  @IsString()
  @IsNotEmpty()
  reason: string;

  @ApiPropertyOptional({ example: 'User is posting inappropriate links.', description: 'Optional explanation details' })
  @IsString()
  @IsOptional()
  description?: string;
}
