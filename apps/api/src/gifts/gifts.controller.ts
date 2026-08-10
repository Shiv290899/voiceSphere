import { Controller, Get, Post, Body, UseGuards, HttpCode, HttpStatus } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';
import { GiftsService } from './gifts.service';
import { SendGiftDto } from './dto/send-gift.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { GetUser } from '../auth/decorators/get-user.decorator';

@ApiTags('Gifts')
@Controller()
export class GiftsController {
  constructor(private giftsService: GiftsService) {}

  @Get('gifts')
  @ApiOperation({ summary: 'Retrieve list of all active virtual gifts' })
  @ApiResponse({ status: 200, description: 'Return gifts array.' })
  list() {
    return this.giftsService.listGifts();
  }

  @Post('gifts/send')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Send a virtual gift to another user' })
  @ApiResponse({ status: 200, description: 'Gift sent successfully and balances adjusted.' })
  @ApiResponse({ status: 400, description: 'Insufficient balance or self-gifting attempt.' })
  @ApiResponse({ status: 403, description: 'Blocked by safety settings.' })
  send(@GetUser('id') senderId: string, @Body() dto: SendGiftDto) {
    return this.giftsService.sendGift(senderId, dto);
  }
}
