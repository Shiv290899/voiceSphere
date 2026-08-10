import { Controller, Post, Get, Body, Query, UseGuards, HttpCode, HttpStatus } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';
import { WithdrawalsService } from './withdrawals.service';
import { RequestWithdrawalDto } from './dto/request-withdrawal.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { GetUser } from '../auth/decorators/get-user.decorator';

@ApiTags('Withdrawals & Payouts')
@Controller('withdrawals')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class WithdrawalsController {
  constructor(private withdrawalsService: WithdrawalsService) {}

  @Post()
  @ApiOperation({ summary: 'Submit a new withdrawal request for eligible earnings' })
  @ApiResponse({ status: 201, description: 'Withdrawal request created successfully.' })
  @ApiResponse({ status: 400, description: 'Insufficient earning balance.' })
  request(@GetUser('id') userId: string, @Body() dto: RequestWithdrawalDto) {
    return this.withdrawalsService.requestWithdrawal(userId, dto);
  }

  @Get()
  @ApiOperation({ summary: 'Retrieve withdrawal request history (paginated)' })
  @ApiResponse({ status: 200, description: 'Return withdrawals history.' })
  list(
    @GetUser('id') userId: string,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
  ) {
    const pageNum = page ? parseInt(page, 10) : 1;
    const limitNum = limit ? parseInt(limit, 10) : 20;
    return this.withdrawalsService.listUserWithdrawals(userId, pageNum, limitNum);
  }
}
