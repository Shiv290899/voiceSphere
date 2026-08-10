import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsBoolean, IsNotEmpty, IsOptional, IsString, Length } from 'class-validator';

export class CreateRoomDto {
  @ApiProperty({ example: 'Chill & Chat Lounge ☕', description: 'Title of the voice room' })
  @IsString()
  @IsNotEmpty()
  @Length(3, 100)
  title: string;

  @ApiPropertyOptional({ example: 'Come hang out, share stories, and make friends!', description: 'Optional description' })
  @IsString()
  @IsOptional()
  @Length(0, 500)
  description?: string;

  @ApiProperty({ example: 'Social', description: 'Category (Tech, Music, Social, Gaming, etc.)' })
  @IsString()
  @IsNotEmpty()
  category: string;

  @ApiPropertyOptional({ example: 'https://example.com/covers/lounge.jpg', description: 'Optional cover image' })
  @IsString()
  @IsOptional()
  coverImageUrl?: string;

  @ApiPropertyOptional({ example: false, description: 'Declare if room requires password access' })
  @IsBoolean()
  @IsOptional()
  isPrivate?: boolean;

  @ApiPropertyOptional({ example: '1234', description: 'Optional password string for private rooms' })
  @IsString()
  @IsOptional()
  password?: string;
}
