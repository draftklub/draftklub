import { describe, it, expect } from 'vitest';
import { CursorPaginationSchema, buildCursorPage, decodeCursor, encodeCursor } from './cursor';

describe('cursor pagination', () => {
  it('encode + decode roundtrip', () => {
    const payload = { id: 'abc', startsAt: '2026-04-29T10:00:00.000Z' };
    const encoded = encodeCursor(payload);
    const decoded = decodeCursor<typeof payload>(encoded);
    expect(decoded).toEqual(payload);
  });

  it('decode retorna null pra cursor lixo', () => {
    expect(decodeCursor('not-base64-!!')).toBeNull();
    expect(decodeCursor(undefined)).toBeNull();
  });

  it('decode retorna null pra base64 valido mas non-JSON', () => {
    const garbage = Buffer.from('not json', 'utf8').toString('base64url');
    expect(decodeCursor(garbage)).toBeNull();
  });

  it('CursorPaginationSchema aplica defaults', () => {
    const parsed = CursorPaginationSchema.parse({});
    expect(parsed.limit).toBe(50);
    expect(parsed.cursor).toBeUndefined();
  });

  it('CursorPaginationSchema rejeita limit > MAX', () => {
    expect(() => CursorPaginationSchema.parse({ limit: 500 })).toThrow();
  });

  it('CursorPaginationSchema coerciona limit string→number', () => {
    expect(CursorPaginationSchema.parse({ limit: '25' }).limit).toBe(25);
  });

  it('buildCursorPage com 5 rows + limit 5 → nextCursor null', () => {
    const rows = [{ id: '1' }, { id: '2' }, { id: '3' }, { id: '4' }, { id: '5' }];
    const page = buildCursorPage(rows, 5, (r) => ({ id: r.id }));
    expect(page.items).toHaveLength(5);
    expect(page.nextCursor).toBeNull();
  });

  it('buildCursorPage com 6 rows + limit 5 → corta + emite cursor', () => {
    const rows = [{ id: '1' }, { id: '2' }, { id: '3' }, { id: '4' }, { id: '5' }, { id: '6' }];
    const page = buildCursorPage(rows, 5, (r) => ({ id: r.id }));
    expect(page.items).toHaveLength(5);
    expect(page.items[4]).toEqual({ id: '5' });
    expect(page.nextCursor).not.toBeNull();
    const decoded = decodeCursor<{ id: string }>(page.nextCursor ?? '');
    expect(decoded?.id).toBe('5');
  });

  it('buildCursorPage com array vazio → items vazio + nextCursor null', () => {
    const page = buildCursorPage<{ id: string }>([], 5, (r) => ({ id: r.id }));
    expect(page.items).toHaveLength(0);
    expect(page.nextCursor).toBeNull();
  });
});
