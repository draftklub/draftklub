import { Injectable } from '@nestjs/common';
import { CreateSpaceHandler, type CreateSpaceCommand } from '../application/create-space.handler';
import { ListKlubSpacesHandler } from '../application/list-klub-spaces.handler';
import { UpdateSpaceHandler, type UpdateSpaceCommand } from '../application/update-space.handler';

@Injectable()
export class SpaceFacade {
  constructor(
    private readonly createHandler: CreateSpaceHandler,
    private readonly listHandler: ListKlubSpacesHandler,
    private readonly updateHandler: UpdateSpaceHandler,
  ) {}

  createSpace(cmd: CreateSpaceCommand) {
    return this.createHandler.execute(cmd);
  }

  listKlubSpaces(klubId: string, includeInactive = false) {
    return this.listHandler.execute(klubId, includeInactive);
  }

  updateSpace(cmd: UpdateSpaceCommand) {
    return this.updateHandler.execute(cmd);
  }
}
