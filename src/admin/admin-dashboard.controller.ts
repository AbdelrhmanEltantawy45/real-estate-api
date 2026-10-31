import { Controller, Get } from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { Roles } from '@/common/decorators/roles.decorator';
import { ResponseMessage } from '@/common/decorators/response-message.decorator';
import { UserRole } from '@prisma/client';
import { AdminService } from './admin.service';

@ApiTags('Admin Dashboard')
@Controller('admin/dashboard')
@Roles(UserRole.ADMIN)
export class AdminDashboardController {
  constructor(private readonly admin: AdminService) {}

  @Get('overview')
  @ResponseMessage('Admin overview retrieved successfully')
  @ApiOperation({ summary: 'Admin dashboard overview' })
  overview() {
    return this.admin.dashboardOverview();
  }

  @Get('analytics')
  @ResponseMessage('Admin analytics retrieved successfully')
  @ApiOperation({ summary: 'Admin dashboard analytics' })
  analytics() {
    return this.admin.dashboardAnalytics();
  }
}
