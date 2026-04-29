import { Controller, Get } from '@nestjs/common';
import { HealthCheck, HealthCheckService, PrismaHealthIndicator } from '@nestjs/terminus';
import { PrismaService } from '../prisma/prisma.service';

/**
 * Sprint N batch 1 — separa liveness (sem dependências externas) de
 * readiness (com DB). Antes /health pingava o DB e era usado por
 * Cloud Run liveness probe — um blip do Cloud SQL matava todos os
 * containers em vez de só remover do load balancer. Agora:
 *
 *  - /livez: só responde 200. Use como liveness probe.
 *  - /readyz: ping no DB. Use como readiness probe (gating de tráfego).
 *  - /health, /ready: aliases legacy mantidos pra compat (a configuração
 *    do Cloud Run em infra/terraform/modules/cloud-run aponta pra /health
 *    nas duas probes — atualizar lá pra usar os endpoints novos).
 */
@Controller()
export class HealthController {
  constructor(
    private readonly health: HealthCheckService,
    private readonly prismaHealth: PrismaHealthIndicator,
    private readonly prisma: PrismaService,
  ) {}

  @Get('livez')
  livez() {
    return { status: 'alive' };
  }

  @Get('readyz')
  @HealthCheck()
  readyz() {
    return this.health.check([() => this.prismaHealth.pingCheck('database', this.prisma)]);
  }

  /** Legacy alias — mantém compat com probes existentes. */
  @Get('health')
  @HealthCheck()
  check() {
    return this.health.check([() => this.prismaHealth.pingCheck('database', this.prisma)]);
  }

  /** Legacy alias. */
  @Get('ready')
  ready() {
    return { status: 'ready' };
  }
}
