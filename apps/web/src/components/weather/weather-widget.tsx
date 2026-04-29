'use client';

import * as React from 'react';
import {
  Cloud,
  CloudDrizzle,
  CloudFog,
  CloudLightning,
  CloudRain,
  CloudSnow,
  Loader2,
  MapPin,
  Sun,
} from 'lucide-react';

interface WeatherData {
  tempC: number;
  feelsLikeC: number;
  weatherCode: number;
  precipChance: number;
  isDay: boolean;
}

const TZ = 'America/Sao_Paulo';

/**
 * Sprint Polish PR-H4 — widget de clima pra dashboard do Klub.
 * Usa OpenMeteo (free, sem auth) via fetch direto do browser.
 *
 * Cache leve via sessionStorage chave `weather:lat:lng` por 30 min;
 * cobre re-mount em SPA navegação.
 *
 * Retorna null silencioso se não há lat/lng (Klub sem geocoding).
 */
export function WeatherWidget({
  latitude,
  longitude,
}: {
  latitude: number | null;
  longitude: number | null;
}) {
  const [data, setData] = React.useState<WeatherData | null>(null);
  const [error, setError] = React.useState(false);
  const [loading, setLoading] = React.useState(false);

  React.useEffect(() => {
    if (latitude == null || longitude == null) return;

    const cacheKey = `weather:${latitude.toFixed(3)}:${longitude.toFixed(3)}`;
    const cached = readCache(cacheKey);
    if (cached) {
      setData(cached);
      return;
    }

    let cancelled = false;
    setLoading(true);
    setError(false);
    fetchWeather(latitude, longitude)
      .then((d) => {
        if (cancelled) return;
        setData(d);
        writeCache(cacheKey, d);
      })
      .catch(() => {
        if (!cancelled) setError(true);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [latitude, longitude]);

  if (latitude == null || longitude == null) return null;

  if (loading && !data) {
    return (
      <div className="inline-flex items-center gap-2 rounded-lg border border-border bg-card px-3 py-2 text-xs text-muted-foreground">
        <Loader2 className="size-3.5 animate-spin" />
        Clima…
      </div>
    );
  }

  if (error || !data) return null;

  const Icon = pickIcon(data.weatherCode, data.isDay);
  const description = describeCode(data.weatherCode);

  return (
    <div className="inline-flex items-center gap-2.5 rounded-lg border border-border bg-card px-3 py-2 text-xs">
      <Icon className="size-4 text-brand-primary-600" />
      <span>
        <span className="font-semibold">{Math.round(data.tempC)}°C</span>
        <span className="text-muted-foreground"> · {description}</span>
        {data.precipChance > 10 ? (
          <span className="ml-1 text-muted-foreground">· {data.precipChance}% chuva</span>
        ) : null}
      </span>
    </div>
  );
}

interface OpenMeteoResponse {
  current?: {
    temperature_2m?: number;
    apparent_temperature?: number;
    weather_code?: number;
    is_day?: number;
  };
  daily?: {
    precipitation_probability_max?: number[];
  };
}

async function fetchWeather(lat: number, lng: number): Promise<WeatherData> {
  const params = new URLSearchParams({
    latitude: lat.toString(),
    longitude: lng.toString(),
    current: 'temperature_2m,apparent_temperature,weather_code,is_day',
    daily: 'precipitation_probability_max',
    timezone: TZ,
    forecast_days: '1',
  });
  const url = `https://api.open-meteo.com/v1/forecast?${params.toString()}`;
  const res = await fetch(url);
  if (!res.ok) throw new Error(`OpenMeteo HTTP ${res.status}`);
  const d = (await res.json()) as OpenMeteoResponse;
  return {
    tempC: d.current?.temperature_2m ?? 0,
    feelsLikeC: d.current?.apparent_temperature ?? 0,
    weatherCode: d.current?.weather_code ?? 0,
    precipChance: d.daily?.precipitation_probability_max?.[0] ?? 0,
    isDay: (d.current?.is_day ?? 1) === 1,
  };
}

const CACHE_TTL_MS = 30 * 60 * 1000; // 30min

function readCache(key: string): WeatherData | null {
  try {
    const raw = sessionStorage.getItem(key);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as { ts: number; data: WeatherData };
    if (Date.now() - parsed.ts > CACHE_TTL_MS) return null;
    return parsed.data;
  } catch {
    return null;
  }
}

function writeCache(key: string, data: WeatherData) {
  try {
    sessionStorage.setItem(key, JSON.stringify({ ts: Date.now(), data }));
  } catch {
    // sessionStorage indisponível — silently ignore.
  }
}

/**
 * WMO weather codes (https://open-meteo.com/en/docs).
 * Picks Lucide icon. Cobre os mais comuns.
 */
function pickIcon(code: number, isDay: boolean): typeof Sun {
  if (code === 0) return isDay ? Sun : Cloud;
  if (code >= 1 && code <= 3) return Cloud;
  if (code >= 45 && code <= 48) return CloudFog;
  if (code >= 51 && code <= 57) return CloudDrizzle;
  if (code >= 61 && code <= 67) return CloudRain;
  if (code >= 71 && code <= 77) return CloudSnow;
  if (code >= 80 && code <= 82) return CloudRain;
  if (code >= 85 && code <= 86) return CloudSnow;
  if (code >= 95 && code <= 99) return CloudLightning;
  return Cloud;
}

function describeCode(code: number): string {
  if (code === 0) return 'Céu limpo';
  if (code === 1) return 'Quase limpo';
  if (code === 2) return 'Parcialmente nublado';
  if (code === 3) return 'Encoberto';
  if (code === 45 || code === 48) return 'Nevoeiro';
  if (code >= 51 && code <= 57) return 'Garoa';
  if (code >= 61 && code <= 67) return 'Chuva';
  if (code >= 71 && code <= 77) return 'Neve';
  if (code >= 80 && code <= 82) return 'Aguaceiros';
  if (code >= 85 && code <= 86) return 'Pancadas de neve';
  if (code >= 95 && code <= 99) return 'Trovoada';
  return 'Indefinido';
}

void MapPin;
