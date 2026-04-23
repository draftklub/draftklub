import { Injectable } from '@nestjs/common';
import { SyncUserHandler, type SyncUserCommand, type SyncUserResult } from '../application/commands/sync-user.handler';
import { GetUserByFirebaseUidHandler } from '../application/queries/get-user-by-firebase-uid.handler';

@Injectable()
export class IdentityFacade {
  constructor(
    private readonly syncUserHandler: SyncUserHandler,
    private readonly getUserHandler: GetUserByFirebaseUidHandler,
  ) {}

  async syncUser(cmd: SyncUserCommand): Promise<SyncUserResult> {
    return this.syncUserHandler.execute(cmd);
  }

  async getUserByFirebaseUid(firebaseUid: string): Promise<SyncUserResult> {
    return this.getUserHandler.execute(firebaseUid);
  }
}
