import type { Request, Response, NextFunction } from 'express';
import { accessibilityCatalog, accessibilityTypes } from '../config/accessibilityCatalog.js';
import { placeModel } from '../models/placeModel.js';
import type { AccessibilityFeatureInput, CreatePlaceInput, PlaceFilters } from '../types/place.js';
import { HttpError } from '../middleware/errorHandler.js';
import { mockUser } from '../config/mockUser.js';

const statuses = new Set(['available', 'unavailable', 'unknown']);

function validatePlace(body: unknown): CreatePlaceInput {
  if (!body || typeof body !== 'object' || Array.isArray(body)) throw new HttpError(400, 'O corpo da requisição deve ser um objeto JSON.');
  const data = body as Record<string, unknown>;
  const errors: string[] = [];
  for (const field of ['name', 'category', 'address'] as const) {
    if (typeof data[field] !== 'string' || !data[field].trim()) errors.push(`"${field}" é obrigatório e deve ser texto.`);
  }
  if (typeof data.latitude !== 'number' || data.latitude < -90 || data.latitude > 90) errors.push('"latitude" deve ser um número entre -90 e 90.');
  if (typeof data.longitude !== 'number' || data.longitude < -180 || data.longitude > 180) errors.push('"longitude" deve ser um número entre -180 e 180.');
  const features = data.accessibilityFeatures ?? [];
  if (!Array.isArray(features)) errors.push('"accessibilityFeatures" deve ser uma lista.');
  const safeFeatures: AccessibilityFeatureInput[] = Array.isArray(features) ? features.map((value, index) => {
    const feature = (value && typeof value === 'object' ? value : {}) as Record<string, unknown>;
    if (typeof feature.type !== 'string' || !accessibilityTypes.has(feature.type)) errors.push(`Recurso ${index}: tipo inválido. Consulte GET /api/accessibility-features.`);
    if (typeof feature.status !== 'string' || !statuses.has(feature.status)) errors.push(`Recurso ${index}: status deve ser available, unavailable ou unknown.`);
    if (feature.notes !== undefined && feature.notes !== null && typeof feature.notes !== 'string') errors.push(`Recurso ${index}: notes deve ser texto ou null.`);
    return { type: String(feature.type ?? ''), status: (feature.status ?? 'unknown') as AccessibilityFeatureInput['status'], notes: feature.notes as string | null | undefined };
  }) : [];
  if (new Set(safeFeatures.map((feature) => feature.type)).size !== safeFeatures.length) errors.push('Não repita o mesmo tipo de recurso no lugar.');
  if (data.description !== undefined && data.description !== null && typeof data.description !== 'string') errors.push('"description" deve ser texto ou null.');
  if (errors.length) throw new HttpError(400, 'Dados inválidos.', errors);
  return {
    name: (data.name as string).trim(), category: (data.category as string).trim(),
    description: data.description as string | null | undefined, address: (data.address as string).trim(),
    latitude: data.latitude as number, longitude: data.longitude as number, accessibilityFeatures: safeFeatures
  };
}

function parseId(raw: string): number {
  const id = Number(raw);
  if (!Number.isInteger(id) || id < 1) throw new HttpError(400, 'O id deve ser um inteiro positivo.');
  return id;
}

export const placeController = {
  list(req: Request, res: Response, next: NextFunction): void {
    try {
      const { q, category, feature, status } = req.query;
      if (status !== undefined && !statuses.has(String(status))) throw new HttpError(400, 'status deve ser available, unavailable ou unknown.');
      if (feature !== undefined && !accessibilityTypes.has(String(feature))) throw new HttpError(400, 'Tipo de recurso inválido. Consulte GET /api/accessibility-features.');
      const filters: PlaceFilters = {
        ...(typeof q === 'string' ? { q: q.trim() } : {}),
        ...(typeof category === 'string' ? { category: category.trim() } : {}),
        ...(typeof feature === 'string' ? { feature } : {}),
        ...(typeof status === 'string' ? { status: status as PlaceFilters['status'] } : {})
      };
      res.json({ data: placeModel.list(filters) });
    } catch (error) { next(error); }
  },

  getById(req: Request, res: Response, next: NextFunction): void {
    try {
      const place = placeModel.findById(parseId(String(req.params.id)));
      if (!place) throw new HttpError(404, 'Lugar não encontrado.');
      res.json({ data: place });
    } catch (error) { next(error); }
  },

  create(req: Request, res: Response, next: NextFunction): void {
    try {
      const place = placeModel.create(validatePlace(req.body), mockUser);
      res.status(201).json({ data: place });
    } catch (error) { next(error); }
  },

  update(req: Request, res: Response, next: NextFunction): void {
    try {
      const place = placeModel.update(parseId(String(req.params.id)), validatePlace(req.body));
      if (!place) throw new HttpError(404, 'Lugar não encontrado.');
      res.json({ data: place });
    } catch (error) { next(error); }
  },

  remove(req: Request, res: Response, next: NextFunction): void {
    try {
      if (!placeModel.delete(parseId(String(req.params.id)))) throw new HttpError(404, 'Lugar não encontrado.');
      res.status(204).send();
    } catch (error) { next(error); }
  },

  getAccessibilityCatalog(_req: Request, res: Response): void {
    res.json({ data: accessibilityCatalog });
  }
};




