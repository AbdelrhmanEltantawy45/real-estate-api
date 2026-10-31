import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsEnum, IsOptional } from 'class-validator';
import { InquiryStatus } from '@prisma/client';
import { PaginationDto } from '@/common/dto/pagination.dto';

export class InquiryQueryDto extends PaginationDto {
  @ApiPropertyOptional({ enum: InquiryStatus })
  @IsOptional()
  @IsEnum(InquiryStatus)
  status?: InquiryStatus;
}
