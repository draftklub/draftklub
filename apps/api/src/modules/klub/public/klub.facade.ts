import { Injectable } from '@nestjs/common';
import { CreateKlubHandler, type CreateKlubCommand } from '../application/commands/create-klub.handler';
import { GetKlubByIdHandler } from '../application/queries/get-klub-by-id.handler';
import { GetKlubBySlugHandler } from '../application/queries/get-klub-by-slug.handler';
import { ListKlubsHandler } from '../application/queries/list-klubs.handler';
import { AddMemberHandler, type AddMemberCommand } from '../application/commands/add-member.handler';
import { CreateKlubRequestHandler } from '../application/commands/create-klub-request.handler';
import { ListKlubRequestsHandler } from '../application/queries/list-klub-requests.handler';
import { AddMediaHandler } from '../application/commands/add-media.handler';
import { AddSportInterestHandler } from '../application/commands/add-sport-interest.handler';
import type { CreateKlubRequestDto } from '../api/dtos/create-klub-request.dto';
import type { AddMediaDto } from '../api/dtos/add-media.dto';

@Injectable()
export class KlubFacade {
  constructor(
    private readonly createKlubHandler: CreateKlubHandler,
    private readonly getKlubByIdHandler: GetKlubByIdHandler,
    private readonly getKlubBySlugHandler: GetKlubBySlugHandler,
    private readonly listKlubsHandler: ListKlubsHandler,
    private readonly addMemberHandler: AddMemberHandler,
    private readonly createKlubRequestHandler: CreateKlubRequestHandler,
    private readonly listKlubRequestsHandler: ListKlubRequestsHandler,
    private readonly addMediaHandler: AddMediaHandler,
    private readonly addSportInterestHandler: AddSportInterestHandler,
  ) {}

  async createKlub(cmd: CreateKlubCommand) {
    return this.createKlubHandler.execute(cmd);
  }

  async getKlubById(id: string) {
    return this.getKlubByIdHandler.execute(id);
  }

  async getKlubBySlug(slug: string) {
    return this.getKlubBySlugHandler.execute(slug);
  }

  async listKlubs() {
    return this.listKlubsHandler.execute();
  }

  async addMember(cmd: AddMemberCommand) {
    return this.addMemberHandler.execute(cmd);
  }

  async createKlubRequest(dto: CreateKlubRequestDto) {
    return this.createKlubRequestHandler.execute(dto);
  }

  async listKlubRequests() {
    return this.listKlubRequestsHandler.execute();
  }

  async addMedia(klubId: string, dto: AddMediaDto) {
    return this.addMediaHandler.execute(klubId, dto);
  }

  async addSportInterest(klubId: string, sportName: string) {
    return this.addSportInterestHandler.execute(klubId, sportName);
  }
}
