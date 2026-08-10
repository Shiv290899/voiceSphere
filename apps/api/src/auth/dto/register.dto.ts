import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsEmail, IsNotEmpty, IsOptional, IsString, Length, Matches } from 'class-validator';

export class RegisterDto {
  @ApiProperty({ example: 'johndoe', description: 'Unique username' })
  @IsString()
  @IsNotEmpty()
  @Length(3, 20)
  @Matches(/^[a-zA-Z0-9_]+$/, { message: 'Username can only contain alphanumeric characters and underscores' })
  username: string;

  @ApiProperty({ example: 'john@example.com', description: 'User email address' })
  @IsEmail()
  @IsNotEmpty()
  email: string;

  @ApiPropertyOptional({ example: '+1234567890', description: 'Optional phone number' })
  @IsString()
  @IsOptional()
  phone?: string;

  @ApiProperty({ example: 'Password123', description: 'Secure user password (min 6 characters)' })
  @IsString()
  @IsNotEmpty()
  @Length(6, 50)
  password: string;

  @ApiProperty({ example: 'John Doe', description: 'Public display name' })
  @IsString()
  @IsNotEmpty()
  @Length(2, 40)
  displayName: string;

  @ApiPropertyOptional({ example: 'Hello! I love talking in voice rooms.', description: 'Short user bio' })
  @IsString()
  @IsOptional()
  bio?: string;

  @ApiPropertyOptional({ example: 'MALE', description: 'User gender' })
  @IsString()
  @IsOptional()
  gender?: string;

  @ApiPropertyOptional({ example: '1995-06-15', description: 'User date of birth' })
  @IsString()
  @IsOptional()
  dateOfBirth?: string;
}
