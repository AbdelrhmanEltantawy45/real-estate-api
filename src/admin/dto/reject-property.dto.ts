import { ApiProperty } from '@nestjs/swagger';
import { IsString, MaxLength, MinLength } from 'class-validator';

export class RejectPropertyDto {
  @ApiProperty()
  @IsString()
  @MinLength(5)
  @MaxLength(1000)
  rejectionReason!: string;
}
