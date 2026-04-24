import { Module } from '@nestjs/common';
import { KlubPrismaRepository } from './infrastructure/repositories/klub.prisma.repository';
import { CreateKlubHandler } from './application/commands/create-klub.handler';
import { GetKlubByIdHandler } from './application/queries/get-klub-by-id.handler';
import { GetKlubBySlugHandler } from './application/queries/get-klub-by-slug.handler';
import { ListKlubsHandler } from './application/queries/list-klubs.handler';
import { AddMemberHandler } from './application/commands/add-member.handler';
import { CreateKlubRequestHandler } from './application/commands/create-klub-request.handler';
import { ListKlubRequestsHandler } from './application/queries/list-klub-requests.handler';
import { AddMediaHandler } from './application/commands/add-media.handler';
import { AddSportInterestHandler } from './application/commands/add-sport-interest.handler';
import { KlubFacade } from './public/klub.facade';
import { KlubController } from './api/klub.controller';
import { KlubRequestController } from './api/klub-request.controller';
import { IdentityModule } from '../identity/identity.module';

@Module({
  imports: [IdentityModule],
  controllers: [KlubController, KlubRequestController],
  providers: [
    KlubPrismaRepository,
    CreateKlubHandler,
    GetKlubByIdHandler,
    GetKlubBySlugHandler,
    ListKlubsHandler,
    AddMemberHandler,
    CreateKlubRequestHandler,
    ListKlubRequestsHandler,
    AddMediaHandler,
    AddSportInterestHandler,
    KlubFacade,
  ],
  exports: [KlubFacade],
})
export class KlubModule {}
