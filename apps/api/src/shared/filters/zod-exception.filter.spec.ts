import { describe, it, expect, vi } from 'vitest';
import type { ArgumentsHost } from '@nestjs/common';
import { z } from 'zod';
import { ZodExceptionFilter } from './zod-exception.filter';

function buildHost(url = '/test') {
  const send = vi.fn();
  const status = vi.fn().mockReturnValue({ send });
  const reply = { status };
  const request = { url };
  const host = {
    switchToHttp: () => ({
      getResponse: () => reply,
      getRequest: () => request,
    }),
  } as unknown as ArgumentsHost;
  return { host, status, send };
}

describe('ZodExceptionFilter', () => {
  const filter = new ZodExceptionFilter();

  it('mapeia ZodError para 400 com payload estruturado', () => {
    const schema = z.object({ spaceId: z.string().uuid() });
    const parsed = schema.safeParse({ spaceId: 'not-a-uuid' });
    expect(parsed.success).toBe(false);
    if (parsed.success) return;

    const { host, status, send } = buildHost('/klubs/abc/booking-series');
    filter.catch(parsed.error, host);

    expect(status).toHaveBeenCalledWith(400);
    const payload = send.mock.calls[0]?.[0] as {
      statusCode: number;
      message: string;
      errors: { path: (string | number)[]; message: string }[];
      path: string;
    };
    expect(payload.statusCode).toBe(400);
    expect(payload.message).toBe('Validation failed');
    expect(payload.path).toBe('/klubs/abc/booking-series');
    expect(payload.errors).toHaveLength(1);
    expect(payload.errors[0]?.path).toEqual(['spaceId']);
    expect(typeof payload.errors[0]?.message).toBe('string');
    expect((payload.errors[0]?.message ?? '').length).toBeGreaterThan(0);
  });

  it('inclui todos os issues quando ha multiplos erros', () => {
    const schema = z.object({
      spaceId: z.string().uuid(),
      durationMinutes: z.number().int().min(15),
    });
    const parsed = schema.safeParse({ spaceId: 'bad', durationMinutes: 5 });
    expect(parsed.success).toBe(false);
    if (parsed.success) return;

    const { host, send } = buildHost();
    filter.catch(parsed.error, host);

    const firstCall = send.mock.calls[0] as [{ errors: unknown[] }] | undefined;
    expect(firstCall).toBeDefined();
    expect(firstCall?.[0].errors).toHaveLength(2);
  });
});
