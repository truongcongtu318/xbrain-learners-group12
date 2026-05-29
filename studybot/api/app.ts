import { Hono } from 'hono';
import { cors } from 'hono/cors';
import { loadConfig } from './config';
import { toErrorResponse } from './errors';
import { createProviders } from './providers';
import { documentRoutes } from './routes/documents';
import { evidenceRoutes } from './routes/evidence';
import { healthRoutes } from './routes/health';
import { meRoutes } from './routes/me';
import { studyRoutes } from './routes/study';
import { uploadRoutes } from './routes/uploads';

export function createApp() {
  const config = loadConfig();
  const providers = createProviders(config);
  const app = new Hono().basePath('/api');

  app.use('*', cors());
  app.route('/', healthRoutes(config));
  app.route('/', meRoutes(providers));
  app.route('/', uploadRoutes(providers));
  app.route('/', documentRoutes(providers));
  app.route('/', studyRoutes(providers));
  app.route('/', evidenceRoutes(providers));

  app.onError((error, c) => {
    const response = toErrorResponse(error);
    return c.json(response.body, response.status as 400 | 404 | 500 | 503);
  });

  return app;
}

export const app = createApp();
