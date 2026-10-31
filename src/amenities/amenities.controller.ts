import { Body, Controller, Get, Query } from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { Public } from '@/common/decorators/public.decorator';
import { ResponseMessage } from '@/common/decorators/response-message.decorator';
import { AmenitiesService } from './amenities.service';
import { AmenityQueryDto } from './dto/amenity-query.dto';

@ApiTags('Amenities')
@Controller('amenities')
export class AmenitiesController {
  constructor(private readonly amenities: AmenitiesService) {}

  @Public()
  @Get()
  @ResponseMessage('Amenities retrieved successfully')
  @ApiOperation({ summary: 'List amenities (public reference data)' })
  findAll(@Query() query: AmenityQueryDto) {
    return this.amenities.findAll(query);
  }
}
