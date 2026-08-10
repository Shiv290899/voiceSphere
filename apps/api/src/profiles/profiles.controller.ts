import { Controller, Patch, Body, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';
import { ProfilesService } from './profiles.service';
import { UpdateProfileDto } from './dto/update-profile.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { GetUser } from '../auth/decorators/get-user.decorator';

@ApiTags('Profiles')
@Controller('profiles')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class ProfilesController {
  constructor(private profilesService: ProfilesService) {}

  @Patch('me')
  @ApiOperation({ summary: 'Update profile details for the authenticated user' })
  @ApiResponse({ status: 200, description: 'Profile updated successfully.' })
  @ApiResponse({ status: 400, description: 'Validation errors.' })
  @ApiResponse({ status: 401, description: 'Unauthorized.' })
  update(@GetUser('id') userId: string, @Body() dto: UpdateProfileDto) {
    return this.profilesService.update(userId, dto);
  }
}
