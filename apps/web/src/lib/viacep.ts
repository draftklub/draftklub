/**
 * ViaCEP — API pública gratuita pra autofill de endereço a partir do
 * CEP. Sem auth, sem rate-limit explícito (mas evite spam).
 *
 * Doc: https://viacep.com.br/
 */

export interface ViaCepResponse {
  cep: string;
  logradouro: string;
  complemento: string;
  bairro: string;
  /** Cidade (campo vem nomeado "localidade" na API). */
  localidade: string;
  uf: string;
  /** Setado quando o CEP não existe — `{ erro: true }`. */
  erro?: boolean;
}

/**
 * Busca dados de endereço por CEP. Retorna null se inválido (8 dígitos
 * obrigatórios) ou não encontrado.
 *
 * Aceita CEP com ou sem hífen — extrai só dígitos antes da requisição.
 */
export async function lookupCep(cep: string): Promise<ViaCepResponse | null> {
  const digits = cep.replace(/\D/g, '');
  if (digits.length !== 8) return null;

  try {
    const res = await fetch(`https://viacep.com.br/ws/${digits}/json/`);
    if (!res.ok) return null;
    const data = (await res.json()) as ViaCepResponse;
    if (data.erro) return null;
    return data;
  } catch {
    return null;
  }
}

/** Formata 8 dígitos como `00000-000`. */
export function formatCep(cep: string): string {
  const digits = cep.replace(/\D/g, '').slice(0, 8);
  if (digits.length <= 5) return digits;
  return `${digits.slice(0, 5)}-${digits.slice(5)}`;
}

/** Formata 11 dígitos de CPF como `000.000.000-00`. */
export function formatCpf(cpf: string): string {
  const d = cpf.replace(/\D/g, '').slice(0, 11);
  if (d.length <= 3) return d;
  if (d.length <= 6) return `${d.slice(0, 3)}.${d.slice(3)}`;
  if (d.length <= 9) return `${d.slice(0, 3)}.${d.slice(3, 6)}.${d.slice(6)}`;
  return `${d.slice(0, 3)}.${d.slice(3, 6)}.${d.slice(6, 9)}-${d.slice(9)}`;
}
