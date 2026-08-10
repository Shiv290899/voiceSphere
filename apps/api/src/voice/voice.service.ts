import { Injectable, InternalServerErrorException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { AccessToken } from 'livekit-server-sdk';

@Injectable()
export class VoiceService {
  constructor(private configService: ConfigService) {}

  async generateToken(roomId: string, userId: string, username: string, canPublish: boolean): Promise<string> {
    const useMock = this.configService.get<string>('USE_MOCK_LIVEKIT') === 'true';

    if (useMock) {
      console.log(`[LIVEKIT MOCK MODE] Generated token for user ${username} (${userId}) in room ${roomId}. canPublish: ${canPublish}`);
      // Return a structured mock token
      return `mock_lk_token_identity_${userId}_room_${roomId}_pub_${canPublish}_sig_${Date.now()}`;
    }

    const apiKey = this.configService.get<string>('LIVEKIT_API_KEY');
    const apiSecret = this.configService.get<string>('LIVEKIT_API_SECRET');

    if (!apiKey || !apiSecret) {
      throw new InternalServerErrorException('LiveKit API keys are not configured on the server');
    }

    try {
      const at = new AccessToken(apiKey, apiSecret, {
        identity: userId,
        name: username,
      });

      at.addGrant({
        roomJoin: true,
        room: roomId,
        canPublish,
        canSubscribe: true,
        canPublishData: true,
      });

      return await at.toJwt();
    } catch (err) {
      console.error('Error generating LiveKit token:', err);
      throw new InternalServerErrorException('Failed to generate LiveKit access token');
    }
  }
}
