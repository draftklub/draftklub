import { TraceExporter as GoogleCloudTraceExporter } from '@google-cloud/opentelemetry-cloud-trace-exporter';
import { getNodeAutoInstrumentations } from '@opentelemetry/auto-instrumentations-node';
import { OTLPTraceExporter } from '@opentelemetry/exporter-trace-otlp-grpc';
import { NodeSDK } from '@opentelemetry/sdk-node';

let sdk: NodeSDK | null = null;

/**
 * Sprint M batch SM-7 — Cloud Trace integration.
 *
 * Estratégia de exporter:
 *  - OTEL_EXPORTER_OTLP_ENDPOINT setado → OTLP/gRPC pra collector
 *    customizado (sidecar, prometheus push gateway, etc).
 *  - OTEL_ENABLED=true sem endpoint → Google Cloud Trace direto (funciona
 *    out-of-the-box em Cloud Run com SA tendo `cloudtrace.agent`, que o
 *    iam module já provisiona).
 *  - Nenhum dos dois → no-op (sem traces).
 *
 * No-op silencioso permite dev local sem GCP sem erros; prod liga só
 * flippando OTEL_ENABLED=true em cloudbuild.
 */
export function initTelemetry(serviceName: string, endpoint?: string): void {
  const enabled = process.env.OTEL_ENABLED === 'true' || !!endpoint;
  if (!enabled) return;

  const traceExporter = endpoint
    ? new OTLPTraceExporter({ url: endpoint })
    : new GoogleCloudTraceExporter();

  sdk = new NodeSDK({
    serviceName,
    // Cast: GoogleCloudTraceExporter usa @opentelemetry/sdk-trace-base@1.x
    // enquanto NodeSDK puxa 2.x — ReadableSpan ganhou `instrumentationScope`
    // em 2.x mas o exporter funciona em runtime (só lê campos compartilhados).
    /* eslint-disable @typescript-eslint/no-explicit-any, @typescript-eslint/no-unsafe-assignment */
    traceExporter: traceExporter as any,
    /* eslint-enable @typescript-eslint/no-explicit-any, @typescript-eslint/no-unsafe-assignment */
    instrumentations: [
      getNodeAutoInstrumentations({
        '@opentelemetry/instrumentation-fs': { enabled: false },
      }),
    ],
  });

  sdk.start();
}

export async function shutdownTelemetry(): Promise<void> {
  if (sdk) {
    await sdk.shutdown();
  }
}
