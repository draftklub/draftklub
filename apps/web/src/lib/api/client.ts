import { getIdToken } from '@/lib/auth';

const BASE_URL = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3000';

/**
 * Erro tipado emitido por `apiFetch` quando a resposta não é 2xx.
 * Carrega `status` e o `body` parseado (quando disponível) pra
 * componentes mostrarem mensagens contextuais.
 */
export class ApiError extends Error {
  readonly status: number;
  readonly body: unknown;

  constructor(status: number, body: unknown, message?: string) {
    super(message ?? `API error ${status}`);
    this.name = 'ApiError';
    this.status = status;
    this.body = body;
  }
}

interface ApiFetchOptions extends Omit<RequestInit, 'body'> {
  /** Body como objeto — serializado pra JSON automaticamente. */
  json?: unknown;
  /**
   * Se `true`, não anexa Authorization mesmo que haja user logado.
   * Use em endpoints públicos (`/klub-requests`, `/sports`).
   */
  anonymous?: boolean;
}

/**
 * Fetch wrapper tipado. Anexa `Authorization: Bearer <ID token>`
 * automaticamente puxando do Firebase Auth (a menos que `anonymous: true`).
 *
 * Uso:
 *   const me = await apiFetch<MeResponse>('/me');
 *   const klub = await apiFetch<Klub>('/klubs', { method: 'POST', json: dto });
 */
export async function apiFetch<T>(path: string, options: ApiFetchOptions = {}): Promise<T> {
  const { json, anonymous, headers: callerHeaders, ...rest } = options;

  const headers = new Headers(callerHeaders);
  if (json !== undefined && !headers.has('Content-Type')) {
    headers.set('Content-Type', 'application/json');
  }
  if (!headers.has('Accept')) {
    headers.set('Accept', 'application/json');
  }

  if (!anonymous) {
    const token = await getIdToken();
    if (token) {
      headers.set('Authorization', `Bearer ${token}`);
    }
  }

  const url = path.startsWith('http') ? path : `${BASE_URL}${path}`;

  const res = await fetch(url, {
    ...rest,
    headers,
    credentials: 'include',
    body: json !== undefined ? JSON.stringify(json) : undefined,
  });

  if (res.status === 204) {
    return undefined as T;
  }

  const contentType = res.headers.get('Content-Type') ?? '';
  const isJson = contentType.includes('application/json');
  const body: unknown = isJson ? await res.json().catch(() => null) : await res.text();

  if (!res.ok) {
    throw new ApiError(res.status, body, extractMessage(body) ?? `${res.status} ${res.statusText}`);
  }

  return body as T;
}

function extractMessage(body: unknown): string | null {
  if (typeof body === 'string') return body;
  if (typeof body === 'object' && body !== null) {
    const obj = body as Record<string, unknown>;
    if (typeof obj.message === 'string') return obj.message;
  }
  return null;
}
