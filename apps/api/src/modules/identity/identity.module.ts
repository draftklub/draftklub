import { Module } from '@nestjs/common';
import { UserPrismaRepository } from './infrastructure/repositories/user.prisma.repository';
import { SyncUserHandler } from './application/commands/sync-user.handler';
import { GetUserByFirebaseUidHandler } from './application/queries/get-user-by-firebase-uid.handler';
import { GetMyKlubsHandler } from './application/queries/get-my-klubs.handler';
import { GetMeHandler } from './application/queries/get-me.handler';
import { UpdateMeHandler } from './application/commands/update-me.handler';
import { RecordConsentHandler } from './application/commands/record-consent.handler';
import { ExportMyDataHandler } from './application/queries/export-my-data.handler';
import { DeleteMyAccountHandler } from './application/commands/delete-my-account.handler';
import { GrantRoleHandler } from './application/commands/grant-role.handler';
import { RevokeRoleHandler } from './application/commands/revoke-role.handler';
import { TransferKlubAdminHandler } from './application/commands/transfer-klub-admin.handler';
import { ListRoleAssignmentsHandler } from './application/queries/list-role-assignments.handler';
import { IdentityFacade } from './public/identity.facade';
import { IdentityController } from './api/identity.controller';
import { RoleAssignmentsController } from './api/role-assignments.controller';
import { FirebaseAuthGuard } from '../../shared/auth/firebase-auth.guard';

@Module({
  controllers: [IdentityController, RoleAssignmentsController],
  providers: [
    UserPrismaRepository,
    SyncUserHandler,
    GetUserByFirebaseUidHandler,
    GetMyKlubsHandler,
    GetMeHandler,
    UpdateMeHandler,
    RecordConsentHandler,
    ExportMyDataHandler,
    DeleteMyAccountHandler,
    GrantRoleHandler,
    RevokeRoleHandler,
    TransferKlubAdminHandler,
    ListRoleAssignmentsHandler,
    IdentityFacade,
    FirebaseAuthGuard,
  ],
  exports: [IdentityFacade, FirebaseAuthGuard],
})
export class IdentityModule {}
