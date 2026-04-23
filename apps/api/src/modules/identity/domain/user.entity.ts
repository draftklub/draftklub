export interface UserProps {
  id: string;
  firebaseUid: string;
  email: string;
  fullName: string;
  phone?: string | null;
  avatarUrl?: string | null;
  consentGivenAt?: Date | null;
  createdAt: Date;
  updatedAt: Date;
  deletedAt?: Date | null;
}

export class UserEntity {
  constructor(private readonly props: UserProps) {}

  get id(): string { return this.props.id; }
  get firebaseUid(): string { return this.props.firebaseUid; }
  get email(): string { return this.props.email; }
  get fullName(): string { return this.props.fullName; }
  get phone(): string | null { return this.props.phone ?? null; }
  get avatarUrl(): string | null { return this.props.avatarUrl ?? null; }
  get createdAt(): Date { return this.props.createdAt; }
  get deletedAt(): Date | null { return this.props.deletedAt ?? null; }

  isActive(): boolean { return this.props.deletedAt == null; }

  toJSON(): UserProps { return { ...this.props }; }
}
