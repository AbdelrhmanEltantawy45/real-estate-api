import {
  Controller,
  Get,
  Param,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { Public } from '@/common/decorators/public.decorator';
import { ResponseMessage } from '@/common/decorators/response-message.decorator';
import { OptionalJwtAuthGuard } from '@/common/guards/optional-jwt-auth.guard';
import { AuthenticatedUser, CurrentUser } from '@/common/decorators/current-user.decorator';
import { PropertiesService } from './properties.service';
import { PropertyQueryDto } from './dto/property-query.dto';

@ApiTags('Properties')
@Controller('properties')
export class PropertiesController {
  constructor(private readonly properties: PropertiesService) {}

  @Public()
  @Get()
  @ResponseMessage('Properties retrieved successfully')
  @ApiOperation({ summary: 'Search and filter published properties' })
  find(@Query() query: PropertyQueryDto) {
    return this.properties.findPublic(query);
  }

  @Public()
  @Get('featured')
  @ResponseMessage('Featured properties retrieved successfully')
  @ApiOperation({ summary: 'List featured properties' })
  findFeatured(@Query('limit') limit?: string) {
    return this.properties.findFeatured(limit ? Number(limit) : 12);
  }

  @Public()
  @Get('recent')
  @ResponseMessage('Recent properties retrieved successfully')
  @ApiOperation({ summary: 'List most recent properties' })
  findRecent(@Query('limit') limit?: string) {
    return this.properties.findRecent(limit ? Number(limit) : 12);
  }

  @Public()
  @Get('locations')
  @ResponseMessage('Locations retrieved successfully')
  @ApiOperation({ summary: 'List cities with published property counts' })
  locations() {
    return this.properties.getLocations();
  }

  @Public()
  @Get('property-types')
  @ResponseMessage('Property types retrieved successfully')
  @ApiOperation({ summary: 'List property types with counts' })
  propertyTypes() {
    return this.properties.getPropertyTypes();
  }

  @Public()
  @Get(':id')
  @ResponseMessage('Property retrieved successfully')
  @ApiOperation({ summary: 'Get a published property by id or slug' })
  findOne(@Param('id') id: string) {
    return this.properties.findOnePublic(id);
  }

  @Public()
  @Get('slug/:slug')
  @ResponseMessage('Property retrieved successfully')
  @ApiOperation({ summary: 'Get a published property by slug' })
  findBySlug(@Param('slug') slug: string) {
    return this.properties.findOnePublic(slug);
  }

  @UseGuards(OptionalJwtAuthGuard)
  @Post(':id/view')
  @ResponseMessage('View recorded')
  @ApiOperation({ summary: 'Record a property view (anonymous or authenticated)' })
  async recordView(@Param('id') id: string, @CurrentUser() user?: AuthenticatedUser) {
    await this.properties.recordView(id, user?.id);
    return null;
  }
}
