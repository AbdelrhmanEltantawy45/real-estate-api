import { Controller, Delete, Get, Param, Post, Query } from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { ResponseMessage } from '@/common/decorators/response-message.decorator';
import { AuthenticatedUser, CurrentUser } from '@/common/decorators/current-user.decorator';
import { PaginationDto } from '@/common/dto/pagination.dto';
import { FavoritesService } from './favorites.service';

@ApiTags('Favorites')
@Controller('favorites')
export class FavoritesController {
  constructor(private readonly favorites: FavoritesService) {}

  @Get()
  @ResponseMessage('Favorites retrieved successfully')
  @ApiOperation({ summary: 'List the authenticated user favorites' })
  list(@CurrentUser() user: AuthenticatedUser, @Query() query: PaginationDto) {
    return this.favorites.list(user.id, query);
  }

  @Post(':propertyId')
  @ResponseMessage('Property added to favorites')
  @ApiOperation({ summary: 'Favorite a property' })
  add(@CurrentUser() user: AuthenticatedUser, @Param('propertyId') propertyId: string) {
    return this.favorites.add(user.id, propertyId);
  }

  @Delete(':propertyId')
  @ResponseMessage('Property removed from favorites')
  @ApiOperation({ summary: 'Remove a property from favorites' })
  async remove(@CurrentUser() user: AuthenticatedUser, @Param('propertyId') propertyId: string) {
    await this.favorites.remove(user.id, propertyId);
    return null;
  }

  @Get('check/:propertyId')
  @ResponseMessage('Favorite status retrieved')
  @ApiOperation({ summary: 'Check if a property is favorited by the user' })
  check(@CurrentUser() user: AuthenticatedUser, @Param('propertyId') propertyId: string) {
    return this.favorites.check(user.id, propertyId);
  }
}
