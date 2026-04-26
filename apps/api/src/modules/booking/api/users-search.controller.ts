import {
  Controller,
  Get,
  Query,
  UseGuards,
  BadRequestException,
} from '@nestjs/common';
import { FirebaseAuthGuard } from '../../../shared/auth/firebase-auth.guard';
import { BookingFacade } from '../public/booking.facade';
import { SearchUsersSchema } from './dtos/search-users.dto';

@Controller('users/search')
@UseGuards(FirebaseAuthGuard)
export class UsersSearchController {
  constructor(private readonly facade: BookingFacade) {}

  @Get()
  async search(@Query('query') query: string, @Query('limit') limit?: string) {
    if (!query) throw new BadRequestException('query is required');
    const dto = SearchUsersSchema.parse({
      query,
      limit: limit ? Number(limit) : 10,
    });
    return this.facade.searchUsers(dto.query, dto.limit);
  }
}
