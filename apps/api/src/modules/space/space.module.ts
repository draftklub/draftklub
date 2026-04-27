import { Module } from '@nestjs/common';
import { SpacePrismaRepository } from './infrastructure/repositories/space.prisma.repository';
import { SpaceFacade } from './public/space.facade';
import { CreateSpaceHandler } from './application/create-space.handler';
import { ListKlubSpacesHandler } from './application/list-klub-spaces.handler';
import { UpdateSpaceHandler } from './application/update-space.handler';
import { SpaceController } from './api/space.controller';
import { IdentityModule } from '../identity/identity.module';

@Module({
  // SpaceController usa @UseGuards(FirebaseAuthGuard); o guard depende
  // de IdentityFacade. Sem importar IdentityModule, Nest falha o DI
  // resolve no startup.
  imports: [IdentityModule],
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
