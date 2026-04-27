/**
 * Slug determinístico de Klub: `nome-bairro-cidade`. Cliente NÃO envia
 * slug — backend é fonte da verdade pra evitar drift. Mesmo algoritmo
 * usado pelo `CreateKlubHandler` e pelo `CheckSlugHandler`.
 */

export function slugify(text: string): string {
  return text
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '');
}

export function generateKlubSlug(
  name: string,
  neighborhood: string | null,
  city: string | null,
): string {
  const parts = [name, neighborhood, city]
    .filter((p): p is string => typeof p === 'string' && p.trim() !== '')
    .map(slugify)
    .filter((p) => p !== '');
  return parts.join('-');
}
