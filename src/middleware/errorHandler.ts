import type { Request, Response, NextFunction } from 'express';

export class HttpError extends Error {
  constructor(public statusCode: number, message: string, public details?: unknown) {
    super(message);
    this.name = 'HttpError';
  }
}

export function errorHandler(error: unknown, _req: Request, res: Response, _next: NextFunction): void {
  if (error instanceof HttpError) {
    res.status(error.statusCode).json({ error: error.message, ...(error.details ? { details: error.details } : {}) });
    return;
  }
  console.error(error);
  res.status(500).json({ error: 'Erro interno do servidor.' });
}



