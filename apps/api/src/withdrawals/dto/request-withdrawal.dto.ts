import { ApiProperty } from '@nestjs/swagger';
import { IsInt, IsNotEmpty, IsString, Min } from 'class-validator';

export class RequestWithdrawalDto {
  @ApiProperty({ example: 1000, description: 'Amount to withdraw in earnings (min 1000)' })
  @IsInt()
  @Min(1000)
  @IsNotEmpty()
  amount: number;

  @ApiProperty({ example: 'BANK_TRANSFER', description: 'Selected payout gateway (STRIPE, BANK_TRANSFER, etc.)' })
  @IsString()
  @IsNotEmpty()
  paymentMethod: string;

  @ApiProperty({ example: '{"routing": "123456", "account": "987654"}', description: 'Private payout routing details' })
  @IsString()
  @IsNotEmpty()
  paymentDetails: string;
}
