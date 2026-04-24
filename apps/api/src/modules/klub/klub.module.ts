import { Module } from '@nestjs/common';
import { KlubPrismaRepository } from './infrastructure/repositories/klub.prisma.repository';
import { CreateKlubHandler } from './application/commands/create-klub.handler';
import { GetKlubByIdHandler } from './application/queries/get-klub-by-id.handler';
import { ListKlubsHandler } from './application/queries/list-klubs.handler';
import { KlubFacade } from './public/klub.facade';
import { KlubController } from './api/klub.controller';

@Module({
  controllers: [KlubController],
  providers: [
    KlubPrismaRepository,
    CreateKlubHandler,
    GetKlubByIdHandler,
    ListKlubsHandler,
    KlubFacade,
  ],
  exports: [KlubFacade],
})
export class KlubModule {}
