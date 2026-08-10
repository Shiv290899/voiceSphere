import { Injectable } from '@nestjs/common';
import { StorageProvider } from './storage.provider';
import * as fs from 'fs';
import * as path from 'path';

@Injectable()
export class LocalStorageProvider implements StorageProvider {
  private uploadDir = path.join(process.cwd(), 'uploads');

  constructor() {
    if (!fs.existsSync(this.uploadDir)) {
      fs.mkdirSync(this.uploadDir, { recursive: true });
    }
  }

  async uploadFile(fileBuffer: Buffer, fileName: string, mimeType: string): Promise<string> {
    const filePath = path.join(this.uploadDir, fileName);
    fs.writeFileSync(filePath, fileBuffer);
    // Return path mapping to local assets
    return `/uploads/${fileName}`;
  }

  async getPresignedUrl(fileName: string, mimeType: string): Promise<{ uploadUrl: string; fileUrl: string }> {
    return {
      uploadUrl: `http://localhost:3000/api/v1/uploads/file?mockFileName=${fileName}`,
      fileUrl: `/uploads/${fileName}`,
    };
  }
}
