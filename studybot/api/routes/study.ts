import { Hono } from 'hono';
import { z } from 'zod';
import { zValidator } from '@hono/zod-validator';
import { StudyService } from '../services/study';
import type { Providers } from '../types';

const questionSchema = z.object({ documentIds: z.array(z.string().min(1)).min(1), question: z.string().min(1) });
const quizSchema = z.object({ difficulty: z.enum(['easy', 'medium', 'hard']).default('medium') });

export function studyRoutes(providers: Providers) {
  const app = new Hono();
  const service = new StudyService(providers);

  app.post('/study', zValidator('json', questionSchema), async (c) => {
    const body = c.req.valid('json');
    return c.json(await service.askQuestion(c.req.raw.headers, body.documentIds, body.question));
  });

  app.post('/documents/:docId/study-guide', async (c) => c.json(await service.generateStudyGuide(c.req.raw.headers, c.req.param('docId'))));
  app.post('/documents/:docId/flashcards', async (c) => c.json(await service.generateFlashcards(c.req.raw.headers, c.req.param('docId'))));
  app.post('/documents/:docId/quiz', zValidator('json', quizSchema), async (c) => c.json(await service.generateQuiz(c.req.raw.headers, c.req.param('docId'), c.req.valid('json').difficulty)));

  return app;
}
