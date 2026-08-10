import { Injectable, NotFoundException, ForbiddenException, BadRequestException, UnauthorizedException } from '@nestjs/common';
import { PrismaService } from '../prisma.service';
import { CreateRoomDto } from './dto/create-room.dto';
import { UpdateRoomDto } from './dto/update-room.dto';
import { ChatGateway } from '../chat/chat.gateway';
import { VoiceService } from '../voice/voice.service';
import * as bcrypt from 'bcrypt';

@Injectable()
export class RoomsService {
  constructor(
    private prisma: PrismaService,
    private chatGateway: ChatGateway,
    private voiceService: VoiceService,
  ) {}

  async create(ownerId: string, dto: CreateRoomDto) {
    let passwordHash: string | null = null;
    if (dto.isPrivate && dto.password) {
      passwordHash = await bcrypt.hash(dto.password, 10);
    }

    return this.prisma.$transaction(async (tx) => {
      const room = await tx.voiceRoom.create({
        data: {
          ownerId,
          title: dto.title,
          description: dto.description,
          category: dto.category,
          coverImageUrl: dto.coverImageUrl,
          isPrivate: dto.isPrivate ?? false,
          passwordHash,
          status: 'LIVE',
          startedAt: new Date(),
        },
      });

      // Host joins as HOST
      await tx.roomMember.create({
        data: {
          roomId: room.id,
          userId: ownerId,
          role: 'HOST',
          isSpeaking: true,
        },
      });

      return room;
    });
  }

  async listActiveRooms(category?: string, page: number = 1, limit: number = 20) {
    return this.prisma.voiceRoom.findMany({
      where: {
        status: 'LIVE',
        ...(category ? { category } : {}),
      },
      orderBy: { createdAt: 'desc' },
      skip: (page - 1) * limit,
      take: limit,
      include: {
        owner: {
          select: {
            id: true,
            username: true,
            avatarUrl: true,
            profile: { select: { displayName: true } },
          },
        },
        _count: {
          select: {
            members: {
              where: { leftAt: null },
            },
          },
        },
      },
    });
  }

  async getRoomDetails(roomId: string, userId: string) {
    const room = await this.prisma.voiceRoom.findUnique({
      where: { id: roomId },
      include: {
        owner: {
          select: {
            id: true,
            username: true,
            avatarUrl: true,
            profile: { select: { displayName: true } },
          },
        },
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

    if (!room) {
      throw new NotFoundException('Voice room not found');
    }

    // Verify private access
    if (room.isPrivate && room.ownerId !== userId) {
      const isMember = room.members.some(m => m.userId === userId);
      if (!isMember) {
        throw new ForbiddenException('Private room access restricted');
      }
    }

    return room;
  }

  async update(ownerId: string, role: string, roomId: string, dto: UpdateRoomDto) {
    const room = await this.prisma.voiceRoom.findUnique({
      where: { id: roomId },
    });

    if (!room) {
      throw new NotFoundException('Voice room not found');
    }

    const isOwner = room.ownerId === ownerId;
    const isPrivileged = role === 'ADMIN' || role === 'SUPER_ADMIN';

    if (!isOwner && !isPrivileged) {
      throw new ForbiddenException('You do not have permission to update this room settings');
    }

    const { password, ...rest } = dto;
    let passwordHash = room.passwordHash;

    if (dto.isPrivate && password) {
      passwordHash = await bcrypt.hash(password, 10);
    } else if (dto.isPrivate === false) {
      passwordHash = null;
    }

    return this.prisma.voiceRoom.update({
      where: { id: roomId },
      data: {
        ...rest,
        passwordHash,
      },
    });
  }

  async closeRoom(ownerId: string, role: string, roomId: string) {
    const room = await this.prisma.voiceRoom.findUnique({
      where: { id: roomId },
    });

    if (!room) {
      throw new NotFoundException('Voice room not found');
    }

    const isOwner = room.ownerId === ownerId;
    const isPrivileged = role === 'ADMIN' || role === 'SUPER_ADMIN' || role === 'MODERATOR';

    if (!isOwner && !isPrivileged) {
      throw new ForbiddenException('You do not have permission to terminate this room');
    }

    await this.prisma.$transaction(async (tx) => {
      // 1. Mark room as ended
      await tx.voiceRoom.update({
        where: { id: roomId },
        data: {
          status: 'ENDED',
          endedAt: new Date(),
        },
      });

      // 2. Remove all members
      await tx.roomMember.deleteMany({
        where: { roomId },
      });
    });

    // Notify room client channels of shutdown
    this.chatGateway.sendToConversation(roomId, 'room:ended', { roomId });

    return { success: true, message: 'Room closed successfully' };
  }

  async joinRoom(userId: string, roomId: string, password?: string) {
    const room = await this.prisma.voiceRoom.findUnique({
      where: { id: roomId },
      include: {
        members: true,
      },
    });

    if (!room || room.status !== 'LIVE') {
      throw new NotFoundException('Voice room is not active or does not exist');
    }

    // Safety block validation
    const block = await this.prisma.block.findFirst({
      where: {
        OR: [
          { blockerId: room.ownerId, blockedUserId: userId },
          { blockerId: userId, blockedUserId: room.ownerId },
        ],
      },
    });
    if (block) {
      throw new ForbiddenException('Action blocked due to safety restrictions');
    }

    // Verify password for private rooms
    if (room.isPrivate && room.ownerId !== userId) {
      if (!room.passwordHash) {
        throw new ForbiddenException('Private room configuration is missing password settings');
      }
      if (!password) {
        throw new UnauthorizedException('Room password is required to join');
      }
      const isPasswordMatch = await bcrypt.compare(password, room.passwordHash);
      if (!isPasswordMatch) {
        throw new UnauthorizedException('Incorrect room password');
      }
    }

    // Check if user is already a member
    const existingMember = room.members.find(m => m.userId === userId);
    if (existingMember) {
      return existingMember;
    }

    // Check room capacity
    const currentMemberCount = room.members.length;
    if (currentMemberCount >= room.maxParticipants) {
      throw new BadRequestException('Voice room is currently full');
    }

    const member = await this.prisma.roomMember.create({
      data: {
        roomId,
        userId,
        role: 'LISTENER',
        isSpeaking: false,
      },
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
    });

    // Notify other room participants
    this.chatGateway.sendToConversation(roomId, 'room:user_joined', {
      userId: member.userId,
      username: member.user.username,
      displayName: member.user.profile?.displayName || member.user.username,
      role: member.role,
      avatarUrl: member.user.avatarUrl,
    });

    return member;
  }

  async leaveRoom(userId: string, roomId: string) {
    const member = await this.prisma.roomMember.findUnique({
      where: {
        roomId_userId: { roomId, userId },
      },
      include: {
        user: { select: { username: true } },
      },
    });

    if (!member) {
      throw new NotFoundException('You are not a member of this voice room');
    }

    await this.prisma.roomMember.delete({
      where: {
        roomId_userId: { roomId, userId },
      },
    });

    // Broadcast departure
    this.chatGateway.sendToConversation(roomId, 'room:user_left', {
      userId,
      username: member.user.username,
    });

    return { success: true, message: 'Left room successfully' };
  }

  async raiseHand(userId: string, roomId: string) {
    const member = await this.prisma.roomMember.findUnique({
      where: { roomId_userId: { roomId, userId } },
    });

    if (!member) {
      throw new NotFoundException('You are not a member of this room');
    }

    await this.prisma.roomMember.update({
      where: { roomId_userId: { roomId, userId } },
      data: { handRaised: true },
    });

    this.chatGateway.sendToConversation(roomId, 'room:raise_hand', { userId });

    return { success: true, message: 'Hand raised successfully' };
  }

  async lowerHand(userId: string, roomId: string) {
    const member = await this.prisma.roomMember.findUnique({
      where: { roomId_userId: { roomId, userId } },
    });

    if (!member) {
      throw new NotFoundException('You are not a member of this room');
    }

    await this.prisma.roomMember.update({
      where: { roomId_userId: { roomId, userId } },
      data: { handRaised: false },
    });

    this.chatGateway.sendToConversation(roomId, 'room:hand_lowered', { userId });

    return { success: true, message: 'Hand lowered successfully' };
  }

  async promoteSpeaker(hostId: string, roomId: string, targetUserId: string) {
    await this.verifyHostPermissions(hostId, roomId);

    const targetMember = await this.prisma.roomMember.findUnique({
      where: { roomId_userId: { roomId, userId: targetUserId } },
    });

    if (!targetMember) {
      throw new NotFoundException('Target member not found in this room');
    }

    await this.prisma.roomMember.update({
      where: { roomId_userId: { roomId, userId: targetUserId } },
      data: {
        role: 'SPEAKER',
        handRaised: false,
      },
    });

    this.chatGateway.sendToConversation(roomId, 'room:speaker_promoted', {
      userId: targetUserId,
      role: 'SPEAKER',
    });

    return { success: true, message: 'Speaker promoted successfully' };
  }

  async demoteSpeaker(hostId: string, roomId: string, targetUserId: string) {
    await this.verifyHostPermissions(hostId, roomId);

    const targetMember = await this.prisma.roomMember.findUnique({
      where: { roomId_userId: { roomId, userId: targetUserId } },
    });

    if (!targetMember) {
      throw new NotFoundException('Target member not found in this room');
    }

    await this.prisma.roomMember.update({
      where: { roomId_userId: { roomId, userId: targetUserId } },
      data: {
        role: 'LISTENER',
        isSpeaking: false,
      },
    });

    this.chatGateway.sendToConversation(roomId, 'room:speaker_removed', {
      userId: targetUserId,
    });

    return { success: true, message: 'Speaker demoted successfully' };
  }

  async toggleMute(hostId: string, roomId: string, targetUserId: string, isMuted: boolean) {
    await this.verifyHostPermissions(hostId, roomId);

    const targetMember = await this.prisma.roomMember.findUnique({
      where: { roomId_userId: { roomId, userId: targetUserId } },
    });

    if (!targetMember) {
      throw new NotFoundException('Target member not found in this room');
    }

    await this.prisma.roomMember.update({
      where: { roomId_userId: { roomId, userId: targetUserId } },
      data: { isMuted },
    });

    this.chatGateway.sendToConversation(roomId, 'room:mute', {
      userId: targetUserId,
      isMuted,
    });

    return { success: true, message: `Speaker ${isMuted ? 'muted' : 'unmuted'} successfully` };
  }

  async generateLiveKitToken(userId: string, roomId: string) {
    const member = await this.prisma.roomMember.findUnique({
      where: { roomId_userId: { roomId, userId } },
      include: {
        user: { select: { username: true } },
      },
    });

    if (!member) {
      throw new ForbiddenException('You must be a member of the room to obtain WebRTC credentials');
    }

    // Hosts, co-hosts, and speakers can publish audio. Listeners can only subscribe.
    const canPublish = member.role === 'HOST' || member.role === 'CO_HOST' || member.role === 'SPEAKER';

    const token = await this.voiceService.generateToken(roomId, userId, member.user.username, canPublish);

    return { token };
  }

  // ==========================================
  // HELPER METHODS
  // ==========================================

  private async verifyHostPermissions(userId: string, roomId: string) {
    const member = await this.prisma.roomMember.findUnique({
      where: { roomId_userId: { roomId, userId } },
    });

    if (!member || (member.role !== 'HOST' && member.role !== 'CO_HOST')) {
      throw new ForbiddenException('Only room hosts or co-hosts can perform this administrative action');
    }
  }
}
