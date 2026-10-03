import dotenv from 'dotenv';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

export const projectRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');

// Resolve .env from the project root, independent of the shell's current directory.
dotenv.config({ path: path.join(projectRoot, '.env'), override: true });

export const env = {
  port: Number(process.env.PORT ?? 3000),
  mockUserName: process.env.MOCK_USER_NAME ?? 'Usuário de teste',
  mockUserEmail: process.env.MOCK_USER_EMAIL ?? 'teste@example.com',
  databasePath: process.env.DATABASE_PATH ?? './data/accessibility.sqlite',
  geocoderUrl: process.env.GEOCODER_URL ?? 'https://nominatim.openstreetmap.org/search',
  geocoderUserAgent: process.env.GEOCODER_USER_AGENT ?? 'MapaAcessivelTCC/1.0'
};

if (!Number.isInteger(env.port) || env.port < 1 || env.port > 65535) {
  throw new Error('PORT deve ser um número inteiro entre 1 e 65535.');
}

