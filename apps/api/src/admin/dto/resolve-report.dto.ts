import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsEnum, IsOptional, IsString } from 'class-validator';

export enum ReportResolutionAction {
  DISMISS = 'DISMISS',
  DELETE_CONTENT = 'DELETE_CONTENT',
  SUSPEND_USER = 'SUSPEND_USER',
}

export class ResolveReportDto {
  @ApiProperty({ enum: ReportResolutionAction, example: ReportResolutionAction.DISMISS, description: 'Resolution action' })
  @IsEnum(ReportResolutionAction)
  action: ReportResolutionAction;

  @ApiPropertyOptional({ example: 'Determined to violate community guidelines.', description: 'Optional resolution explanation' })
  @IsString()
  @IsOptional()
  notes?: string;
}
