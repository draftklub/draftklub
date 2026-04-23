export type Role =
  | 'SUPER_ADMIN'
  | 'KLUB_ADMIN'
  | 'SPORTS_COMMITTEE'
  | 'TEACHER'
  | 'PLAYER';

export interface RoleAssignmentProps {
  id: string;
  userId: string;
  role: Role;
  scopeKlubId?: string | null;
  scopeSportId?: string | null;
  grantedAt: Date;
  grantedBy?: string | null;
}

export class RoleAssignmentEntity {
  constructor(private readonly props: RoleAssignmentProps) {}

  get id(): string { return this.props.id; }
  get userId(): string { return this.props.userId; }
  get role(): Role { return this.props.role; }
  get scopeKlubId(): string | null { return this.props.scopeKlubId ?? null; }
  get scopeSportId(): string | null { return this.props.scopeSportId ?? null; }

  matchesScope(klubId?: string, sportId?: string): boolean {
    const klubMatch = this.props.scopeKlubId == null || this.props.scopeKlubId === klubId;
    const sportMatch = this.props.scopeSportId == null || this.props.scopeSportId === sportId;
    return klubMatch && sportMatch;
  }
}
