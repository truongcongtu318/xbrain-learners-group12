import { Hono } from 'hono';
import { StudyService } from '../services/study';
import type { Providers } from '../types';

export function progressRoutes(providers: Providers) {
  const app = new Hono();
  const service = new StudyService(providers);
  app.get('/progress/week', async (c) => c.json(await service.getWeeklyProgress(c.req.raw.headers)));
  return app;
}
