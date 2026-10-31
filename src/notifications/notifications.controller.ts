import {
  Controller,
  Delete,
  Get,
  NotFoundException,
  Param,
  Patch,
  Query,
} from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { ResponseMessage } from '@/common/decorators/response-message.decorator';
import { AuthenticatedUser, CurrentUser } from '@/common/decorators/current-user.decorator';
import { PrismaService } from '@/prisma/prisma.service';
import { buildPaginationMeta, Paginated } from '@/common/types/pagination';
import { PaginationDto } from '@/common/dto/pagination.dto';

@ApiTags('Notifications')
@Controller('notifications')
export class NotificationsController {
  constructor(private readonly prisma: PrismaService) {}

  @Get()
  @ResponseMessage('Notifications retrieved successfully')
  @ApiOperation({ summary: 'List the user notifications' })
  async list(@CurrentUser() user: AuthenticatedUser, @Query() query: PaginationDto) {
    const page = query.pageValue;
    const limit = query.limitValue;
    const where = { userId: user.id };
    const [items, total] = await Promise.all([
      this.prisma.notification.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * limit,
        take: limit,
      }),
      this.prisma.notification.count({ where }),
    ]);
    return new Paginated(items, buildPaginationMeta(total, page, limit));
  }

  @Get('unread-count')
  @ResponseMessage('Unread notifications count retrieved')
  @ApiOperation({ summary: 'Count unread notifications' })
  async unreadCount(@CurrentUser() user: AuthenticatedUser) {
    const count = await this.prisma.notification.count({
      where: { userId: user.id, isRead: false },
    });
    return { count };
  }

  @Patch(':id/read')
  @ResponseMessage('Notification marked as read')
  @ApiOperation({ summary: 'Mark a notification as read' })
  async markRead(@CurrentUser() user: AuthenticatedUser, @Param('id') id: string) {
    await this.ownOrFail(user.id, id);
    await this.prisma.notification.update({
      where: { id },
      data: { isRead: true },
    });
    return null;
  }

  @Patch('read-all')
  @ResponseMessage('All notifications marked as read')
  @ApiOperation({ summary: 'Mark all notifications as read' })
  async markAllRead(@CurrentUser() user: AuthenticatedUser) {
    await this.prisma.notification.updateMany({
      where: { userId: user.id, isRead: false },
      data: { isRead: true },
    });
    return null;
  }

  @Delete(':id')
  @ResponseMessage('Notification deleted')
  @ApiOperation({ summary: 'Delete a notification' })
  async remove(@CurrentUser() user: AuthenticatedUser, @Param('id') id: string) {
    await this.ownOrFail(user.id, id);
    await this.prisma.notification.delete({ where: { id } });
    return null;
  }

  private async ownOrFail(userId: string, id: string) {
    const notification = await this.prisma.notification.findUnique({ where: { id } });
    if (!notification || notification.userId !== userId) {
      throw new NotFoundException('Notification not found');
    }
  }
}
