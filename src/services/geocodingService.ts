import { env } from '../config/env.js';

export interface GeocodingResult {
  displayName: string;
  latitude: number;
  longitude: number;
}

interface NominatimResult {
  display_name: string;
  lat: string;
  lon: string;
}

const cache = new Map<string, { expiresAt: number; results: GeocodingResult[] }>();
const cacheDurationMs = 10 * 60 * 1000;
const minimumRequestIntervalMs = 1000;
let lastRequestAt = 0;
let requestQueue: Promise<void> = Promise.resolve();

async function waitForPublicServiceLimit(): Promise<void> {
  const previous = requestQueue;
  let release!: () => void;
  requestQueue = new Promise<void>((resolve) => { release = resolve; });
  await previous;
  try {
    const waitMs = Math.max(0, lastRequestAt + minimumRequestIntervalMs - Date.now());
    if (waitMs > 0) await new Promise((resolve) => setTimeout(resolve, waitMs));
    lastRequestAt = Date.now();
  } finally {
    release();
  }
}

export const geocodingService = {
  async search(address: string): Promise<GeocodingResult[]> {
    const normalizedAddress = address.trim().replace(/\s+/g, ' ');
    const cacheKey = normalizedAddress.toLocaleLowerCase('pt-BR');
    const cached = cache.get(cacheKey);
    if (cached && cached.expiresAt > Date.now()) return cached.results;

    await waitForPublicServiceLimit();
    const url = new URL(env.geocoderUrl);
    url.search = new URLSearchParams({
      q: normalizedAddress,
      format: 'jsonv2',
      limit: '5',
      addressdetails: '1',
      countrycodes: 'br',
      'accept-language': 'pt-BR'
    }).toString();

    let response: Response;
    try {
      response = await fetch(url, {
        headers: { 'User-Agent': env.geocoderUserAgent, Accept: 'application/json' },
        signal: AbortSignal.timeout(8000)
      });
    } catch {
      throw new Error('O serviço de busca de endereços está indisponível no momento.');
    }

    if (!response.ok) throw new Error(`O serviço de busca de endereços respondeu com HTTP ${response.status}.`);
    const payload = await response.json() as NominatimResult[];
    const results = payload.map((item) => ({
      displayName: item.display_name,
      latitude: Number(item.lat),
      longitude: Number(item.lon)
    })).filter((item) => item.displayName && Number.isFinite(item.latitude) && Number.isFinite(item.longitude));

    cache.set(cacheKey, { expiresAt: Date.now() + cacheDurationMs, results });
    return results;
  }
};
