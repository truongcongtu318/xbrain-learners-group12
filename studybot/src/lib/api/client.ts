import type { Difficulty, EvidenceReadiness, FlashcardDeck, QuestionAnswer, Quiz, StudyDocument, StudyGuide, UploadSession, User, WeeklyProgress } from '../../types/domain';
import { ClientApiError } from './errors';

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const response = await fetch(`/api${path}`, {
    ...init,
    headers: {
      ...(init?.body instanceof FormData ? {} : { 'content-type': 'application/json' }),
      ...(init?.headers || {})
    }
  });

  const body = await response.json().catch(() => null);
  if (!response.ok) {
    throw new ClientApiError(body?.code || 'REQUEST_FAILED', body?.message || 'Request failed.', response.status);
  }
  return body as T;
}

export const apiClient = {
  me: () => request<User>('/me'),
  documents: () => request<StudyDocument[]>('/documents'),
  document: (documentId: string) => request<StudyDocument>(`/documents/${documentId}`),
  createUpload: (filename: string, contentType: string) => request<UploadSession>('/uploads', { method: 'POST', body: JSON.stringify({ filename, contentType }) }),
  completeMockUpload: (uploadUrl: string, file: File) => fetch(uploadUrl, { method: 'PUT', body: file }),
  ask: (documentId: string, question: string) => request<QuestionAnswer>(`/documents/${documentId}/questions`, { method: 'POST', body: JSON.stringify({ question }) }),
  studyGuide: (documentId: string) => request<StudyGuide>(`/documents/${documentId}/study-guide`, { method: 'POST' }),
  flashcards: (documentId: string) => request<FlashcardDeck>(`/documents/${documentId}/flashcards`, { method: 'POST' }),
  quiz: (documentId: string, difficulty: Difficulty) => request<Quiz>(`/documents/${documentId}/quiz`, { method: 'POST', body: JSON.stringify({ difficulty }) }),
  weeklyProgress: () => request<WeeklyProgress>('/progress/week'),
  evidence: () => request<EvidenceReadiness>('/evidence/readiness')
};
