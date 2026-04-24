import { Module } from '@nestjs/common';
import { SportCatalogRepository } from './infrastructure/repositories/sport-catalog.prisma.repository';
import { KlubSportProfileRepository } from './infrastructure/repositories/klub-sport-profile.prisma.repository';
import { ListSportsHandler } from './application/queries/list-sports.handler';
import { GetSportHandler } from './application/queries/get-sport.handler';
import { ListKlubSportsHandler } from './application/queries/list-klub-sports.handler';
import { GetKlubSportHandler } from './application/queries/get-klub-sport.handler';
import { ActivateSportHandler } from './application/commands/activate-sport.handler';
import { SportsFacade } from './public/sports.facade';
import { SportsController } from './api/sports.controller';
import { KlubSportsController } from './api/klub-sports.controller';
import { IdentityModule } from '../identity/identity.module';

@Module({
  imports: [IdentityModule],
  controllers: [SportsController, KlubSportsController],
  providers: [
    SportCatalogRepository,
    KlubSportProfileRepository,
    ListSportsHandler,
    GetSportHandler,
    ListKlubSportsHandler,
    GetKlubSportHandler,
    ActivateSportHandler,
    SportsFacade,
  ],
  exports: [SportsFacade],
})
export class SportsModule {}
