import { Injectable, BadRequestException, ConflictException, NotFoundException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../prisma.service';
import { CreateOrderDto } from './dto/create-order.dto';

@Injectable()
export class PaymentsService {
  constructor(
    private prisma: PrismaService,
    private configService: ConfigService,
  ) {}

  async createOrder(userId: string, dto: CreateOrderDto) {
    const useMock = this.configService.get<string>('USE_MOCK_PAYMENT') === 'true';

    // Verify wallet exists
    const wallet = await this.prisma.wallet.findUnique({
      where: { userId },
    });
    if (!wallet) {
      throw new NotFoundException('User wallet not found');
    }

    const orderId = `order_${dto.provider.toLowerCase()}_${Date.now()}_${Math.random().toString(36).substring(7)}`;

    if (useMock) {
      console.log(`[PAYMENT MOCK MODE] Creating order for user ${userId}. Amount: ${dto.amount}, Provider: ${dto.provider}, OrderID: ${orderId}`);
      return {
        success: true,
        orderId,
        amount: dto.amount,
        currency: 'USD',
        provider: dto.provider,
        checkoutUrl: `http://localhost:3000/api/v1/payments/mock-checkout?orderId=${orderId}&userId=${userId}&amount=${dto.amount}`,
      };
    }

    // Stripe/Razorpay configurations can be instantiated here.
    // E.g., const stripe = new Stripe(secretKey);
    // For development, we return order details as we prepare adapters.
    return {
      success: true,
      orderId,
      amount: dto.amount,
      currency: 'USD',
      provider: dto.provider,
      message: 'Checkout initialized. Complete payment using the provider sdk.',
    };
  }

  async processWebhook(provider: string, payload: any) {
    // 1. Validate payload inputs
    const { userId, amount, transactionId } = payload;
    if (!userId || !amount || !transactionId) {
      throw new BadRequestException('Invalid webhook event payload parameters');
    }

    // 2. IDEMPOTENCY CHECK: Ensure we never credit the same payment twice!
    const existingTransaction = await this.prisma.walletTransaction.findFirst({
      where: {
        referenceType: 'PAYMENT',
        referenceId: transactionId,
      },
    });

    if (existingTransaction) {
      console.log(`[PAYMENT Webhook] Transaction ${transactionId} already processed (Idempotent bypass)`);
      return { success: true, message: 'Payment already processed' };
    }

    // Calculate coins to credit. Rate: $1.00 = 100 cents = 10 coins (10 cents per coin)
    const coinCredit = Math.floor(amount / 10);
    if (coinCredit <= 0) {
      throw new BadRequestException('Payment amount is too small to credit coins');
    }

    const wallet = await this.prisma.wallet.findUnique({
      where: { userId },
    });
    if (!wallet) {
      throw new NotFoundException('User wallet not found');
    }

    // 3. Atomically credit wallet and write transaction log
    return this.prisma.$transaction(async (tx) => {
      const updatedWallet = await tx.wallet.update({
        where: { userId },
        data: {
          coinBalance: {
            increment: coinCredit,
          },
        },
      });

      await tx.walletTransaction.create({
        data: {
          walletId: wallet.id,
          userId,
          type: 'PURCHASE',
          amount: coinCredit,
          balanceBefore: wallet.coinBalance,
          balanceAfter: updatedWallet.coinBalance,
          referenceType: 'PAYMENT',
          referenceId: transactionId,
          status: 'SUCCESS',
          metadata: JSON.stringify({ provider, originalAmount: amount }),
        },
      });

      console.log(`[PAYMENT Webhook] Credited ${coinCredit} coins to user ${userId} for transaction ${transactionId}`);
      return { success: true, coinBalance: updatedWallet.coinBalance };
    });
  }
}
