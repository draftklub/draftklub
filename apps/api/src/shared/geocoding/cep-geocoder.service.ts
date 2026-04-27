import { Injectable, Logger } from '@nestjs/common';

/**
 * Coordenadas geográficas resolvidas a partir do CEP.
 */
export interface GeoCoords {
  latitude: number;
  longitude: number;
}

/**
 * Serviço de geocoding por CEP usando BrasilAPI v2 (público, free,
 * sem auth). Endpoint:
 *
 *   GET https://brasilapi.com.br/api/cep/v2/{cep}
 *
 * Retorna shape com `location.coordinates.{latitude,longitude}`.
 *
 * Comportamento:
 * - CEP inválido (não 8 dígitos) → null
 * - CEP não encontrado / API offline / sem coords → null
 * - Sucesso → { latitude, longitude }
 *
 * Nunca lança — falha silenciosamente. Caller decide o que fazer
 * (geralmente: persistir lat/lng só se geocode tiver sucesso, senão
 * deixar null e cair em fallback de tier-sort).
 */
@Injectable()
export class CepGeocoderService {
  private readonly logger = new Logger(CepGeocoderService.name);

  async geocode(cep: string): Promise<GeoCoords | null> {
    const digits = cep.replace(/\D/g, '');
    if (digits.length !== 8) return null;

    try {
      const res = await fetch(`https://brasilapi.com.br/api/cep/v2/${digits}`, {
        // 5s é tempo razoável; geocoding não pode bloquear UX longo.
        signal: AbortSignal.timeout(5000),
      });
      if (!res.ok) {
        this.logger.warn(`BrasilAPI CEP ${digits}: HTTP ${res.status}`);
        return null;
      }
      const data = (await res.json()) as {
        location?: {
          coordinates?: {
            latitude?: string | number;
            longitude?: string | number;
          };
        };
      };
      const c = data.location?.coordinates;
      if (!c?.latitude || !c?.longitude) return null;

      const lat = typeof c.latitude === 'string' ? parseFloat(c.latitude) : c.latitude;
      const lng = typeof c.longitude === 'string' ? parseFloat(c.longitude) : c.longitude;
      if (!Number.isFinite(lat) || !Number.isFinite(lng)) return null;
      return { latitude: lat, longitude: lng };
    } catch (err) {
      this.logger.warn(`BrasilAPI CEP ${digits} falhou: ${(err as Error).message}`);
      return null;
    }
  }
}
