/**
 * Helpers de formatação de CPF/CNPJ — masks pra inputs, parse pra dígitos
 * puros (formato canônico do backend), validação módulo 11.
 */

export function onlyDigits(s: string): string {
  return s.replace(/\D/g, '');
}

/** Aplica mask `XXX.XXX.XXX-XX` em string que pode ter dígitos parciais. */
export function maskCpf(s: string): string {
  const d = onlyDigits(s).slice(0, 11);
  if (d.length <= 3) return d;
  if (d.length <= 6) return `${d.slice(0, 3)}.${d.slice(3)}`;
  if (d.length <= 9) return `${d.slice(0, 3)}.${d.slice(3, 6)}.${d.slice(6)}`;
  return `${d.slice(0, 3)}.${d.slice(3, 6)}.${d.slice(6, 9)}-${d.slice(9)}`;
}

/** Aplica mask `XX.XXX.XXX/XXXX-XX`. */
export function maskCnpj(s: string): string {
  const d = onlyDigits(s).slice(0, 14);
  if (d.length <= 2) return d;
  if (d.length <= 5) return `${d.slice(0, 2)}.${d.slice(2)}`;
  if (d.length <= 8) return `${d.slice(0, 2)}.${d.slice(2, 5)}.${d.slice(5)}`;
  if (d.length <= 12) return `${d.slice(0, 2)}.${d.slice(2, 5)}.${d.slice(5, 8)}/${d.slice(8)}`;
  return `${d.slice(0, 2)}.${d.slice(2, 5)}.${d.slice(5, 8)}/${d.slice(8, 12)}-${d.slice(12)}`;
}

/** Mask hint pra exibir CPF/CNPJ com 4 últimos dígitos visíveis. */
export function hintDocument(digits: string, type: 'cpf' | 'cnpj'): string {
  const d = onlyDigits(digits);
  if (type === 'cpf') {
    if (d.length !== 11) return '***';
    return `***.***.***-${d.slice(9)}`;
  }
  if (d.length !== 14) return '***';
  return `**.***.***/****-${d.slice(12)}`;
}

/** CPF módulo 11. Aceita só dígitos puros (já filtrados). */
export function isValidCpf(cpf: string): boolean {
  const d = onlyDigits(cpf);
  if (d.length !== 11 || /^(\d)\1+$/.test(d)) return false;
  let sum = 0;
  for (let i = 0; i < 9; i++) sum += parseInt(d[i] ?? '0', 10) * (10 - i);
  let check = 11 - (sum % 11);
  if (check >= 10) check = 0;
  if (check !== parseInt(d[9] ?? '0', 10)) return false;
  sum = 0;
  for (let i = 0; i < 10; i++) sum += parseInt(d[i] ?? '0', 10) * (11 - i);
  check = 11 - (sum % 11);
  if (check >= 10) check = 0;
  return check === parseInt(d[10] ?? '0', 10);
}

/** CNPJ módulo 11 (algoritmo Receita Federal). */
export function isValidCnpj(cnpj: string): boolean {
  const d = onlyDigits(cnpj);
  if (d.length !== 14 || /^(\d)\1+$/.test(d)) return false;
  const calc = (slice: number, weights: number[]): number => {
    let sum = 0;
    for (let i = 0; i < weights.length; i++) {
      sum += parseInt(d[i] ?? '0', 10) * (weights[i] ?? 0);
    }
    const mod = sum % 11;
    return mod < 2 ? 0 : 11 - mod;
  };
  const w1 = [5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2];
  const w2 = [6, 5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2];
  return calc(12, w1) === parseInt(d[12] ?? '0', 10) && calc(13, w2) === parseInt(d[13] ?? '0', 10);
}
