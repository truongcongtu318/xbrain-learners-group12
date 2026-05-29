import type { Citation, Difficulty, EvidenceReadiness, FlashcardDeck, QuestionAnswer, Quiz, QuizProgress, SavedFlashcardDeck, SavedQuiz, StudyDocument, StudyGuide, StudyRequest, UploadSession, User } from '../../types/domain';
import { ClientApiError } from './errors';

const apiBaseUrl = import.meta.env.VITE_API_BASE_URL || '/api';
const routes = {
  documents: '/documents',
  upload: '/upload',
  study: '/study'
};

type UnknownRecord = Record<string, unknown>;

type AwsCitation = {
  id?: string;
  label?: string;
  text?: string;
  snippet?: string;
  content?: string;
  score?: number;
  filename?: string;
  fileName?: string;
  documentId?: string;
  pageNumber?: number;
  page?: number;
  location?: string;
  sourceUri?: string;
  uri?: string;
};

function apiUrl(path: string) {
  return `${apiBaseUrl.replace(/\/$/, '')}${path}`;
}

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const response = await fetch(apiUrl(path), {
    ...init,
    headers: {
      ...(init?.body instanceof FormData ? {} : { 'content-type': 'application/json' }),
      ...(init?.headers || {})
    }
  });

  const body = await response.json().catch(() => null);
  if (!response.ok) {
    throw new ClientApiError(body?.code || body?.error || 'REQUEST_FAILED', body?.message || body?.error || 'Request failed.', response.status);
  }
  return body as T;
}

function asRecord(value: unknown): UnknownRecord {
  return value && typeof value === 'object' ? value as UnknownRecord : {};
}

function asString(value: unknown, fallback = ''): string {
  return typeof value === 'string' ? value : fallback;
}

function asStringArray(value: unknown): string[] {
  return Array.isArray(value) ? value.filter((item): item is string => typeof item === 'string') : [];
}

function normalizeCitation(value: unknown, index: number): Citation {
  const citation = asRecord(value) as AwsCitation;
  const filename = citation.filename || citation.fileName;
  const pageNumber = citation.pageNumber || citation.page;
  const location = citation.location || (pageNumber ? `Page ${pageNumber}` : undefined);
  const snippet = citation.snippet || citation.text || citation.content || '';

  return {
    id: citation.id || `citation-${index + 1}`,
    label: citation.label || [filename, location].filter(Boolean).join(' · ') || `Citation ${index + 1}`,
    snippet,
    score: citation.score ?? 0,
    filename,
    documentId: citation.documentId,
    pageNumber,
    location,
    sourceUri: citation.sourceUri || citation.uri
  };
}

function normalizeCitations(body: UnknownRecord): Citation[] {
  const citations = Array.isArray(body.citations) ? body.citations : Array.isArray(body.sources) ? body.sources : [];
  return citations.map(normalizeCitation).filter((citation) => citation.snippet || citation.filename || citation.label);
}

function normalizeQuestionAnswer(value: unknown, question: string): QuestionAnswer {
  const body = asRecord(value);

  return {
    id: asString(body.id, `qa-${Date.now()}`),
    question: asString(body.question, question),
    answer: asString(body.answer, asString(body.response, asString(body.output, ''))),
    citations: normalizeCitations(body),
    createdAt: asString(body.createdAt, new Date().toISOString())
  };
}

function normalizeStudyGuide(value: unknown, documentId: string): StudyGuide {
  const body = asRecord(value);
  const concepts = Array.isArray(body.concepts) ? body.concepts : [];
  const answer = asString(body.answer, asString(body.response, asString(body.output, '')));

  return {
    documentId,
    generatedAt: asString(body.generatedAt, new Date().toISOString()),
    concepts: concepts.length > 0
      ? concepts.map((concept, index) => {
        const item = asRecord(concept);
        return {
          id: asString(item.id, `concept-${index + 1}`),
          title: asString(item.title, `Key point ${index + 1}`),
          explanation: asString(item.explanation, asString(item.summary, '')),
          whyItMatters: asString(item.whyItMatters, asString(item.importance, 'Useful for exam review.'))
        };
      })
      : [{ id: 'summary-1', title: 'Summary', explanation: answer, whyItMatters: 'Use this as a compact study guide for the selected source.' }]
  };
}

function normalizeFlashcards(value: unknown, documentId: string): SavedFlashcardDeck {
  const body = asRecord(value);
  const cards = Array.isArray(body.cards) ? body.cards : Array.isArray(body.flashcards) ? body.flashcards : [];
  const answer = asString(body.answer, asString(body.response, asString(body.output, '')));
  const generatedAt = asString(body.generatedAt, asString(body.createdAt, new Date().toISOString()));

  return {
    id: asString(body.id, asString(body.artifactId, `flashcards-${documentId}-${generatedAt}`)),
    documentId: asString(body.documentId, documentId),
    generatedAt,
    createdAt: asString(body.createdAt, generatedAt),
    updatedAt: asString(body.updatedAt, generatedAt),
    cards: cards.length > 0
      ? cards.map((card, index) => {
        const item = asRecord(card);
        return {
          id: asString(item.id, `card-${index + 1}`),
          front: asString(item.front, asString(item.question, `Flashcard ${index + 1}`)),
          back: asString(item.back, asString(item.answer, '')),
          sourceLabel: asString(item.sourceLabel, asString(item.source, 'Selected source'))
        };
      })
      : parseFlashcardAnswer(answer)
  };
}

function parseFlashcardAnswer(answer: string) {
  const matches = [...answer.matchAll(/Flashcard\s+\d+\s*:\s*([^\n]+)\n([\s\S]*?)(?=\nFlashcard\s+\d+\s*:|$)/gi)];
  if (matches.length > 0) {
    return matches.map((match, index) => ({
      id: `card-${index + 1}`,
      front: match[1].trim(),
      back: match[2].trim(),
      sourceLabel: 'Selected source'
    }));
  }

  return answer.split('\n').filter(Boolean).slice(0, 8).map((line, index) => ({
    id: `card-${index + 1}`,
    front: `Review point ${index + 1}`,
    back: line.replace(/^[-*\d.\s]+/, ''),
    sourceLabel: 'Selected source'
  }));
}

function normalizeQuiz(value: unknown, documentId: string, difficulty: Difficulty): SavedQuiz {
  const body = asRecord(value);
  const questions = Array.isArray(body.questions) ? body.questions : [];
  const answer = asString(body.answer, asString(body.response, asString(body.output, '')));
  const generatedAt = asString(body.generatedAt, asString(body.createdAt, new Date().toISOString()));

  return {
    id: asString(body.id, asString(body.artifactId, `quiz-${documentId}-${generatedAt}`)),
    documentId: asString(body.documentId, documentId),
    difficulty: asString(body.difficulty, difficulty) as Difficulty,
    generatedAt,
    createdAt: asString(body.createdAt, generatedAt),
    updatedAt: asString(body.updatedAt, generatedAt),
    questions: questions.length > 0
      ? questions.map((question, index) => {
        const item = asRecord(question);
        const options = asStringArray(item.options);
        return {
          id: asString(item.id, `quiz-${index + 1}`),
          prompt: asString(item.prompt, asString(item.question, `Question ${index + 1}`)),
          options: options.length > 0 ? options : ['True', 'False'],
          correctIndex: typeof item.correctIndex === 'number' ? item.correctIndex : 0,
          explanation: asString(item.explanation, '')
        };
      })
      : parseQuizAnswer(answer)
  };
}

function parsedQuizQuestion(prompt: string, block: string, index: number) {
  const options = [...block.matchAll(/(?:^|\n)\s*([A-D])[).:-]\s*([^\n]+)/gi)].map((option) => option[2].trim());
  const answerMatch = block.match(/(?:correct\s*answer|answer)\s*[:\-]?\s*([A-D]|[^\n]+)/i);
  const correctLetter = answerMatch?.[1]?.trim().toUpperCase();
  const correctIndex = correctLetter && /^[A-D]$/.test(correctLetter) ? correctLetter.charCodeAt(0) - 65 : 0;

  return {
    id: `quiz-${index + 1}`,
    prompt: prompt.trim(),
    options: options.length > 0 ? options : ['True', 'False'],
    correctIndex,
    explanation: answerMatch ? `Correct answer: ${answerMatch[1].trim()}` : ''
  };
}

function parseQuizAnswer(answer: string) {
  const numberedBlocks = [...answer.matchAll(/(?:Question\s*)?(\d+)\s*[).:-]\s*([^\n]+)([\s\S]*?)(?=(?:\n\s*(?:Question\s*)?\d+\s*[).:-])|$)/gi)]
    .map((match, index) => parsedQuizQuestion(match[2], match[3], index))
    .filter((question) => question.options.length > 1);

  if (numberedBlocks.length > 0) return numberedBlocks;

  const questionBlocks = [...answer.matchAll(/(?:^|\n)\s*([^\n?]+\?[^\n]*)([\s\S]*?)(?=\n\s*[^\n?]+\?[^\n]*\n\s*A[).:-]|$)/g)]
    .map((match, index) => parsedQuizQuestion(match[1], match[2], index))
    .filter((question) => question.options.length > 1);

  if (questionBlocks.length > 0) return questionBlocks;

  const [firstLine, ...rest] = answer.split('\n').filter(Boolean);
  return firstLine ? [{
    id: 'quiz-1',
    prompt: firstLine.trim(),
    options: ['Review the cited source', 'Not supported by the source'],
    correctIndex: 0,
    explanation: rest.join(' ').trim()
  }] : [];
}

function studyPayload(documentIds: string[], prompt: string, task: string, extra: UnknownRecord = {}) {
  return JSON.stringify({ docId: documentIds[0], documentIds, question: prompt, prompt, task, ...extra });
}

function emptyToNull<T>(promise: Promise<T>): Promise<T | null> {
  return promise.catch((error) => {
    if (error instanceof ClientApiError && error.status === 404) return null;
    throw error;
  });
}

function normalizeArtifactList<T>(value: unknown, normalize: (item: unknown) => T): T[] {
  const body = asRecord(value);
  const items = Array.isArray(body.items) ? body.items : Array.isArray(value) ? value : [];
  return items.map(normalize);
}

function normalizeQuizProgress(value: unknown, quiz: SavedQuiz, answers?: Record<string, number>): QuizProgress {
  const body = asRecord(value);
  const progressAnswers = answers ?? Object.fromEntries(
    Object.entries(asRecord(body.answers)).filter((entry): entry is [string, number] => typeof entry[1] === 'number')
  );
  const score = quiz.questions.filter((question) => progressAnswers[question.id] === question.correctIndex).length;

  return {
    quizId: asString(body.quizId, quiz.id),
    documentId: asString(body.documentId, quiz.documentId),
    answers: progressAnswers,
    score: typeof body.score === 'number' ? body.score : score,
    total: typeof body.total === 'number' ? body.total : quiz.questions.length,
    updatedAt: asString(body.updatedAt, new Date().toISOString())
  };
}

export const apiClient = {
  me: () => request<User>('/me'),
  documents: () => request<StudyDocument[]>(routes.documents),
  document: (documentId: string) => request<StudyDocument>(`${routes.documents}/${documentId}`),
  createUpload: (filename: string, contentType: string) => request<UploadSession>(routes.upload, { method: 'POST', body: JSON.stringify({ fileName: filename, contentType }) }),
  completeUpload: async (session: UploadSession, file: File) => {
    const response = await fetch(session.uploadUrl, {
      method: session.method || 'PUT',
      headers: session.headers || {},
      body: file
    });
    if (!response.ok) {
      throw new ClientApiError('UPLOAD_FAILED', 'Upload failed.', response.status);
    }
  },
  ask: async (documentIds: string[], question: string) => normalizeQuestionAnswer(
    await request<unknown>(routes.study, { method: 'POST', body: studyPayload(documentIds, question, 'qa', { documentIds } satisfies Pick<StudyRequest, 'documentIds'>) }),
    question
  ),
  studyGuide: async (documentId: string) => normalizeStudyGuide(
    await request<unknown>(routes.study, { method: 'POST', body: studyPayload([documentId], 'Create a concise study guide and summary for this source.', 'summary') }),
    documentId
  ),
  summarizeDocument: (documentId: string) => request<QuestionAnswer>(routes.study, {
    method: 'POST',
    body: studyPayload([documentId], 'Write a one-paragraph student-friendly summary of this lecture source. Mention the main topic and the most testable ideas.', 'summary')
  }),
  flashcards: async (documentId: string) => normalizeFlashcards(
    await request<unknown>(routes.study, { method: 'POST', body: studyPayload([documentId], 'Create flashcards from the most important facts in this source.', 'flashcard') }),
    documentId
  ),
  savedFlashcards: (documentId: string, artifactId?: string) => emptyToNull(
    request<unknown>(routes.study, { method: 'POST', body: studyPayload([documentId], 'Load saved flashcards for this source.', 'get-flashcards', { artifactId }) }).then((value) => normalizeFlashcards(value, documentId))
  ),
  savedFlashcardDecks: (documentId: string) => request<unknown>(routes.study, {
    method: 'POST',
    body: studyPayload([documentId], 'List saved flashcards for this source.', 'list-flashcards')
  }).then((value) => normalizeArtifactList(value, (item) => normalizeFlashcards(item, documentId))),
  quiz: async (documentId: string, difficulty: Difficulty) => normalizeQuiz(
    await request<unknown>(routes.study, { method: 'POST', body: studyPayload([documentId], `Create exactly 10 numbered ${difficulty} multiple-choice questions from this source. Each question must include options A, B, C, and D plus the correct answer.`, 'quiz', { difficulty }) }),
    documentId,
    difficulty
  ),
  savedQuiz: (documentId: string, artifactId?: string) => emptyToNull(
    request<unknown>(routes.study, { method: 'POST', body: studyPayload([documentId], 'Load saved quiz for this source.', 'get-quiz', { artifactId }) }).then((value) => normalizeQuiz(value, documentId, 'medium'))
  ),
  savedQuizzes: (documentId: string) => request<unknown>(routes.study, {
    method: 'POST',
    body: studyPayload([documentId], 'List saved quizzes for this source.', 'list-quizzes')
  }).then((value) => normalizeArtifactList(value, (item) => normalizeQuiz(item, documentId, 'medium'))),
  quizProgress: (quiz: SavedQuiz) => emptyToNull(
    request<unknown>(routes.study, { method: 'POST', body: studyPayload([quiz.documentId], 'Load saved quiz progress.', 'get-quiz-progress', { quizId: quiz.id }) }).then((value) => normalizeQuizProgress(value, quiz))
  ),
  saveQuizProgress: (quiz: SavedQuiz, answers: Record<string, number>) => request<unknown>(routes.study, {
    method: 'POST',
    body: studyPayload([quiz.documentId], 'Save quiz progress.', 'save-quiz-progress', { quizId: quiz.id, documentId: quiz.documentId, answers })
  }).then((value) => normalizeQuizProgress(value, quiz, answers)),
  resetQuizProgress: (quiz: SavedQuiz) => request<unknown>(routes.study, {
    method: 'POST',
    body: studyPayload([quiz.documentId], 'Reset quiz progress.', 'reset-quiz-progress', { quizId: quiz.id })
  }).then((value) => normalizeQuizProgress(value, quiz, {})),
  evidence: () => request<EvidenceReadiness>('/evidence/readiness')
};
