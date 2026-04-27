import { Module } from '@nestjs/common';
import { KlubPrismaRepository } from './infrastructure/repositories/klub.prisma.repository';
import { CreateKlubHandler } from './application/commands/create-klub.handler';
import { GetKlubByIdHandler } from './application/queries/get-klub-by-id.handler';
import { GetKlubBySlugHandler } from './application/queries/get-klub-by-slug.handler';
import { ListKlubsHandler } from './application/queries/list-klubs.handler';
import { DiscoverKlubsHandler } from './application/queries/discover-klubs.handler';
import { CheckSlugHandler } from './application/queries/check-slug.handler';
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
} from './api/enrollment.controller';
import { IdentityModule } from '../identity/identity.module';

@Module({
  imports: [IdentityModule],
  controllers: [
    KlubController,
    KlubRequestController,
    EnrollmentScopeController,
    EnrollmentActionsController,
    EnrollmentsByUserController,
  ],
  providers: [
    KlubPrismaRepository,
    CreateKlubHandler,
    GetKlubByIdHandler,
    GetKlubBySlugHandler,
    ListKlubsHandler,
    DiscoverKlubsHandler,
    CheckSlugHandler,
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
