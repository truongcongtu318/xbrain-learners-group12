import { describe, expect, it } from 'vitest';
import { app } from '../app';

async function json<T>(response: Response): Promise<T> {
  expect(response.ok).toBe(true);
  return response.json() as Promise<T>;
}

describe('StudyBot API', () => {
  it('returns health in mock mode', async () => {
    const response = await app.request('/api/health');
    const body = await json<{ ok: boolean; mode: string }>(response);
    expect(body).toEqual(expect.objectContaining({ ok: true, mode: 'mock' }));
  });

  it('creates an upload session and marks mock upload ready', async () => {
    const sessionResponse = await app.request('/api/uploads', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ filename: 'lecture.pdf', contentType: 'application/pdf' })
    });
    const session = await json<{ document: { id: string; status: string }; uploadUrl: string }>(sessionResponse);
    expect(session.document).toEqual(expect.objectContaining({ id: 'doc-upload-1', status: 'UPLOADING' }));
    expect(session.uploadUrl).toBe('/api/uploads/doc-upload-1/content');

    const uploadResponse = await app.request(session.uploadUrl, { method: 'PUT', body: 'fake pdf bytes' });
    const document = await json<{ id: string; status: string; pageCount: number }>(uploadResponse);
    expect(document).toEqual(expect.objectContaining({ id: 'doc-upload-1', status: 'READY' }));
    expect(document.pageCount).toBeGreaterThan(0);
  });

  it('generates required study artifacts', async () => {
    const documentsResponse = await app.request('/api/documents');
    const documents = await json<Array<{ id: string }>>(documentsResponse);
    const documentId = documents.find((document) => document.id === 'doc-machine-learning-101')?.id ?? documents[0].id;

    const guide = await json<{ concepts: unknown[] }>(await app.request(`/api/documents/${documentId}/study-guide`, { method: 'POST' }));
    expect(guide.concepts).toHaveLength(5);

    const flashcards = await json<{ cards: unknown[] }>(await app.request(`/api/documents/${documentId}/flashcards`, { method: 'POST' }));
    expect(flashcards.cards.length).toBeGreaterThanOrEqual(5);

    const quiz = await json<{ questions: unknown[] }>(await app.request(`/api/documents/${documentId}/quiz`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ difficulty: 'hard' })
    }));
    expect(quiz.questions).toHaveLength(10);
  });

  it('returns citations for selected study sources', async () => {
    const documents = await json<Array<{ id: string }>>(await app.request('/api/documents'));
    const documentId = documents.find((document) => document.id === 'doc-machine-learning-101')?.id ?? documents[0].id;
    const qa = await json<{ citations: unknown[] }>(await app.request('/api/study', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ documentIds: [documentId], question: 'What is gradient descent?' })
    }));
    expect(qa.citations.length).toBeGreaterThan(0);
  });});
