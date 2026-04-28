import { Injectable, Logger } from '@nestjs/common';

export type CnpjSituacao = 'ativa' | 'baixada' | 'suspensa' | 'inapta' | 'nula';

export interface CnpjLookupResult {
  razaoSocial: string | null;
  nomeFantasia: string | null;
  situacaoCadastral: CnpjSituacao | null;
  descricaoSituacao: string | null;
  dataSituacao: string | null;
  endereco: {
    logradouro: string | null;
    numero: string | null;
    complemento: string | null;
    bairro: string | null;
    municipio: string | null;
    uf: string | null;
    cep: string | null;
  };
  contato: {
    telefone: string | null;
    email: string | null;
  };
  capitalSocial: number | null;
  atividadePrimaria: string | null;
  dataAbertura: string | null;
  /** Payload bruto da BrasilAPI; admin usa pra audit. */
  raw: Record<string, unknown>;
}

const SITUACAO_MAP: Record<string, CnpjSituacao> = {
  ATIVA: 'ativa',
  BAIXADA: 'baixada',
  SUSPENSA: 'suspensa',
  INAPTA: 'inapta',
  NULA: 'nula',
};

@Injectable()
export class CnpjLookupService {
  private readonly logger = new Logger(CnpjLookupService.name);

  /**
   * Consulta CNPJ na BrasilAPI v1. Retorna null em qualquer falha
   * (timeout, 404, parse) — caller decide se permite cadastro manual.
   * Snapshot fica no DB pra admin auditar.
   */
  async lookup(cnpj: string): Promise<CnpjLookupResult | null> {
    const digits = cnpj.replace(/\D/g, '');
    if (digits.length !== 14) return null;
    try {
      const res = await fetch(`https://brasilapi.com.br/api/cnpj/v1/${digits}`, {
        signal: AbortSignal.timeout(8000),
        headers: {
          // Alguns rate-limiters de borda bloqueiam fetch sem UA. Identifica
          // a integração explicitamente pra facilitar contato/whitelisting.
          'User-Agent': 'DraftKlub/1.0 (+https://draftklub.com.br)',
          Accept: 'application/json',
        },
      });
      if (!res.ok) {
        const body = await res.text().catch(() => '<unreadable>');
        this.logger.warn(`BrasilAPI CNPJ ${digits} HTTP ${res.status}: ${body.slice(0, 300)}`);
        return null;
      }
      const data = (await res.json()) as Record<string, unknown>;
      return this.normalize(data);
    } catch (err) {
      this.logger.warn(`BrasilAPI CNPJ ${digits} falhou: ${(err as Error).message}`);
      return null;
    }
  }

  private normalize(d: Record<string, unknown>): CnpjLookupResult {
    const str = (k: string): string | null => {
      const v = d[k];
      return typeof v === 'string' && v.trim() !== '' ? v.trim() : null;
    };
    const num = (k: string): number | null => {
      const v = d[k];
      if (typeof v === 'number' && Number.isFinite(v)) return v;
      if (typeof v === 'string' && v.trim() !== '') {
        const n = parseFloat(v);
        return Number.isFinite(n) ? n : null;
      }
      return null;
    };

    const situacaoStr = str('descricao_situacao_cadastral');
    const situacao = situacaoStr ? (SITUACAO_MAP[situacaoStr.toUpperCase()] ?? null) : null;

    return {
      razaoSocial: str('razao_social'),
      nomeFantasia: str('nome_fantasia'),
      situacaoCadastral: situacao,
      descricaoSituacao: situacaoStr,
      dataSituacao: str('data_situacao_cadastral'),
      endereco: {
        logradouro: str('logradouro'),
        numero: str('numero'),
        complemento: str('complemento'),
        bairro: str('bairro'),
        municipio: str('municipio'),
        uf: str('uf'),
        cep: str('cep'),
      },
      contato: {
        telefone: str('ddd_telefone_1') ?? str('ddd_telefone_2'),
        email: str('email'),
      },
      capitalSocial: num('capital_social'),
      atividadePrimaria: (() => {
        const cnae = d.cnae_fiscal_descricao;
        return typeof cnae === 'string' ? cnae : null;
      })(),
      dataAbertura: str('data_inicio_atividade'),
      raw: d,
    };
  }
}
