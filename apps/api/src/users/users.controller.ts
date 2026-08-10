import { Controller, Get, Param, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';
import { UsersService } from './users.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { GetUser } from '../auth/decorators/get-user.decorator';

@ApiTags('Users')
@Controller('users')
export class UsersController {
  constructor(private usersService: UsersService) {}

  @Get('me')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get current logged-in user detailed profile' })
  @ApiResponse({ status: 200, description: 'Return current user details.' })
  @ApiResponse({ status: 401, description: 'Unauthorized.' })
  getMe(@GetUser('id') userId: string) {
    return this.usersService.findOneById(userId);
  }

  @Get(':username')
  @ApiOperation({ summary: 'Get public profile details of a user by username' })
  @ApiResponse({ status: 200, description: 'Return user public profile details.' })
  @ApiResponse({ status: 404, description: 'User not found.' })
  getByUsername(@Param('username') username: string) {
    return this.usersService.findOneByUsername(username);
  }
}
