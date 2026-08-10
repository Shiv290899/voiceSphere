import { Injectable, NotFoundException, BadRequestException, ForbiddenException } from '@nestjs/common';
import { PrismaService } from '../prisma.service';
import { SendGiftDto } from './dto/send-gift.dto';
import { ChatGateway } from '../chat/chat.gateway';

@Injectable()
export class GiftsService {
  constructor(
    private prisma: PrismaService,
    private chatGateway: ChatGateway,
  ) {}

  async listGifts() {
    return this.prisma.gift.findMany({
      where: { isActive: true },
      orderBy: { coinCost: 'asc' },
    });
  }

  async sendGift(senderId: string, dto: SendGiftDto) {
    if (senderId === dto.receiverId) {
      throw new BadRequestException('You cannot send a gift to yourself');
    }

    const gift = await this.prisma.gift.findUnique({
      where: { id: dto.giftId },
    });
    if (!gift || !gift.isActive) {
      throw new NotFoundException('Gift not found or is currently inactive');
    }

    // Safety block validation
    const block = await this.prisma.block.findFirst({
      where: {
        OR: [
          { blockerId: senderId, blockedUserId: dto.receiverId },
          { blockerId: dto.receiverId, blockedUserId: senderId },
        ],
      },
    });
    if (block) {
      throw new ForbiddenException('Action blocked due to safety restrictions');
    }

    const totalCost = gift.coinCost * dto.quantity;

    // Fetch wallets to verify existence and starting state
    const senderWallet = await this.prisma.wallet.findUnique({
      where: { userId: senderId },
    });
    const receiverWallet = await this.prisma.wallet.findUnique({
      where: { userId: dto.receiverId },
    });

    if (!senderWallet) {
      throw new NotFoundException('Sender wallet not found');
    }
    if (!receiverWallet) {
      throw new NotFoundException('Receiver wallet not found');
    }

    if (senderWallet.coinBalance < totalCost) {
      throw new BadRequestException(`Insufficient coin balance. Required: ${totalCost}, Available: ${senderWallet.coinBalance}`);
    }

    // Perform atomic transaction updates
    const giftTransaction = await this.prisma.$transaction(async (tx) => {
      // 1. Deduct coins from sender wallet
      const updatedSenderWallet = await tx.wallet.update({
        where: { userId: senderId },
        data: {
          coinBalance: {
            decrement: totalCost,
          },
        },
      });

      // Constraint: ensure balance did not drop below zero
      if (updatedSenderWallet.coinBalance < 0) {
        throw new BadRequestException('Insufficient coin balance');
      }

      // 2. Add earnings to receiver wallet
      const updatedReceiverWallet = await tx.wallet.update({
        where: { userId: dto.receiverId },
        data: {
          earningBalance: {
            increment: totalCost,
          },
        },
      });

      // 3. Create the GiftTransaction record
      const createdTx = await tx.giftTransaction.create({
        data: {
          senderId,
          receiverId: dto.receiverId,
          roomId: dto.roomId || null,
          giftId: dto.giftId,
          quantity: dto.quantity,
          totalCoins: totalCost,
        },
        include: {
          gift: true,
          sender: { select: { username: true } },
          receiver: { select: { username: true } },
        },
      });

      // 4. Log sender wallet transaction
      await tx.walletTransaction.create({
        data: {
          walletId: senderWallet.id,
          userId: senderId,
          type: 'GIFT_SENT',
          amount: -totalCost,
          balanceBefore: senderWallet.coinBalance,
          balanceAfter: updatedSenderWallet.coinBalance,
          referenceType: 'GIFT',
          referenceId: createdTx.id,
          status: 'SUCCESS',
        },
      });

      // 5. Log receiver wallet transaction
      await tx.walletTransaction.create({
        data: {
          walletId: receiverWallet.id,
          userId: dto.receiverId,
          type: 'GIFT_RECEIVED',
          amount: totalCost,
          balanceBefore: receiverWallet.earningBalance,
          balanceAfter: updatedReceiverWallet.earningBalance,
          referenceType: 'GIFT',
          referenceId: createdTx.id,
          status: 'SUCCESS',
        },
      });

      return createdTx;
    });

    // 6. Broadcast gift event in room WebSockets if sent inside a voice room context
    if (dto.roomId) {
      this.chatGateway.sendToConversation(dto.roomId, 'room:gift', {
        id: giftTransaction.id,
        sender: { id: senderId, username: giftTransaction.sender.username },
        receiver: { id: dto.receiverId, username: giftTransaction.receiver.username },
        giftName: giftTransaction.gift.name,
        giftIconUrl: giftTransaction.gift.iconUrl,
        quantity: giftTransaction.quantity,
      });
    }

    return giftTransaction;
  }
}
