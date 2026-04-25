import { describe, it, expect } from 'vitest';
import { uuidString } from './uuid-string';

describe('uuidString', () => {
  const schema = uuidString();

  it('aceita UUID v4 RFC 4122', () => {
    const result = schema.safeParse('550e8400-e29b-41d4-a716-446655440000');
    expect(result.success).toBe(true);
  });

  it('aceita seed UUID com version digit 0', () => {
    const result = schema.safeParse('00000000-0000-0000-0001-000000000001');
    expect(result.success).toBe(true);
  });

  it('rejeita string vazia', () => {
    const result = schema.safeParse('');
    expect(result.success).toBe(false);
  });

  it('rejeita formato inválido', () => {
    expect(schema.safeParse('not-a-uuid').success).toBe(false);
    expect(schema.safeParse('550e8400-e29b-41d4-a716').success).toBe(false);
    expect(schema.safeParse('550e8400e29b41d4a716446655440000').success).toBe(false);
    expect(schema.safeParse('550e8400-e29b-41d4-a716-44665544000g').success).toBe(false);
  });
});
