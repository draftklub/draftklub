import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../../../shared/prisma/prisma.service';
import { generateKlubSlug } from '../slug-generator';

export interface CheckSlugCommand {
  name: string;
  neighborhood?: string;
  city?: string;
}

export interface CheckSlugResult {
  /** Slug calculado (mesmo algoritmo do CreateKlubHandler). */
  slug: string;
  /** True se livre; false se já existe outro Klub com o mesmo slug. */
  available: boolean;
  /** Slug sugerido (`-2`, `-3`...) quando o base está taken. */
  suggestedSlug: string | null;
  /** Nome do Klub conflitante (pra UI explicar o conflito). */
  conflictKlubName: string | null;
}

const MAX_SUFFIX_PROBE = 99;

/**
 * Preview live de slug pro /criar-klub. Não bloqueia submit (admin
 * desambigua na PR2), mas alerta o user e dá sugestão visível.
 *
 * Liberado pra qualquer auth user — é só leitura, não vaza dados
 * sensíveis (só nome do Klub conflitante, que é público mesmo).
 */
@Injectable()
export class CheckSlugHandler {
  constructor(private readonly prisma: PrismaService) {}

  async execute(cmd: CheckSlugCommand): Promise<CheckSlugResult> {
    const slug = generateKlubSlug(cmd.name, cmd.neighborhood ?? null, cmd.city ?? null);

    if (!slug) {
      // Nome só com símbolos — devolve placeholder, não checa unique.
      return {
        slug: '',
        available: false,
        suggestedSlug: null,
        conflictKlubName: null,
      };
    }

    const conflict = await this.prisma.klub.findUnique({
      where: { slug },
      select: { name: true, deletedAt: true },
    });

    if (!conflict || conflict.deletedAt) {
      return { slug, available: true, suggestedSlug: null, conflictKlubName: null };
    }

    // Slug taken — sugere próximo livre `-2`, `-3`...
    let suggested: string | null = null;
    for (let i = 2; i <= MAX_SUFFIX_PROBE; i++) {
      const candidate = `${slug}-${i}`;
      const c = await this.prisma.klub.findUnique({
        where: { slug: candidate },
        select: { id: true, deletedAt: true },
      });
      if (!c || c.deletedAt) {
        suggested = candidate;
        break;
      }
    }

    return {
      slug,
      available: false,
      suggestedSlug: suggested,
      conflictKlubName: conflict.name,
    };
  }
}
