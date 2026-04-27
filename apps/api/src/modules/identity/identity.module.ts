import { Module } from '@nestjs/common';
import { UserPrismaRepository } from './infrastructure/repositories/user.prisma.repository';
import { SyncUserHandler } from './application/commands/sync-user.handler';
import { GetUserByFirebaseUidHandler } from './application/queries/get-user-by-firebase-uid.handler';
import { GetMyKlubsHandler } from './application/queries/get-my-klubs.handler';
import { GetMeHandler } from './application/queries/get-me.handler';
import { UpdateMeHandler } from './application/commands/update-me.handler';
import { IdentityFacade } from './public/identity.facade';
import { IdentityController } from './api/identity.controller';
import { FirebaseAuthGuard } from '../../shared/auth/firebase-auth.guard';

@Module({
  controllers: [IdentityController],
  providers: [
    UserPrismaRepository,
    SyncUserHandler,
    GetUserByFirebaseUidHandler,
    GetMyKlubsHandler,
    GetMeHandler,
    UpdateMeHandler,
    IdentityFacade,
    FirebaseAuthGuard,
  ],
  exports: [IdentityFacade, FirebaseAuthGuard],
})
export class IdentityModule {}
