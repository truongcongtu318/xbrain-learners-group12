import { Hono } from 'hono';
import type { Providers } from '../types';

export function meRoutes(providers: Providers) {
  const app = new Hono();
  app.get('/me', async (c) => c.json(await providers.auth.resolveUser(c.req.raw.headers)));
  return app;
}
