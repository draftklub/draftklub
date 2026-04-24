import { Module } from '@nestjs/common';
import { SpacePrismaRepository } from './infrastructure/repositories/space.prisma.repository';
import { SpaceFacade } from './public/space.facade';

@Module({
  providers: [SpacePrismaRepository, SpaceFacade],
  exports: [SpaceFacade],
})
export class SpaceModule {}
