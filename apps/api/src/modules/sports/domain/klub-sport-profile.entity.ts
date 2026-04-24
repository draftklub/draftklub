export interface KlubSportProfileProps {
  id: string;
  klubId: string;
  sportCode: string;
  name?: string | null;
  description?: string | null;
  defaultRatingEngine: string;
  defaultRatingConfig: Record<string, unknown>;
  defaultInitialRating: number;
  status: string;
}

export class KlubSportProfileEntity {
  constructor(private readonly props: KlubSportProfileProps) {}

  get id(): string { return this.props.id; }
  get klubId(): string { return this.props.klubId; }
  get sportCode(): string { return this.props.sportCode; }
  get isActive(): boolean { return this.props.status === 'active'; }
}
