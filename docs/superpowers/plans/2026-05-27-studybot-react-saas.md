# StudyBot React SaaS Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a root-level full-stack TypeScript StudyBot SaaS app with Vite React, Hono API handlers, complete mock mode, and AWS-ready provider interfaces.

**Architecture:** The frontend is a Vite React SPA that talks to a Hono API under `/api`. Domain logic is behind provider interfaces so the app runs fully in mock mode locally and can switch to AWS mode through environment variables during deployment. Primary learner UX stays clean; AWS/service readiness lives in a secondary evidence view.

**Tech Stack:** Vite, React, TypeScript, Hono, Vitest, Testing Library, Zod, AWS SDK v3 placeholders/providers, CSS modules/global CSS.

---

## File structure

Create these files under root-level `studybot/`:

```text
studybot/
  package.json
  tsconfig.json
  tsconfig.node.json
  vite.config.ts
  index.html
  .env.example
  src/
    main.tsx
    App.tsx
    styles.css
    types/domain.ts
    lib/api/client.ts
    lib/api/errors.ts
    lib/utils/date.ts
    features/shell/AppShell.tsx
    features/dashboard/DashboardPage.tsx
    features/documents/DocumentsPage.tsx
    features/study-room/StudyRoomPage.tsx
    features/study-guide/StudyGuidePage.tsx
    features/flashcards/FlashcardsPage.tsx
    features/quiz/QuizPage.tsx
    features/progress/ProgressPage.tsx
    features/evidence/EvidencePage.tsx
    components/ui/Button.tsx
    components/ui/Card.tsx
    components/ui/EmptyState.tsx
    components/ui/StatusBadge.tsx
    components/ui/MetricCard.tsx
  api/
    app.ts
    dev-server.ts
    lambda.ts
    config.ts
    types.ts
    errors.ts
    routes/health.ts
    routes/me.ts
    routes/uploads.ts
    routes/documents.ts
    routes/study.ts
    routes/progress.ts
    routes/evidence.ts
    providers/index.ts
    providers/mock.ts
    providers/aws.ts
    services/documents.ts
    services/study.ts
    test/app.test.ts
```

Responsibilities:

- `src/types/domain.ts`: shared frontend domain models matching API output.
- `api/types.ts`: backend domain/provider contracts. Keep names aligned with frontend types.
- `api/providers/mock.ts`: deterministic complete mock mode.
- `api/providers/aws.ts`: AWS-ready provider skeleton that reads env and returns clear configuration errors when required env is missing.
- `api/routes/*`: thin Hono route registration only.
- `api/services/*`: orchestration over provider interfaces.
- `src/features/*`: one page per SaaS workflow.

---

### Task 1: Scaffold the TypeScript app shell

**Files:**
- Create: `studybot/package.json`
- Create: `studybot/tsconfig.json`
- Create: `studybot/tsconfig.node.json`
- Create: `studybot/vite.config.ts`
- Create: `studybot/index.html`
- Create: `studybot/.env.example`

- [ ] **Step 1: Create package.json**

Create `studybot/package.json`:

```json
{
  "name": "studybot",
  "version": "0.1.0",
  "private": true,
  "type": "module",
  "scripts": {
    "dev": "vite",
    "api:dev": "tsx watch api/dev-server.ts",
    "build": "tsc -p tsconfig.json && vite build",
    "typecheck": "tsc -p tsconfig.json --noEmit",
    "test": "vitest run",
    "test:watch": "vitest"
  },
  "dependencies": {
    "@hono/node-server": "^1.14.4",
    "@hono/zod-validator": "^0.7.0",
    "@vitejs/plugin-react": "^5.0.0",
    "hono": "^4.10.7",
    "lucide-react": "^0.468.0",
    "react": "^19.0.0",
    "react-dom": "^19.0.0",
    "zod": "^4.1.13"
  },
  "devDependencies": {
    "@testing-library/jest-dom": "^6.6.3",
    "@testing-library/react": "^16.3.0",
    "@testing-library/user-event": "^14.6.1",
    "@types/node": "^22.10.2",
    "@types/react": "^19.0.2",
    "@types/react-dom": "^19.0.2",
    "jsdom": "^26.0.0",
    "tsx": "^4.19.2",
    "typescript": "^5.9.3",
    "vite": "^7.0.0",
    "vitest": "^3.2.0"
  }
}
```

- [ ] **Step 2: Create TypeScript configs**

Create `studybot/tsconfig.json`:

```json
{
  "compilerOptions": {
    "target": "ES2022",
    "useDefineForClassFields": true,
    "lib": ["DOM", "DOM.Iterable", "ES2022"],
    "allowJs": false,
    "skipLibCheck": true,
    "esModuleInterop": true,
    "allowSyntheticDefaultImports": true,
    "strict": true,
    "forceConsistentCasingInFileNames": true,
    "module": "ESNext",
    "moduleResolution": "Bundler",
    "resolveJsonModule": true,
    "isolatedModules": true,
    "noEmit": true,
    "jsx": "react-jsx",
    "types": ["vitest/globals", "@testing-library/jest-dom"]
  },
  "include": ["src", "api", "vite.config.ts"],
  "references": [{ "path": "./tsconfig.node.json" }]
}
```

Create `studybot/tsconfig.node.json`:

```json
{
  "compilerOptions": {
    "composite": true,
    "module": "ESNext",
    "moduleResolution": "Bundler",
    "allowSyntheticDefaultImports": true,
    "strict": true
  },
  "include": ["vite.config.ts"]
}
```

- [ ] **Step 3: Create Vite config with API proxy**

Create `studybot/vite.config.ts`:

```ts
import react from '@vitejs/plugin-react';
import { defineConfig } from 'vite';

export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    proxy: {
      '/api': 'http://127.0.0.1:8787'
    }
  },
  test: {
    environment: 'jsdom',
    globals: true,
    setupFiles: []
  }
});
```

- [ ] **Step 4: Create index.html**

Create `studybot/index.html`:

```html
<!doctype html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>StudyBot</title>
  </head>
  <body>
    <div id="root"></div>
    <script type="module" src="/src/main.tsx"></script>
  </body>
</html>
```

- [ ] **Step 5: Create .env.example**

Create `studybot/.env.example`:

```env
APP_MODE=mock
AWS_REGION=us-east-1
STUDYBOT_DOCS_BUCKET=
STUDYBOT_TABLE_NAME=
BEDROCK_KB_ID=
BEDROCK_KB_DATA_SOURCE_ID=
BEDROCK_MODEL_ID=anthropic.claude-3-5-haiku-20241022-v1:0
BEDROCK_EMBEDDING_MODEL_ID=amazon.titan-embed-text-v2:0
COGNITO_USER_POOL_ID=
COGNITO_CLIENT_ID=
```

- [ ] **Step 6: Install dependencies**

Run:

```powershell
Set-Location "studybot"; npm install
```

Expected: dependencies install and `studybot/package-lock.json` is created.

- [ ] **Step 7: Run initial typecheck**

Run:

```powershell
Set-Location "studybot"; npm run typecheck
```

Expected: fails because source files do not exist yet. This confirms scripts are wired.

- [ ] **Step 8: Commit scaffold**

Run:

```powershell
git add "studybot/package.json" "studybot/package-lock.json" "studybot/tsconfig.json" "studybot/tsconfig.node.json" "studybot/vite.config.ts" "studybot/index.html" "studybot/.env.example"
git commit -m "Create StudyBot TypeScript scaffold"
```

---

### Task 2: Define domain types and API error helpers

**Files:**
- Create: `studybot/src/types/domain.ts`
- Create: `studybot/api/types.ts`
- Create: `studybot/api/errors.ts`
- Create: `studybot/src/lib/api/errors.ts`

- [ ] **Step 1: Create shared frontend domain types**

Create `studybot/src/types/domain.ts`:

```ts
export type DocumentStatus = 'UPLOADING' | 'ANALYZING' | 'INDEXING' | 'READY' | 'FAILED';
export type Difficulty = 'easy' | 'medium' | 'hard';
export type AppMode = 'mock' | 'aws';

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
  document: StudyDocument;
  uploadUrl: string;
  method: 'PUT';
  headers: Record<string, string>;
}

export interface Citation {
  id: string;
  label: string;
  snippet: string;
  score: number;
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

export interface QuizAttempt {
  quizId: string;
  score: number;
  total: number;
  completedAt: string;
}

export interface WeeklyProgress {
  weekStart: string;
  topicsStudied: string[];
  questionsAsked: number;
  flashcardsReviewed: number;
  quizAverage: number;
  weakTopics: string[];
}

export interface EvidenceReadiness {
  mode: AppMode;
  services: Array<{ name: string; status: 'ready' | 'missing' | 'mock'; detail: string }>;
  retrievalProbes: Array<{ question: string; expectedSource: string; retrievedSource: string; relevance: number }>;
}
```

- [ ] **Step 2: Create backend provider contracts**

Create `studybot/api/types.ts`:

```ts
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
  User,
  WeeklyProgress
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
  askQuestion(user: User, documentId: string, question: string): Promise<QuestionAnswer>;
  generateStudyGuide(user: User, documentId: string): Promise<StudyGuide>;
  generateFlashcards(user: User, documentId: string): Promise<FlashcardDeck>;
  generateQuiz(user: User, documentId: string, difficulty: Difficulty): Promise<Quiz>;
  getWeeklyProgress(user: User): Promise<WeeklyProgress>;
}

export interface EvidenceProvider {
  getReadiness(): Promise<EvidenceReadiness>;
}
```

- [ ] **Step 3: Create backend API error helper**

Create `studybot/api/errors.ts`:

```ts
export class ApiError extends Error {
  constructor(
    public readonly code: string,
    message: string,
    public readonly status = 400,
    public readonly details?: unknown
  ) {
    super(message);
  }
}

export function toErrorResponse(error: unknown) {
  if (error instanceof ApiError) {
    return {
      status: error.status,
      body: { code: error.code, message: error.message, details: error.details }
    };
  }

  return {
    status: 500,
    body: { code: 'INTERNAL_ERROR', message: 'Something went wrong.' }
  };
}
```

- [ ] **Step 4: Create frontend API error helper**

Create `studybot/src/lib/api/errors.ts`:

```ts
export class ClientApiError extends Error {
  constructor(
    public readonly code: string,
    message: string,
    public readonly status: number
  ) {
    super(message);
  }
}
```

- [ ] **Step 5: Run typecheck**

Run:

```powershell
Set-Location "studybot"; npm run typecheck
```

Expected: may still fail because app entry files do not exist. Type errors in files from this task should not appear.

- [ ] **Step 6: Commit domain contracts**

Run:

```powershell
git add "studybot/src/types/domain.ts" "studybot/api/types.ts" "studybot/api/errors.ts" "studybot/src/lib/api/errors.ts"
git commit -m "Define StudyBot domain contracts"
```

---

### Task 3: Build the Hono API with complete mock providers

**Files:**
- Create: `studybot/api/config.ts`
- Create: `studybot/api/providers/mock.ts`
- Create: `studybot/api/providers/aws.ts`
- Create: `studybot/api/providers/index.ts`
- Create: `studybot/api/services/documents.ts`
- Create: `studybot/api/services/study.ts`
- Create: `studybot/api/routes/health.ts`
- Create: `studybot/api/routes/me.ts`
- Create: `studybot/api/routes/uploads.ts`
- Create: `studybot/api/routes/documents.ts`
- Create: `studybot/api/routes/study.ts`
- Create: `studybot/api/routes/progress.ts`
- Create: `studybot/api/routes/evidence.ts`
- Create: `studybot/api/app.ts`
- Create: `studybot/api/dev-server.ts`
- Create: `studybot/api/lambda.ts`

- [ ] **Step 1: Create config loader**

Create `studybot/api/config.ts`:

```ts
import type { AppMode } from './types';

export interface ApiConfig {
  mode: AppMode;
  awsRegion: string;
  docsBucket: string;
  tableName: string;
  bedrockKbId: string;
  bedrockDataSourceId: string;
  bedrockModelId: string;
  bedrockEmbeddingModelId: string;
  cognitoUserPoolId: string;
  cognitoClientId: string;
}

export function loadConfig(env: NodeJS.ProcessEnv = process.env): ApiConfig {
  const mode = env.APP_MODE === 'aws' ? 'aws' : 'mock';

  return {
    mode,
    awsRegion: env.AWS_REGION || 'us-east-1',
    docsBucket: env.STUDYBOT_DOCS_BUCKET || '',
    tableName: env.STUDYBOT_TABLE_NAME || '',
    bedrockKbId: env.BEDROCK_KB_ID || '',
    bedrockDataSourceId: env.BEDROCK_KB_DATA_SOURCE_ID || '',
    bedrockModelId: env.BEDROCK_MODEL_ID || 'anthropic.claude-3-5-haiku-20241022-v1:0',
    bedrockEmbeddingModelId: env.BEDROCK_EMBEDDING_MODEL_ID || 'amazon.titan-embed-text-v2:0',
    cognitoUserPoolId: env.COGNITO_USER_POOL_ID || '',
    cognitoClientId: env.COGNITO_CLIENT_ID || ''
  };
}
```

- [ ] **Step 2: Create mock providers**

Create `studybot/api/providers/mock.ts`:

```ts
import type { Citation, Difficulty, EvidenceReadiness, FlashcardDeck, QuestionAnswer, Quiz, StudyDocument, StudyGuide, UploadSession, User, WeeklyProgress } from '../../src/types/domain';
import type { AuthProvider, DocumentProvider, EvidenceProvider, Providers, StudyProvider } from '../types';
import { ApiError } from '../errors';

const demoUser: User = {
  id: 'demo-user-001',
  name: 'Tu Truong',
  email: 'demo@studybot.local',
  avatarInitials: 'TT'
};

const now = () => new Date().toISOString();

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
    const id = `doc-${crypto.randomUUID()}`;
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
      id: `qa-${crypto.randomUUID()}`,
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
```

- [ ] **Step 3: Create AWS provider skeleton**

Create `studybot/api/providers/aws.ts`:

```ts
import type { ApiConfig } from '../config';
import type { Providers } from '../types';
import { ApiError } from '../errors';
import { createMockProviders } from './mock';

function missingConfig(config: ApiConfig): string[] {
  const required = [
    ['STUDYBOT_DOCS_BUCKET', config.docsBucket],
    ['STUDYBOT_TABLE_NAME', config.tableName],
    ['BEDROCK_KB_ID', config.bedrockKbId],
    ['BEDROCK_KB_DATA_SOURCE_ID', config.bedrockDataSourceId]
  ] as const;
  return required.filter(([, value]) => !value).map(([name]) => name);
}

export function createAwsProviders(config: ApiConfig): Providers {
  const missing = missingConfig(config);
  if (missing.length > 0) {
    const mock = createMockProviders();
    return {
      ...mock,
      evidence: {
        async getReadiness() {
          return {
            mode: 'aws',
            services: missing.map((name) => ({ name, status: 'missing' as const, detail: 'Set this environment variable before AWS deployment.' })),
            retrievalProbes: []
          };
        }
      },
      documents: {
        ...mock.documents,
        async createUploadSession() {
          throw new ApiError('AWS_CONFIG_MISSING', 'AWS mode is missing required deployment environment variables.', 503, { missing });
        }
      }
    };
  }

  return createMockProviders();
}
```

- [ ] **Step 4: Create provider selector**

Create `studybot/api/providers/index.ts`:

```ts
import type { ApiConfig } from '../config';
import type { Providers } from '../types';
import { createAwsProviders } from './aws';
import { createMockProviders } from './mock';

export function createProviders(config: ApiConfig): Providers {
  return config.mode === 'aws' ? createAwsProviders(config) : createMockProviders();
}
```

- [ ] **Step 5: Create services**

Create `studybot/api/services/documents.ts`:

```ts
import type { Providers } from '../types';

export class DocumentService {
  constructor(private readonly providers: Providers) {}

  createUploadSession(userIdHeaders: Headers, filename: string, contentType: string) {
    return this.providers.auth.resolveUser(userIdHeaders).then((user) => this.providers.documents.createUploadSession(user, filename, contentType));
  }

  acceptMockUpload(userIdHeaders: Headers, documentId: string) {
    return this.providers.auth.resolveUser(userIdHeaders).then((user) => this.providers.documents.acceptMockUpload(user, documentId));
  }

  listDocuments(userIdHeaders: Headers) {
    return this.providers.auth.resolveUser(userIdHeaders).then((user) => this.providers.documents.listDocuments(user));
  }

  getDocument(userIdHeaders: Headers, documentId: string) {
    return this.providers.auth.resolveUser(userIdHeaders).then((user) => this.providers.documents.getDocument(user, documentId));
  }
}
```

Create `studybot/api/services/study.ts`:

```ts
import type { Difficulty } from '../../src/types/domain';
import type { Providers } from '../types';

export class StudyService {
  constructor(private readonly providers: Providers) {}

  async askQuestion(headers: Headers, documentId: string, question: string) {
    const user = await this.providers.auth.resolveUser(headers);
    return this.providers.study.askQuestion(user, documentId, question);
  }

  async generateStudyGuide(headers: Headers, documentId: string) {
    const user = await this.providers.auth.resolveUser(headers);
    return this.providers.study.generateStudyGuide(user, documentId);
  }

  async generateFlashcards(headers: Headers, documentId: string) {
    const user = await this.providers.auth.resolveUser(headers);
    return this.providers.study.generateFlashcards(user, documentId);
  }

  async generateQuiz(headers: Headers, documentId: string, difficulty: Difficulty) {
    const user = await this.providers.auth.resolveUser(headers);
    return this.providers.study.generateQuiz(user, documentId, difficulty);
  }

  async getWeeklyProgress(headers: Headers) {
    const user = await this.providers.auth.resolveUser(headers);
    return this.providers.study.getWeeklyProgress(user);
  }
}
```

- [ ] **Step 6: Create route files**

Create `studybot/api/routes/health.ts`:

```ts
import { Hono } from 'hono';
import type { ApiConfig } from '../config';

export function healthRoutes(config: ApiConfig) {
  const app = new Hono();
  app.get('/health', (c) => c.json({ ok: true, mode: config.mode, region: config.awsRegion }));
  return app;
}
```

Create `studybot/api/routes/me.ts`:

```ts
import { Hono } from 'hono';
import type { Providers } from '../types';

export function meRoutes(providers: Providers) {
  const app = new Hono();
  app.get('/me', async (c) => c.json(await providers.auth.resolveUser(c.req.raw.headers)));
  return app;
}
```

Create `studybot/api/routes/uploads.ts`:

```ts
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
```

Create `studybot/api/routes/documents.ts`:

```ts
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
```

Create `studybot/api/routes/study.ts`:

```ts
import { Hono } from 'hono';
import { z } from 'zod';
import { zValidator } from '@hono/zod-validator';
import { StudyService } from '../services/study';
import type { Providers } from '../types';

const questionSchema = z.object({ question: z.string().min(1) });
const quizSchema = z.object({ difficulty: z.enum(['easy', 'medium', 'hard']).default('medium') });

export function studyRoutes(providers: Providers) {
  const app = new Hono();
  const service = new StudyService(providers);

  app.post('/documents/:docId/questions', zValidator('json', questionSchema), async (c) => {
    return c.json(await service.askQuestion(c.req.raw.headers, c.req.param('docId'), c.req.valid('json').question));
  });

  app.post('/documents/:docId/study-guide', async (c) => c.json(await service.generateStudyGuide(c.req.raw.headers, c.req.param('docId'))));
  app.post('/documents/:docId/flashcards', async (c) => c.json(await service.generateFlashcards(c.req.raw.headers, c.req.param('docId'))));
  app.post('/documents/:docId/quiz', zValidator('json', quizSchema), async (c) => c.json(await service.generateQuiz(c.req.raw.headers, c.req.param('docId'), c.req.valid('json').difficulty)));

  return app;
}
```

Create `studybot/api/routes/progress.ts`:

```ts
import { Hono } from 'hono';
import { StudyService } from '../services/study';
import type { Providers } from '../types';

export function progressRoutes(providers: Providers) {
  const app = new Hono();
  const service = new StudyService(providers);
  app.get('/progress/week', async (c) => c.json(await service.getWeeklyProgress(c.req.raw.headers)));
  return app;
}
```

Create `studybot/api/routes/evidence.ts`:

```ts
import { Hono } from 'hono';
import type { Providers } from '../types';

export function evidenceRoutes(providers: Providers) {
  const app = new Hono();
  app.get('/evidence/readiness', async (c) => c.json(await providers.evidence.getReadiness()));
  return app;
}
```

- [ ] **Step 7: Create Hono app and dev/lambda entrypoints**

Create `studybot/api/app.ts`:

```ts
import { Hono } from 'hono';
import { cors } from 'hono/cors';
import { loadConfig } from './config';
import { toErrorResponse } from './errors';
import { createProviders } from './providers';
import { documentRoutes } from './routes/documents';
import { evidenceRoutes } from './routes/evidence';
import { healthRoutes } from './routes/health';
import { meRoutes } from './routes/me';
import { progressRoutes } from './routes/progress';
import { studyRoutes } from './routes/study';
import { uploadRoutes } from './routes/uploads';

export function createApp() {
  const config = loadConfig();
  const providers = createProviders(config);
  const app = new Hono().basePath('/api');

  app.use('*', cors());
  app.route('/', healthRoutes(config));
  app.route('/', meRoutes(providers));
  app.route('/', uploadRoutes(providers));
  app.route('/', documentRoutes(providers));
  app.route('/', studyRoutes(providers));
  app.route('/', progressRoutes(providers));
  app.route('/', evidenceRoutes(providers));

  app.onError((error, c) => {
    const response = toErrorResponse(error);
    return c.json(response.body, response.status as 400 | 404 | 500 | 503);
  });

  return app;
}

export const app = createApp();
```

Create `studybot/api/dev-server.ts`:

```ts
import { serve } from '@hono/node-server';
import { app } from './app';

serve({ fetch: app.fetch, port: 8787, hostname: '127.0.0.1' }, (info) => {
  console.log(`StudyBot API listening on http://${info.address}:${info.port}`);
});
```

Create `studybot/api/lambda.ts`:

```ts
import { app } from './app';

export default app;
```

- [ ] **Step 8: Run API typecheck**

Run:

```powershell
Set-Location "studybot"; npm run typecheck
```

Expected: frontend entry files are still missing, but API-specific imports should typecheck after frontend files are added in later tasks.

- [ ] **Step 9: Commit mock API**

Run:

```powershell
git add "studybot/api"
git commit -m "Build StudyBot mock API providers"
```

---

### Task 4: Add API tests for core flows

**Files:**
- Create: `studybot/api/test/app.test.ts`

- [ ] **Step 1: Write API route tests**

Create `studybot/api/test/app.test.ts`:

```ts
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
    expect(session.document.status).toBe('UPLOADING');

    const uploadResponse = await app.request(session.uploadUrl, { method: 'PUT', body: 'fake pdf bytes' });
    const document = await json<{ status: string; pageCount: number }>(uploadResponse);
    expect(document.status).toBe('READY');
    expect(document.pageCount).toBeGreaterThan(0);
  });

  it('generates required study artifacts', async () => {
    const documentsResponse = await app.request('/api/documents');
    const documents = await json<Array<{ id: string }>>(documentsResponse);
    const documentId = documents[0].id;

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

  it('returns citations and weekly progress', async () => {
    const documents = await json<Array<{ id: string }>>(await app.request('/api/documents'));
    const qa = await json<{ citations: unknown[] }>(await app.request(`/api/documents/${documents[0].id}/questions`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ question: 'What is gradient descent?' })
    }));
    expect(qa.citations.length).toBeGreaterThan(0);

    const progress = await json<{ topicsStudied: string[] }>(await app.request('/api/progress/week'));
    expect(progress.topicsStudied.length).toBeGreaterThan(0);
  });
});
```

- [ ] **Step 2: Run tests**

Run:

```powershell
Set-Location "studybot"; npm test
```

Expected: tests pass once Task 3 API files exist.

- [ ] **Step 3: Commit API tests**

Run:

```powershell
git add "studybot/api/test/app.test.ts"
git commit -m "Test StudyBot mock API flows"
```

---

### Task 5: Build frontend API client and UI primitives

**Files:**
- Create: `studybot/src/lib/api/client.ts`
- Create: `studybot/src/lib/utils/date.ts`
- Create: `studybot/src/components/ui/Button.tsx`
- Create: `studybot/src/components/ui/Card.tsx`
- Create: `studybot/src/components/ui/EmptyState.tsx`
- Create: `studybot/src/components/ui/StatusBadge.tsx`
- Create: `studybot/src/components/ui/MetricCard.tsx`

- [ ] **Step 1: Create frontend API client**

Create `studybot/src/lib/api/client.ts`:

```ts
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
```

- [ ] **Step 2: Create date utility**

Create `studybot/src/lib/utils/date.ts`:

```ts
export function formatShortDate(value: string): string {
  return new Intl.DateTimeFormat('en', { month: 'short', day: 'numeric' }).format(new Date(value));
}
```

- [ ] **Step 3: Create UI primitives**

Create `studybot/src/components/ui/Button.tsx`:

```tsx
import type { ButtonHTMLAttributes, PropsWithChildren } from 'react';

type ButtonVariant = 'primary' | 'secondary' | 'ghost';

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
}

export function Button({ children, className = '', variant = 'primary', ...props }: PropsWithChildren<ButtonProps>) {
  return <button className={`btn btn-${variant} ${className}`} {...props}>{children}</button>;
}
```

Create `studybot/src/components/ui/Card.tsx`:

```tsx
import type { PropsWithChildren, ReactNode } from 'react';

interface CardProps {
  title?: string;
  eyebrow?: string;
  action?: ReactNode;
  className?: string;
}

export function Card({ title, eyebrow, action, className = '', children }: PropsWithChildren<CardProps>) {
  return (
    <section className={`card ${className}`}>
      {(title || eyebrow || action) && (
        <div className="card-header">
          <div>
            {eyebrow && <p className="eyebrow">{eyebrow}</p>}
            {title && <h2>{title}</h2>}
          </div>
          {action}
        </div>
      )}
      {children}
    </section>
  );
}
```

Create `studybot/src/components/ui/EmptyState.tsx`:

```tsx
export function EmptyState({ title, description }: { title: string; description: string }) {
  return (
    <div className="empty-state">
      <strong>{title}</strong>
      <p>{description}</p>
    </div>
  );
}
```

Create `studybot/src/components/ui/StatusBadge.tsx`:

```tsx
import type { DocumentStatus } from '../../types/domain';

const labels: Record<DocumentStatus, string> = {
  UPLOADING: 'Uploading',
  ANALYZING: 'Analyzing',
  INDEXING: 'Indexing',
  READY: 'Ready',
  FAILED: 'Failed'
};

export function StatusBadge({ status }: { status: DocumentStatus }) {
  return <span className={`status status-${status.toLowerCase()}`}>{labels[status]}</span>;
}
```

Create `studybot/src/components/ui/MetricCard.tsx`:

```tsx
export function MetricCard({ label, value, detail }: { label: string; value: string | number; detail: string }) {
  return (
    <div className="metric-card">
      <span>{label}</span>
      <strong>{value}</strong>
      <p>{detail}</p>
    </div>
  );
}
```

- [ ] **Step 4: Commit UI primitives**

Run:

```powershell
git add "studybot/src/lib" "studybot/src/components" "studybot/src/types/domain.ts"
git commit -m "Add StudyBot frontend API client and UI primitives"
```

---

### Task 6: Build app shell, navigation, and global styling

**Files:**
- Create: `studybot/src/main.tsx`
- Create: `studybot/src/App.tsx`
- Create: `studybot/src/features/shell/AppShell.tsx`
- Create: `studybot/src/styles.css`

- [ ] **Step 1: Create main entry**

Create `studybot/src/main.tsx`:

```tsx
import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { App } from './App';
import './styles.css';

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>
);
```

- [ ] **Step 2: Create app router state**

Create `studybot/src/App.tsx`:

```tsx
import { useState } from 'react';
import { AppShell, type PageKey } from './features/shell/AppShell';
import { DashboardPage } from './features/dashboard/DashboardPage';
import { DocumentsPage } from './features/documents/DocumentsPage';
import { StudyRoomPage } from './features/study-room/StudyRoomPage';
import { StudyGuidePage } from './features/study-guide/StudyGuidePage';
import { FlashcardsPage } from './features/flashcards/FlashcardsPage';
import { QuizPage } from './features/quiz/QuizPage';
import { ProgressPage } from './features/progress/ProgressPage';
import { EvidencePage } from './features/evidence/EvidencePage';

export function App() {
  const [page, setPage] = useState<PageKey>('dashboard');
  const [activeDocumentId, setActiveDocumentId] = useState('doc-machine-learning-101');

  const content = {
    dashboard: <DashboardPage onNavigate={setPage} onSelectDocument={setActiveDocumentId} />,
    documents: <DocumentsPage onSelectDocument={setActiveDocumentId} />,
    study: <StudyRoomPage activeDocumentId={activeDocumentId} />,
    guide: <StudyGuidePage activeDocumentId={activeDocumentId} />,
    flashcards: <FlashcardsPage activeDocumentId={activeDocumentId} />,
    quiz: <QuizPage activeDocumentId={activeDocumentId} />,
    progress: <ProgressPage />,
    evidence: <EvidencePage />
  }[page];

  return <AppShell currentPage={page} onNavigate={setPage}>{content}</AppShell>;
}
```

- [ ] **Step 3: Create app shell**

Create `studybot/src/features/shell/AppShell.tsx`:

```tsx
import type { PropsWithChildren } from 'react';
import { BookOpen, FileText, GraduationCap, LayoutDashboard, LineChart, ShieldCheck, Sparkles, StickyNote, Trophy } from 'lucide-react';

export type PageKey = 'dashboard' | 'documents' | 'study' | 'guide' | 'flashcards' | 'quiz' | 'progress' | 'evidence';

const navItems: Array<{ key: PageKey; label: string; icon: typeof LayoutDashboard }> = [
  { key: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { key: 'documents', label: 'Documents', icon: FileText },
  { key: 'study', label: 'Study room', icon: BookOpen },
  { key: 'guide', label: 'Guide', icon: StickyNote },
  { key: 'flashcards', label: 'Flashcards', icon: Sparkles },
  { key: 'quiz', label: 'Quiz', icon: Trophy },
  { key: 'progress', label: 'Progress', icon: LineChart },
  { key: 'evidence', label: 'Readiness', icon: ShieldCheck }
];

export function AppShell({ currentPage, onNavigate, children }: PropsWithChildren<{ currentPage: PageKey; onNavigate: (page: PageKey) => void }>) {
  return (
    <div className="app-shell">
      <aside className="sidebar">
        <div className="brand-mark"><GraduationCap size={24} /><span>StudyBot</span></div>
        <nav>
          {navItems.map((item) => {
            const Icon = item.icon;
            return (
              <button key={item.key} className={currentPage === item.key ? 'nav-item active' : 'nav-item'} onClick={() => onNavigate(item.key)}>
                <Icon size={18} />
                <span>{item.label}</span>
              </button>
            );
          })}
        </nav>
      </aside>
      <main className="main-area">{children}</main>
    </div>
  );
}
```

- [ ] **Step 4: Create global styles**

Create `studybot/src/styles.css`:

```css
:root {
  --bg: #f6fbff;
  --surface: #ffffff;
  --surface-soft: #eef8ff;
  --text: #102033;
  --muted: #6c8194;
  --line: #dbe8f0;
  --blue: #2563eb;
  --blue-soft: #dbeafe;
  --teal: #14b8a6;
  --teal-soft: #dffcf7;
  --amber: #f59e0b;
  --red: #ef4444;
  --shadow: 0 18px 55px rgba(39, 66, 91, 0.11);
  font-family: ui-rounded, Aptos, "Segoe UI", "Trebuchet MS", sans-serif;
}

* { box-sizing: border-box; }
body { margin: 0; color: var(--text); background: radial-gradient(circle at 20% 0%, #dff4ff 0, transparent 34rem), var(--bg); }
button, input, select, textarea { font: inherit; }
button { cursor: pointer; }

.app-shell { min-height: 100vh; display: grid; grid-template-columns: 250px 1fr; }
.sidebar { position: sticky; top: 0; height: 100vh; padding: 24px 18px; background: rgba(255,255,255,0.82); border-right: 1px solid var(--line); backdrop-filter: blur(18px); }
.brand-mark { display: flex; align-items: center; gap: 10px; font-weight: 900; font-size: 1.2rem; margin-bottom: 28px; color: var(--blue); }
nav { display: grid; gap: 8px; }
.nav-item { display: flex; align-items: center; gap: 10px; width: 100%; border: 0; border-radius: 14px; padding: 11px 12px; background: transparent; color: var(--muted); text-align: left; font-weight: 750; }
.nav-item.active, .nav-item:hover { background: var(--blue-soft); color: var(--blue); }
.main-area { padding: 32px; max-width: 1240px; width: 100%; }
.page-header { display: flex; align-items: flex-start; justify-content: space-between; gap: 18px; margin-bottom: 22px; }
.page-header h1 { margin: 0; font-size: clamp(2rem, 4vw, 3.4rem); line-height: 0.95; letter-spacing: -0.06em; }
.page-header p { margin: 10px 0 0; color: var(--muted); max-width: 680px; }
.grid { display: grid; gap: 18px; }
.grid.two { grid-template-columns: 1.25fr 0.75fr; }
.grid.three { grid-template-columns: repeat(3, 1fr); }
.card { background: rgba(255,255,255,0.9); border: 1px solid var(--line); border-radius: 24px; padding: 22px; box-shadow: var(--shadow); }
.card-header { display: flex; justify-content: space-between; gap: 12px; align-items: flex-start; margin-bottom: 16px; }
.card h2 { margin: 0; letter-spacing: -0.03em; }
.eyebrow { margin: 0 0 4px; color: var(--blue); font-size: 0.76rem; font-weight: 900; letter-spacing: 0.12em; text-transform: uppercase; }
.btn { border: 1px solid var(--line); border-radius: 14px; padding: 10px 14px; font-weight: 850; background: white; color: var(--text); }
.btn-primary { background: linear-gradient(135deg, var(--blue), var(--teal)); color: white; border: 0; }
.btn-secondary { background: var(--teal-soft); color: #0f766e; border-color: #b5f4e8; }
.btn-ghost { background: transparent; color: var(--blue); }
.status { display: inline-flex; border-radius: 999px; padding: 6px 10px; font-size: 0.78rem; font-weight: 850; background: var(--blue-soft); color: var(--blue); }
.status-ready { background: var(--teal-soft); color: #0f766e; }
.status-failed { background: #fee2e2; color: var(--red); }
.status-uploading, .status-analyzing, .status-indexing { background: #fff7d6; color: #9a5b00; }
.metric-card { border: 1px solid var(--line); border-radius: 20px; background: white; padding: 18px; }
.metric-card span, .muted { color: var(--muted); }
.metric-card strong { display: block; font-size: 2rem; letter-spacing: -0.05em; margin: 8px 0; }
.empty-state { border: 1px dashed var(--line); border-radius: 20px; padding: 28px; text-align: center; color: var(--muted); background: rgba(255,255,255,0.55); }
.list { display: grid; gap: 10px; }
.row { display: flex; align-items: center; justify-content: space-between; gap: 12px; padding: 14px; border: 1px solid var(--line); border-radius: 18px; background: white; }
.input, .textarea, .select { width: 100%; border: 1px solid var(--line); border-radius: 14px; padding: 12px 14px; background: white; color: var(--text); }
.textarea { min-height: 120px; resize: vertical; }
.citation { border: 1px solid var(--line); border-radius: 16px; padding: 12px; background: var(--surface-soft); }

@media (max-width: 920px) {
  .app-shell { grid-template-columns: 1fr; }
  .sidebar { position: static; height: auto; }
  nav { grid-template-columns: repeat(2, minmax(0, 1fr)); }
  .main-area { padding: 20px; }
  .grid.two, .grid.three { grid-template-columns: 1fr; }
}
```

- [ ] **Step 5: Run typecheck**

Run:

```powershell
Set-Location "studybot"; npm run typecheck
```

Expected: errors only for feature pages not created yet. App shell imports will resolve after Task 7.

- [ ] **Step 6: Commit app shell**

Run:

```powershell
git add "studybot/src/main.tsx" "studybot/src/App.tsx" "studybot/src/features/shell/AppShell.tsx" "studybot/src/styles.css"
git commit -m "Build StudyBot SaaS app shell"
```

---

### Task 7: Build SaaS feature pages

**Files:**
- Create: `studybot/src/features/dashboard/DashboardPage.tsx`
- Create: `studybot/src/features/documents/DocumentsPage.tsx`
- Create: `studybot/src/features/study-room/StudyRoomPage.tsx`
- Create: `studybot/src/features/study-guide/StudyGuidePage.tsx`
- Create: `studybot/src/features/flashcards/FlashcardsPage.tsx`
- Create: `studybot/src/features/quiz/QuizPage.tsx`
- Create: `studybot/src/features/progress/ProgressPage.tsx`
- Create: `studybot/src/features/evidence/EvidencePage.tsx`

- [ ] **Step 1: Create Dashboard page**

Create `studybot/src/features/dashboard/DashboardPage.tsx`:

```tsx
import { useEffect, useState } from 'react';
import type { PageKey } from '../shell/AppShell';
import type { StudyDocument, WeeklyProgress } from '../../types/domain';
import { apiClient } from '../../lib/api/client';
import { Card } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { MetricCard } from '../../components/ui/MetricCard';
import { StatusBadge } from '../../components/ui/StatusBadge';

export function DashboardPage({ onNavigate, onSelectDocument }: { onNavigate: (page: PageKey) => void; onSelectDocument: (id: string) => void }) {
  const [documents, setDocuments] = useState<StudyDocument[]>([]);
  const [progress, setProgress] = useState<WeeklyProgress | null>(null);

  useEffect(() => {
    void Promise.all([apiClient.documents(), apiClient.weeklyProgress()]).then(([docs, weekly]) => {
      setDocuments(docs);
      setProgress(weekly);
    });
  }, []);

  return (
    <>
      <header className="page-header">
        <div>
          <h1>Your AI study workspace</h1>
          <p>Upload lecture notes, ask cited questions, practice with generated study tools, and track what you learned this week.</p>
        </div>
        <Button onClick={() => onNavigate('documents')}>Upload lecture</Button>
      </header>
      <div className="grid three">
        <MetricCard label="Topics this week" value={progress?.topicsStudied.length ?? '—'} detail="Tracked from study events" />
        <MetricCard label="Questions asked" value={progress?.questionsAsked ?? '—'} detail="Grounded in your notes" />
        <MetricCard label="Quiz average" value={`${progress?.quizAverage ?? '—'}%`} detail="Across recent attempts" />
      </div>
      <div className="grid two" style={{ marginTop: 18 }}>
        <Card title="Continue studying" eyebrow="Recent documents">
          <div className="list">
            {documents.map((doc) => (
              <button className="row" key={doc.id} onClick={() => { onSelectDocument(doc.id); onNavigate('study'); }}>
                <span><strong>{doc.filename}</strong><br /><span className="muted">{doc.summary}</span></span>
                <StatusBadge status={doc.status} />
              </button>
            ))}
          </div>
        </Card>
        <Card title="Recommended next steps" eyebrow="Study plan">
          <div className="list">
            <Button variant="secondary" onClick={() => onNavigate('guide')}>Review 5 key concepts</Button>
            <Button variant="secondary" onClick={() => onNavigate('flashcards')}>Practice flashcards</Button>
            <Button variant="secondary" onClick={() => onNavigate('quiz')}>Take a 10-question quiz</Button>
          </div>
        </Card>
      </div>
    </>
  );
}
```

- [ ] **Step 2: Create Documents page**

Create `studybot/src/features/documents/DocumentsPage.tsx`:

```tsx
import { useEffect, useState } from 'react';
import type { StudyDocument } from '../../types/domain';
import { apiClient } from '../../lib/api/client';
import { Button } from '../../components/ui/Button';
import { Card } from '../../components/ui/Card';
import { StatusBadge } from '../../components/ui/StatusBadge';

export function DocumentsPage({ onSelectDocument }: { onSelectDocument: (id: string) => void }) {
  const [documents, setDocuments] = useState<StudyDocument[]>([]);
  const [message, setMessage] = useState('');

  async function refresh() {
    setDocuments(await apiClient.documents());
  }

  useEffect(() => { void refresh(); }, []);

  async function upload(file: File) {
    setMessage(`Uploading ${file.name}...`);
    const session = await apiClient.createUpload(file.name, file.type || 'application/octet-stream');
    await apiClient.completeMockUpload(session.uploadUrl, file);
    onSelectDocument(session.document.id);
    setMessage('Lecture is ready for study.');
    await refresh();
  }

  return (
    <>
      <header className="page-header"><div><h1>Documents</h1><p>Upload lecture slides and keep the learner-facing processing state simple.</p></div></header>
      <div className="grid two">
        <Card title="Upload lecture" eyebrow="PDF, TXT, or MD">
          <label className="empty-state" style={{ display: 'block', cursor: 'pointer' }}>
            <strong>Choose a lecture file</strong>
            <p>Mock mode processes it instantly. AWS mode uses a presigned S3 upload session.</p>
            <input style={{ display: 'none' }} type="file" accept=".pdf,.txt,.md" onChange={(event) => { const file = event.target.files?.[0]; if (file) void upload(file); }} />
          </label>
          {message && <p className="muted">{message}</p>}
        </Card>
        <Card title="Library" eyebrow="Ready to study">
          <div className="list">
            {documents.map((doc) => (
              <div className="row" key={doc.id}>
                <span><strong>{doc.filename}</strong><br /><span className="muted">{doc.pageCount} pages · {doc.sourceType}</span></span>
                <StatusBadge status={doc.status} />
              </div>
            ))}
          </div>
        </Card>
      </div>
    </>
  );
}
```

- [ ] **Step 3: Create Study Room page**

Create `studybot/src/features/study-room/StudyRoomPage.tsx`:

```tsx
import { useState } from 'react';
import type { QuestionAnswer } from '../../types/domain';
import { apiClient } from '../../lib/api/client';
import { Button } from '../../components/ui/Button';
import { Card } from '../../components/ui/Card';

export function StudyRoomPage({ activeDocumentId }: { activeDocumentId: string }) {
  const [question, setQuestion] = useState('What should I remember for the exam?');
  const [answer, setAnswer] = useState<QuestionAnswer | null>(null);
  const [loading, setLoading] = useState(false);

  async function ask() {
    setLoading(true);
    setAnswer(await apiClient.ask(activeDocumentId, question));
    setLoading(false);
  }

  return (
    <>
      <header className="page-header"><div><h1>Study room</h1><p>Ask questions and get grounded answers with friendly citations.</p></div></header>
      <div className="grid two">
        <Card title="Ask your lecture" eyebrow="Cited Q&A">
          <textarea className="textarea" value={question} onChange={(event) => setQuestion(event.target.value)} />
          <div style={{ marginTop: 12 }}><Button onClick={() => void ask()} disabled={loading}>{loading ? 'Thinking...' : 'Ask StudyBot'}</Button></div>
        </Card>
        <Card title="Answer" eyebrow="Grounded response">
          {answer ? <div className="list"><p>{answer.answer}</p>{answer.citations.map((citation) => <div className="citation" key={citation.id}><strong>{citation.label}</strong><p>{citation.snippet}</p></div>)}</div> : <p className="muted">Ask a question to see answer and citations.</p>}
        </Card>
      </div>
    </>
  );
}
```

- [ ] **Step 4: Create Study Guide page**

Create `studybot/src/features/study-guide/StudyGuidePage.tsx`:

```tsx
import { useEffect, useState } from 'react';
import type { StudyGuide } from '../../types/domain';
import { apiClient } from '../../lib/api/client';
import { Card } from '../../components/ui/Card';

export function StudyGuidePage({ activeDocumentId }: { activeDocumentId: string }) {
  const [guide, setGuide] = useState<StudyGuide | null>(null);
  useEffect(() => { void apiClient.studyGuide(activeDocumentId).then(setGuide); }, [activeDocumentId]);

  return (
    <>
      <header className="page-header"><div><h1>One-page guide</h1><p>Exactly five concepts most likely to matter on the exam.</p></div></header>
      <div className="grid">
        {guide?.concepts.map((concept, index) => <Card key={concept.id} title={`${index + 1}. ${concept.title}`}><p>{concept.explanation}</p><p className="muted">Why it matters: {concept.whyItMatters}</p></Card>)}
      </div>
    </>
  );
}
```

- [ ] **Step 5: Create Flashcards page**

Create `studybot/src/features/flashcards/FlashcardsPage.tsx`:

```tsx
import { useEffect, useState } from 'react';
import type { FlashcardDeck } from '../../types/domain';
import { apiClient } from '../../lib/api/client';
import { Button } from '../../components/ui/Button';
import { Card } from '../../components/ui/Card';

export function FlashcardsPage({ activeDocumentId }: { activeDocumentId: string }) {
  const [deck, setDeck] = useState<FlashcardDeck | null>(null);
  const [flipped, setFlipped] = useState<Record<string, boolean>>({});
  useEffect(() => { void apiClient.flashcards(activeDocumentId).then(setDeck); }, [activeDocumentId]);

  return (
    <>
      <header className="page-header"><div><h1>Flashcards</h1><p>Flip cards and mark what needs review later.</p></div></header>
      <div className="grid three">
        {deck?.cards.map((card) => <Card key={card.id} title={card.sourceLabel}><p>{flipped[card.id] ? card.back : card.front}</p><Button variant="secondary" onClick={() => setFlipped((state) => ({ ...state, [card.id]: !state[card.id] }))}>Flip</Button></Card>)}
      </div>
    </>
  );
}
```

- [ ] **Step 6: Create Quiz page**

Create `studybot/src/features/quiz/QuizPage.tsx`:

```tsx
import { useEffect, useState } from 'react';
import type { Difficulty, Quiz } from '../../types/domain';
import { apiClient } from '../../lib/api/client';
import { Button } from '../../components/ui/Button';
import { Card } from '../../components/ui/Card';

export function QuizPage({ activeDocumentId }: { activeDocumentId: string }) {
  const [difficulty, setDifficulty] = useState<Difficulty>('medium');
  const [quiz, setQuiz] = useState<Quiz | null>(null);
  const [answers, setAnswers] = useState<Record<string, number>>({});

  useEffect(() => { void apiClient.quiz(activeDocumentId, difficulty).then(setQuiz); }, [activeDocumentId, difficulty]);
  const score = quiz ? quiz.questions.filter((q) => answers[q.id] === q.correctIndex).length : 0;

  return (
    <>
      <header className="page-header"><div><h1>Quiz</h1><p>Ten multiple-choice questions with explanations.</p></div><select className="select" value={difficulty} onChange={(event) => setDifficulty(event.target.value as Difficulty)}><option value="easy">Easy</option><option value="medium">Medium</option><option value="hard">Hard</option></select></header>
      <Card title="Score" eyebrow="Current attempt"><strong>{score}/{quiz?.questions.length ?? 10}</strong></Card>
      <div className="grid" style={{ marginTop: 18 }}>{quiz?.questions.map((question) => <Card key={question.id} title={question.prompt}>{question.options.map((option, index) => <button className="row" key={option} onClick={() => setAnswers((state) => ({ ...state, [question.id]: index }))}><span>{option}</span><span>{answers[question.id] === index ? 'Selected' : ''}</span></button>)}{answers[question.id] !== undefined && <p className="muted">{question.explanation}</p>}</Card>)}</div>
    </>
  );
}
```

- [ ] **Step 7: Create Progress page**

Create `studybot/src/features/progress/ProgressPage.tsx`:

```tsx
import { useEffect, useState } from 'react';
import type { WeeklyProgress } from '../../types/domain';
import { apiClient } from '../../lib/api/client';
import { Card } from '../../components/ui/Card';
import { MetricCard } from '../../components/ui/MetricCard';

export function ProgressPage() {
  const [progress, setProgress] = useState<WeeklyProgress | null>(null);
  useEffect(() => { void apiClient.weeklyProgress().then(setProgress); }, []);

  return (
    <>
      <header className="page-header"><div><h1>Progress</h1><p>Track topics studied this week and weak areas to revisit.</p></div></header>
      <div className="grid three"><MetricCard label="Topics" value={progress?.topicsStudied.length ?? '—'} detail="Studied this week" /><MetricCard label="Flashcards" value={progress?.flashcardsReviewed ?? '—'} detail="Reviewed cards" /><MetricCard label="Quiz average" value={`${progress?.quizAverage ?? '—'}%`} detail="Recent attempts" /></div>
      <div className="grid two" style={{ marginTop: 18 }}><Card title="Topics studied">{progress?.topicsStudied.map((topic) => <p key={topic}>{topic}</p>)}</Card><Card title="Weak topics">{progress?.weakTopics.map((topic) => <p key={topic}>{topic}</p>)}</Card></div>
    </>
  );
}
```

- [ ] **Step 8: Create Evidence page**

Create `studybot/src/features/evidence/EvidencePage.tsx`:

```tsx
import { useEffect, useState } from 'react';
import type { EvidenceReadiness } from '../../types/domain';
import { apiClient } from '../../lib/api/client';
import { Card } from '../../components/ui/Card';

export function EvidencePage() {
  const [evidence, setEvidence] = useState<EvidenceReadiness | null>(null);
  useEffect(() => { void apiClient.evidence().then(setEvidence); }, []);

  return (
    <>
      <header className="page-header"><div><h1>Demo readiness</h1><p>A focused evidence view for graders and deployment checks, kept away from the main learner flow.</p></div></header>
      <div className="grid two"><Card title="Service mapping" eyebrow={`Mode: ${evidence?.mode ?? 'loading'}`}>{evidence?.services.map((service) => <div className="row" key={service.name}><strong>{service.name}</strong><span className="muted">{service.status}</span></div>)}</Card><Card title="Retrieval probes" eyebrow="Quality evidence">{evidence?.retrievalProbes.map((probe) => <div className="citation" key={probe.question}><strong>{probe.question}</strong><p>{probe.retrievedSource} · relevance {probe.relevance}</p></div>)}</Card></div>
    </>
  );
}
```

- [ ] **Step 9: Run typecheck**

Run:

```powershell
Set-Location "studybot"; npm run typecheck
```

Expected: PASS.

- [ ] **Step 10: Commit feature pages**

Run:

```powershell
git add "studybot/src/features" "studybot/src/App.tsx"
git commit -m "Build StudyBot SaaS feature pages"
```

---

### Task 8: Verify locally in browser and fix UX defects

**Files:**
- Modify as needed only within `studybot/src/**` and `studybot/api/**`

- [ ] **Step 1: Run full checks**

Run:

```powershell
Set-Location "studybot"; npm run typecheck; npm test
```

Expected: typecheck passes and API tests pass.

- [ ] **Step 2: Start API dev server**

Run in background:

```powershell
Set-Location "studybot"; npm run api:dev
```

Expected: output includes `StudyBot API listening on http://127.0.0.1:8787`.

- [ ] **Step 3: Start Vite dev server**

Run in background:

```powershell
Set-Location "studybot"; npm run dev -- --host 127.0.0.1
```

Expected: Vite serves on `http://127.0.0.1:5173`.

- [ ] **Step 4: Browser verification checklist**

Open `http://127.0.0.1:5173` and verify:

- Dashboard loads with metrics and recent document.
- Documents page uploads a `.txt` or `.pdf` file and shows `Ready`.
- Study Room asks a question and renders answer plus citations.
- Study Guide shows exactly 5 concepts.
- Flashcards show at least 5 cards and flip.
- Quiz shows exactly 10 questions and score changes when selecting options.
- Progress shows topics and weak topics.
- Evidence page shows mock mode and service mapping.
- Browser console has no app errors.

- [ ] **Step 5: Fix concrete issues found**

If browser verification finds a defect, make the smallest targeted code change. Example fix if uploads do not refresh:

```tsx
await apiClient.completeMockUpload(session.uploadUrl, file);
await refresh();
```

Run after each fix:

```powershell
Set-Location "studybot"; npm run typecheck; npm test
```

Expected: PASS.

- [ ] **Step 6: Commit verification fixes**

Run:

```powershell
git add "studybot"
git commit -m "Verify StudyBot local SaaS demo"
```

---

## Self-review

Spec coverage:

- Root-level `studybot/` app: covered in Task 1.
- Vite React + TypeScript frontend: covered in Tasks 1, 5, 6, 7.
- Hono TypeScript API/serverless handlers: covered in Task 3.
- Complete mock mode: covered in Task 3 and Task 4.
- AWS mode via env: covered in Task 1 `.env.example` and Task 3 AWS provider skeleton/readiness.
- SaaS UX pages: covered in Task 7.
- Evidence page separate from core UX: covered in Task 7.
- Testing and browser verification: covered in Tasks 4 and 8.

Placeholder scan: no `TBD`, `TODO`, or unspecified implementation instructions remain.

Type consistency: frontend and backend share names from `src/types/domain.ts`; provider contracts use the same document/study artifact names throughout the plan.
