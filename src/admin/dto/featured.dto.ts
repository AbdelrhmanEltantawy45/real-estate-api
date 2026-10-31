import { ApiProperty } from '@nestjs/swagger';
import { IsBoolean } from 'class-validator';

export class FeaturedDto {
  @ApiProperty()
  @IsBoolean()
  isFeatured!: boolean;
}
