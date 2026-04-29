import { Injectable, Logger } from '@nestjs/common';
import { InjectMetric } from '@willsoto/nestjs-prometheus';
import type { Counter } from 'prom-client';

/**
 * Sprint N batch 7 — métricas de negócio em formato Prometheus.
 *
 * Counters expostos em `/metrics` (handler do nestjs-prometheus).
 * Próximo passo (sprint futura): scrape via Google Managed Prometheus
 * → dashboards no Cloud Monitoring.
 *
 * Naming convention: `{domínio}_{evento}_total` (ex: booking_created_total).
 * Labels devem ser cardinality-safe — use IDs estáveis (klubId, sportCode)
 * mas evite valores ilimitados como timestamps/userIds.
 *
 * Falhas em record() são logadas mas NUNCA propagadas — métrica não
 * pode derrubar operação de negócio (mesmo padrão do AuditService).
 */
@Injectable()
export class MetricsService {
  private readonly logger = new Logger(MetricsService.name);

  constructor(
    @InjectMetric('booking_created_total')
    private readonly bookingCreatedTotal: Counter<'klub' | 'status'>,
    @InjectMetric('booking_cancelled_total')
    private readonly bookingCancelledTotal: Counter<'klub'>,
    @InjectMetric('tournament_created_total')
    private readonly tournamentCreatedTotal: Counter<'klub' | 'sport'>,
    @InjectMetric('tournament_cancelled_total')
    private readonly tournamentCancelledTotal: Counter<'klub' | 'sport'>,
    @InjectMetric('match_reported_total')
    private readonly matchReportedTotal: Counter<'source'>,
    @InjectMetric('klub_created_total')
    private readonly klubCreatedTotal: Counter<'plan'>,
    @InjectMetric('membership_request_decided_total')
    private readonly membershipRequestDecidedTotal: Counter<'decision'>,
    @InjectMetric('klub_review_decided_total')
    private readonly klubReviewDecidedTotal: Counter<'decision'>,
  ) {}

  bookingCreated(klubId: string, status: 'pending' | 'confirmed'): void {
    this.safe(() => this.bookingCreatedTotal.inc({ klub: klubId, status }));
  }

  bookingCancelled(klubId: string): void {
    this.safe(() => this.bookingCancelledTotal.inc({ klub: klubId }));
  }

  tournamentCreated(klubId: string, sport: string): void {
    this.safe(() => this.tournamentCreatedTotal.inc({ klub: klubId, sport }));
  }

  tournamentCancelled(klubId: string, sport: string): void {
    this.safe(() => this.tournamentCancelledTotal.inc({ klub: klubId, sport }));
  }

  matchReported(source: 'casual' | 'tournament'): void {
    this.safe(() => this.matchReportedTotal.inc({ source }));
  }

  klubCreated(plan: string): void {
    this.safe(() => this.klubCreatedTotal.inc({ plan }));
  }

  membershipRequestDecided(decision: 'approved' | 'rejected'): void {
    this.safe(() => this.membershipRequestDecidedTotal.inc({ decision }));
  }

  klubReviewDecided(decision: 'approved' | 'rejected'): void {
    this.safe(() => this.klubReviewDecidedTotal.inc({ decision }));
  }

  private safe(fn: () => void): void {
    try {
      fn();
    } catch (err) {
      this.logger.warn(
        `Metric increment failed: ${err instanceof Error ? err.message : String(err)}`,
      );
    }
  }
}
