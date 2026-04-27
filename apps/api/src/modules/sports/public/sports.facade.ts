import { Injectable } from '@nestjs/common';
import { ListSportsHandler } from '../application/queries/list-sports.handler';
import { GetSportHandler } from '../application/queries/get-sport.handler';
import { ListKlubSportsHandler } from '../application/queries/list-klub-sports.handler';
import { GetKlubSportHandler } from '../application/queries/get-klub-sport.handler';
import {
  ActivateSportHandler,
  type ActivateSportCommand,
} from '../application/commands/activate-sport.handler';

@Injectable()
export class SportsFacade {
  constructor(
    private readonly listSportsHandler: ListSportsHandler,
    private readonly getSportHandler: GetSportHandler,
    private readonly listKlubSportsHandler: ListKlubSportsHandler,
    private readonly getKlubSportHandler: GetKlubSportHandler,
    private readonly activateSportHandler: ActivateSportHandler,
  ) {}

  async listSports(onlyActive = true) {
    return this.listSportsHandler.execute(onlyActive);
  }

  async getSport(code: string) {
    return this.getSportHandler.execute(code);
  }

  async listKlubSports(klubId: string) {
    return this.listKlubSportsHandler.execute(klubId);
  }

  async getKlubSport(klubId: string, sportCode: string) {
    return this.getKlubSportHandler.execute(klubId, sportCode);
  }

  async activateSport(cmd: ActivateSportCommand) {
    return this.activateSportHandler.execute(cmd);
  }
}
