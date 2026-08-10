import { Injectable, NotFoundException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../prisma.service';
import { NotificationType } from '@voicesphere/types';

@Injectable()
export class NotificationsService {
  constructor(
    private prisma: PrismaService,
    private configService: ConfigService,
  ) {}

  async createNotification(
    userId: string,
    type: NotificationType,
    title: string,
    body: string,
    data?: any,
  ) {
    const useMock = this.configService.get<string>('USE_MOCK_NOTIFICATIONS') === 'true';

    const notification = await this.prisma.notification.create({
      data: {
        userId,
        type,
        title,
        body,
        data: data ? JSON.stringify(data) : null,
      },
    });

    if (useMock) {
      console.log(`[FCM PUSH ALERT] Sending notification to user ${userId}:`);
      console.log(`  Title: "${title}"`);
      console.log(`  Body:  "${body}"`);
      console.log(`  Type:  ${type}`);
    } else {
      // Production integration (FCM Admin SDK / APNS Connection)
    }

    return notification;
  }

  async listNotifications(userId: string, page: number = 1, limit: number = 20) {
    return this.prisma.notification.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
      skip: (page - 1) * limit,
      take: limit,
    });
  }

  async markAsRead(userId: string, id: string) {
    const notification = await this.prisma.notification.findUnique({
      where: { id },
    });

    if (!notification || notification.userId !== userId) {
      throw new NotFoundException('Notification not found');
    }

    return this.prisma.notification.update({
      where: { id },
      data: { readAt: new Date() },
    });
  }

  async markAllAsRead(userId: string) {
    const updateResult = await this.prisma.notification.updateMany({
      where: {
        userId,
        readAt: null,
      },
      data: {
        readAt: new Date(),
      },
    });

    return { success: true, count: updateResult.count };
  }
}
