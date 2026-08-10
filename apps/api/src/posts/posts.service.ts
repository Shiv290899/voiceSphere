import { Injectable, NotFoundException, ForbiddenException, ConflictException } from '@nestjs/common';
import { PrismaService } from '../prisma.service';
import { CreatePostDto } from './dto/create-post.dto';
import { CreateCommentDto } from './dto/create-comment.dto';
import { InjectQueue } from '@nestjs/bullmq';
import { Queue } from 'bullmq';

@Injectable()
export class PostsService {
  constructor(
    private prisma: PrismaService,
    @InjectQueue('media-processing') private mediaQueue: Queue,
  ) {}

  async create(authorId: string, dto: CreatePostDto) {
    const post = await this.prisma.post.create({
      data: {
        authorId,
        content: dto.content,
        visibility: dto.visibility,
        media: dto.media ? {
          create: dto.media.map(m => ({
            type: m.type,
            url: m.url,
            thumbnailUrl: m.thumbnailUrl,
            metadata: m.metadata ? m.metadata : JSON.stringify({ status: m.type === 'AUDIO' ? 'PENDING' : 'PROCESSED' }),
          })),
        } : undefined,
      },
      include: {
        media: true,
      },
    });

    // Queue audio transcoding jobs for uploaded audios
    if (post.media) {
      for (const m of post.media) {
        if (m.type === 'AUDIO') {
          await this.mediaQueue.add('transcode', {
            mediaId: m.id,
            url: m.url,
          });
          console.log(`[QUEUED] Audio transcode job added for media ID: ${m.id}`);
        }
      }
    }

    return post;
  }

  async delete(userId: string, role: string, postId: string) {
    const post = await this.prisma.post.findUnique({
      where: { id: postId },
    });

    if (!post) {
      throw new NotFoundException('Post not found');
    }

    // Verify ownership or admin/moderator role
    const isOwner = post.authorId === userId;
    const isPrivileged = role === 'ADMIN' || role === 'SUPER_ADMIN' || role === 'MODERATOR';

    if (!isOwner && !isPrivileged) {
      throw new ForbiddenException('You do not have permission to delete this post');
    }

    await this.prisma.post.delete({
      where: { id: postId },
    });

    return { success: true, message: 'Post deleted successfully' };
  }

  async getFeed(userId: string, page: number = 1, limit: number = 10) {
    // 1. Fetch blocks where either current user blocked someone, or they blocked current user
    const blocks = await this.prisma.block.findMany({
      where: {
        OR: [
          { blockerId: userId },
          { blockedUserId: userId },
        ],
      },
      select: {
        blockerId: true,
        blockedUserId: true,
      },
    });

    const blockedUserIds = Array.from(
      new Set(
        blocks.flatMap(b => [b.blockerId, b.blockedUserId]).filter(id => id !== userId)
      )
    );

    // 2. Fetch list of users followed by current user
    const follows = await this.prisma.follow.findMany({
      where: { followerId: userId },
      select: { followingId: true },
    });
    
    const followingUserIds = follows.map(f => f.followingId);

    // 3. Query feed with safety bounds
    const posts = await this.prisma.post.findMany({
      where: {
        authorId: { notIn: blockedUserIds },
        OR: [
          // Current user's own posts
          { authorId: userId },
          // Public posts
          { visibility: 'PUBLIC' },
          // Followers-only posts of users they follow
          {
            visibility: 'FOLLOWERS',
            authorId: { in: followingUserIds },
          },
        ],
      },
      orderBy: { createdAt: 'desc' },
      skip: (page - 1) * limit,
      take: limit,
      include: {
        author: {
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
        media: true,
        likes: {
          where: { userId },
          select: { id: true },
        },
        comments: {
          take: 3,
          orderBy: { createdAt: 'desc' },
          include: {
            author: {
              select: {
                id: true,
                username: true,
                profile: {
                  select: {
                    displayName: true,
                  },
                },
              },
            },
          },
        },
        _count: {
          select: {
            likes: true,
            comments: true,
          },
        },
      },
    });

    return posts.map(post => {
      const isLiked = post.likes.length > 0;
      const { likes, ...rest } = post;
      return {
        ...rest,
        isLiked,
      };
    });
  }

  async like(userId: string, postId: string) {
    const post = await this.prisma.post.findUnique({
      where: { id: postId },
    });
    if (!post) {
      throw new NotFoundException('Post not found');
    }

    try {
      return await this.prisma.like.create({
        data: {
          userId,
          postId,
        },
      });
    } catch (err) {
      throw new ConflictException('You have already liked this post');
    }
  }

  async unlike(userId: string, postId: string) {
    const likeRecord = await this.prisma.like.findUnique({
      where: {
        userId_postId: {
          userId,
          postId,
        },
      },
    });

    if (!likeRecord) {
      throw new NotFoundException('You have not liked this post');
    }

    await this.prisma.like.delete({
      where: {
        userId_postId: {
          userId,
          postId,
        },
      },
    });

    return { success: true, message: 'Unliked successfully' };
  }

  async addComment(userId: string, postId: string, dto: CreateCommentDto) {
    const post = await this.prisma.post.findUnique({
      where: { id: postId },
    });
    if (!post) {
      throw new NotFoundException('Post not found');
    }

    return this.prisma.comment.create({
      data: {
        authorId: userId,
        postId,
        content: dto.content,
      },
      include: {
        author: {
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

  async deleteComment(userId: string, role: string, commentId: string) {
    const comment = await this.prisma.comment.findUnique({
      where: { id: commentId },
      include: { post: true },
    });

    if (!comment) {
      throw new NotFoundException('Comment not found');
    }

    const isCommentAuthor = comment.authorId === userId;
    const isPostAuthor = comment.post.authorId === userId;
    const isPrivileged = role === 'ADMIN' || role === 'SUPER_ADMIN' || role === 'MODERATOR';

    if (!isCommentAuthor && !isPostAuthor && !isPrivileged) {
      throw new ForbiddenException('You do not have permission to delete this comment');
    }

    await this.prisma.comment.delete({
      where: { id: commentId },
    });

    return { success: true, message: 'Comment deleted successfully' };
  }
}
