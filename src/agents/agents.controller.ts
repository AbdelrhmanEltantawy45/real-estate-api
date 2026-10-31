import { Body, Controller, Get, Param, Post, Query } from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { Public } from '@/common/decorators/public.decorator';
import { Roles } from '@/common/decorators/roles.decorator';
import { ResponseMessage } from '@/common/decorators/response-message.decorator';
import { AuthenticatedUser, CurrentUser } from '@/common/decorators/current-user.decorator';
import { UserRole } from '@prisma/client';
import { AgentsService } from './agents.service';
import { ReviewsService } from '@/reviews/reviews.service';
import { AgentQueryDto } from './dto/agent-query.dto';
import { ApplyAgentDto } from './dto/apply-agent.dto';
import { CreateReviewDto } from '@/reviews/dto/create-review.dto';
import { PaginationDto } from '@/common/dto/pagination.dto';

@ApiTags('Agents')
@Controller('agents')
export class AgentsController {
  constructor(
    private readonly agents: AgentsService,
    private readonly reviews: ReviewsService,
  ) {}

  @Public()
  @Get()
  @ResponseMessage('Agents retrieved successfully')
  @ApiOperation({ summary: 'List verified agents' })
  findAll(@Query() query: AgentQueryDto) {
    return this.agents.findAll(query);
  }

  @Post('apply')
  @Roles(UserRole.USER)
  @ResponseMessage('Agent application submitted')
  @ApiOperation({ summary: 'Apply to become an agent (creates a pending profile)' })
  apply(@CurrentUser() user: AuthenticatedUser, @Body() dto: ApplyAgentDto) {
    return this.agents.apply(user.id, dto);
  }

  @Public()
  @Get(':id')
  @ResponseMessage('Agent retrieved successfully')
  @ApiOperation({ summary: 'Get a public agent profile' })
  findOne(@Param('id') id: string) {
    return this.agents.findOne(id);
  }

  @Public()
  @Get(':id/properties')
  @ResponseMessage('Agent properties retrieved successfully')
  @ApiOperation({ summary: 'List an agent published properties' })
  findProperties(@Param('id') id: string, @Query() query: PaginationDto) {
    return this.agents.findAgentProperties(id, query);
  }

  @Public()
  @Get(':id/reviews')
  @ResponseMessage('Agent reviews retrieved successfully')
  @ApiOperation({ summary: 'List an agent reviews' })
  findReviews(@Param('id') id: string, @Query() query: PaginationDto) {
    return this.reviews.findByAgent(id, query);
  }

  @Post(':id/reviews')
  @ResponseMessage('Review submitted successfully')
  @ApiOperation({ summary: 'Submit a review for an agent' })
  createReview(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id') id: string,
    @Body() dto: CreateReviewDto,
  ) {
    return this.reviews.create(user.id, id, dto);
  }
}
