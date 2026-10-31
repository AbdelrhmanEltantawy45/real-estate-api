import {
  BadRequestException,
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Query,
  UploadedFile,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { Roles } from '@/common/decorators/roles.decorator';
import { ResponseMessage } from '@/common/decorators/response-message.decorator';
import { AuthenticatedUser, CurrentUser } from '@/common/decorators/current-user.decorator';
import { requireAgent } from '@/common/utils/auth.util';
import { StorageService } from '@/uploads/storage.service';
import { UserRole } from '@prisma/client';
import { PropertiesService } from './properties.service';
import { CreatePropertyDto } from './dto/create-property.dto';
import { UpdatePropertyDto } from './dto/update-property.dto';
import { AgentPropertyQueryDto } from './dto/agent-property-query.dto';
import { PropertyStatusDto } from './dto/property-status.dto';
import { ImageMetaDto } from './dto/image-meta.dto';

const TEN_MB = 10 * 1024 * 1024;

@ApiTags('Agent Properties')
@Controller('agent/properties')
@Roles(UserRole.AGENT)
export class AgentPropertiesController {
  constructor(
    private readonly properties: PropertiesService,
    private readonly storage: StorageService,
  ) {}

  @Post()
  @ResponseMessage('Property created successfully')
  @ApiOperation({ summary: 'Create a property listing (draft or submit)' })
  create(@CurrentUser() user: AuthenticatedUser, @Body() dto: CreatePropertyDto) {
    return this.properties.createAgentProperty(requireAgent(user), dto);
  }

  @Get()
  @ResponseMessage('Properties retrieved successfully')
  @ApiOperation({ summary: 'List the agent own properties' })
  find(@CurrentUser() user: AuthenticatedUser, @Query() query: AgentPropertyQueryDto) {
    return this.properties.findAgentProperties(requireAgent(user), query);
  }

  @Get(':id')
  @ResponseMessage('Property retrieved successfully')
  @ApiOperation({ summary: 'Get one of the agent own properties' })
  findOne(@CurrentUser() user: AuthenticatedUser, @Param('id') id: string) {
    return this.properties.findOneAgentProperty(requireAgent(user), id);
  }

  @Patch(':id')
  @ResponseMessage('Property updated successfully')
  @ApiOperation({ summary: 'Update a draft, rejected, pending or archived listing' })
  update(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id') id: string,
    @Body() dto: UpdatePropertyDto,
  ) {
    return this.properties.updateAgentProperty(requireAgent(user), id, dto);
  }

  @Delete(':id')
  @ResponseMessage('Property deleted successfully')
  @ApiOperation({ summary: 'Soft-delete an agent listing' })
  async remove(@CurrentUser() user: AuthenticatedUser, @Param('id') id: string) {
    await this.properties.softDeleteAgentProperty(requireAgent(user), id);
    return null;
  }

  @Post(':id/submit')
  @ResponseMessage('Property submitted for approval')
  @ApiOperation({ summary: 'Submit a listing for admin approval' })
  submit(@CurrentUser() user: AuthenticatedUser, @Param('id') id: string) {
    return this.properties.submitForApproval(requireAgent(user), id);
  }

  @Post(':id/images')
  @UseInterceptors(FileInterceptor('file', { limits: { fileSize: TEN_MB } }))
  @ResponseMessage('Image uploaded successfully')
  @ApiOperation({ summary: 'Upload an image to a property' })
  async uploadImage(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id') id: string,
    @UploadedFile() file: Express.Multer.File,
    @Body() meta?: ImageMetaDto,
  ) {
    if (!file) throw new BadRequestException('Image file is required');
    const agentProfileId = requireAgent(user);
    const result = await this.storage.uploadImage({
      buffer: file.buffer,
      originalname: file.originalname,
      mimetype: file.mimetype,
      size: file.size,
    });
    return this.properties.addImage(agentProfileId, id, {
      imageUrl: result.url,
      storageKey: result.storageKey,
      altText: meta?.altText,
      isPrimary: meta?.isPrimary,
    });
  }

  @Delete(':id/images/:imageId')
  @ResponseMessage('Image deleted successfully')
  @ApiOperation({ summary: 'Delete a property image' })
  async removeImage(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id') id: string,
    @Param('imageId') imageId: string,
  ) {
    const agentProfileId = requireAgent(user);
    const removed = await this.properties.removeImage(agentProfileId, id, imageId);
    if (removed?.storageKey) await this.storage.delete(removed.storageKey);
    return null;
  }

  @Patch(':id/status')
  @ResponseMessage('Property status updated successfully')
  @ApiOperation({ summary: 'Update a listing status (SOLD, RENTED, ARCHIVED, DRAFT)' })
  updateStatus(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id') id: string,
    @Body() dto: PropertyStatusDto,
  ) {
    return this.properties.updateAgentStatus(requireAgent(user), id, dto.status);
  }
}
