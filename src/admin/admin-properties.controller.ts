import { Body, Controller, Get, Param, Patch, Post, Query, Req } from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { Roles } from '@/common/decorators/roles.decorator';
import { ResponseMessage } from '@/common/decorators/response-message.decorator';
import { AuthenticatedUser, CurrentUser } from '@/common/decorators/current-user.decorator';
import { UserRole } from '@prisma/client';
import { Request } from 'express';
import { AdminService } from './admin.service';
import { AuditService } from './audit/audit.service';
import { AdminPropertyQueryDto } from './dto/admin-property-query.dto';
import { RejectPropertyDto } from './dto/reject-property.dto';
import { FeaturedDto } from './dto/featured.dto';
import { PropertyStatusDto } from '@/properties/dto/property-status.dto';

@ApiTags('Admin Properties')
@Controller('admin/properties')
@Roles(UserRole.ADMIN)
export class AdminPropertiesController {
  constructor(
    private readonly admin: AdminService,
    private readonly audit: AuditService,
  ) {}

  @Get()
  @ResponseMessage('Properties retrieved successfully')
  @ApiOperation({ summary: 'List all properties (admin)' })
  list(@Query() query: AdminPropertyQueryDto) {
    return this.admin.propertiesList(query);
  }

  @Get(':id')
  @ResponseMessage('Property retrieved successfully')
  findOne(@Param('id') id: string) {
    return this.admin.propertyFindOne(id);
  }

  @Post(':id/approve')
  @ResponseMessage('Property approved successfully')
  @ApiOperation({ summary: 'Approve a pending listing' })
  async approve(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id') id: string,
    @Req() req: Request,
  ) {
    const result = await this.admin.approveProperty(user.id, id, req.ip);
    this.audit.log({
      actorUserId: user.id,
      action: 'APPROVE_PROPERTY',
      targetType: 'Property',
      targetId: id,
      ipAddress: req.ip,
    });
    return result;
  }

  @Post(':id/reject')
  @ResponseMessage('Property rejected successfully')
  @ApiOperation({ summary: 'Reject a pending listing with a reason' })
  async reject(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id') id: string,
    @Body() dto: RejectPropertyDto,
    @Req() req: Request,
  ) {
    const result = await this.admin.rejectProperty(user.id, id, dto.rejectionReason, req.ip);
    this.audit.log({
      actorUserId: user.id,
      action: 'REJECT_PROPERTY',
      targetType: 'Property',
      targetId: id,
      metadata: { rejectionReason: dto.rejectionReason },
      ipAddress: req.ip,
    });
    return result;
  }

  @Patch(':id/featured')
  @ResponseMessage('Property featured status updated successfully')
  @ApiOperation({ summary: 'Toggle featured status' })
  async featured(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id') id: string,
    @Body() dto: FeaturedDto,
    @Req() req: Request,
  ) {
    const result = await this.admin.setFeatured(id, dto.isFeatured);
    this.audit.log({
      actorUserId: user.id,
      action: 'SET_FEATURED',
      targetType: 'Property',
      targetId: id,
      metadata: { isFeatured: dto.isFeatured },
      ipAddress: req.ip,
    });
    return result;
  }

  @Patch(':id/status')
  @ResponseMessage('Property status updated successfully')
  @ApiOperation({ summary: 'Override a property status' })
  async status(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id') id: string,
    @Body() dto: PropertyStatusDto,
    @Req() req: Request,
  ) {
    const result = await this.admin.updatePropertyStatus(id, dto.status);
    this.audit.log({
      actorUserId: user.id,
      action: 'UPDATE_PROPERTY_STATUS',
      targetType: 'Property',
      targetId: id,
      metadata: { status: dto.status },
      ipAddress: req.ip,
    });
    return result;
  }
}
