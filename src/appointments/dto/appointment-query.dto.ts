import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsEnum, IsOptional } from 'class-validator';
import { AppointmentStatus } from '@prisma/client';
import { PaginationDto } from '@/common/dto/pagination.dto';

export class AppointmentQueryDto extends PaginationDto {
  @ApiPropertyOptional({ enum: AppointmentStatus })
  @IsOptional()
  @IsEnum(AppointmentStatus)
  status?: AppointmentStatus;
}
