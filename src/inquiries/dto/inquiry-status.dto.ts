import { ApiProperty } from '@nestjs/swagger';
import { InquiryStatus } from '@prisma/client';
import { IsEnum } from 'class-validator';

export class InquiryStatusDto {
  @ApiProperty({ enum: InquiryStatus })
  @IsEnum(InquiryStatus)
  status!: InquiryStatus;
}
