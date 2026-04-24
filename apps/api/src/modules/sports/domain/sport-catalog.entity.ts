export interface SportCatalogProps {
  code: string;
  name: string;
  description?: string | null;
  playType: 'singles' | 'doubles' | 'both';
  minPlayers: number;
  maxPlayers: number;
  active: boolean;
  sortOrder: number;
}

export class SportCatalogEntity {
  constructor(private readonly props: SportCatalogProps) {}

  get code(): string { return this.props.code; }
  get name(): string { return this.props.name; }
  get description(): string | null { return this.props.description ?? null; }
  get playType(): string { return this.props.playType; }
  get minPlayers(): number { return this.props.minPlayers; }
  get maxPlayers(): number { return this.props.maxPlayers; }
  get active(): boolean { return this.props.active; }
  get supportsSingles(): boolean { return this.props.playType !== 'doubles'; }
  get supportsDoubles(): boolean { return this.props.playType !== 'singles'; }
}
