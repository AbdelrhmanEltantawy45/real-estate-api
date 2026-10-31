import {
  Body,
  Controller,
  Get,
  Param,
  Patch,
  Query,
  Req,
} from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { Roles } from '@/common/decorators/roles.decorator';
import { ResponseMessage } from '@/common/decorators/response-message.decorator';
import { AuthenticatedUser, CurrentUser } from '@/common/decorators/current-user.decorator';
import { UserRole } from '@prisma/client';
import { Request } from 'express';
import { AdminService } from './admin.service';
import { AuditService } from './audit/audit.service';
import { AdminUserQueryDto } from './dto/admin-user-query.dto';
import { UpdateUserStatusDto } from './dto/update-user-status.dto';
import { UpdateUserRoleDto } from './dto/update-user-role.dto';

@ApiTags('Admin Users')
@Controller('admin/users')
@Roles(UserRole.ADMIN)
export class AdminUsersController {
  constructor(
    private readonly admin: AdminService,
    private readonly audit: AuditService,
  ) {}

  @Get()
  @ResponseMessage('Users retrieved successfully')
  @ApiOperation({ summary: 'List users with search and filters' })
  list(@Query() query: AdminUserQueryDto) {
    return this.admin.usersList(query);
  }

  @Get(':id')
  @ResponseMessage('User retrieved successfully')
  findOne(@Param('id') id: string) {
    return this.admin.userFindOne(id);
  }

  @Patch(':id/status')
  @ResponseMessage('User status updated successfully')
  async updateStatus(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id') id: string,
    @Body() dto: UpdateUserStatusDto,
    @Req() req: Request,
  ) {
    const result = await this.admin.updateUserStatus(user.id, id, dto.isActive, req.ip);
    this.audit.log({
      actorUserId: user.id,
      action: 'UPDATE_USER_STATUS',
      targetType: 'User',
      targetId: id,
      metadata: { isActive: dto.isActive },
      ipAddress: req.ip,
    });
    return result;
  }

  @Patch(':id/role')
  @ResponseMessage('User role updated successfully')
  async updateRole(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id') id: string,
    @Body() dto: UpdateUserRoleDto,
    @Req() req: Request,
  ) {
    const result = await this.admin.updateUserRole(user.id, id, dto.role, req.ip);
    this.audit.log({
      actorUserId: user.id,
      action: 'UPDATE_USER_ROLE',
      targetType: 'User',
      targetId: id,
      metadata: { role: dto.role },
      ipAddress: req.ip,
    });
    return result;
  }
}
