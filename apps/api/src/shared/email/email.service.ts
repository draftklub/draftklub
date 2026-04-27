import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

export interface SendEmailInput {
  to: string;
  subject: string;
  /** HTML body. */
  html: string;
  /** Plain text fallback (acessibilidade + clientes que não renderizam HTML). */
  text: string;
}

export type SendEmailResult =
  | { ok: true; id: string }
  | { ok: false; error: string; retryable: boolean };

const RESEND_ENDPOINT = 'https://api.resend.com/emails';

/**
 * Sprint D PR3 — wrapper do Resend (https://resend.com/docs/api-reference/emails/send-email).
 * Sem RESEND_API_KEY configurado, opera em modo log-only: imprime o
 * email no logger ao invés de enviar. Útil pra dev local e pro caso
 * de a infra ainda não estar provisionada.
 *
 * Erros 4xx do Resend são marcados como NÃO-retryable (problema com
 * destinatário/conteúdo, retry não muda nada). 5xx e timeouts ficam
 * retryable — outbox processor faz backoff exponencial até dead.
 */
@Injectable()
export class EmailService {
  private readonly logger = new Logger(EmailService.name);
  private readonly apiKey: string | undefined;
  private readonly defaultFrom: string;

  constructor(config: ConfigService) {
    const raw = config.get<string>('RESEND_API_KEY');
    // Resend keys reais sempre começam com `re_` (api.resend.com/docs).
    // Qualquer outro valor (placeholder, vazio, undefined) cai em log-only
    // mode — útil pra dev e pro setup operacional onde o secret existe
    // mas ainda não foi populado com a key real.
    this.apiKey = raw?.startsWith('re_') ? raw : undefined;
    this.defaultFrom = config.get<string>('EMAIL_FROM') ?? 'DraftKlub <noreply@draftklub.com>';
  }

  async send(input: SendEmailInput): Promise<SendEmailResult> {
    if (!this.apiKey) {
      this.logger.warn(
        `[email log-only] To: ${input.to} | Subject: ${input.subject}\n${input.text}`,
      );
      return { ok: true, id: 'dev-noop' };
    }

    try {
      const res = await fetch(RESEND_ENDPOINT, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${this.apiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          from: this.defaultFrom,
          to: [input.to],
          subject: input.subject,
          html: input.html,
          text: input.text,
        }),
        signal: AbortSignal.timeout(10_000),
      });

      if (res.ok) {
        const data = (await res.json()) as { id?: string };
        return { ok: true, id: data.id ?? 'unknown' };
      }

      const body = await res.text().catch(() => '');
      const retryable = res.status >= 500 || res.status === 429;
      const reason = `Resend ${res.status}: ${body.slice(0, 200)}`;
      this.logger.warn(reason);
      return { ok: false, error: reason, retryable };
    } catch (err) {
      const msg = (err as Error).message;
      this.logger.warn(`Resend network error: ${msg}`);
      return { ok: false, error: msg, retryable: true };
    }
  }
}
