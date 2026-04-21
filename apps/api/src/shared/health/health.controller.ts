import { Controller, Get } from '@nestjs/common';
import { HealthCheck, HealthCheckService, PrismaHealthIndicator } from '@nestjs/terminus';
import { PrismaService } from '../prisma/prisma.service';

@Controller()
export class HealthController {
  constructor(
    private readonly health: HealthCheckService,
    private readonly prismaHealth: PrismaHealthIndicator,
    private readonly prisma: PrismaService,
  ) {}

  @Get('health')
  @HealthCheck()
  check() {
    return this.health.check([() => this.prismaHealth.pingCheck('database', this.prisma)]);
  }

  @Get('ready')
  ready() {
    return { status: 'ready' };
  }
}
