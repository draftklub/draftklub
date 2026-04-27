import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import type { ConfigService } from '@nestjs/config';
import { EmailService } from './email.service';

function buildService(env: { RESEND_API_KEY?: string; EMAIL_FROM?: string } = {}) {
  const config = {
    get: vi.fn((key: string) => (env as Record<string, string | undefined>)[key]),
  };
  return new EmailService(config as unknown as ConfigService);
}

describe('EmailService', () => {
  let fetchMock: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    fetchMock = vi.fn();
    vi.stubGlobal('fetch', fetchMock);
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('sem RESEND_API_KEY retorna ok=true em modo log-only sem fetch', async () => {
    const service = buildService();
    const result = await service.send({
      to: 'a@b.com',
      subject: 'X',
      html: '<p>X</p>',
      text: 'X',
    });
    expect(result.ok).toBe(true);
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('com RESEND_API_KEY sem prefixo re_ (placeholder) cai em log-only', async () => {
    const service = buildService({ RESEND_API_KEY: 'PLACEHOLDER_NOT_REAL_KEY' });
    const result = await service.send({
      to: 'a@b.com',
      subject: 'X',
      html: '<p>X</p>',
      text: 'X',
    });
    expect(result.ok).toBe(true);
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('chama Resend com Authorization Bearer e payload correto quando key configurada', async () => {
    fetchMock.mockResolvedValueOnce({
      ok: true,
      json: () => Promise.resolve({ id: 'msg-123' }),
    });
    const service = buildService({ RESEND_API_KEY: 're_test-key' });
    const result = await service.send({
      to: 'creator@klub.com',
      subject: 'Aprovado',
      html: '<p>OK</p>',
      text: 'OK',
    });
    expect(result).toEqual({ ok: true, id: 'msg-123' });
    expect(fetchMock).toHaveBeenCalledTimes(1);
    const call = fetchMock.mock.calls[0] as [string, RequestInit] | undefined;
    const init = call?.[1];
    const headers = init?.headers as Record<string, string> | undefined;
    expect(headers?.Authorization).toBe('Bearer re_test-key');
    const body = JSON.parse((init?.body as string) ?? '{}') as Record<string, unknown>;
    expect(body.to).toEqual(['creator@klub.com']);
    expect(body.subject).toBe('Aprovado');
  });

  it('marca 4xx como NÃO retryable', async () => {
    fetchMock.mockResolvedValueOnce({
      ok: false,
      status: 422,
      text: () => Promise.resolve('invalid email'),
    });
    const service = buildService({ RESEND_API_KEY: 're_test-key' });
    const result = await service.send({
      to: 'bad',
      subject: 'X',
      html: 'X',
      text: 'X',
    });
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.retryable).toBe(false);
  });

  it('marca 5xx como retryable', async () => {
    fetchMock.mockResolvedValueOnce({
      ok: false,
      status: 503,
      text: () => Promise.resolve('upstream'),
    });
    const service = buildService({ RESEND_API_KEY: 're_test-key' });
    const result = await service.send({ to: 'a', subject: 'X', html: 'X', text: 'X' });
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.retryable).toBe(true);
  });

  it('marca 429 como retryable', async () => {
    fetchMock.mockResolvedValueOnce({
      ok: false,
      status: 429,
      text: () => Promise.resolve('rate limit'),
    });
    const service = buildService({ RESEND_API_KEY: 're_test-key' });
    const result = await service.send({ to: 'a', subject: 'X', html: 'X', text: 'X' });
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.retryable).toBe(true);
  });

  it('network error cai em retryable', async () => {
    fetchMock.mockRejectedValueOnce(new Error('ECONNRESET'));
    const service = buildService({ RESEND_API_KEY: 're_test-key' });
    const result = await service.send({ to: 'a', subject: 'X', html: 'X', text: 'X' });
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.retryable).toBe(true);
  });
});
