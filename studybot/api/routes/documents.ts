import { Hono } from 'hono';
import { DocumentService } from '../services/documents';
import type { Providers } from '../types';

export function documentRoutes(providers: Providers) {
  const app = new Hono();
  const service = new DocumentService(providers);

  app.get('/documents', async (c) => c.json(await service.listDocuments(c.req.raw.headers)));
  app.get('/documents/:docId', async (c) => c.json(await service.getDocument(c.req.raw.headers, c.req.param('docId'))));

  return app;
}
