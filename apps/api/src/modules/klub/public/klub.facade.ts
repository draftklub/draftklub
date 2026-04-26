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
import {
  RequestEnrollmentHandler,
  ApproveEnrollmentHandler,
  RejectEnrollmentHandler,
  CreateEnrollmentDirectHandler,
  SuspendEnrollmentHandler,
  ReactivateEnrollmentHandler,
  CancelEnrollmentHandler,
  type RequestEnrollmentCommand,
  type ApproveEnrollmentCommand,
  type RejectEnrollmentCommand,
  type CreateEnrollmentDirectCommand,
  type SuspendEnrollmentCommand,
  type ReactivateEnrollmentCommand,
  type CancelEnrollmentCommand,
} from '../application/commands/enrollment.handlers';
import {
  ListEnrollmentsByProfileHandler,
  ListEnrollmentsByUserHandler,
} from '../application/queries/list-enrollments.handler';
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
    private readonly requestEnrollmentHandler: RequestEnrollmentHandler,
    private readonly approveEnrollmentHandler: ApproveEnrollmentHandler,
    private readonly rejectEnrollmentHandler: RejectEnrollmentHandler,
    private readonly createEnrollmentDirectHandler: CreateEnrollmentDirectHandler,
    private readonly suspendEnrollmentHandler: SuspendEnrollmentHandler,
    private readonly reactivateEnrollmentHandler: ReactivateEnrollmentHandler,
    private readonly cancelEnrollmentHandler: CancelEnrollmentHandler,
    private readonly listEnrollmentsByProfileHandler: ListEnrollmentsByProfileHandler,
    private readonly listEnrollmentsByUserHandler: ListEnrollmentsByUserHandler,
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

  // ─── Enrollments (W2.3) ──────────────────────────────────
  async requestEnrollment(cmd: RequestEnrollmentCommand) {
    return this.requestEnrollmentHandler.execute(cmd);
  }

  async approveEnrollment(cmd: ApproveEnrollmentCommand) {
    return this.approveEnrollmentHandler.execute(cmd);
  }

  async rejectEnrollment(cmd: RejectEnrollmentCommand) {
    return this.rejectEnrollmentHandler.execute(cmd);
  }

  async createEnrollmentDirect(cmd: CreateEnrollmentDirectCommand) {
    return this.createEnrollmentDirectHandler.execute(cmd);
  }

  async suspendEnrollment(cmd: SuspendEnrollmentCommand) {
    return this.suspendEnrollmentHandler.execute(cmd);
  }

  async reactivateEnrollment(cmd: ReactivateEnrollmentCommand) {
    return this.reactivateEnrollmentHandler.execute(cmd);
  }

  async cancelEnrollment(cmd: CancelEnrollmentCommand) {
    return this.cancelEnrollmentHandler.execute(cmd);
  }

  async listEnrollmentsByProfile(klubId: string, sportCode: string) {
    return this.listEnrollmentsByProfileHandler.execute(klubId, sportCode);
  }

  async listEnrollmentsByUser(userId: string) {
    return this.listEnrollmentsByUserHandler.execute(userId);
  }
}
