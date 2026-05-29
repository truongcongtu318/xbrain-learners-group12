export type DocumentStatus = 'UPLOADING' | 'ANALYZING' | 'INDEXING' | 'READY' | 'FAILED';
export type Difficulty = 'easy' | 'medium' | 'hard';
export type AppMode = 'mock' | 'aws';
export type StudyArtifactType = 'flashcards' | 'quiz';

export interface User {
  id: string;
  name: string;
  email: string;
  avatarInitials: string;
}

export interface StudyDocument {
  id: string;
  filename: string;
  status: DocumentStatus;
  uploadedAt: string;
  pageCount: number;
  sourceType: 'RAW_PDF' | 'PYPDF_MARKDOWN' | 'TEXTRACT_MARKDOWN';
  summary: string;
}

export interface UploadSession {
  document?: StudyDocument;
  uploadUrl: string;
  method?: 'PUT';
  headers?: Record<string, string>;
  key?: string;
  expiresIn?: number;
}

export interface Citation {
  id: string;
  label: string;
  snippet: string;
  score: number;
  filename?: string;
  documentId?: string;
  pageNumber?: number;
  location?: string;
  sourceUri?: string;
}

export interface StudyRequest {
  documentIds: string[];
  question: string;
}

export interface QuestionAnswer {
  id: string;
  question: string;
  answer: string;
  citations: Citation[];
  createdAt: string;
}

export interface StudyGuideConcept {
  id: string;
  title: string;
  explanation: string;
  whyItMatters: string;
}

export interface StudyGuide {
  documentId: string;
  generatedAt: string;
  concepts: StudyGuideConcept[];
}

export interface Flashcard {
  id: string;
  front: string;
  back: string;
  sourceLabel: string;
}

export interface FlashcardDeck {
  documentId: string;
  generatedAt: string;
  cards: Flashcard[];
}

export interface SavedFlashcardDeck extends FlashcardDeck {
  id: string;
  createdAt: string;
  updatedAt: string;
}

export interface QuizQuestion {
  id: string;
  prompt: string;
  options: string[];
  correctIndex: number;
  explanation: string;
}

export interface Quiz {
  documentId: string;
  difficulty: Difficulty;
  generatedAt: string;
  questions: QuizQuestion[];
}

export interface SavedQuiz extends Quiz {
  id: string;
  createdAt: string;
  updatedAt: string;
}

export interface QuizProgress {
  quizId: string;
  documentId: string;
  answers: Record<string, number>;
  score: number;
  total: number;
  updatedAt: string;
}

export interface QuizAttempt {
  quizId: string;
  score: number;
  total: number;
  completedAt: string;
}

export interface EvidenceReadiness {
  mode: AppMode;
  services: Array<{ name: string; status: 'ready' | 'missing' | 'mock'; detail: string }>;
  retrievalProbes: Array<{ question: string; expectedSource: string; retrievedSource: string; relevance: number }>;
}
