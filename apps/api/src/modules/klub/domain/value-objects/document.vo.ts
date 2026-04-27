export type DocumentType = 'cpf' | 'cnpj';

export interface DocumentLookupResult {
  legalName: string;
  address: string;
  city: string;
  state: string;
  zipCode: string;
}

export class DocumentVO {
  private constructor(
    private readonly raw: string,
    readonly type: DocumentType,
  ) {}

  static createCPF(value: string): DocumentVO {
    const clean = value.replace(/\D/g, '');
    if (!DocumentVO.validateCPF(clean)) {
      throw new Error(`Invalid CPF: ${value}`);
    }
    return new DocumentVO(clean, 'cpf');
  }

  static createCNPJ(value: string): DocumentVO {
    const clean = value.replace(/\D/g, '');
    if (!DocumentVO.validateCNPJ(clean)) {
      throw new Error(`Invalid CNPJ: ${value}`);
    }
    return new DocumentVO(clean, 'cnpj');
  }

  static tryCreate(value: string, type: DocumentType): DocumentVO | null {
    try {
      return type === 'cpf' ? DocumentVO.createCPF(value) : DocumentVO.createCNPJ(value);
    } catch {
      return null;
    }
  }

  get value(): string {
    return this.raw;
  }

  hint(): string {
    if (this.type === 'cpf') {
      return `***.${this.raw.slice(3, 6)}.***-${this.raw.slice(9)}`;
    }
    return `**.${this.raw.slice(2, 5)}.${this.raw.slice(5, 8)}/****-${this.raw.slice(12)}`;
  }

  lookup(): Promise<DocumentLookupResult | null> {
    return Promise.resolve(null);
  }

  static validateCPF(cpf: string): boolean {
    const clean = cpf.replace(/\D/g, '');
    if (clean.length !== 11) return false;
    if (/^(\d)\1+$/.test(clean)) return false;

    let sum = 0;
    for (let i = 0; i < 9; i++) sum += parseInt(clean[i] ?? '0') * (10 - i);
    let remainder = (sum * 10) % 11;
    if (remainder === 10 || remainder === 11) remainder = 0;
    if (remainder !== parseInt(clean[9] ?? '-1')) return false;

    sum = 0;
    for (let i = 0; i < 10; i++) sum += parseInt(clean[i] ?? '0') * (11 - i);
    remainder = (sum * 10) % 11;
    if (remainder === 10 || remainder === 11) remainder = 0;
    return remainder === parseInt(clean[10] ?? '-1');
  }

  static validateCNPJ(cnpj: string): boolean {
    const clean = cnpj.replace(/\D/g, '');
    if (clean.length !== 14) return false;
    if (/^(\d)\1+$/.test(clean)) return false;

    const calc = (c: string, len: number): number => {
      let sum = 0;
      let pos = len - 7;
      for (let i = len; i >= 1; i--) {
        sum += parseInt(c[len - i] ?? '0') * pos--;
        if (pos < 2) pos = 9;
      }
      return sum % 11 < 2 ? 0 : 11 - (sum % 11);
    };

    return (
      calc(clean, 12) === parseInt(clean[12] ?? '-1') &&
      calc(clean, 13) === parseInt(clean[13] ?? '-1')
    );
  }
}
