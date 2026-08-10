import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsString, Length } from 'class-validator';

export class UpdateProfileDto {
  @ApiPropertyOptional({ example: 'John Doe', description: 'Updated display name' })
  @IsString()
  @IsOptional()
  @Length(2, 40)
  displayName?: string;

  @ApiPropertyOptional({ example: 'FEMALE', description: 'Updated gender' })
  @IsString()
  @IsOptional()
  gender?: string;

  @ApiPropertyOptional({ example: '1995-06-15', description: 'Updated date of birth' })
  @IsString()
  @IsOptional()
  dateOfBirth?: string;

  @ApiPropertyOptional({ example: 'I love music and chatting online.', description: 'Updated biography' })
  @IsString()
  @IsOptional()
  bio?: string;

  @ApiPropertyOptional({ example: 'USA', description: 'Updated country' })
  @IsString()
  @IsOptional()
  country?: string;

  @ApiPropertyOptional({ example: 'en', description: 'Updated default language' })
  @IsString()
  @IsOptional()
  language?: string;

  @ApiPropertyOptional({ example: 'https://example.com/avatar.jpg', description: 'Updated avatar image URL' })
  @IsString()
  @IsOptional()
  avatarUrl?: string;

  @ApiPropertyOptional({ example: 'https://example.com/cover.jpg', description: 'Updated cover image URL' })
  @IsString()
  @IsOptional()
  coverUrl?: string;
}
