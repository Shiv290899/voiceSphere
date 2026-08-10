import { Controller, Post, Delete, Get, Param, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';
import { SocialService } from './social.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { GetUser } from '../auth/decorators/get-user.decorator';

@ApiTags('Social Graph')
@Controller()
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class SocialController {
  constructor(private socialService: SocialService) {}

  @Post('users/:id/follow')
  @ApiOperation({ summary: 'Follow a user' })
  @ApiResponse({ status: 201, description: 'Followed successfully.' })
  @ApiResponse({ status: 400, description: 'Self-follow attempt.' })
  @ApiResponse({ status: 403, description: 'Action blocked by security settings.' })
  @ApiResponse({ status: 404, description: 'Target user not found.' })
  follow(@GetUser('id') currentUserId: string, @Param('id') targetUserId: string) {
    return this.socialService.follow(currentUserId, targetUserId);
  }

  @Delete('users/:id/follow')
  @ApiOperation({ summary: 'Unfollow a user' })
  @ApiResponse({ status: 200, description: 'Unfollowed successfully.' })
  @ApiResponse({ status: 404, description: 'Relationship not found.' })
  unfollow(@GetUser('id') currentUserId: string, @Param('id') targetUserId: string) {
    return this.socialService.unfollow(currentUserId, targetUserId);
  }

  @Post('users/:id/block')
  @ApiOperation({ summary: 'Block a user' })
  @ApiResponse({ status: 201, description: 'User blocked successfully.' })
  @ApiResponse({ status: 400, description: 'Self-block attempt.' })
  @ApiResponse({ status: 404, description: 'Target user not found.' })
  block(@GetUser('id') currentUserId: string, @Param('id') targetUserId: string) {
    return this.socialService.block(currentUserId, targetUserId);
  }

  @Delete('users/:id/block')
  @ApiOperation({ summary: 'Unblock a user' })
  @ApiResponse({ status: 200, description: 'User unblocked successfully.' })
  @ApiResponse({ status: 404, description: 'Block relationship not found.' })
  unblock(@GetUser('id') currentUserId: string, @Param('id') targetUserId: string) {
    return this.socialService.unblock(currentUserId, targetUserId);
  }

  @Get('social/followers')
  @ApiOperation({ summary: 'Get list of followers for the current user' })
  @ApiResponse({ status: 200, description: 'Return follower list.' })
  getFollowers(@GetUser('id') currentUserId: string) {
    return this.socialService.getFollowers(currentUserId);
  }

  @Get('social/following')
  @ApiOperation({ summary: 'Get list of users followed by the current user' })
  @ApiResponse({ status: 200, description: 'Return following list.' })
  getFollowing(@GetUser('id') currentUserId: string) {
    return this.socialService.getFollowing(currentUserId);
  }

  @Get('social/blocked')
  @ApiOperation({ summary: 'Get list of blocked users' })
  @ApiResponse({ status: 200, description: 'Return blocked users list.' })
  getBlockedUsers(@GetUser('id') currentUserId: string) {
    return this.socialService.getBlockedUsers(currentUserId);
  }
}
