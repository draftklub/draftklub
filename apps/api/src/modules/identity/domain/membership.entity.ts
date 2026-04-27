export type MembershipStatus = 'active' | 'inactive' | 'suspended';
export type MembershipType = 'member' | 'guest' | 'staff';

export interface MembershipProps {
  id: string;
  userId: string;
  klubId: string;
  status: MembershipStatus;
  type: MembershipType;
  joinedAt: Date;
  expiresAt?: Date | null;
}

export class MembershipEntity {
  constructor(private readonly props: MembershipProps) {}

  get id(): string {
    return this.props.id;
  }
  get userId(): string {
    return this.props.userId;
  }
  get klubId(): string {
    return this.props.klubId;
  }
  get status(): MembershipStatus {
    return this.props.status;
  }
  get type(): MembershipType {
    return this.props.type;
  }

  isActive(): boolean {
    return this.props.status === 'active';
  }
}
