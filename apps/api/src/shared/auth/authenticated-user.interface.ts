import type { Role } from '../../modules/identity/domain/role-assignment.entity';

export interface RoleAssignmentClaim {
  role: Role;
  scopeKlubId?: string | null;
  scopeSportId?: string | null;
}

export interface AuthenticatedUser {
  userId: string;
  firebaseUid: string;
  email: string;
  roleAssignments: RoleAssignmentClaim[];
}
