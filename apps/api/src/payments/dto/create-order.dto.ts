import { ApiProperty } from '@nestjs/swagger';
import { IsEnum, IsInt, IsNotEmpty, Min } from 'class-validator';

export class CreateOrderDto {
  @ApiProperty({ example: 1000, description: 'Amount in currency base units (e.g., 1000 cents = $10.00)' })
  @IsInt()
  @Min(500) // Minimum $5.00 purchase
  @IsNotEmpty()
  amount: number;

  @ApiProperty({ enum: ['STRIPE', 'RAZORPAY'], example: 'STRIPE', description: 'Selected payment gateway' })
  @IsEnum(['STRIPE', 'RAZORPAY'])
  @IsNotEmpty()
  provider: 'STRIPE' | 'RAZORPAY';
}
