import { Body, Controller, Get, Param, Post, Query, UseGuards } from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { Throttle } from '@nestjs/throttler';
import { ResponseMessage } from '@/common/decorators/response-message.decorator';
import { AuthenticatedUser, CurrentUser } from '@/common/decorators/current-user.decorator';
import { OptionalJwtAuthGuard } from '@/common/guards/optional-jwt-auth.guard';
import { InquiriesService } from './inquiries.service';
import { CreateInquiryDto } from './dto/create-inquiry.dto';
import { InquiryQueryDto } from './dto/inquiry-query.dto';

@ApiTags('Inquiries')
@Controller('inquiries')
export class InquiriesController {
  constructor(private readonly inquiries: InquiriesService) {}

  @UseGuards(OptionalJwtAuthGuard)
  @Throttle({ default: { limit: 20, ttl: 15 * 60 * 1000 } })
  @Post()
  @ResponseMessage('Inquiry submitted successfully')
  @ApiOperation({ summary: 'Submit a property inquiry (guests or users)' })
  create(@CurrentUser() user: AuthenticatedUser | undefined, @Body() dto: CreateInquiryDto) {
    return this.inquiries.create(user?.id, dto);
  }

  @Get('my')
  @ResponseMessage('Inquiries retrieved successfully')
  @ApiOperation({ summary: 'List the authenticated user inquiries' })
  myList(@CurrentUser() user: AuthenticatedUser, @Query() query: InquiryQueryDto) {
    return this.inquiries.myList(user.id, query);
  }
}
