import {
  CanActivate,
  ExecutionContext,
  Injectable,
  UnauthorizedException,
  Logger,
} from '@nestjs/common';
import type { FastifyRequest } from 'fastify';
import * as admin from 'firebase-admin';
import type { AuthenticatedUser } from './authenticated-user.interface';
import type { Role } from '../../modules/identity/domain/role-assignment.entity';
import { IdentityFacade } from '../../modules/identity/public/identity.facade';

@Injectable()
export class FirebaseAuthGuard implements CanActivate {
  private readonly logger = new Logger(FirebaseAuthGuard.name);

  constructor(private readonly identityFacade: IdentityFacade) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest<FastifyRequest>();
    const token = this.extractToken(request);

    if (!token) {
      throw new UnauthorizedException('Missing authorization token');
    }

    try {
      const decoded = await admin.auth().verifyIdToken(token);

      const user = await this.identityFacade.syncUser({
        firebaseUid: decoded.uid,
        email: decoded.email ?? '',
        fullName: (decoded.name as string | undefined) ?? decoded.email ?? '',
        avatarUrl: decoded.picture,
      });

      const authenticatedUser: AuthenticatedUser = {
        userId: user.id,
        firebaseUid: decoded.uid,
        email: user.email,
        roleAssignments: user.roleAssignments.map((r) => ({
          role: r.role as Role,
          scopeKlubId: r.scopeKlubId,
          scopeSportId: r.scopeSportId,
        })),
      };

      (request as FastifyRequest & { user: AuthenticatedUser }).user = authenticatedUser;
      return true;
    } catch (error) {
      this.logger.error(
        `Auth failed: ${error instanceof Error ? error.message : String(error)}`,
        error instanceof Error ? error.stack : undefined,
      );
      throw new UnauthorizedException('Invalid or expired token');
    }
  }

  private extractToken(request: FastifyRequest): string | null {
    const auth = request.headers.authorization;
    if (!auth?.startsWith('Bearer ')) return null;
    return auth.slice(7);
  }
}
