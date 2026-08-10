import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma.service';

@Injectable()
export class UsersService {
  constructor(private prisma: PrismaService) {}

  async findOneById(id: string) {
    const user = await this.prisma.user.findUnique({
      where: { id },
      select: {
        id: true,
        username: true,
        email: true,
        phone: true,
        role: true,
        status: true,
        createdAt: true,
        profile: true,
        wallet: {
          select: {
            coinBalance: true,
            earningBalance: true,
          },
        },
      },
    });
    
    if (!user) {
      throw new NotFoundException('User not found');
    }
    
    return user;
  }

  async findOneByUsername(username: string) {
    const user = await this.prisma.user.findUnique({
      where: { username },
      select: {
        id: true,
        username: true,
        role: true,
        status: true,
        createdAt: true,
        profile: {
          select: {
            displayName: true,
            gender: true,
            bio: true,
            country: true,
            language: true,
            avatarUrl: true,
            coverUrl: true,
            level: true,
          },
        },
      },
    });
    
    if (!user) {
      throw new NotFoundException(`User @${username} not found`);
    }
    
    return user;
  }
}
