import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsInt, IsNotEmpty, IsOptional, IsString, Min } from 'class-validator';

export class SendGiftDto {
  @ApiProperty({ example: 'a1b2c3d4-e5f6-7a8b-9c0d-e1f2a3b4c5d6', description: 'ID of user receiving the gift' })
  @IsString()
  @IsNotEmpty()
  receiverId: string;

  @ApiProperty({ example: 'a1b2c3d4-e5f6-7a8b-9c0d-e1f2a3b4c5d6', description: 'ID of the gift in catalog' })
  @IsString()
  @IsNotEmpty()
  giftId: string;

  @ApiProperty({ example: 1, description: 'Quantity of gifts to send' })
  @IsInt()
  @Min(1)
  @IsNotEmpty()
  quantity: number;

  @ApiPropertyOptional({ example: 'a1b2c3d4-e5f6-7a8b-9c0d-e1f2a3b4c5d6', description: 'Optional context room ID' })
  @IsString()
  @IsOptional()
  roomId?: string;
}
