import {
  WebSocketGateway,
  WebSocketServer,
  SubscribeMessage,
  OnGatewayConnection,
  OnGatewayDisconnect,
  ConnectedSocket,
  MessageBody,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../prisma.service';
import { Injectable, UseFilters } from '@nestjs/common';

@WebSocketGateway({
  cors: {
    origin: '*',
  },
})
@Injectable()
export class ChatGateway implements OnGatewayConnection, OnGatewayDisconnect {
  @WebSocketServer()
  server: Server;

  // Map to track active user WebSocket client associations (userId -> Set of clientIds)
  private userClients = new Map<string, Set<string>>();
  // Reverse lookup to map clientIds to userIds on disconnect
  private clientUsers = new Map<string, string>();

  constructor(
    private jwtService: JwtService,
    private configService: ConfigService,
    private prisma: PrismaService,
  ) {}

  async handleConnection(client: Socket) {
    const token = this.extractToken(client);
    if (!token) {
      client.disconnect(true);
      return;
    }

    try {
      const payload = await this.jwtService.verifyAsync(token, {
        secret: this.configService.get<string>('JWT_ACCESS_SECRET'),
      });
      const userId = payload.sub;

      // Track online status
      this.clientUsers.set(client.id, userId);
      if (!this.userClients.has(userId)) {
        this.userClients.set(userId, new Set<string>());
        // First connection: broadcast online state
        this.server.emit('user:online', { userId });
        
        // Update last seen in DB
        await this.prisma.user.update({
          where: { id: userId },
          data: { lastSeenAt: new Date() },
        });
      }
      this.userClients.get(userId)?.add(client.id);
      
      console.log(`Socket client connected: ${client.id} (user: ${userId})`);
    } catch (err) {
      client.disconnect(true);
    }
  }

  async handleDisconnect(client: Socket) {
    const userId = this.clientUsers.get(client.id);
    if (userId) {
      this.clientUsers.delete(client.id);
      const clients = this.userClients.get(userId);
      if (clients) {
        clients.delete(client.id);
        if (clients.size === 0) {
          this.userClients.delete(userId);
          // Last client disconnected: user is offline
          this.server.emit('user:offline', { userId });
          
          // Update last seen in DB
          await this.prisma.user.update({
            where: { id: userId },
            data: { lastSeenAt: new Date() },
          });
        }
      }
    }
    console.log(`Socket client disconnected: ${client.id}`);
  }

  // ==========================================
  // EVENT HANDLERS
  // ==========================================

  @SubscribeMessage('chat:join_conversations')
  handleJoinConversations(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: { conversationIds: string[] },
  ) {
    const userId = this.clientUsers.get(client.id);
    if (!userId || !data.conversationIds) return;

    for (const conversationId of data.conversationIds) {
      client.join(conversationId);
      console.log(`User ${userId} joined room conversation:${conversationId}`);
    }
  }

  @SubscribeMessage('chat:typing')
  handleTyping(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: { conversationId: string },
  ) {
    const userId = this.clientUsers.get(client.id);
    if (!userId || !data.conversationId) return;

    client.to(data.conversationId).emit('chat:typing', {
      conversationId: data.conversationId,
      userId,
    });
  }

  @SubscribeMessage('chat:stop_typing')
  handleStopTyping(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: { conversationId: string },
  ) {
    const userId = this.clientUsers.get(client.id);
    if (!userId || !data.conversationId) return;

    client.to(data.conversationId).emit('chat:stop_typing', {
      conversationId: data.conversationId,
      userId,
    });
  }

  @SubscribeMessage('chat:read')
  async handleRead(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: { conversationId: string; lastReadMessageId: string },
  ) {
    const userId = this.clientUsers.get(client.id);
    if (!userId || !data.conversationId || !data.lastReadMessageId) return;

    // Update read receipt status in DB
    await this.prisma.conversationMember.update({
      where: {
        conversationId_userId: {
          conversationId: data.conversationId,
          userId,
        },
      },
      data: {
        lastReadMessageId: data.lastReadMessageId,
      },
    });

    client.to(data.conversationId).emit('chat:read', {
      conversationId: data.conversationId,
      userId,
      lastReadMessageId: data.lastReadMessageId,
    });
  }

  // ==========================================
  // SERVER BROADCAST UTILITIES
  // ==========================================

  sendToConversation(conversationId: string, event: string, payload: any) {
    this.server.to(conversationId).emit(event, payload);
  }

  isUserOnline(userId: string): boolean {
    return this.userClients.has(userId);
  }

  private extractToken(client: Socket): string | undefined {
    // Check auth header, query param, or cookies
    const authHeader = client.handshake.headers.authorization;
    if (authHeader && authHeader.startsWith('Bearer ')) {
      return authHeader.substring(7);
    }
    return (client.handshake.auth?.token || client.handshake.query?.token) as string | undefined;
  }
}
