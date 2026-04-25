import { z } from 'zod';

const UUID_PERMISSIVE_REGEX =
  /^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$/;

/**
 * UUID validation que aceita qualquer 32-hex no formato 8-4-4-4-12.
 * Diferente de z.string().uuid() (RFC 4122 strict, exige version 1-5),
 * aceita UUIDs sintéticos usados em seeds (ex: 00000000-0000-0000-0001-000000000001).
 */
export const uuidString = () =>
  z.string().regex(UUID_PERMISSIVE_REGEX, { message: 'Invalid UUID format' });
