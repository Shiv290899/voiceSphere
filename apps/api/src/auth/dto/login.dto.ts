import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsString } from 'class-validator';

export class LoginDto {
  @ApiProperty({ example: 'johndoe', description: 'Username or email address' })
  @IsString()
  @IsNotEmpty()
  identity: string;

  @ApiProperty({ example: 'Password123', description: 'User account password' })
  @IsString()
  @IsNotEmpty()
  password: string;
}
