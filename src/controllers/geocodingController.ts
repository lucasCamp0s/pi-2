import type { Request, Response, NextFunction } from 'express';
import { HttpError } from '../middleware/errorHandler.js';
import { geocodingService } from '../services/geocodingService.js';

export const geocodingController = {
  async search(req: Request, res: Response, next: NextFunction): Promise<void> {
    const query = req.query.q;
    if (typeof query !== 'string' || query.trim().length < 3) {
      next(new HttpError(400, 'Informe um endereço com pelo menos 3 caracteres no parâmetro "q".'));
      return;
    }
    if (query.trim().length > 200) {
      next(new HttpError(400, 'A busca deve ter no máximo 200 caracteres.'));
      return;
    }

    try {
      const results = await geocodingService.search(query);
      res.json({ data: results, attribution: 'Geocodificação por OpenStreetMap contributors (Nominatim).' });
    } catch (error) {
      next(new HttpError(502, error instanceof Error ? error.message : 'Falha ao buscar endereço.'));
    }
  }
};
