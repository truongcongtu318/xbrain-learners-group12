# Handoff Summary — StudyBot React SaaS / Claude-like RAG Redesign

## Project context

Repository: `c:\Users\tct31\project\xbrain-learners-group12`

The project is an EduTech “AI Study Buddy” app. The canonical requirements come from `service.md`.

Original AWS target architecture:

- Static frontend: S3 + CloudFront
- API: API Gateway HTTP API + Lambda
- RAG: Amazon Bedrock Knowledge Base + S3 Vectors
- Document storage: private S3 bucket
- Upload flow: presigned S3 URL to raw upload path
- Preprocessing: `pypdf` / `pdfplumber`, with Textract/Tesseract fallback for scanned/table/image-heavy PDFs
- App memory/status/history: DynamoDB
- Auth: Cognito/JWT-ready
- Observability: CloudWatch-ready logs/metrics
- User-facing features:
  - Upload learning documents
  - Ask questions with citations
  - Generate study guide
  - Generate flashcards
  - Generate quiz
  - Track weekly progress

Important UX rule: the learner-facing web app should not look like an AWS diagram or enterprise dashboard. AWS readiness/evidence should be hidden/secondary.

## Major pivot

The original W7 Python starter app was temporarily modified and browser-tested, but the user pivoted to a new root-level React/TypeScript app.

The real app is now in:

- `studybot/`

This folder is outside `W7/`.

Chosen stack:

- Vite
- React
- TypeScript
- Hono API routes/serverless handlers
- Zod validation
- Vitest
- Mock mode by default
- AWS-ready provider skeleton selected via env vars
- Cognito-ready shape, but local/demo auth for now

Goal: “full-stack TypeScript luôn”, deploy to AWS later by filling env vars.

## Important completed work

A full root-level `studybot/` app was implemented through Tasks 1–8.

Main completed features:

- TypeScript app scaffold
- Shared domain contracts
- Hono API
- Mock providers
- AWS provider skeleton
- API tests
- Frontend API client
- UI primitives
- App shell/navigation
- Feature pages:
  - Dashboard
  - Documents
  - Study Room
  - Study Guide
  - Flashcards
  - Quiz
  - Progress
  - Evidence/Readiness
- Local typecheck/tests/browser verification

Browser verification passed for:

- Dashboard load
- Document upload mock flow
- Documents ready state
- Study room Q&A
- Citations rendering
- Study guide with 5 concepts
- Flashcards flip/review
- Quiz with 10 questions, score, correct answer, explanation
- Progress page
- Evidence/readiness page
- Browser console clean after favicon fix

## Current unresolved product problem

The user disliked the current UI.

User feedback:

> UI hiện tại tôi thấy quá công nghiệp không được hoàn thiện tôi muốn 1 web tương tự cho ứng dụng chatbot RAG này theo phong cách của ứng dụng claude

Meaning:

- Current UI feels too industrial/dashboard-like.
- They want a Claude-like web app for this RAG chatbot.

A redesign brainstorming session started.

Three directions were explored:

### A. Claude Chat Workspace

- Chat centered
- Small document sidebar
- Most Claude-like
- Good for chatbot RAG

### B. Claude Home + Cards

- Warm Claude-like homepage
- Hero prompt and quick cards
- Better landing page
- Chat not central immediately

### C. Claude + Research Panel

- Left narrow icon rail
- Center Claude-like chat
- Right source/citation panel
- Stronger RAG/citations
- More like NotebookLM

User first chose hybrid A+B, then rejected it:

> không thích kiểu này lắm dùng kiểu C vẽ mockup tôi xem thử

Then option C mockup was created.

User observed:

> Tôi thấy web này giống phiên bản thu gọn của notebook llm vậy nhỉ

The correct product interpretation:

- Yes, option C naturally resembles a compact NotebookLM because both are source-grounded RAG study/research interfaces.
- This is a strength for StudyBot.
- The best direction is **Claude-like chat workspace + NotebookLM-lite source panel**:
  - Chat remains central like Claude.
  - Source/citation panel is useful but visually quieter.
  - Study tools live in the right panel as secondary actions.
  - Avoid industrial dashboards.
  - Keep warm neutral Claude-style palette.

## Current design direction to continue

Continue with:

# Claude-like Study Workspace + NotebookLM-lite Source Panel

Core layout:

- Left icon rail:
  - StudyBot logo
  - Chat
  - Documents
  - Guide
  - Flashcards
  - Quiz
  - Progress/settings
- Center:
  - Main chat workspace
  - Claude-style warm neutral background
  - Conversation focused on the selected document
  - Citation chips inline under assistant answers
  - Input composer at bottom
  - Attach document and send actions
- Right:
  - Sources / Lecture context panel
  - Citation cards with score/snippet
  - Current document status/page count
  - Secondary study actions:
    - Generate study guide
    - Make flashcards
    - Start quiz
  - Small progress summary
- Dashboard metrics should be removed or made very quiet.
- Evidence/readiness should stay hidden/secondary, not primary navigation.

## Visual companion files created

Visual mockup files live under:

- `.superpowers/brainstorm/577-1779897969/content/`

Files:

- `claude-like-layout-options.html`
  - A/B/C option cards
- `claude-hybrid-ab-v1.html`
  - rejected hybrid A+B
- `claude-research-panel-c-v1.html`
  - current preferred option C mockup

The option C mockup includes:

- Left icon rail
- Center chat grounded in `machine-learning-week-7.pdf`
- Right “Sources / Lecture context” panel
- Citation cards for Slide 18 and Slide 20
- Actions:
  - Generate study guide
  - Make flashcards
  - Start quiz

## Important files in root `studybot/`

### App entry/config

- `studybot/package.json`
- `studybot/index.html`
- `studybot/vite.config.ts`
- `studybot/tsconfig.json`
- `studybot/tsconfig.node.json`
- `studybot/src/main.tsx`
- `studybot/src/App.tsx`
- `studybot/src/styles.css`

### API

- `studybot/api/app.ts`
- `studybot/api/dev-server.ts`
- `studybot/api/lambda.ts`
- `studybot/api/config.ts`
- `studybot/api/types.ts`
- `studybot/api/errors.ts`
- `studybot/api/providers/mock.ts`
- `studybot/api/providers/aws.ts`
- `studybot/api/providers/index.ts`
- `studybot/api/services/documents.ts`
- `studybot/api/services/study.ts`
- `studybot/api/routes/*.ts`
- `studybot/api/test/app.test.ts`

### Frontend types/client

- `studybot/src/types/domain.ts`
- `studybot/src/lib/api/client.ts`
- `studybot/src/lib/api/errors.ts`
- `studybot/src/lib/utils/date.ts`

### UI/components/pages

- `studybot/src/components/ui/Button.tsx`
- `studybot/src/components/ui/Card.tsx`
- `studybot/src/components/ui/EmptyState.tsx`
- `studybot/src/components/ui/StatusBadge.tsx`
- `studybot/src/components/ui/MetricCard.tsx`

Feature pages:

- `studybot/src/features/shell/AppShell.tsx`
- `studybot/src/features/dashboard/DashboardPage.tsx`
- `studybot/src/features/documents/DocumentsPage.tsx`
- `studybot/src/features/study-room/StudyRoomPage.tsx`
- `studybot/src/features/study-guide/StudyGuidePage.tsx`
- `studybot/src/features/flashcards/FlashcardsPage.tsx`
- `studybot/src/features/quiz/QuizPage.tsx`
- `studybot/src/features/progress/ProgressPage.tsx`
- `studybot/src/features/evidence/EvidencePage.tsx`

## Important implementation details

### `studybot/package.json`

Scripts:

```json
{
  "dev": "vite",
  "api:dev": "tsx watch api/dev-server.ts",
  "build": "tsc -p tsconfig.json && vite build",
  "typecheck": "tsc -p tsconfig.json --noEmit",
  "test": "vitest run",
  "test:watch": "vitest"
}
```

Important dependencies:

- `react`
- `react-dom`
- `vite`
- `typescript`
- `hono`
- `@hono/node-server`
- `@hono/zod-validator`
- `zod`
- `lucide-react`
- `vitest`
- Testing Library packages
- `tsx`

### `.env.example`

Expected vars:

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

### API routes

Base path: `/api`

Routes include:

- `GET /api/health`
- `GET /api/me`
- `POST /api/uploads`
- `PUT /api/uploads/:docId/content`
- `GET /api/documents`
- `GET /api/documents/:docId`
- `POST /api/documents/:docId/questions`
- `POST /api/documents/:docId/study-guide`
- `POST /api/documents/:docId/flashcards`
- `POST /api/documents/:docId/quiz`
- `GET /api/progress/week`
- `GET /api/evidence/readiness`

### Provider behavior

Mock provider:

- Default mode
- Deterministic IDs/timestamps
- Seed document:
  - `doc-machine-learning-101`
  - `machine-learning-week-7.pdf`
- Upload session creates ready mock document after content PUT
- Study guide returns exactly 5 concepts
- Flashcards returns at least 5 cards
- Quiz returns exactly 10 questions
- Q&A returns citations

AWS provider skeleton:

- Does not silently fake success.
- If required AWS config is missing, returns `AWS_CONFIG_MISSING`.
- If config is present but AWS integration is not implemented, returns `AWS_PROVIDER_NOT_IMPLEMENTED` with status `501`.
- Mock upload completion is disabled in AWS mode.

## Important bugs already fixed

1. `StatusBadge.tsx` import path

Correct:

```ts
import type { DocumentStatus } from '../../types/domain';
```

2. `client.ts` upload flow

The frontend client must use full `UploadSession`, not just URL:

```ts
completeUpload: async (session: UploadSession, file: File) => {
  const response = await fetch(session.uploadUrl, {
    method: session.method,
    headers: session.headers,
    body: file
  });

  if (!response.ok) {
    throw new ClientApiError('UPLOAD_FAILED', 'Upload failed.', response.status);
  }
}
```

3. `vite.config.ts` Vitest typing

Needs:

```ts
/// <reference types="vitest/config" />
```

4. `tsconfig.json`

Main include should not include `vite.config.ts`.

It was changed to:

```json
"include": ["src", "api"]
```

5. Hidden BOM in `studybot/package.json`

This caused:

- `tsx` API server parse failure
- Vite/PostCSS config JSON parse error
- `/src/styles.css` 500

Fixed by rewriting `package.json` without BOM.

6. Favicon 404

Fixed by adding inline SVG favicon in `studybot/index.html`.

## Git / repo state notes

At the time of handoff, git status had many uncommitted changes.

Known git status snapshot included:

- Modified:
  - `.gitignore`
  - `studybot/index.html`
  - `studybot/package.json`
  - `studybot/src/components/ui/StatusBadge.tsx`
  - `studybot/src/lib/api/client.ts`
  - `studybot/tsconfig.json`
  - `studybot/vite.config.ts`
- Untracked:
  - `.claude/`
  - `.superpowers/`
  - `docs/.$edutech-study-buddy-aws-architecture.drawio.bkp`
  - `docs/edutech-study-buddy-aws-architecture.drawio`
  - `docs/superpowers/plans/`
  - `studybot/src/App.tsx`
  - `studybot/src/features/`
  - `studybot/src/main.tsx`
  - `studybot/src/styles.css`

Recent commits:

- `9222ec2 Add StudyBot frontend API client and UI primitives`
- `2c03824 Test StudyBot mock API flows`
- `da9102c Harden StudyBot provider modes`
- `cac6dfc Build StudyBot mock API providers`
- `3daa951 Define StudyBot domain contracts`
- Earlier spec commit:
  - `5ce20bd Add StudyBot React SaaS design spec`

Do not blindly commit everything. Check status/diff first and avoid committing `.claude/`, `.superpowers/`, temp files, or secrets.

Consider adding `.superpowers/` to `.gitignore` if appropriate.

## Skills/process constraints

The redesign is still in brainstorming/spec phase.

Important hard gate:

- Do not implement redesign until the user approves the design/spec.
- Continue design discussion first.
- Then write a short redesign spec.
- Then write implementation plan.
- Only then edit app files.

Relevant process:

- `superpowers:brainstorming` was active for UI redesign.
- If implementing later, likely use planning/writing-plans before code.
- For UI/frontend changes, after implementation start the dev server and test in browser before claiming complete.

## Recommended next response in new session

Start from the UI redesign continuation.

Suggested response:

> Không có lỗi nghiêm trọng; mình chỉ bị ngắt lúc đang đưa mockup C lên visual companion. Nhận xét của bạn đúng: hướng C giống NotebookLM mini vì cùng là RAG source-grounded chat. Mình sẽ chốt hướng thành “Claude-like Study Workspace + NotebookLM-lite Source Panel”: chat trung tâm như Claude, panel nguồn/citation bên phải nhưng nhẹ hơn, và study guide/flashcards/quiz là action phụ. Tiếp theo mình sẽ viết spec redesign ngắn để bạn duyệt trước khi sửa code.

Then proceed to write/design the spec only after user agrees, or if user says “ok/tiếp tục”, create the redesign spec and plan.

## Likely redesign implementation targets after approval

Files likely to change:

- `studybot/src/features/shell/AppShell.tsx`
- `studybot/src/App.tsx`
- `studybot/src/styles.css`
- `studybot/src/features/study-room/StudyRoomPage.tsx`
- Possibly reduce/remove:
  - `DashboardPage`
  - industrial metric cards
- Possibly reuse:
  - `DocumentsPage`
  - `StudyGuidePage`
  - `FlashcardsPage`
  - `QuizPage`
  - `ProgressPage`
  - `EvidencePage`

Expected UI changes:

- Make Study Room the primary/home experience.
- Replace dashboard-first structure with chat-first workspace.
- Add persistent right source/citation panel.
- Make evidence/readiness secondary.
- Keep warm Claude-like colors:
  - cream / warm neutral background
  - dark brown text
  - terracotta accent
  - soft borders/shadows
- Avoid overly corporate cards, metrics, and heavy nav.

## Important user preferences learned

- User wants modern clean SaaS, but not industrial/enterprise.
- User prefers Claude-like UI.
- User is okay with NotebookLM-lite similarity for a RAG Study Buddy, as long as it is polished and not a cluttered dashboard.
- User wants full-stack TypeScript in root `studybot/`, outside `W7/`.
- User wants AWS deployment later to require env vars, not rewriting the app.
- User wants skill-based/multitask workflow, but also wants practical progress.
