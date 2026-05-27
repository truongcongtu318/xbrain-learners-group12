# StudyBot React SaaS Design

## Goal

Build a new full-stack TypeScript StudyBot app in the root-level `studybot/` directory. It replaces the Python starter experience with a clean EduTech SaaS product while preserving the AWS architecture from `service.md`: static frontend, API Gateway/Lambda handlers, S3 presigned uploads, Bedrock Knowledge Base with S3 Vectors, DynamoDB app memory, and CloudWatch-ready observability.

The user-facing app must not feel like an AWS architecture diagram. AWS details should support deployment and evidence, not clutter the learning workflow.

## Chosen approach

Use Vite React + TypeScript for the frontend and Hono-based TypeScript API handlers for the backend. This best matches `service.md` because the frontend can deploy as static assets to S3/CloudFront, while API routes can deploy behind API Gateway HTTP API and Lambda.

The app has two provider modes:

- `mock` mode by default, requiring no AWS credentials and giving a complete demo experience.
- `aws` mode selected by environment variables at deployment time.

## Product experience

### Dashboard

The dashboard gives the learner a clean landing page with recent activity, current document status, weekly topics studied, and quick actions. It should feel like a modern study workspace, not a technical console.

### Documents

The Documents area supports lecture upload and simple processing status:

- Uploading
- Analyzing
- Indexing
- Ready
- Failed

In mock mode, processing is simulated. In AWS mode, upload starts with an API-created presigned URL to S3 `raw/{user_id}/{doc_id}/lecture.pdf`, then document status is polled from the API.

### Study Room

The Study Room is the main workflow. The user selects an active document, asks questions, and receives grounded answers with citations. Citations should appear as friendly slide/page chips with a source preview, not raw KB metadata.

### Study Guide

The Study Guide view generates a one-page guide with exactly 5 exam-likely concepts. Each concept includes a short explanation and why it matters.

### Flashcards

The Flashcards view provides front/back cards, a flip interaction, and review actions such as known and review later. Progress is stored through the backend provider.

### Quiz

The Quiz view generates 10 multiple-choice questions from the active document. The user can choose easy, medium, or hard difficulty. Results show score, correct answer, and a short explanation.

### Progress

Progress shows topics studied this week, quiz history, weak topics, and recent learning events. This maps to DynamoDB `StudyEvent` and topic memory items in AWS mode.

### Demo Readiness / Evidence

A secondary evidence page or hidden menu item shows implementation mode, AWS service mapping, ingestion status, retrieval quality probes, and observability checklist. This page is for graders/team defense and must not interrupt the main SaaS user experience.

## Architecture

### Frontend

The React app should use clear feature boundaries:

- `features/dashboard`
- `features/documents`
- `features/study-room`
- `features/study-guide`
- `features/flashcards`
- `features/quiz`
- `features/progress`
- `features/evidence`
- `components/ui`
- `lib/api`

The UI style is bright, modern, and clean EduTech SaaS: light background, calm blue/teal accents, generous spacing, refined cards, restrained motion, and no crowded AWS diagrams on primary pages.

### Backend API

The TypeScript API exposes these routes:

- `GET /health`
- `GET /me`
- `POST /uploads`
- `PUT /uploads/:docId/content` for mock/local upload compatibility if needed
- `GET /documents`
- `GET /documents/:docId`
- `POST /documents/:docId/questions`
- `POST /documents/:docId/study-guide`
- `POST /documents/:docId/flashcards`
- `POST /documents/:docId/quiz`
- `GET /progress/week`
- `GET /evidence/readiness`

The route layer should be thin. Business logic goes through service/provider interfaces so mock and AWS implementations share the same API contract.

### Provider interfaces

Use provider interfaces for:

- `AuthProvider`: resolves demo user locally or Cognito/JWT claims in AWS mode.
- `StorageProvider`: creates upload sessions and handles S3 keys.
- `DocumentProvider`: stores document metadata and processing status.
- `RagProvider`: handles Q&A, citations, and retrieval quality probes.
- `StudyArtifactProvider`: stores study guides, flashcards, quiz outputs, and progress events.
- `ObservabilityProvider`: emits metrics/log fields in AWS mode and no-ops in mock mode.

### Mock mode

Mock mode must be complete and polished:

- Upload creates a document record and simulates processing to `READY`.
- Q&A returns grounded-looking answers with realistic citations.
- Study guide returns 5 concepts.
- Flashcards returns a deck of front/back cards.
- Quiz returns 10 multiple-choice questions and explanations.
- Progress returns weekly topics, quiz score history, and weak topics.

Mock data should be deterministic enough for tests and demos.

### AWS mode

AWS mode is activated through environment variables. The deployment should only require filling env values, not rewriting code.

Expected environment variables include:

- `APP_MODE=mock|aws`
- `AWS_REGION`
- `STUDYBOT_DOCS_BUCKET`
- `STUDYBOT_TABLE_NAME`
- `BEDROCK_KB_ID`
- `BEDROCK_KB_DATA_SOURCE_ID`
- `BEDROCK_MODEL_ID`
- `BEDROCK_EMBEDDING_MODEL_ID`
- `COGNITO_USER_POOL_ID` and `COGNITO_CLIENT_ID` if auth is enabled

AWS behavior:

1. `POST /uploads` creates a document ID, writes a DynamoDB `DOC#` item with `UPLOADING`, and returns a presigned S3 URL for `raw/{user_id}/{doc_id}/lecture.pdf`.
2. Preprocessing chooses either raw PDF copy to `kb-input/` or normalized markdown/text output.
3. API can start and check Bedrock KB ingestion using `StartIngestionJob` and `GetIngestionJob`.
4. Q&A uses Bedrock KB `RetrieveAndGenerate` for simple grounded answers or `Retrieve` + Bedrock Converse for tighter prompt control.
5. Study guide, flashcards, and quiz use retrieved context plus Bedrock generation and are stored in DynamoDB.
6. Progress reads DynamoDB study events and topic memory.

## Data model

The API should use TypeScript domain types for:

- `User`
- `Document`
- `DocumentStatus`
- `UploadSession`
- `Citation`
- `QuestionAnswer`
- `StudyGuide`
- `FlashcardDeck`
- `Quiz`
- `QuizAttempt`
- `StudyEvent`
- `WeeklyProgress`
- `EvidenceReadiness`

DynamoDB AWS mode follows `service.md`:

- `PK = USER#<user_id>`, `SK = DOC#<doc_id>`
- `PK = USER#<user_id>`, `SK = STUDY_GUIDE#<doc_id>`
- `PK = USER#<user_id>`, `SK = FLASHCARDS#<doc_id>`
- `PK = USER#<user_id>`, `SK = QUIZ#<doc_id>`
- `PK = USER#<user_id>`, `SK = STUDY_EVENT#<week_start>#<timestamp>`

DynamoDB stores app memory and learning state only. It does not store retrieval chunks in the primary RAG path.

## Error handling

The UI should translate backend states into learner-friendly language:

- Upload failures: explain file type/size or retry.
- Processing failures: show a retry path and a concise reason.
- KB not ready: show document is still indexing instead of exposing raw Bedrock errors.
- Q&A with no citations: explain that no matching lecture source was found.
- AWS misconfiguration: surface only in evidence/readiness, not in learner workflows.

API responses should use a consistent JSON error shape with `code`, `message`, and optional `details`.

## Testing and verification

Minimum verification before completion:

- Typecheck the TypeScript project.
- Run unit tests for provider contracts and mock data.
- Run API route tests for the key flows.
- Start the app locally in mock mode.
- Use the browser to verify:
  - dashboard loads;
  - document upload moves to ready;
  - Q&A shows answer and citations;
  - study guide has 5 concepts;
  - flashcards work;
  - quiz has 10 questions and score;
  - progress page shows weekly topics;
  - evidence page shows mock/AWS readiness without cluttering core UX.

## Out of scope for first implementation

- Real Cognito login UI.
- Full production tenant isolation tests.
- Real PDF preprocessing Lambda implementation beyond provider contract and AWS integration placeholders.
- Full IaC deployment stack, unless added after the app works locally.
- Billing/subscription SaaS features.

## Open deployment note

The project should include an `.env.example` that makes required deployment env explicit. Local development should run without AWS credentials in mock mode.
