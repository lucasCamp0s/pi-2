import type { FeatureStatus } from '../config/accessibilityCatalog.js';

export interface AccessibilityFeatureInput {
  type: string;
  status: FeatureStatus;
  notes?: string | null;
}

export interface CreatePlaceInput {
  name: string;
  category: string;
  description?: string | null;
  address: string;
  latitude: number;
  longitude: number;
  accessibilityFeatures?: AccessibilityFeatureInput[];
}

export interface PlaceFilters {
  q?: string;
  category?: string;
  feature?: string;
  status?: FeatureStatus;
}

export interface MockUser {
  nome: string;
  email: string;
}



