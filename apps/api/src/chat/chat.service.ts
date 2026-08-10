import { Injectable } from '@nestjs/common';
import { ChatGateway } from './chat.gateway';

@Injectable()
export class ChatService {
  constructor(private chatGateway: ChatGateway) {}

  isUserOnline(userId: string): boolean {
    return this.chatGateway.isUserOnline(userId);
  }
}
