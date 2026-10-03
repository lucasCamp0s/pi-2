import assert from 'node:assert/strict';
import { after, before, test } from 'node:test';
import type { AddressInfo } from 'node:net';
import type { Server } from 'node:http';
import app from '../src/app.js';

let server: Server;
let baseUrl: string;

before(async () => {
  server = app.listen(0);
  await new Promise<void>((resolve) => server.once('listening', resolve));
  const address = server.address() as AddressInfo;
  baseUrl = `http://127.0.0.1:${address.port}`;
});

after(async () => {
  await new Promise<void>((resolve, reject) => {
    server.close((error) => error ? reject(error) : resolve());
  });
});

test('GET /health informa que a API está disponível', async () => {
  const response = await fetch(`${baseUrl}/health`);
  assert.equal(response.status, 200);
  assert.deepEqual(await response.json(), { status: 'ok' });
});

test('GET /api/accessibility-features retorna o catálogo', async () => {
  const response = await fetch(`${baseUrl}/api/accessibility-features`);
  const body = await response.json() as { data: Array<{ type: string; label: string }> };
  assert.equal(response.status, 200);
  assert.ok(body.data.some((feature) => feature.type === 'ramp' && feature.label === 'Rampa de acesso'));
});

test('POST /api/places rejeita campos obrigatórios ausentes', async () => {
  const response = await fetch(`${baseUrl}/api/places`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ name: 'Lugar sem dados completos' })
  });
  const body = await response.json() as { error: string };
  assert.equal(response.status, 400);
  assert.equal(body.error, 'Dados inválidos.');
});
