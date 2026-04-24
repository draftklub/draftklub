import { Controller, Post, Get, Param, Body, UseGuards } from '@nestjs/common';
import { FirebaseAuthGuard } from '../../../shared/auth/firebase-auth.guard';
import { CurrentUser } from '../../../shared/auth/current-user.decorator';
import { RequirePolicy } from '../../../shared/auth/require-policy.decorator';
import { PolicyGuard } from '../../../shared/auth/policy.guard';
import type { AuthenticatedUser } from '../../../shared/auth/authenticated-user.interface';
import { KlubFacade } from '../public/klub.facade';
import { CreateKlubSchema } from './dtos/create-klub.dto';

@Controller('klubs')
@UseGuards(FirebaseAuthGuard, PolicyGuard)
export class KlubController {
  constructor(private readonly klubFacade: KlubFacade) {}

  @Post()
  @RequirePolicy('klub.create')
  async createKlub(
    @Body() body: unknown,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    const dto = CreateKlubSchema.parse(body);
    return this.klubFacade.createKlub({ ...dto, createdById: user.userId });
  }

  @Get()
  @RequirePolicy('klub.list')
  async listKlubs() {
    return this.klubFacade.listKlubs();
  }

  @Get(':id')
  async getKlub(@Param('id') id: string) {
    return this.klubFacade.getKlubById(id);
  }
}
