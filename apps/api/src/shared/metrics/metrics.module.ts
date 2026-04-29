import { Global, Module } from '@nestjs/common';
import { PrometheusModule, makeCounterProvider } from '@willsoto/nestjs-prometheus';
import { MetricsService } from './metrics.service';

/**
 * Sprint N batch 7 — módulo de métricas Prometheus.
 *
 * Expõe `/metrics` automaticamente via PrometheusModule (default config).
 * Default metrics do Node.js (CPU, memória, event loop, GC) ligados.
 * Counters de negócio definidos abaixo via makeCounterProvider — cada
 * um precisa ser registrado E injetado em MetricsService.
 *
 * @Global porque qualquer handler pode injetar MetricsService sem
 * precisar importar o módulo.
 */
@Global()
@Module({
  imports: [
    PrometheusModule.register({
      defaultMetrics: { enabled: true },
      defaultLabels: { app: 'draftklub-api' },
    }),
  ],
  providers: [
    MetricsService,
    makeCounterProvider({
      name: 'booking_created_total',
      help: 'Total de bookings criados, label klub + status (pending|confirmed)',
      labelNames: ['klub', 'status'],
    }),
    makeCounterProvider({
      name: 'booking_cancelled_total',
      help: 'Total de bookings cancelados (não conta soft-deletes auto-cascata)',
      labelNames: ['klub'],
    }),
    makeCounterProvider({
      name: 'tournament_created_total',
      help: 'Total de torneios criados',
      labelNames: ['klub', 'sport'],
    }),
    makeCounterProvider({
      name: 'tournament_cancelled_total',
      help: 'Total de torneios cancelados',
      labelNames: ['klub', 'sport'],
    }),
    makeCounterProvider({
      name: 'match_reported_total',
      help: 'Total de matches reportados, label source=casual|tournament',
      labelNames: ['source'],
    }),
    makeCounterProvider({
      name: 'klub_created_total',
      help: 'Total de Klubs criados (review_status=pending)',
      labelNames: ['plan'],
    }),
    makeCounterProvider({
      name: 'membership_request_decided_total',
      help: 'Solicitações de entrada decididas, label decision=approved|rejected',
      labelNames: ['decision'],
    }),
    makeCounterProvider({
      name: 'klub_review_decided_total',
      help: 'Klubs cadastrados moderados pelo platform admin, decision=approved|rejected',
      labelNames: ['decision'],
    }),
  ],
  exports: [MetricsService],
})
export class MetricsModule {}
