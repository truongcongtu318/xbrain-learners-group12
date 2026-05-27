import { Hono } from 'hono';
import type { ApiConfig } from '../config';

export function healthRoutes(config: ApiConfig) {
  const app = new Hono();
  app.get('/health', (c) => c.json({ ok: true, mode: config.mode, region: config.awsRegion }));
  return app;
}
