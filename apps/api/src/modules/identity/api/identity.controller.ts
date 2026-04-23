import { Controller, Get, UseGuards } from '@nestjs/common';
import { FirebaseAuthGuard } from '../../../shared/auth/firebase-auth.guard';
import { CurrentUser } from '../../../shared/auth/current-user.decorator';
import type { AuthenticatedUser } from '../../../shared/auth/authenticated-user.interface';

@Controller()
@UseGuards(FirebaseAuthGuard)
export class IdentityController {
  @Get('me')
  getMe(@CurrentUser() user: AuthenticatedUser) {
    return {
      id: user.userId,
      email: user.email,
      firebaseUid: user.firebaseUid,
      roleAssignments: user.roleAssignments,
    };
  }
}
