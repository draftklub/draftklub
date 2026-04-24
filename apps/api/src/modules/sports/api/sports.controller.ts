import { Controller, Get, Param, Query } from '@nestjs/common';
import { SportsFacade } from '../public/sports.facade';

@Controller('sports')
export class SportsController {
  constructor(private readonly facade: SportsFacade) {}

  @Get()
  async listSports(@Query('all') all?: string) {
    return this.facade.listSports(all !== 'true');
  }

  @Get(':code')
  async getSport(@Param('code') code: string) {
    return this.facade.getSport(code);
  }
}
