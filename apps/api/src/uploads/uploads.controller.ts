import { Controller, Post, Body, Query, UseInterceptors, UploadedFile, UseGuards, BadRequestException } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth, ApiConsumes, ApiBody } from '@nestjs/swagger';
import { FileInterceptor } from '@nestjs/platform-express';
import { UploadsService } from './uploads.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';

@ApiTags('Media & Uploads')
@Controller('uploads')
export class UploadsController {
  constructor(private uploadsService: UploadsService) {}

  @Post('file')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiConsumes('multipart/form-data')
  @ApiOperation({ summary: 'Upload an image, video, or audio file directly' })
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        file: { type: 'string', format: 'binary' },
      },
    },
  })
  @UseInterceptors(FileInterceptor('file'))
  uploadFile(
    @UploadedFile() file: any,
    @Query('type') type: 'IMAGE' | 'VIDEO' | 'AUDIO' = 'IMAGE',
  ) {
    if (!file) {
      throw new BadRequestException('No file uploaded in multi-part form-data requests');
    }
    return this.uploadsService.uploadFile(file, type);
  }

  @Post('presigned-url')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Generate S3 presigned URL for direct client uploads' })
  @ApiResponse({ status: 201, description: 'Return presigned upload URL & target file URL.' })
  getPresignedUrl(
    @Body('fileName') fileName: string,
    @Body('mimeType') mimeType: string,
  ) {
    if (!fileName || !mimeType) {
      throw new BadRequestException('fileName and mimeType are required parameters');
    }
    return this.uploadsService.getPresignedUrl(fileName, mimeType);
  }
}
