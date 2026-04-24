import { Injectable } from '@nestjs/common';
import { CreateKlubHandler, type CreateKlubCommand } from '../application/commands/create-klub.handler';
import { GetKlubByIdHandler } from '../application/queries/get-klub-by-id.handler';
import { ListKlubsHandler } from '../application/queries/list-klubs.handler';

@Injectable()
export class KlubFacade {
  constructor(
    private readonly createKlubHandler: CreateKlubHandler,
    private readonly getKlubByIdHandler: GetKlubByIdHandler,
    private readonly listKlubsHandler: ListKlubsHandler,
  ) {}

  async createKlub(cmd: CreateKlubCommand) {
    return this.createKlubHandler.execute(cmd);
  }

  async getKlubById(id: string) {
    return this.getKlubByIdHandler.execute(id);
  }

  async listKlubs() {
    return this.listKlubsHandler.execute();
  }
}
