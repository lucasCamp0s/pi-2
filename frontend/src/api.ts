const apiBaseUrl = import.meta.env.VITE_API_BASE_URL ?? 'http://localhost:8080';

export type FeatureStatus = 'available' | 'unavailable' | 'unknown';

export interface AccessibilityFeatureType {
  type: string;
  label: string;
  description: string;
}

export interface AccessibilityFeature {
  type: string;
  status: FeatureStatus;
  notes: string | null;
}

export interface Place {
  id: number;
  name: string;
  category: string;
  description: string | null;
  address: string;
  latitude: number;
  longitude: number;
  contributorName: string;
  contributorEmail: string;
  createdAt: string;
  updatedAt: string;
  accessibilityFeatures: AccessibilityFeature[];
}

export interface GeocodingResult {
  displayName: string;
  latitude: number;
  longitude: number;
}

interface ApiResponse<T> {
  data: T;
}

async function request<T>(url: string, init?: RequestInit): Promise<T> {
  let response: Response;
  try {
    response = await fetch(`${apiBaseUrl}${url}`, init);
  } catch {
    throw new Error('Não foi possível conectar à API. Confira se o backend está rodando.');
  }
  const payload = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new Error(typeof payload.error === 'string' ? payload.error : 'A solicitação não pôde ser concluída.');
  }
  return payload as T;
}

export const api = {
  async getPlaces(filters: { q?: string; feature?: string } = {}): Promise<Place[]> {
    const query = new URLSearchParams();
    if (filters.q) query.set('q', filters.q);
    if (filters.feature) {
      query.set('feature', filters.feature);
      query.set('status', 'available');
    }
    const suffix = query.size ? `?${query.toString()}` : '';
    return (await request<ApiResponse<Place[]>>(`/api/places${suffix}`)).data;
  },
  async getFeatureCatalog(): Promise<AccessibilityFeatureType[]> {
    return (await request<ApiResponse<AccessibilityFeatureType[]>>('/api/accessibility-features')).data;
  },
  async geocode(query: string): Promise<GeocodingResult[]> {
    const params = new URLSearchParams({ q: query });
    return (await request<ApiResponse<GeocodingResult[]>>(`/api/geocoding/search?${params.toString()}`)).data;
  },
  async createPlace(payload: {
    name: string;
    category: string;
    description: string;
    address: string;
    latitude: number;
    longitude: number;
    accessibilityFeatures: AccessibilityFeature[];
  }): Promise<Place> {
    return (await request<ApiResponse<Place>>('/api/places', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    })).data;
  }
};
