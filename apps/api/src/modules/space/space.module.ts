import { Module } from '@nestjs/common';
import { SpacePrismaRepository } from './infrastructure/repositories/space.prisma.repository';
import { SpaceFacade } from './public/space.facade';
import { CreateSpaceHandler } from './application/create-space.handler';
import { ListKlubSpacesHandler } from './application/list-klub-spaces.handler';
import { UpdateSpaceHandler } from './application/update-space.handler';
import { SpaceController } from './api/space.controller';

@Module({
  controllers: [SpaceController],
  providers: [
    SpacePrismaRepository,
    SpaceFacade,
    CreateSpaceHandler,
    ListKlubSpacesHandler,
    UpdateSpaceHandler,
  ],
  exports: [SpaceFacade],
})
export class SpaceModule {}
