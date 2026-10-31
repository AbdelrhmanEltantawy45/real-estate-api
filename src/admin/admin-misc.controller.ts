import { Controller, Get, Query } from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { Roles } from '@/common/decorators/roles.decorator';
import { ResponseMessage } from '@/common/decorators/response-message.decorator';
import { UserRole } from '@prisma/client';
import { PaginationDto } from '@/common/dto/pagination.dto';
import { AdminService } from './admin.service';

@ApiTags('Admin')
@Controller('admin')
@Roles(UserRole.ADMIN)
export class AdminMiscController {
  constructor(private readonly admin: AdminService) {}

  @Get('inquiries')
  @ResponseMessage('Inquiries retrieved successfully')
  @ApiOperation({ summary: 'List all inquiries (admin)' })
  inquiries(@Query() query: PaginationDto) {
    return this.admin.inquiriesList(query);
  }

  @Get('appointments')
  @ResponseMessage('Appointments retrieved successfully')
  @ApiOperation({ summary: 'List all appointments (admin)' })
  appointments(@Query() query: PaginationDto) {
    return this.admin.appointmentsList(query);
  }

  @Get('reviews')
  @ResponseMessage('Reviews retrieved successfully')
  @ApiOperation({ summary: 'List all reviews (admin)' })
  reviews(@Query() query: PaginationDto) {
    return this.admin.reviewsList(query);
  }
}
