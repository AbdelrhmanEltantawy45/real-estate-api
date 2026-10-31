import { Controller, Get, Query } from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { ResponseMessage } from '@/common/decorators/response-message.decorator';
import { AuthenticatedUser, CurrentUser } from '@/common/decorators/current-user.decorator';
import { PaginationDto } from '@/common/dto/pagination.dto';
import { DashboardService } from './dashboard.service';

@ApiTags('Dashboard')
@Controller('dashboard')
export class DashboardController {
  constructor(private readonly dashboard: DashboardService) {}

  @Get('overview')
  @ResponseMessage('Dashboard overview retrieved successfully')
  @ApiOperation({ summary: 'Buyer dashboard overview statistics' })
  overview(@CurrentUser() user: AuthenticatedUser) {
    return this.dashboard.overview(user.id);
  }

  @Get('recently-viewed')
  @ResponseMessage('Recently viewed properties retrieved successfully')
  @ApiOperation({ summary: 'Recently viewed properties for the user' })
  recentlyViewed(@CurrentUser() user: AuthenticatedUser, @Query('limit') limit?: string) {
    return this.dashboard.recentlyViewed(user.id, limit ? Number(limit) : 10);
  }

  @Get('recommendations')
  @ResponseMessage('Recommended properties retrieved successfully')
  @ApiOperation({ summary: 'Recommended properties based on user activity' })
  recommendations(@CurrentUser() user: AuthenticatedUser) {
    return this.dashboard.recommendations(user.id);
  }

  @Get('appointments')
  @ResponseMessage('Upcoming appointments retrieved successfully')
  @ApiOperation({ summary: 'Upcoming appointments for the user' })
  appointments(@CurrentUser() user: AuthenticatedUser, @Query() query: PaginationDto) {
    return this.dashboard.appointments(user.id, query);
  }

  @Get('notifications')
  @ResponseMessage('Notifications retrieved successfully')
  @ApiOperation({ summary: 'Recent notifications for the user' })
  notifications(@CurrentUser() user: AuthenticatedUser, @Query() query: PaginationDto) {
    return this.dashboard.notifications(user.id, query);
  }
}
