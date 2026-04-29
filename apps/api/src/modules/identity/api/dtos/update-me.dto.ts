import { z } from 'zod';
import { createZodDto } from 'nestjs-zod';
import { DocumentVO } from '../../../klub/domain/value-objects/document.vo';

/**
 * PATCH /me — todos campos opcionais. Backend só atualiza fields
 * presentes no body (Prisma update parcial). State em maiúsculas (UF
 * Brasil). CPF chega só dígitos (11 chars), validado por DocumentVO
 * (módulo 11).
 */
export const UpdateMeSchema = z.object({
  fullName: z.string().min(2).max(100).optional(),
  phone: z.string().max(30).optional(),
  // ISO date YYYY-MM-DD; sem time
  birthDate: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/, 'Use formato YYYY-MM-DD')
    .optional(),
  avatarUrl: z.string().url().max(500).optional(),
  gender: z.enum(['male', 'female', 'undisclosed']).optional(),
  city: z.string().min(2).max(100).optional(),
  state: z
    .string()
    .length(2)
    .regex(/^[A-Z]{2}$/, 'UF deve ser 2 letras maiúsculas')
    .optional(),

  // CPF — chega só dígitos do frontend; validador módulo 11.
  documentNumber: z
    .string()
    .length(11)
    .regex(/^\d{11}$/, 'CPF deve ter 11 dígitos')
    .refine((v) => DocumentVO.validateCPF(v), 'CPF inválido')
    .optional(),
  documentType: z.enum(['cpf', 'rg', 'passport', 'other']).optional(),

  // Endereço — todos opcionais, mas usuário tipicamente preenche junto.
  cep: z
    .string()
    .length(8)
    .regex(/^\d{8}$/, 'CEP deve ter 8 dígitos')
    .optional(),
  addressStreet: z.string().min(2).max(200).optional(),
  addressNumber: z.string().min(1).max(20).optional(),
  addressComplement: z.string().max(100).optional(),
  addressNeighborhood: z.string().min(2).max(100).optional(),

  // Notification prefs (jsonb shape canônico). UI envia objeto completo
  // ou parcial; backend faz merge/replace via Prisma update.
  notificationPrefs: z
    .object({
      email: z
        .object({
          enrollment: z.boolean().optional(),
          booking: z.boolean().optional(),
          tournament: z.boolean().optional(),
          invitation: z.boolean().optional(),
          announcement: z.boolean().optional(),
        })
        .optional(),
    })
    .optional(),
});

export class UpdateMeDto extends createZodDto(UpdateMeSchema) {}
