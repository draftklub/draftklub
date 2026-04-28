import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import { FirebaseAuthGuard } from '../../../shared/auth/firebase-auth.guard';
import { RequirePolicy } from '../../../shared/auth/require-policy.decorator';
import { PolicyGuard } from '../../../shared/auth/policy.guard';
import { SpaceFacade } from '../public/space.facade';
import { CreateSpaceSchema, UpdateSpaceSchema } from './dtos/space.dto';

/**
 * Sprint Onboarding PR1 — CRUD básico de Space (quadras) escopado por
 * Klub. KLUB_ADMIN cria/edita; outros roles (sports committee/staff)
 * herdam por scope match.
 */
@Controller('klubs/:klubId/spaces')
@UseGuards(FirebaseAuthGuard, PolicyGuard)
export class SpaceController {
  constructor(private readonly facade: SpaceFacade) {}

  @Post()
  @RequirePolicy('klub.spaces.create', (req) => ({
    klubId: (req as { params: { klubId: string } }).params.klubId,
  }))
  async create(@Param('klubId') klubId: string, @Body() body: unknown) {
    const dto = CreateSpaceSchema.parse(body);
    return this.facade.createSpace({ klubId, ...dto });
  }

  @Get()
  @RequirePolicy('klub.spaces.read', (req) => ({
    klubId: (req as { params: { klubId: string } }).params.klubId,
  }))
  async list(@Param('klubId') klubId: string, @Query('includeInactive') includeInactive?: string) {
    return this.facade.listKlubSpaces(klubId, includeInactive === 'true');
  }

  @Patch(':spaceId')
  @RequirePolicy('klub.spaces.update', (req) => ({
    klubId: (req as { params: { klubId: string } }).params.klubId,
  }))
  async update(
    @Param('klubId') klubId: string,
    @Param('spaceId') spaceId: string,
    @Body() body: unknown,
  ) {
    const dto = UpdateSpaceSchema.parse(body);
    return this.facade.updateSpace({ klubId, spaceId, patch: dto });
  }

  @Delete(':spaceId')
  @RequirePolicy('klub.spaces.delete', (req) => ({
    klubId: (req as { params: { klubId: string } }).params.klubId,
  }))
  async delete(@Param('klubId') klubId: string, @Param('spaceId') spaceId: string) {
    return this.facade.deleteSpace({ klubId, spaceId });
  }
}
