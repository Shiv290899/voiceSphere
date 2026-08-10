import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../prisma.service';
import { RequestWithdrawalDto } from './dto/request-withdrawal.dto';

@Injectable()
export class WithdrawalsService {
  constructor(private prisma: PrismaService) {}

  async requestWithdrawal(userId: string, dto: RequestWithdrawalDto) {
    const wallet = await this.prisma.wallet.findUnique({
      where: { userId },
    });

    if (!wallet) {
      throw new NotFoundException('User wallet not found');
    }

    if (wallet.earningBalance < dto.amount) {
      throw new BadRequestException(`Insufficient earning balance. Available: ${wallet.earningBalance}, Requested: ${dto.amount}`);
    }

    // Execute withdrawal debit atomically in transaction
    return this.prisma.$transaction(async (tx) => {
      // 1. Deduct earningBalance from wallet
      const updatedWallet = await tx.wallet.update({
        where: { userId },
        data: {
          earningBalance: {
            decrement: dto.amount,
          },
        },
      });

      // Constraint check
      if (updatedWallet.earningBalance < 0) {
        throw new BadRequestException('Insufficient earning balance');
      }

      // 2. Create the Withdrawal request
      const withdrawal = await tx.withdrawal.create({
        data: {
          userId,
          amount: dto.amount,
          status: 'PENDING',
          paymentMethod: dto.paymentMethod,
          paymentDetails: dto.paymentDetails,
        },
      });

      // 3. Log the WalletTransaction record
      await tx.walletTransaction.create({
        data: {
          walletId: wallet.id,
          userId,
          type: 'WITHDRAWAL',
          amount: -dto.amount,
          balanceBefore: wallet.earningBalance,
          balanceAfter: updatedWallet.earningBalance,
          referenceType: 'WITHDRAWAL',
          referenceId: withdrawal.id,
          status: 'PENDING',
        },
      });

      return withdrawal;
    });
  }

  async listUserWithdrawals(userId: string, page: number = 1, limit: number = 20) {
    return this.prisma.withdrawal.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
      skip: (page - 1) * limit,
      take: limit,
    });
  }
}
