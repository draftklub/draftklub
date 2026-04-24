export const SPORT_ACTIVATED = 'sport.activated';

export interface SportActivatedEvent {
  klubId: string;
  sportCode: string;
  profileId: string;
}
