import type { Citation, Difficulty, EvidenceReadiness, FlashcardDeck, QuestionAnswer, Quiz, StudyDocument, StudyGuide, UploadSession, User, WeeklyProgress } from '../../src/types/domain';
import type { AuthProvider, DocumentProvider, EvidenceProvider, Providers, StudyProvider } from '../types';
import { ApiError } from '../errors';

const demoUser: User = {
  id: 'demo-user-001',
  name: 'Tu Truong',
  email: 'demo@studybot.local',
  avatarInitials: 'TT'
};

const FIXED_TIMESTAMP = '2026-05-27T00:00:00.000Z';

let uploadCounter = 0;
let qaCounter = 0;

const now = () => FIXED_TIMESTAMP;
const nextUploadId = () => `doc-upload-${++uploadCounter}`;
const nextQaId = () => `qa-${++qaCounter}`;

const documents = new Map<string, StudyDocument>();

function seedDocument(): StudyDocument {
  const doc: StudyDocument = {
    id: 'doc-machine-learning-101',
    filename: 'machine-learning-week-7.pdf',
    status: 'READY',
    uploadedAt: now(),
    pageCount: 42,
    sourceType: 'PYPDF_MARKDOWN',
    summary: 'Lecture notes covering supervised learning, gradient descent, model evaluation, and overfitting.'
  };
  documents.set(doc.id, doc);
  return doc;
}

seedDocument();

class MockAuthProvider implements AuthProvider {
  async resolveUser(): Promise<User> {
    return demoUser;
  }
}

class MockDocumentProvider implements DocumentProvider {
  async createUploadSession(_user: User, filename: string, contentType: string): Promise<UploadSession> {
    const id = nextUploadId();
    const document: StudyDocument = {
      id,
      filename,
      status: 'UPLOADING',
      uploadedAt: now(),
      pageCount: 0,
      sourceType: contentType.includes('pdf') ? 'RAW_PDF' : 'PYPDF_MARKDOWN',
      summary: 'Upload session created. Mock processing will mark this document ready.'
    };
    documents.set(id, document);
    return {
      document,
      uploadUrl: `/api/uploads/${id}/content`,
      method: 'PUT',
      headers: { 'content-type': contentType }
    };
  }

  async acceptMockUpload(_user: User, documentId: string): Promise<StudyDocument> {
    const document = documents.get(documentId);
    if (!document) throw new ApiError('DOCUMENT_NOT_FOUND', 'Document not found.', 404);
    const ready: StudyDocument = {
      ...document,
      status: 'READY',
      pageCount: document.pageCount || 28,
      sourceType: document.sourceType === 'RAW_PDF' ? 'PYPDF_MARKDOWN' : document.sourceType,
      summary: 'Mock preprocessing completed: text density looked healthy, markdown was prepared, and the knowledge base index is ready.'
    };
    documents.set(documentId, ready);
    return ready;
  }

  async listDocuments(): Promise<StudyDocument[]> {
    return [...documents.values()].sort((a, b) => b.uploadedAt.localeCompare(a.uploadedAt));
  }

  async getDocument(_user: User, documentId: string): Promise<StudyDocument> {
    const document = documents.get(documentId);
    if (!document) throw new ApiError('DOCUMENT_NOT_FOUND', 'Document not found.', 404);
    return document;
  }
}

const citations: Citation[] = [
  { id: 'cite-1', label: 'Slide 12', snippet: 'Gradient descent updates model weights in the direction that reduces loss.', score: 0.94 },
  { id: 'cite-2', label: 'Slide 18', snippet: 'Validation accuracy helps detect overfitting when training accuracy keeps rising.', score: 0.89 }
];

class MockStudyProvider implements StudyProvider {
  async askQuestion(_user: User, documentId: string, question: string): Promise<QuestionAnswer> {
    if (!documents.has(documentId)) throw new ApiError('DOCUMENT_NOT_FOUND', 'Document not found.', 404);
    return {
      id: nextQaId(),
      question,
      answer: 'Based on your lecture, the key idea is to connect the learning objective to evidence from the slides: define the concept, explain how it is used, and cite the source slide when answering exam-style questions.',
      citations,
      createdAt: now()
    };
  }

  async generateStudyGuide(_user: User, documentId: string): Promise<StudyGuide> {
    if (!documents.has(documentId)) throw new ApiError('DOCUMENT_NOT_FOUND', 'Document not found.', 404);
    return {
      documentId,
      generatedAt: now(),
      concepts: [
        { id: 'concept-1', title: 'Supervised learning', explanation: 'Learning from labeled examples to predict labels for unseen data.', whyItMatters: 'It frames most classification and regression exam questions.' },
        { id: 'concept-2', title: 'Loss functions', explanation: 'A numeric penalty that measures how wrong predictions are.', whyItMatters: 'It explains what the model is optimizing.' },
        { id: 'concept-3', title: 'Gradient descent', explanation: 'An iterative method for reducing loss by updating parameters.', whyItMatters: 'It is the core training mechanism in the lecture.' },
        { id: 'concept-4', title: 'Overfitting', explanation: 'When a model memorizes training data and generalizes poorly.', whyItMatters: 'It is a common failure mode students must identify.' },
        { id: 'concept-5', title: 'Evaluation metrics', explanation: 'Accuracy, precision, recall, and validation loss summarize model behavior.', whyItMatters: 'They justify whether a model is ready to use.' }
      ]
    };
  }

  async generateFlashcards(_user: User, documentId: string): Promise<FlashcardDeck> {
    if (!documents.has(documentId)) throw new ApiError('DOCUMENT_NOT_FOUND', 'Document not found.', 404);
    return {
      documentId,
      generatedAt: now(),
      cards: [
        { id: 'card-1', front: 'What does a loss function measure?', back: 'How far model predictions are from the correct labels.', sourceLabel: 'Slide 9' },
        { id: 'card-2', front: 'Why use validation data?', back: 'To estimate generalization and detect overfitting.', sourceLabel: 'Slide 18' },
        { id: 'card-3', front: 'What is gradient descent?', back: 'An optimization loop that updates weights to reduce loss.', sourceLabel: 'Slide 12' },
        { id: 'card-4', front: 'Name one sign of overfitting.', back: 'Training accuracy improves while validation accuracy drops.', sourceLabel: 'Slide 20' },
        { id: 'card-5', front: 'What is precision?', back: 'The share of predicted positives that are actually positive.', sourceLabel: 'Slide 26' }
      ]
    };
  }

  async generateQuiz(_user: User, documentId: string, difficulty: Difficulty): Promise<Quiz> {
    if (!documents.has(documentId)) throw new ApiError('DOCUMENT_NOT_FOUND', 'Document not found.', 404);
    return {
      documentId,
      difficulty,
      generatedAt: now(),
      questions: Array.from({ length: 10 }, (_, index) => ({
        id: `quiz-${index + 1}`,
        prompt: `Question ${index + 1}: Which choice best matches a key machine learning concept from the lecture?`,
        options: ['A model behavior described by evidence', 'A random UI preference', 'An unrelated deployment detail', 'A billing-only concern'],
        correctIndex: 0,
        explanation: 'The correct answer ties the concept back to lecture evidence and model behavior.'
      }))
    };
  }

  async getWeeklyProgress(): Promise<WeeklyProgress> {
    return {
      weekStart: '2026-05-25',
      topicsStudied: ['Gradient descent', 'Overfitting', 'Evaluation metrics', 'Loss functions', 'Validation sets'],
      questionsAsked: 12,
      flashcardsReviewed: 34,
      quizAverage: 84,
      weakTopics: ['Precision vs recall', 'Regularization']
    };
  }
}

class MockEvidenceProvider implements EvidenceProvider {
  async getReadiness(): Promise<EvidenceReadiness> {
    return {
      mode: 'mock',
      services: [
        { name: 'S3 presigned uploads', status: 'mock', detail: 'Mock upload URL returns a local API endpoint.' },
        { name: 'Bedrock Knowledge Base + S3 Vectors', status: 'mock', detail: 'Mock RAG returns deterministic citations.' },
        { name: 'DynamoDB app memory', status: 'mock', detail: 'In-memory maps simulate document and study records.' },
        { name: 'Cognito/JWT', status: 'mock', detail: 'Demo user resolver is active.' }
      ],
      retrievalProbes: [
        { question: 'What is gradient descent?', expectedSource: 'Slide 12', retrievedSource: 'Slide 12', relevance: 0.94 },
        { question: 'How do we spot overfitting?', expectedSource: 'Slide 18', retrievedSource: 'Slide 18', relevance: 0.89 }
      ]
    };
  }
}

export function createMockProviders(): Providers {
  return {
    auth: new MockAuthProvider(),
    documents: new MockDocumentProvider(),
    study: new MockStudyProvider(),
    evidence: new MockEvidenceProvider()
  };
}
