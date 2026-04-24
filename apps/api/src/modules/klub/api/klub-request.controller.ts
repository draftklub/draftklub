import { Controller, Post, Get, Body, UseGuards } from '@nestjs/common';
import { FirebaseAuthGuard } from '../../../shared/auth/firebase-auth.guard';
import { PolicyGuard } from '../../../shared/auth/policy.guard';
import { RequirePolicy } from '../../../shared/auth/require-policy.decorator';
import { KlubFacade } from '../public/klub.facade';
import { CreateKlubRequestSchema } from './dtos/create-klub-request.dto';

@Controller('klub-requests')
export class KlubRequestController {
  constructor(private readonly klubFacade: KlubFacade) {}

  @Post()
  async createRequest(@Body() body: unknown) {
    const dto = CreateKlubRequestSchema.parse(body);
    return this.klubFacade.createKlubRequest(dto);
  }

  @Get()
  @UseGuards(FirebaseAuthGuard, PolicyGuard)
  @RequirePolicy('klub.requests.list')
  async listRequests() {
    return this.klubFacade.listKlubRequests();
  }
}
