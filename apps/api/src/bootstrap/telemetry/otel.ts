import { getNodeAutoInstrumentations } from '@opentelemetry/auto-instrumentations-node';
import { OTLPTraceExporter } from '@opentelemetry/exporter-trace-otlp-grpc';
import { NodeSDK } from '@opentelemetry/sdk-node';

let sdk: NodeSDK | null = null;

export function initTelemetry(serviceName: string, endpoint?: string): void {
  if (!endpoint) return;

  sdk = new NodeSDK({
    serviceName,
    traceExporter: new OTLPTraceExporter({ url: endpoint }),
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
