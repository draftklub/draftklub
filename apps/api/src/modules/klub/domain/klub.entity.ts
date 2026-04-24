export interface KlubProps {
  id: string;
  name: string;
  slug: string;
  type: string;
  plan: string;
  status: string;
  city?: string | null;
  state?: string | null;
  country: string;
  timezone: string;
  maxMembers: number;
  maxSports: number;
  maxCourts: number;
  isGroup: boolean;
  parentKlubId?: string | null;
  onboardingSource: string;
  createdAt: Date;
  updatedAt: Date;
  deletedAt?: Date | null;
}

export class KlubEntity {
  constructor(private readonly props: KlubProps) {}

  get id(): string { return this.props.id; }
  get name(): string { return this.props.name; }
  get slug(): string { return this.props.slug; }
  get type(): string { return this.props.type; }
  get plan(): string { return this.props.plan; }
  get status(): string { return this.props.status; }
  get city(): string | null { return this.props.city ?? null; }
  get state(): string | null { return this.props.state ?? null; }
  get country(): string { return this.props.country; }
  get timezone(): string { return this.props.timezone; }
  get maxMembers(): number { return this.props.maxMembers; }
  get maxSports(): number { return this.props.maxSports; }
  get maxCourts(): number { return this.props.maxCourts; }
  get isGroup(): boolean { return this.props.isGroup; }
  get parentKlubId(): string | null { return this.props.parentKlubId ?? null; }
  get isFilial(): boolean { return this.props.parentKlubId != null; }
  get isActive(): boolean { return this.props.status === 'active' || this.props.status === 'trial'; }

  toJSON(): KlubProps { return { ...this.props }; }
}
