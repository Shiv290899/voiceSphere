import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma.service';
import { UpdateProfileDto } from './dto/update-profile.dto';

@Injectable()
export class ProfilesService {
  constructor(private prisma: PrismaService) {}

  async update(userId: string, dto: UpdateProfileDto) {
    const profile = await this.prisma.userProfile.findUnique({
      where: { userId },
    });
    
    if (!profile) {
      throw new NotFoundException('Profile record not found');
    }

    const { dateOfBirth, avatarUrl, ...rest } = dto;
    const dobDate = dateOfBirth ? new Date(dateOfBirth) : undefined;

    return this.prisma.$transaction(async (tx) => {
      if (avatarUrl !== undefined) {
        await tx.user.update({
          where: { id: userId },
          data: { avatarUrl },
        });
      }

      return tx.userProfile.update({
        where: { userId },
        data: {
          ...rest,
          ...(dobDate !== undefined ? { dateOfBirth: dobDate } : {}),
          ...(avatarUrl !== undefined ? { avatarUrl } : {}),
        },
      });
    });
  }
}
