import { Injectable, BadRequestException, ConflictException, NotFoundException, ForbiddenException } from '@nestjs/common';
import { PrismaService } from '../prisma.service';

@Injectable()
export class SocialService {
  constructor(private prisma: PrismaService) {}

  async follow(followerId: string, followingId: string) {
    if (followerId === followingId) {
      throw new BadRequestException('You cannot follow yourself');
    }

    // Verify target user exists
    const targetUser = await this.prisma.user.findUnique({
      where: { id: followingId },
    });
    if (!targetUser) {
      throw new NotFoundException('Target user not found');
    }

    // Check if block exists between them
    const block = await this.prisma.block.findFirst({
      where: {
        OR: [
          { blockerId: followerId, blockedUserId: followingId },
          { blockerId: followingId, blockedUserId: followerId },
        ],
      },
    });
    if (block) {
      throw new ForbiddenException('Action blocked due to safety restrictions');
    }

    // Create follow relationship if it doesn't exist
    try {
      return await this.prisma.follow.create({
        data: {
          followerId,
          followingId,
        },
      });
    } catch (err) {
      throw new ConflictException('You are already following this user');
    }
  }

  async unfollow(followerId: string, followingId: string) {
    const followRecord = await this.prisma.follow.findUnique({
      where: {
        followerId_followingId: {
          followerId,
          followingId,
        },
      },
    });

    if (!followRecord) {
      throw new NotFoundException('You are not following this user');
    }

    await this.prisma.follow.delete({
      where: {
        followerId_followingId: {
          followerId,
          followingId,
        },
      },
    });

    return { success: true, message: 'Unfollowed successfully' };
  }

  async block(blockerId: string, blockedUserId: string) {
    if (blockerId === blockedUserId) {
      throw new BadRequestException('You cannot block yourself');
    }

    const targetUser = await this.prisma.user.findUnique({
      where: { id: blockedUserId },
    });
    if (!targetUser) {
      throw new NotFoundException('Target user not found');
    }

    return this.prisma.$transaction(async (tx) => {
      // 1. Delete follow relationships between blocker and blocked user
      await tx.follow.deleteMany({
        where: {
          OR: [
            { followerId: blockerId, followingId: blockedUserId },
            { followerId: blockedUserId, followingId: blockerId },
          ],
        },
      });

      // 2. Create Block record
      try {
        return await tx.block.create({
          data: {
            blockerId,
            blockedUserId,
          },
        });
      } catch (err) {
        throw new ConflictException('You have already blocked this user');
      }
    });
  }

  async unblock(blockerId: string, blockedUserId: string) {
    const blockRecord = await this.prisma.block.findUnique({
      where: {
        blockerId_blockedUserId: {
          blockerId,
          blockedUserId,
        },
      },
    });

    if (!blockRecord) {
      throw new NotFoundException('User is not blocked');
    }

    await this.prisma.block.delete({
      where: {
        blockerId_blockedUserId: {
          blockerId,
          blockedUserId,
        },
      },
    });

    return { success: true, message: 'User unblocked successfully' };
  }

  async getFollowers(userId: string) {
    return this.prisma.follow.findMany({
      where: { followingId: userId },
      select: {
        id: true,
        createdAt: true,
        follower: {
          select: {
            id: true,
            username: true,
            avatarUrl: true,
            profile: {
              select: {
                displayName: true,
                bio: true,
                level: true,
              },
            },
          },
        },
      },
    });
  }

  async getFollowing(userId: string) {
    return this.prisma.follow.findMany({
      where: { followerId: userId },
      select: {
        id: true,
        createdAt: true,
        following: {
          select: {
            id: true,
            username: true,
            avatarUrl: true,
            profile: {
              select: {
                displayName: true,
                bio: true,
                level: true,
              },
            },
          },
        },
      },
    });
  }

  async getBlockedUsers(userId: string) {
    return this.prisma.block.findMany({
      where: { blockerId: userId },
      select: {
        id: true,
        createdAt: true,
        blockedUser: {
          select: {
            id: true,
            username: true,
            avatarUrl: true,
            profile: {
              select: {
                displayName: true,
              },
            },
          },
        },
      },
    });
  }
}
