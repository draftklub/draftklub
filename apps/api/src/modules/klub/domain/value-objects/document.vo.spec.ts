import { describe, it, expect } from 'vitest';
import { DocumentVO } from './document.vo';

describe('DocumentVO', () => {
  describe('CPF validation', () => {
    it('valida CPF correto', () => {
      expect(DocumentVO.validateCPF('529.982.247-25')).toBe(true);
    });

    it('rejeita CPF com dígitos iguais', () => {
      expect(DocumentVO.validateCPF('111.111.111-11')).toBe(false);
    });

    it('rejeita CPF com dígito verificador errado', () => {
      expect(DocumentVO.validateCPF('529.982.247-26')).toBe(false);
    });

    it('rejeita CPF com tamanho errado', () => {
      expect(DocumentVO.validateCPF('123.456.789')).toBe(false);
    });
  });

  describe('CNPJ validation', () => {
    it('valida CNPJ correto', () => {
      expect(DocumentVO.validateCNPJ('11.222.333/0001-81')).toBe(true);
    });

    it('rejeita CNPJ com dígitos iguais', () => {
      expect(DocumentVO.validateCNPJ('11.111.111/1111-11')).toBe(false);
    });

    it('rejeita CNPJ com tamanho errado', () => {
      expect(DocumentVO.validateCNPJ('11.222.333/0001')).toBe(false);
    });
  });

  describe('hint', () => {
    it('mascara CPF corretamente', () => {
      const doc = DocumentVO.createCPF('529.982.247-25');
      expect(doc.hint()).toBe('***.982.***-25');
    });

    it('mascara CNPJ corretamente', () => {
      const doc = DocumentVO.createCNPJ('11.222.333/0001-81');
      expect(doc.hint()).toBe('**.222.333/****-81');
    });
  });

  describe('tryCreate', () => {
    it('retorna null para documento inválido', () => {
      expect(DocumentVO.tryCreate('000.000.000-00', 'cpf')).toBeNull();
    });

    it('retorna DocumentVO para documento válido', () => {
      expect(DocumentVO.tryCreate('529.982.247-25', 'cpf')).not.toBeNull();
    });
  });
});
