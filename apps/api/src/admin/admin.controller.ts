import { Controller, Get, Post, Param, Body, Query, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';
import { AdminService } from './admin.service';
import { ResolveReportDto } from './dto/resolve-report.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { GetUser } from '../auth/decorators/get-user.decorator';

@ApiTags('Admin Administration')
@Controller('admin')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('ADMIN', 'SUPER_ADMIN', 'MODERATOR')
@ApiBearerAuth()
export class AdminController {
  constructor(private adminService: AdminService) {}

  @Get('stats')
  @ApiOperation({ summary: 'Get general platform statistics (admin only)' })
  @ApiResponse({ status: 200, description: 'Return statistics metrics.' })
  getStats() {
    return this.adminService.getStats();
  }

  @Get('reports')
  @ApiOperation({ summary: 'List submitted moderation reports (admin only)' })
  @ApiResponse({ status: 200, description: 'Return reported flags list.' })
  getReports(
    @Query('page') page?: string,
    @Query('limit') limit?: string,
  ) {
    const pageNum = page ? parseInt(page, 10) : 1;
    const limitNum = limit ? parseInt(limit, 10) : 20;
    return this.adminService.listReports(pageNum, limitNum);
  }

  @Post('reports/:id/resolve')
  @ApiOperation({ summary: 'Resolve a moderation report (admin only)' })
  @ApiResponse({ status: 200, description: 'Report status resolved.' })
  resolveReport(
    @GetUser('id') adminId: string,
    @Param('id') reportId: string,
    @Body() dto: ResolveReportDto,
  ) {
    return this.adminService.resolveReport(adminId, reportId, dto);
  }

  @Post('users/:id/suspend')
  @ApiOperation({ summary: 'Suspend user account and block access (admin only)' })
  @ApiResponse({ status: 200, description: 'User account suspended.' })
  suspendUser(@GetUser('id') adminId: string, @Param('id') userId: string) {
    return this.adminService.suspendUser(adminId, userId);
  }

  @Post('users/:id/reactivate')
  @ApiOperation({ summary: 'Reactivate a suspended user account (admin only)' })
  @ApiResponse({ status: 200, description: 'User account reactivated.' })
  reactivateUser(@GetUser('id') adminId: string, @Param('id') userId: string) {
    return this.adminService.reactivateUser(adminId, userId);
  }

  @Get('withdrawals')
  @ApiOperation({ summary: 'List all host withdrawal requests (admin only)' })
  @ApiResponse({ status: 200, description: 'Return withdrawals requests list.' })
  getWithdrawals(
    @Query('page') page?: string,
    @Query('limit') limit?: string,
  ) {
    const pageNum = page ? parseInt(page, 10) : 1;
    const limitNum = limit ? parseInt(limit, 10) : 20;
    return this.adminService.listWithdrawals(pageNum, limitNum);
  }

  @Post('withdrawals/:id/approve')
  @ApiOperation({ summary: 'Approve withdrawal request and release funds (admin only)' })
  @ApiResponse({ status: 200, description: 'Withdrawal approved.' })
  approveWithdrawal(@GetUser('id') adminId: string, @Param('id') withdrawalId: string) {
    return this.adminService.approveWithdrawal(adminId, withdrawalId);
  }

  @Post('withdrawals/:id/reject')
  @ApiOperation({ summary: 'Reject withdrawal request and refund host balance (admin only)' })
  @ApiResponse({ status: 200, description: 'Withdrawal rejected and refunded.' })
  rejectWithdrawal(
    @GetUser('id') adminId: string,
    @Param('id') withdrawalId: string,
    @Body('reason') reason?: string,
  ) {
    return this.adminService.rejectWithdrawal(adminId, withdrawalId, reason);
  }
}
