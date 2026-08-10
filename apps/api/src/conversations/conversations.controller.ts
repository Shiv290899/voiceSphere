import { Controller, Post, Get, Delete, Body, Param, Query, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';
import { ConversationsService } from './conversations.service';
import { CreateConversationDto } from './dto/create-conversation.dto';
import { CreateMessageDto } from './dto/create-message.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { GetUser } from '../auth/decorators/get-user.decorator';

@ApiTags('Direct Messages')
@Controller('conversations')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class ConversationsController {
  constructor(private conversationsService: ConversationsService) {}

  @Post()
  @ApiOperation({ summary: 'Open or create a direct conversation room' })
  @ApiResponse({ status: 201, description: 'Conversation opened successfully.' })
  @ApiResponse({ status: 403, description: 'Blocked by security settings.' })
  getOrCreate(
    @GetUser('id') userId: string,
    @Body() dto: CreateConversationDto,
  ) {
    return this.conversationsService.getOrCreateConversation(userId, dto);
  }

  @Get()
  @ApiOperation({ summary: 'List all active conversations for current user' })
  @ApiResponse({ status: 200, description: 'Return conversation list.' })
  list(@GetUser('id') userId: string) {
    return this.conversationsService.listConversations(userId);
  }

  @Get(':id/messages')
  @ApiOperation({ summary: 'Retrieve pagination message history' })
  @ApiResponse({ status: 200, description: 'Return messages array.' })
  getMessages(
    @GetUser('id') userId: string,
    @Param('id') conversationId: string,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
  ) {
    const pageNum = page ? parseInt(page, 10) : 1;
    const limitNum = limit ? parseInt(limit, 10) : 20;
    return this.conversationsService.listMessages(userId, conversationId, pageNum, limitNum);
  }

  @Post(':id/messages')
  @ApiOperation({ summary: 'Post a new message in a conversation' })
  @ApiResponse({ status: 201, description: 'Message sent successfully.' })
  sendMessage(
    @GetUser('id') userId: string,
    @Param('id') conversationId: string,
    @Body() dto: CreateMessageDto,
  ) {
    return this.conversationsService.sendMessage(userId, conversationId, dto);
  }

  @Delete(':id/messages/:messageId')
  @ApiOperation({ summary: 'Revoke/delete a sent message' })
  @ApiResponse({ status: 200, description: 'Message deleted.' })
  @ApiResponse({ status: 403, description: 'Permission denied.' })
  deleteMessage(
    @GetUser('id') userId: string,
    @GetUser('role') role: string,
    @Param('id') conversationId: string,
    @Param('messageId') messageId: string,
  ) {
    return this.conversationsService.deleteMessage(userId, role, conversationId, messageId);
  }
}
