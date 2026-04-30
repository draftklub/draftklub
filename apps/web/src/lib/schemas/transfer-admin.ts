import { z } from 'zod';

export const transferAdminSchema = z.object({
  email: z.string().min(1, 'Email obrigatório').email('Email inválido'),
});

export type TransferAdminInput = z.infer<typeof transferAdminSchema>;
