import { Body, Controller, Delete, Get, Param, Patch, Post } from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { Roles } from '@/common/decorators/roles.decorator';
import { ResponseMessage } from '@/common/decorators/response-message.decorator';
import { UserRole } from '@prisma/client';
import { AmenitiesService } from './amenities.service';
import { CreateAmenityDto, UpdateAmenityDto } from './dto/create-amenity.dto';

@ApiTags('Admin Amenities')
@Controller('admin/amenities')
@Roles(UserRole.ADMIN)
export class AdminAmenitiesController {
  constructor(private readonly amenities: AmenitiesService) {}

  @Get()
  @ResponseMessage('Amenities retrieved successfully')
  findAll() {
    return this.amenities.findAll({ pageValue: 1, limitValue: 100 } as any);
  }

  @Post()
  @ResponseMessage('Amenity created successfully')
  create(@Body() dto: CreateAmenityDto) {
    return this.amenities.create(dto);
  }

  @Patch(':id')
  @ResponseMessage('Amenity updated successfully')
  update(@Param('id') id: string, @Body() dto: UpdateAmenityDto) {
    return this.amenities.update(id, dto);
  }

  @Delete(':id')
  @ResponseMessage('Amenity deleted successfully')
  async remove(@Param('id') id: string) {
    await this.amenities.remove(id);
    return null;
  }
}
