import { Module } from '@nestjs/common';
import { KlubPrismaRepository } from './infrastructure/repositories/klub.prisma.repository';
import { CreateKlubHandler } from './application/commands/create-klub.handler';
import { UpdateKlubHandler } from './application/commands/update-klub.handler';
import { DeactivateKlubHandler } from './application/commands/deactivate-klub.handler';
import { GetKlubByIdHandler } from './application/queries/get-klub-by-id.handler';
import { GetKlubBySlugHandler } from './application/queries/get-klub-by-slug.handler';
import { ListKlubsHandler } from './application/queries/list-klubs.handler';
import { DiscoverKlubsHandler } from './application/queries/discover-klubs.handler';
import { CheckSlugHandler } from './application/queries/check-slug.handler';
import { ListPendingKlubsHandler } from './application/admin/list-pending-klubs.handler';
import { GetPendingKlubHandler } from './application/admin/get-pending-klub.handler';
import { UpdatePendingKlubHandler } from './application/admin/update-pending-klub.handler';
import { ApproveKlubHandler } from './application/admin/approve-klub.handler';
import { RejectKlubHandler } from './application/admin/reject-klub.handler';
import { AdminKlubController } from './api/admin-klub.controller';
import { RequestMembershipHandler } from './application/membership-requests/request-membership.handler';
import { ListMembershipRequestsHandler } from './application/membership-requests/list-membership-requests.handler';
import { ApproveMembershipRequestHandler } from './application/membership-requests/approve-membership-request.handler';
import { RejectMembershipRequestHandler } from './application/membership-requests/reject-membership-request.handler';
import { ListMyRequestsHandler } from './application/membership-requests/list-my-requests.handler';
import { CancelMyRequestHandler } from './application/membership-requests/cancel-my-request.handler';
import { MeMembershipRequestsController } from './api/me-membership-requests.controller';
import { AddMemberHandler } from './application/commands/add-member.handler';
import { CreateKlubRequestHandler } from './application/commands/create-klub-request.handler';
import { ListKlubRequestsHandler } from './application/queries/list-klub-requests.handler';
import { AddMediaHandler } from './application/commands/add-media.handler';
import { AddSportInterestHandler } from './application/commands/add-sport-interest.handler';
import {
  RequestEnrollmentHandler,
  ApproveEnrollmentHandler,
  RejectEnrollmentHandler,
  CreateEnrollmentDirectHandler,
  SuspendEnrollmentHandler,
  ReactivateEnrollmentHandler,
  CancelEnrollmentHandler,
} from './application/commands/enrollment.handlers';
import {
  ListEnrollmentsByProfileHandler,
  ListEnrollmentsByUserHandler,
} from './application/queries/list-enrollments.handler';
import { KlubFacade } from './public/klub.facade';
import { KlubController } from './api/klub.controller';
import { KlubRequestController } from './api/klub-request.controller';
import {
  EnrollmentScopeController,
  EnrollmentActionsController,
  EnrollmentsByUserController,
  MeEnrollmentsController,
} from './api/enrollment.controller';
import { IdentityModule } from '../identity/identity.module';

@Module({
  imports: [IdentityModule],
  controllers: [
    KlubController,
    AdminKlubController,
    MeMembershipRequestsController,
    KlubRequestController,
    EnrollmentScopeController,
    EnrollmentActionsController,
    EnrollmentsByUserController,
    MeEnrollmentsController,
  ],
  providers: [
    KlubPrismaRepository,
    CreateKlubHandler,
    UpdateKlubHandler,
    DeactivateKlubHandler,
    GetKlubByIdHandler,
    GetKlubBySlugHandler,
    ListKlubsHandler,
    DiscoverKlubsHandler,
    CheckSlugHandler,
    ListPendingKlubsHandler,
    GetPendingKlubHandler,
    UpdatePendingKlubHandler,
    ApproveKlubHandler,
    RejectKlubHandler,
    RequestMembershipHandler,
    ListMembershipRequestsHandler,
    ApproveMembershipRequestHandler,
    RejectMembershipRequestHandler,
    ListMyRequestsHandler,
    CancelMyRequestHandler,
    AddMemberHandler,
    CreateKlubRequestHandler,
    ListKlubRequestsHandler,
    AddMediaHandler,
    AddSportInterestHandler,
    RequestEnrollmentHandler,
    ApproveEnrollmentHandler,
    RejectEnrollmentHandler,
    CreateEnrollmentDirectHandler,
    SuspendEnrollmentHandler,
    ReactivateEnrollmentHandler,
    CancelEnrollmentHandler,
    ListEnrollmentsByProfileHandler,
    ListEnrollmentsByUserHandler,
    KlubFacade,
  ],
  exports: [KlubFacade],
})
export class KlubModule {}
