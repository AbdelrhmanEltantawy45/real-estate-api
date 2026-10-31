import { Module } from '@nestjs/common';
import { AmenitiesController } from './amenities.controller';
import { AdminAmenitiesController } from './admin-amenities.controller';
import { AmenitiesService } from './amenities.service';

@Module({
  controllers: [AmenitiesController, AdminAmenitiesController],
  providers: [AmenitiesService],
  exports: [AmenitiesService],
})
export class AmenitiesModule {}
