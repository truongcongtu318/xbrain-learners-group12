import { Hono } from 'hono';
import type { Providers } from '../types';

export function evidenceRoutes(providers: Providers) {
  const app = new Hono();
  app.get('/evidence/readiness', async (c) => c.json(await providers.evidence.getReadiness()));
  return app;
}
