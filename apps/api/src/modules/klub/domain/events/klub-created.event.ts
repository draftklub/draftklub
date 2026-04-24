export class KlubCreatedEvent {
  readonly eventType = 'klub.created';

  constructor(
    public readonly klubId: string,
    public readonly name: string,
    public readonly createdById: string | null,
    public readonly onboardingSource: string,
  ) {}
}
