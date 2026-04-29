import { z } from 'zod';
import { createZodDto } from 'nestjs-zod';
import { uuidString } from '../../../../shared/validation/uuid-string';

export const ReportMatchSchema = z.object({
  winnerId: uuidString(),
  score: z.string().max(50).optional(),
  notes: z.string().max(500).optional(),
});

export class ReportMatchDto extends createZodDto(ReportMatchSchema) {}
