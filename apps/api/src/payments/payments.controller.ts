import { Controller, Post, Get, Body, Query, UseGuards, Res, HttpCode, HttpStatus } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';
import { Response } from 'express';
import { PaymentsService } from './payments.service';
import { CreateOrderDto } from './dto/create-order.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { GetUser } from '../auth/decorators/get-user.decorator';

@ApiTags('Payments & Recharges')
@Controller('payments')
export class PaymentsController {
  constructor(private paymentsService: PaymentsService) {}

  @Post('create-order')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Initialize a new recharge order' })
  @ApiResponse({ status: 201, description: 'Order created.' })
  create(@GetUser('id') userId: string, @Body() dto: CreateOrderDto) {
    return this.paymentsService.createOrder(userId, dto);
  }

  @Post('webhook')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Handle incoming Stripe/Razorpay webhooks' })
  @ApiResponse({ status: 200, description: 'Event processed successfully.' })
  webhook(@Body() payload: any, @Query('provider') provider: string = 'STRIPE') {
    return this.paymentsService.processWebhook(provider, payload);
  }

  @Get('mock-checkout')
  @ApiOperation({ summary: 'Simulated payment gateway checkout page' })
  mockCheckout(
    @Query('orderId') orderId: string,
    @Query('userId') userId: string,
    @Query('amount') amount: string,
    @Res() res: Response,
  ) {
    res.setHeader('Content-Type', 'text/html');
    res.send(`
      <!DOCTYPE html>
      <html>
      <head>
        <title>VoiceSphere Secure Mock Checkout</title>
        <script src="https://cdn.tailwindcss.com"></script>
      </head>
      <body class="bg-slate-950 text-slate-100 flex justify-center items-center min-h-screen p-4">
        <div class="max-w-md w-full bg-slate-900 border border-slate-800 p-8 rounded-3xl shadow-2xl">
          <div class="text-center mb-6">
            <h2 class="text-2xl font-black bg-gradient-to-r from-violet-400 to-indigo-400 bg-clip-text text-transparent">VoiceSphere Checkout</h2>
            <p class="text-slate-400 text-xs mt-1">Simulated Gateway Integration</p>
          </div>
          
          <div class="bg-slate-950 p-5 rounded-2xl border border-slate-800/80 mb-6">
            <div class="flex justify-between text-sm mb-2"><span class="text-slate-500">OrderID</span><span class="font-mono text-indigo-400">${orderId}</span></div>
            <div class="flex justify-between text-sm mb-2"><span class="text-slate-500">Amount</span><span class="font-bold text-slate-200">$${(parseInt(amount) / 100).toFixed(2)}</span></div>
            <div class="flex justify-between text-sm"><span class="text-slate-500">Coins Credited</span><span class="font-bold text-emerald-400">${Math.floor(parseInt(amount) / 10)} coins</span></div>
          </div>

          <button id="pay-btn" class="w-full bg-gradient-to-r from-violet-600 to-indigo-600 hover:from-violet-500 hover:to-indigo-500 h-12 rounded-xl text-sm font-semibold tracking-wide shadow-lg shadow-indigo-500/20 active:scale-[0.98] transition-all">
            Authorize Payment
          </button>
          
          <p id="status-msg" class="text-center text-xs text-slate-500 mt-4"></p>
        </div>

        <script>
          document.getElementById('pay-btn').addEventListener('click', async () => {
            const btn = document.getElementById('pay-btn');
            const status = document.getElementById('status-msg');
            btn.disabled = true;
            btn.textContent = 'Processing...';
            
            try {
              const res = await fetch('/api/v1/payments/webhook?provider=MOCK', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                  userId: '${userId}',
                  amount: ${amount},
                  transactionId: 'mock_tx_' + Date.now()
                })
              });
              const data = await res.json();
              if (data.success) {
                btn.className = 'w-full bg-emerald-600 text-white h-12 rounded-xl text-sm font-semibold cursor-not-allowed';
                btn.textContent = 'Payment Authorized!';
                status.className = 'text-center text-xs text-emerald-400 mt-4';
                status.textContent = 'Coins credited! You can close this window now.';
              } else {
                throw new Error();
              }
            } catch (err) {
              btn.disabled = false;
              btn.textContent = 'Retry Payment';
              status.className = 'text-center text-xs text-rose-400 mt-4';
              status.textContent = 'Checkout verification failed. Please try again.';
            }
          });
        </script>
      </body>
      </html>
    `);
  }
}
