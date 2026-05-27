import { serve } from '@hono/node-server';
import { app } from './app';

serve({ fetch: app.fetch, port: 8787, hostname: '127.0.0.1' }, (info) => {
  console.log(`StudyBot API listening on http://${info.address}:${info.port}`);
});
