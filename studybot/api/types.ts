import type {
  AppMode,
  Difficulty,
  EvidenceReadiness,
  FlashcardDeck,
  QuestionAnswer,
  Quiz,
  StudyDocument,
  StudyGuide,
  UploadSession,
  User
} from '../src/types/domain';

export type { AppMode, Difficulty };

export interface RequestContext {
  user: User;
  mode: AppMode;
}

export interface Providers {
  auth: AuthProvider;
  documents: DocumentProvider;
  study: StudyProvider;
  evidence: EvidenceProvider;
}

export interface AuthProvider {
  resolveUser(headers: Headers): Promise<User>;
}

export interface DocumentProvider {
  createUploadSession(user: User, filename: string, contentType: string): Promise<UploadSession>;
  acceptMockUpload(user: User, documentId: string): Promise<StudyDocument>;
  listDocuments(user: User): Promise<StudyDocument[]>;
  getDocument(user: User, documentId: string): Promise<StudyDocument>;
}

export interface StudyProvider {
  askQuestion(user: User, documentIds: string[], question: string): Promise<QuestionAnswer>;
  generateStudyGuide(user: User, documentId: string): Promise<StudyGuide>;
  generateFlashcards(user: User, documentId: string): Promise<FlashcardDeck>;
  generateQuiz(user: User, documentId: string, difficulty: Difficulty): Promise<Quiz>;
}

export interface EvidenceProvider {
  getReadiness(): Promise<EvidenceReadiness>;
}
