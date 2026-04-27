import { ForbiddenException, Injectable } from '@nestjs/common';
import {
  CreateKlubHandler,
  type CreateKlubCommand,
} from '../application/commands/create-klub.handler';
import { GetKlubByIdHandler } from '../application/queries/get-klub-by-id.handler';
import { GetKlubBySlugHandler } from '../application/queries/get-klub-by-slug.handler';
import { ListKlubsHandler } from '../application/queries/list-klubs.handler';
import { DiscoverKlubsHandler } from '../application/queries/discover-klubs.handler';
import { CheckSlugHandler } from '../application/queries/check-slug.handler';
import { CnpjLookupService } from '../../../shared/lookup/cnpj-lookup.service';
import {
  ListPendingKlubsHandler,
  type ListPendingKlubsCommand,
} from '../application/admin/list-pending-klubs.handler';
import { GetPendingKlubHandler } from '../application/admin/get-pending-klub.handler';
import {
  UpdatePendingKlubHandler,
  type UpdatePendingKlubCommand,
} from '../application/admin/update-pending-klub.handler';
import {
  ApproveKlubHandler,
  type ApproveKlubCommand,
} from '../application/admin/approve-klub.handler';
import {
  RejectKlubHandler,
  type RejectKlubCommand,
} from '../application/admin/reject-klub.handler';
import {
  RequestMembershipHandler,
  type RequestMembershipCommand,
} from '../application/membership-requests/request-membership.handler';
import {
  ListMembershipRequestsHandler,
  type ListMembershipRequestsCommand,
} from '../application/membership-requests/list-membership-requests.handler';
import {
  ApproveMembershipRequestHandler,
  type ApproveMembershipRequestCommand,
} from '../application/membership-requests/approve-membership-request.handler';
import {
  RejectMembershipRequestHandler,
  type RejectMembershipRequestCommand,
} from '../application/membership-requests/reject-membership-request.handler';
import { ListMyRequestsHandler } from '../application/membership-requests/list-my-requests.handler';
import { CancelMyRequestHandler } from '../application/membership-requests/cancel-my-request.handler';
import { PrismaService } from '../../../shared/prisma/prisma.service';
import type { DiscoverKlubsQueryDto } from '../api/dtos/discover-klubs.dto';
import type { CheckSlugQueryDto } from '../api/dtos/check-slug.dto';
import {
  AddMemberHandler,
  type AddMemberCommand,
} from '../application/commands/add-member.handler';
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
    private readonly discoverKlubsHandler: DiscoverKlubsHandler,
    private readonly checkSlugHandler: CheckSlugHandler,
    private readonly cnpjLookupService: CnpjLookupService,
    private readonly listPendingKlubsHandler: ListPendingKlubsHandler,
    private readonly getPendingKlubHandler: GetPendingKlubHandler,
    private readonly updatePendingKlubHandler: UpdatePendingKlubHandler,
    private readonly approveKlubHandler: ApproveKlubHandler,
    private readonly rejectKlubHandler: RejectKlubHandler,
    private readonly requestMembershipHandler: RequestMembershipHandler,
    private readonly listMembershipRequestsHandler: ListMembershipRequestsHandler,
    private readonly approveMembershipRequestHandler: ApproveMembershipRequestHandler,
    private readonly rejectMembershipRequestHandler: RejectMembershipRequestHandler,
    private readonly listMyRequestsHandler: ListMyRequestsHandler,
    private readonly cancelMyRequestHandler: CancelMyRequestHandler,
    private readonly prisma: PrismaService,
  ) {}

  async createKlub(cmd: CreateKlubCommand) {
    return this.createKlubHandler.execute(cmd);
  }

  async getKlubById(id: string, viewerId?: string) {
    return this.getKlubByIdHandler.execute(id, viewerId);
  }

  async getKlubBySlug(slug: string, viewerId?: string) {
    return this.getKlubBySlugHandler.execute(slug, viewerId);
  }

  async listKlubs() {
    return this.listKlubsHandler.execute();
  }

  /**
   * Discovery: lista Klubs com `discoverable=true`. Busca user.city/state
   * pra ranking por tier (mesma cidade > mesmo estado > resto).
   */
  async discoverKlubs(input: DiscoverKlubsQueryDto & { userId: string }) {
    const user = await this.prisma.user.findUnique({
      where: { id: input.userId },
      select: { city: true, state: true },
    });
    return this.discoverKlubsHandler.execute({
      q: input.q,
      state: input.state,
      sport: input.sport,
      limit: input.limit,
      userCity: user?.city ?? null,
      userState: user?.state ?? null,
      lat: input.lat,
      lng: input.lng,
      radiusKm: input.radiusKm,
    });
  }

  async checkSlug(input: CheckSlugQueryDto) {
    return this.checkSlugHandler.execute(input);
  }

  async lookupCnpj(cnpj: string) {
    return this.cnpjLookupService.lookup(cnpj);
  }

  // ─── Admin (Sprint D PR2) ──────────────────────────────────
  async listPendingKlubs(cmd: ListPendingKlubsCommand) {
    return this.listPendingKlubsHandler.execute(cmd);
  }

  async getPendingKlub(id: string) {
    return this.getPendingKlubHandler.execute(id);
  }

  async updatePendingKlub(cmd: UpdatePendingKlubCommand) {
    return this.updatePendingKlubHandler.execute(cmd);
  }

  async approveKlub(cmd: ApproveKlubCommand) {
    return this.approveKlubHandler.execute(cmd);
  }

  async rejectKlub(cmd: RejectKlubCommand) {
    return this.rejectKlubHandler.execute(cmd);
  }

  // ─── Sprint C: membership requests ─────────────────────────
  async requestMembership(cmd: RequestMembershipCommand) {
    return this.requestMembershipHandler.execute(cmd);
  }

  async listMembershipRequests(cmd: ListMembershipRequestsCommand) {
    return this.listMembershipRequestsHandler.execute(cmd);
  }

  async approveMembershipRequest(cmd: ApproveMembershipRequestCommand) {
    return this.approveMembershipRequestHandler.execute(cmd);
  }

  async rejectMembershipRequest(cmd: RejectMembershipRequestCommand) {
    return this.rejectMembershipRequestHandler.execute(cmd);
  }

  async listMyMembershipRequests(userId: string) {
    return this.listMyRequestsHandler.execute(userId);
  }

  async cancelMyMembershipRequest(input: { requestId: string; userId: string }) {
    return this.cancelMyRequestHandler.execute(input);
  }

  async addMember(cmd: AddMemberCommand) {
    return this.addMemberHandler.execute(cmd);
  }

  /**
   * Aceitar convite por link compartilhado: resolve slug → Klub e
   * adiciona o user atual como PLAYER. Idempotente. Bloqueia se Klub
   * está em review pendente/rejeitado (Sprint D PR1) — chamada do
   * handler já retorna 404 nesses casos.
   *
   * Sprint C: Klubs com `accessMode='private'` rejeitam direct join —
   * user precisa passar pelo flow MembershipRequest. Frontend chama
   * `requestMembership` em vez de `joinKlubBySlug` quando vê accessMode
   * privado, mas backend protege também.
   */
  async joinKlubBySlug(slug: string, userId: string) {
    const klub = await this.getKlubBySlugHandler.execute(slug, userId);
    if (klub.accessMode === 'private') {
      throw new ForbiddenException({
        type: 'request_required',
        message: 'Este Klub é privado. Envie uma solicitação de entrada — o admin vai revisar.',
      });
    }
    return this.addMemberHandler.execute({
      klubId: klub.id,
      userId,
      type: 'member',
      role: 'PLAYER',
    });
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
