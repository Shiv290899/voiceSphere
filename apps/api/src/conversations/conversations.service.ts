import { Injectable, NotFoundException, ForbiddenException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../prisma.service';
import { CreateConversationDto } from './dto/create-conversation.dto';
import { CreateMessageDto } from './dto/create-message.dto';
import { ChatGateway } from '../chat/chat.gateway';

@Injectable()
export class ConversationsService {
  constructor(
    private prisma: PrismaService,
    private chatGateway: ChatGateway,
  ) {}

  async getOrCreateConversation(userId: string, dto: CreateConversationDto) {
    if (userId === dto.recipientId) {
      throw new BadRequestException('You cannot start a conversation with yourself');
    }

    // Verify target recipient exists
    const recipient = await this.prisma.user.findUnique({
      where: { id: dto.recipientId },
    });
    if (!recipient) {
      throw new NotFoundException('Recipient user not found');
    }

    // Safety block validation
    const block = await this.prisma.block.findFirst({
      where: {
        OR: [
          { blockerId: userId, blockedUserId: dto.recipientId },
          { blockerId: dto.recipientId, blockedUserId: userId },
        ],
      },
    });
    if (block) {
      throw new ForbiddenException('Cannot start conversation due to safety restrictions');
    }

    // Find if a direct conversation already exists between these users
    const existingConversation = await this.prisma.conversation.findFirst({
      where: {
        type: 'DIRECT',
        AND: [
          { members: { some: { userId } } },
          { members: { some: { userId: dto.recipientId } } },
        ],
      },
      include: {
        members: {
          include: {
            user: {
              select: {
                id: true,
                username: true,
                avatarUrl: true,
                profile: { select: { displayName: true } },
              },
            },
          },
        },
      },
    });

    if (existingConversation) {
      return existingConversation;
    }

    // Otherwise, create a new direct conversation
    return this.prisma.conversation.create({
      data: {
        type: 'DIRECT',
        members: {
          create: [
            { userId },
            { userId: dto.recipientId },
          ],
        },
      },
      include: {
        members: {
          include: {
            user: {
              select: {
                id: true,
                username: true,
                avatarUrl: true,
                profile: { select: { displayName: true } },
              },
            },
          },
        },
      },
    });
  }

  async listConversations(userId: string) {
    const memberships = await this.prisma.conversationMember.findMany({
      where: { userId },
      include: {
        conversation: {
          include: {
            members: {
              where: { userId: { not: userId } }, // Select the other member
              include: {
                user: {
                  select: {
                    id: true,
                    username: true,
                    avatarUrl: true,
                    profile: { select: { displayName: true } },
                  },
                },
              },
            },
            messages: {
              orderBy: { createdAt: 'desc' },
              take: 1,
            },
          },
        },
      },
    });

    const conversations = [];
    for (const membership of memberships) {
      const conv = membership.conversation;
      const otherMember = conv.members[0]; // DIRECT chats only have 1 other member
      if (!otherMember) continue;

      const lastMessage = conv.messages[0] || null;
      let unreadCount = 0;

      // Count unread messages
      if (lastMessage) {
        if (!membership.lastReadMessageId) {
          unreadCount = await this.prisma.message.count({
            where: { conversationId: conv.id },
          });
        } else {
          const lastReadMsg = await this.prisma.message.findUnique({
            where: { id: membership.lastReadMessageId },
          });
          if (lastReadMsg) {
            unreadCount = await this.prisma.message.count({
              where: {
                conversationId: conv.id,
                createdAt: { gt: lastReadMsg.createdAt },
              },
            });
          }
        }
      }

      const isOnline = this.chatGateway.isUserOnline(otherMember.userId);

      conversations.push({
        id: conv.id,
        type: conv.type,
        updatedAt: conv.updatedAt,
        unreadCount,
        otherParticipant: {
          id: otherMember.user.id,
          username: otherMember.user.username,
          avatarUrl: otherMember.user.avatarUrl,
          displayName: otherMember.user.profile?.displayName,
          isOnline,
        },
        lastMessage: lastMessage ? {
          id: lastMessage.id,
          content: lastMessage.content,
          messageType: lastMessage.messageType,
          senderId: lastMessage.senderId,
          createdAt: lastMessage.createdAt,
        } : null,
      });
    }

    // Sort by last message time or update time descending
    return conversations.sort((a, b) => {
      const timeA = a.lastMessage ? new Date(a.lastMessage.createdAt).getTime() : new Date(a.updatedAt).getTime();
      const timeB = b.lastMessage ? new Date(b.lastMessage.createdAt).getTime() : new Date(b.updatedAt).getTime();
      return timeB - timeA;
    });
  }

  async listMessages(userId: string, conversationId: string, page: number = 1, limit: number = 20) {
    // Verify membership
    const member = await this.prisma.conversationMember.findUnique({
      where: {
        conversationId_userId: {
          conversationId,
          userId,
        },
      },
    });
    if (!member) {
      throw new ForbiddenException('You are not a participant in this conversation');
    }

    return this.prisma.message.findMany({
      where: { conversationId, deletedAt: null },
      orderBy: { createdAt: 'desc' },
      skip: (page - 1) * limit,
      take: limit,
      include: {
        sender: {
          select: {
            id: true,
            username: true,
            avatarUrl: true,
          },
        },
      },
    });
  }

  async sendMessage(senderId: string, conversationId: string, dto: CreateMessageDto) {
    // Verify sender is participant
    const member = await this.prisma.conversationMember.findUnique({
      where: {
        conversationId_userId: {
          conversationId,
          userId: senderId,
        },
      },
    });
    if (!member) {
      throw new ForbiddenException('You are not a participant in this conversation');
    }

    // Fetch the conversation and find the other participant (if DIRECT)
    const conversation = await this.prisma.conversation.findUnique({
      where: { id: conversationId },
      include: { members: true },
    });
    if (!conversation) {
      throw new NotFoundException('Conversation not found');
    }

    if (conversation.type === 'DIRECT') {
      const otherMember = conversation.members.find(m => m.userId !== senderId);
      if (otherMember) {
        // Block validation check
        const block = await this.prisma.block.findFirst({
          where: {
            OR: [
              { blockerId: senderId, blockedUserId: otherMember.userId },
              { blockerId: otherMember.userId, blockedUserId: senderId },
            ],
          },
        });
        if (block) {
          throw new ForbiddenException('Action blocked due to safety restrictions');
        }
      }
    }

    // Create the message
    const message = await this.prisma.message.create({
      data: {
        conversationId,
        senderId,
        messageType: dto.messageType,
        content: dto.content,
        mediaUrl: dto.mediaUrl,
        replyToMessageId: dto.replyToMessageId,
      },
      include: {
        sender: {
          select: {
            id: true,
            username: true,
            avatarUrl: true,
            profile: { select: { displayName: true } },
          },
        },
      },
    });

    // Update conversation updatedAt timestamp
    await this.prisma.conversation.update({
      where: { id: conversationId },
      data: { updatedAt: new Date() },
    });

    // Update sender lastReadMessageId
    await this.prisma.conversationMember.update({
      where: {
        conversationId_userId: {
          conversationId,
          userId: senderId,
        },
      },
      data: {
        lastReadMessageId: message.id,
      },
    });

    // Broadcast message via WebSockets
    this.chatGateway.sendToConversation(conversationId, 'chat:message', {
      id: message.id,
      conversationId: message.conversationId,
      senderId: message.senderId,
      messageType: message.messageType,
      content: message.content,
      mediaUrl: message.mediaUrl,
      createdAt: message.createdAt,
    });

    return message;
  }

  async deleteMessage(userId: string, role: string, conversationId: string, messageId: string) {
    const message = await this.prisma.message.findUnique({
      where: { id: messageId },
    });
    if (!message || message.conversationId !== conversationId) {
      throw new NotFoundException('Message not found');
    }

    const isSender = message.senderId === userId;
    const isPrivileged = role === 'ADMIN' || role === 'SUPER_ADMIN' || role === 'MODERATOR';

    if (!isSender && !isPrivileged) {
      throw new ForbiddenException('You do not have permission to delete this message');
    }

    // Set deletedAt to soft-delete message
    await this.prisma.message.update({
      where: { id: messageId },
      data: { deletedAt: new Date() },
    });

    // Notify other clients of deletion
    this.chatGateway.sendToConversation(conversationId, 'chat:message_deleted', {
      messageId,
      conversationId,
    });

    return { success: true, message: 'Message deleted successfully' };
  }
}
