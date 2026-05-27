import { Hono } from 'hono';
import { z } from 'zod';
import { zValidator } from '@hono/zod-validator';
import { DocumentService } from '../services/documents';
import type { Providers } from '../types';

const uploadSchema = z.object({
  filename: z.string().min(1),
  contentType: z.string().min(1)
});

export function uploadRoutes(providers: Providers) {
  const app = new Hono();
  const service = new DocumentService(providers);

  app.post('/uploads', zValidator('json', uploadSchema), async (c) => {
    const body = c.req.valid('json');
    return c.json(await service.createUploadSession(c.req.raw.headers, body.filename, body.contentType));
  });

  app.put('/uploads/:docId/content', async (c) => {
    return c.json(await service.acceptMockUpload(c.req.raw.headers, c.req.param('docId')));
  });

  return app;
}
