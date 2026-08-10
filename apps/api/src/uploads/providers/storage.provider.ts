export interface StorageProvider {
  uploadFile(fileBuffer: Buffer, fileName: string, mimeType: string): Promise<string>;
  getPresignedUrl(fileName: string, mimeType: string): Promise<{ uploadUrl: string; fileUrl: string }>;
}
export const STORAGE_PROVIDER_KEY = 'StorageProvider';
