import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../prisma.service';
import { ResolveReportDto, ReportResolutionAction } from './dto/resolve-report.dto';

@Injectable()
export class AdminService {
  constructor(private prisma: PrismaService) {}

  async getStats() {
    const totalUsers = await this.prisma.user.count();
    const activeVoiceRooms = await this.prisma.voiceRoom.count({
      where: { status: 'LIVE' },
    });
    
    // Aggregation of gift volumes
    const totalGiftsSent = await this.prisma.giftTransaction.count();
    const giftsAgg = await this.prisma.giftTransaction.aggregate({
      _sum: {
        totalCoins: true,
      },
    });

    const pendingReports = await this.prisma.report.count({
      where: { status: 'PENDING' },
    });

    return {
      totalUsers,
      activeVoiceRooms,
      totalGiftsSent,
      totalCoinsVolume: giftsAgg._sum.totalCoins || 0,
      pendingReports,
    };
  }

  async listReports(page: number = 1, limit: number = 20) {
    return this.prisma.report.findMany({
      orderBy: { createdAt: 'desc' },
      skip: (page - 1) * limit,
      take: limit,
      include: {
        reporter: {
          select: { id: true, username: true },
        },
        targetUser: {
          select: { id: true, username: true, status: true },
        },
        targetRoom: {
          select: { id: true, title: true, status: true },
        },
      },
    });
  }

  async resolveReport(adminId: string, reportId: string, dto: ResolveReportDto) {
    const report = await this.prisma.report.findUnique({
      where: { id: reportId },
    });

    if (!report) {
      throw new NotFoundException('Report not found');
    }

    if (report.status !== 'PENDING') {
      throw new BadRequestException('Report has already been resolved or reviewed');
    }

    // Resolve report inside database transaction
    return this.prisma.$transaction(async (tx) => {
      // 1. Update report status
      const updatedReport = await tx.report.update({
        where: { id: reportId },
        data: {
          status: 'RESOLVED',
          reviewedById: adminId,
          reviewedAt: new Date(),
        },
      });

      // 2. Process moderation action
      if (dto.action === ReportResolutionAction.DELETE_CONTENT && report.targetContentId) {
        // Try deleting post first
        const post = await tx.post.findUnique({ where: { id: report.targetContentId } });
        if (post) {
          await tx.post.delete({ where: { id: report.targetContentId } });
        } else {
          // If not post, try deleting comment
          const comment = await tx.comment.findUnique({ where: { id: report.targetContentId } });
          if (comment) {
            await tx.comment.delete({ where: { id: report.targetContentId } });
          }
        }
      } else if (dto.action === ReportResolutionAction.SUSPEND_USER && report.targetUserId) {
        await tx.user.update({
          where: { id: report.targetUserId },
          data: { status: 'SUSPENDED' },
        });
      }

      // 3. Log Audit Trail
      await tx.auditLog.create({
        data: {
          actorId: adminId,
          action: 'RESOLVE_REPORT',
          targetType: 'REPORT',
          targetId: reportId,
          details: JSON.stringify({ action: dto.action, notes: dto.notes }),
        },
      });

      return updatedReport;
    });
  }

  async suspendUser(adminId: string, userId: string) {
    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!user) {
      throw new NotFoundException('User not found');
    }

    await this.prisma.$transaction(async (tx) => {
      await tx.user.update({
        where: { id: userId },
        data: { status: 'SUSPENDED' },
      });

      await tx.auditLog.create({
        data: {
          actorId: adminId,
          action: 'SUSPEND_USER',
          targetType: 'USER',
          targetId: userId,
        },
      });
    });

    return { success: true, message: 'User suspended successfully' };
  }

  async reactivateUser(adminId: string, userId: string) {
    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!user) {
      throw new NotFoundException('User not found');
    }

    await this.prisma.$transaction(async (tx) => {
      await tx.user.update({
        where: { id: userId },
        data: { status: 'ACTIVE' },
      });

      await tx.auditLog.create({
        data: {
          actorId: adminId,
          action: 'REACTIVATE_USER',
          targetType: 'USER',
          targetId: userId,
        },
      });
    });

    return { success: true, message: 'User reactivated successfully' };
  }

  async listWithdrawals(page: number = 1, limit: number = 20) {
    return this.prisma.withdrawal.findMany({
      orderBy: { createdAt: 'desc' },
      skip: (page - 1) * limit,
      take: limit,
      include: {
        user: {
          select: { id: true, username: true, email: true },
        },
      },
    });
  }

  async approveWithdrawal(adminId: string, withdrawalId: string) {
    const withdrawal = await this.prisma.withdrawal.findUnique({
      where: { id: withdrawalId },
    });

    if (!withdrawal) {
      throw new NotFoundException('Withdrawal request not found');
    }

    if (withdrawal.status !== 'PENDING') {
      throw new BadRequestException(`Withdrawal is already ${withdrawal.status.toLowerCase()}`);
    }

    return this.prisma.$transaction(async (tx) => {
      // 1. Mark request as completed
      const updatedWithdrawal = await tx.withdrawal.update({
        where: { id: withdrawalId },
        data: { status: 'COMPLETED' },
      });

      // 2. Mark matching WalletTransaction as SUCCESS
      await tx.walletTransaction.updateMany({
        where: {
          referenceType: 'WITHDRAWAL',
          referenceId: withdrawalId,
        },
        data: { status: 'SUCCESS' },
      });

      // 3. Log Audit Trail
      await tx.auditLog.create({
        data: {
          actorId: adminId,
          action: 'APPROVE_WITHDRAWAL',
          targetType: 'WITHDRAWAL',
          targetId: withdrawalId,
        },
      });

      return updatedWithdrawal;
    });
  }

  async rejectWithdrawal(adminId: string, withdrawalId: string, reason?: string) {
    const withdrawal = await this.prisma.withdrawal.findUnique({
      where: { id: withdrawalId },
    });

    if (!withdrawal) {
      throw new NotFoundException('Withdrawal request not found');
    }

    if (withdrawal.status !== 'PENDING') {
      throw new BadRequestException(`Withdrawal is already ${withdrawal.status.toLowerCase()}`);
    }

    return this.prisma.$transaction(async (tx) => {
      // 1. Mark request as rejected
      const updatedWithdrawal = await tx.withdrawal.update({
        where: { id: withdrawalId },
        data: {
          status: 'REJECTED',
          rejectionReason: reason || 'Rejected by administrator',
        },
      });

      // 2. Mark matching WalletTransaction as FAILED
      await tx.walletTransaction.updateMany({
        where: {
          referenceType: 'WITHDRAWAL',
          referenceId: withdrawalId,
        },
        data: { status: 'FAILED' },
      });

      // 3. REFUND the user: return the debited amount to host's earningBalance
      const wallet = await tx.wallet.findUnique({
        where: { userId: withdrawal.userId },
      });

      if (!wallet) {
        throw new NotFoundException('User wallet not found');
      }

      const updatedWallet = await tx.wallet.update({
        where: { userId: withdrawal.userId },
        data: {
          earningBalance: {
            increment: withdrawal.amount,
          },
        },
      });

      // 4. Create a refund transaction log
      await tx.walletTransaction.create({
        data: {
          walletId: wallet.id,
          userId: withdrawal.userId,
          type: 'BONUS', // or REFUND
          amount: withdrawal.amount,
          balanceBefore: wallet.earningBalance,
          balanceAfter: updatedWallet.earningBalance,
          referenceType: 'WITHDRAWAL',
          referenceId: withdrawalId,
          status: 'SUCCESS',
          metadata: JSON.stringify({ note: 'Withdrawal request rejected refund' }),
        },
      });

      // 5. Log Audit Trail
      await tx.auditLog.create({
        data: {
          actorId: adminId,
          action: 'REJECT_WITHDRAWAL',
          targetType: 'WITHDRAWAL',
          targetId: withdrawalId,
          details: JSON.stringify({ reason }),
        },
      });

      return updatedWithdrawal;
    });
  }
}
