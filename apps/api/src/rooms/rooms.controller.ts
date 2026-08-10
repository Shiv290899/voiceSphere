import { Controller, Post, Get, Patch, Delete, Param, Body, Query, UseGuards, HttpCode, HttpStatus } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';
import { RoomsService } from './rooms.service';
import { CreateRoomDto } from './dto/create-room.dto';
import { UpdateRoomDto } from './dto/update-room.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { GetUser } from '../auth/decorators/get-user.decorator';

@ApiTags('Voice Rooms')
@Controller('rooms')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class RoomsController {
  constructor(private roomsService: RoomsService) {}

  @Post()
  @ApiOperation({ summary: 'Create a new live voice room' })
  @ApiResponse({ status: 201, description: 'Room created successfully.' })
  create(@GetUser('id') userId: string, @Body() dto: CreateRoomDto) {
    return this.roomsService.create(userId, dto);
  }

  @Get()
  @ApiOperation({ summary: 'List all currently active/live voice rooms' })
  @ApiResponse({ status: 200, description: 'Return room list.' })
  list(
    @Query('category') category?: string,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
  ) {
    const pageNum = page ? parseInt(page, 10) : 1;
    const limitNum = limit ? parseInt(limit, 10) : 20;
    return this.roomsService.listActiveRooms(category, pageNum, limitNum);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get detailed parameters and member statuses of a room' })
  @ApiResponse({ status: 200, description: 'Return room structure.' })
  @ApiResponse({ status: 403, description: 'Private room access restricted.' })
  @ApiResponse({ status: 404, description: 'Room not found.' })
  getDetails(@GetUser('id') userId: string, @Param('id') roomId: string) {
    return this.roomsService.getRoomDetails(roomId, userId);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Update room info (owner only)' })
  @ApiResponse({ status: 200, description: 'Settings updated.' })
  @ApiResponse({ status: 403, description: 'Permission denied.' })
  update(
    @GetUser('id') userId: string,
    @GetUser('role') role: string,
    @Param('id') roomId: string,
    @Body() dto: UpdateRoomDto,
  ) {
    return this.roomsService.update(userId, role, roomId, dto);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Close and end a live voice room (owner/moderator only)' })
  @ApiResponse({ status: 200, description: 'Room closed successfully.' })
  @ApiResponse({ status: 403, description: 'Permission denied.' })
  close(
    @GetUser('id') userId: string,
    @GetUser('role') role: string,
    @Param('id') roomId: string,
  ) {
    return this.roomsService.closeRoom(userId, role, roomId);
  }

  @Post(':id/join')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Join a live voice room as a listener' })
  @ApiResponse({ status: 200, description: 'Joined room successfully.' })
  @ApiResponse({ status: 401, description: 'Password required or invalid.' })
  @ApiResponse({ status: 403, description: 'Blocked by safety settings.' })
  join(
    @GetUser('id') userId: string,
    @Param('id') roomId: string,
    @Body('password') password?: string,
  ) {
    return this.roomsService.joinRoom(userId, roomId, password);
  }

  @Post(':id/leave')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Exit a voice room' })
  @ApiResponse({ status: 200, description: 'Left room.' })
  leave(@GetUser('id') userId: string, @Param('id') roomId: string) {
    return this.roomsService.leaveRoom(userId, roomId);
  }

  @Post(':id/raise-hand')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Raise hand requesting speaking rights' })
  @ApiResponse({ status: 200, description: 'Hand raised.' })
  raiseHand(@GetUser('id') userId: string, @Param('id') roomId: string) {
    return this.roomsService.raiseHand(userId, roomId);
  }

  @Post(':id/lower-hand')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Lower hand withdrawal request' })
  @ApiResponse({ status: 200, description: 'Hand lowered.' })
  lowerHand(@GetUser('id') userId: string, @Param('id') roomId: string) {
    return this.roomsService.lowerHand(userId, roomId);
  }

  @Post(':id/promote/:userId')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Promote a listener to speaker (host only)' })
  @ApiResponse({ status: 200, description: 'Speaker promoted.' })
  @ApiResponse({ status: 403, description: 'Permission denied.' })
  promote(
    @GetUser('id') currentUserId: string,
    @Param('id') roomId: string,
    @Param('userId') targetUserId: string,
  ) {
    return this.roomsService.promoteSpeaker(currentUserId, roomId, targetUserId);
  }

  @Post(':id/demote/:userId')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Demote a speaker to listener (host only)' })
  @ApiResponse({ status: 200, description: 'Speaker demoted.' })
  @ApiResponse({ status: 403, description: 'Permission denied.' })
  demote(
    @GetUser('id') currentUserId: string,
    @Param('id') roomId: string,
    @Param('userId') targetUserId: string,
  ) {
    return this.roomsService.demoteSpeaker(currentUserId, roomId, targetUserId);
  }

  @Post(':id/mute/:userId')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Toggle microphone mute for a speaker (host only)' })
  @ApiResponse({ status: 200, description: 'Mute toggled.' })
  @ApiResponse({ status: 403, description: 'Permission denied.' })
  toggleMute(
    @GetUser('id') currentUserId: string,
    @Param('id') roomId: string,
    @Param('userId') targetUserId: string,
    @Body('isMuted') isMuted: boolean,
  ) {
    return this.roomsService.toggleMute(currentUserId, roomId, targetUserId, isMuted);
  }

  @Post(':id/livekit-token')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Generate WebRTC room join connection token' })
  @ApiResponse({ status: 200, description: 'Connection token generated.' })
  getToken(@GetUser('id') userId: string, @Param('id') roomId: string) {
    return this.roomsService.generateLiveKitToken(userId, roomId);
  }
}
