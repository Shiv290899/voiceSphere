import { Injectable, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../prisma.service';
import { CreateReportDto } from './dto/create-report.dto';

@Injectable()
export class ReportsService {
  constructor(private prisma: PrismaService) {}

  async create(reporterId: string, dto: CreateReportDto) {
    if (!dto.targetUserId && !dto.targetContentId && !dto.targetRoomId) {
      throw new BadRequestException('At least one report target (user, content, or room) must be specified');
    }

    return this.prisma.report.create({
      data: {
        reporterId,
        targetUserId: dto.targetUserId || null,
        targetContentId: dto.targetContentId || null,
        targetRoomId: dto.targetRoomId || null,
        reason: dto.reason,
        description: dto.description || null,
        status: 'PENDING',
      },
    });
  }
}
