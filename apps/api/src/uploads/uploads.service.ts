import { Injectable, BadRequestException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { StorageProvider } from './providers/storage.provider';
import { LocalStorageProvider } from './providers/local-storage.provider';
import { S3StorageProvider } from './providers/s3-storage.provider';
import * as path from 'path';

@Injectable()
export class UploadsService {
  private storageProvider: StorageProvider;

  constructor(private configService: ConfigService) {
    const useMock = this.configService.get<string>('USE_MOCK_STORAGE') === 'true';
    if (useMock) {
      this.storageProvider = new LocalStorageProvider();
    } else {
      this.storageProvider = new S3StorageProvider(this.configService);
    }
  }

  async uploadFile(file: any, type: 'IMAGE' | 'VIDEO' | 'AUDIO') {
    this.validateFile(file, type);

    const ext = path.extname(file.originalname) || (type === 'IMAGE' ? '.jpg' : '.mp3');
    const randomName = `${Date.now()}-${Math.random().toString(36).substring(7)}${ext}`;

    const fileUrl = await this.storageProvider.uploadFile(file.buffer, randomName, file.mimetype);

    return {
      url: fileUrl,
      fileName: randomName,
      mimeType: file.mimetype,
      originalName: file.originalname,
    };
  }

  async getPresignedUrl(fileName: string, mimeType: string) {
    return this.storageProvider.getPresignedUrl(fileName, mimeType);
  }

  private validateFile(file: any, type: 'IMAGE' | 'VIDEO' | 'AUDIO') {
    const size = file.size;
    const mime = file.mimetype;

    if (type === 'IMAGE') {
      const allowedMimes = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'];
      const maxSize = 10 * 1024 * 1024; // 10MB
      if (!allowedMimes.includes(mime)) {
        throw new BadRequestException(`Invalid image MIME type: ${mime}`);
      }
      if (size > maxSize) {
        throw new BadRequestException('Image file size exceeds 10MB limit');
      }
    } else {
      const allowedMimes = [
        'audio/mpeg',
        'audio/mp3',
        'audio/wav',
        'audio/x-wav',
        'audio/aac',
        'audio/m4a',
        'audio/mp4',
        'audio/ogg',
        'video/mp4',
      ];
      const maxSize = 50 * 1024 * 1024; // 50MB
      if (!allowedMimes.includes(mime)) {
        throw new BadRequestException(`Invalid media MIME type: ${mime}`);
      }
      if (size > maxSize) {
        throw new BadRequestException('Media file size exceeds 50MB limit');
      }
    }
  }
}
