import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { CnpjLookupService } from './cnpj-lookup.service';

describe('CnpjLookupService', () => {
  let service: CnpjLookupService;
  let fetchMock: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    service = new CnpjLookupService();
    fetchMock = vi.fn();
    vi.stubGlobal('fetch', fetchMock);
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('rejeita CNPJ com tamanho incorreto retornando null sem fetch', async () => {
    const result = await service.lookup('1234');
    expect(result).toBeNull();
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('normaliza payload BrasilAPI com sucesso', async () => {
    fetchMock.mockResolvedValueOnce({
      ok: true,
      json: () =>
        Promise.resolve({
          razao_social: 'TENNIS CLUB LTDA',
          nome_fantasia: 'Tennis Club',
          descricao_situacao_cadastral: 'ATIVA',
          data_situacao_cadastral: '2020-01-01',
          logradouro: 'RUA TESTE',
          numero: '100',
          bairro: 'BOTAFOGO',
          municipio: 'RIO DE JANEIRO',
          uf: 'RJ',
          cep: '22440000',
          ddd_telefone_1: '21999999999',
          cnae_fiscal_descricao: 'Atividades esportivas',
        }),
    });
    const result = await service.lookup('11222333000181');
    expect(result).not.toBeNull();
    expect(result?.razaoSocial).toBe('TENNIS CLUB LTDA');
    expect(result?.situacaoCadastral).toBe('ativa');
    expect(result?.endereco.bairro).toBe('BOTAFOGO');
    expect(result?.endereco.uf).toBe('RJ');
    expect(result?.atividadePrimaria).toBe('Atividades esportivas');
  });

  it('retorna null silenciosamente em 404', async () => {
    fetchMock.mockResolvedValueOnce({ ok: false, status: 404 });
    const result = await service.lookup('11222333000181');
    expect(result).toBeNull();
  });

  it('retorna null silenciosamente em network error', async () => {
    fetchMock.mockRejectedValueOnce(new Error('network failure'));
    const result = await service.lookup('11222333000181');
    expect(result).toBeNull();
  });

  it('mapeia situação cadastral desconhecida pra null', async () => {
    fetchMock.mockResolvedValueOnce({
      ok: true,
      json: () =>
        Promise.resolve({
          descricao_situacao_cadastral: 'STATUS_QUE_NAO_EXISTE',
        }),
    });
    const result = await service.lookup('11222333000181');
    expect(result?.situacaoCadastral).toBeNull();
    expect(result?.descricaoSituacao).toBe('STATUS_QUE_NAO_EXISTE');
  });
});
