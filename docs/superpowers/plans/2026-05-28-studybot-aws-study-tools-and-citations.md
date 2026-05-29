# StudyBot AWS Study Tools and Citations Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Wire StudyBot to the existing AWS API Gateway study-tool endpoints and show per-answer citations with source file and quoted snippet details.

**Architecture:** Keep API Gateway as the source of truth for real AWS behavior. Normalize AWS response shapes in the frontend API client so React components continue to consume stable domain types. Render citations directly under each assistant answer and allow a click to focus an inline/right-panel citation detail without inventing file URLs.

**Tech Stack:** React 19, TypeScript, Vite, Hono test API, AWS CLI, API Gateway, Lambda, DynamoDB, Bedrock Knowledge Base.

---

## File Structure

- Modify `studybot/src/types/domain.ts`: expand `Citation` with optional source filename/location fields and optional raw URI metadata.
- Modify `studybot/src/lib/api/client.ts`: map existing API Gateway routes and normalize Q&A, study guide, flashcards, quiz, document, and citation responses.
- Modify `studybot/src/features/study-room/StudyRoomPage.tsx`: connect Studio buttons to real APIs and render clickable per-answer citations.
- Modify `studybot/src/styles.css`: add citation detail, selected citation, study guide, and flashcard styles if missing.
- Modify `studybot/api/test/app.test.ts`: keep mock contract tests aligned with expanded citation shape.
- Use AWS CLI during implementation to inspect API Gateway and test live routes before editing mappings.

---

### Task 1: Inspect Existing AWS API Gateway Routes

**Files:**
- Read only: AWS API Gateway resources through AWS CLI
- Reference: `studybot/src/lib/api/client.ts`
- Reference: `studybot/.env.example`

- [ ] **Step 1: Identify the StudyBot REST API**

Run:

```powershell
aws apigateway get-rest-apis --region ap-southeast-1
```

Expected: output includes the existing StudyBot API, likely API ID `9r1xtz9sa7` from prior work. Record the exact API ID and API name in the implementation notes, not in source code.

- [ ] **Step 2: List deployed resources and methods**

Run, replacing `<api-id>` with the actual ID:

```powershell
aws apigateway get-resources --rest-api-id <api-id> --region ap-southeast-1
```

Expected: output includes paths for existing study features, such as `/documents`, `/study`, `/quiz`, `/flashcards`, `/study-guide`, `/summary`, or document-scoped variants. Capture exact path names, method names, and path parameters.

- [ ] **Step 3: Inspect integrations for study endpoints**

Run once per relevant resource ID:

```powershell
aws apigateway get-method --rest-api-id <api-id> --resource-id <resource-id> --http-method POST --region ap-southeast-1
aws apigateway get-integration --rest-api-id <api-id> --resource-id <resource-id> --http-method POST --region ap-southeast-1
```

Expected: each route maps to a Lambda integration. Note whether each endpoint expects `documentId`, `documentIds`, `question`, `difficulty`, or a different body shape.

- [ ] **Step 4: Smoke test live endpoints with curl or PowerShell**

Use a real ready document ID from `/v1/documents`:

```powershell
$base = "https://9r1xtz9sa7.execute-api.ap-southeast-1.amazonaws.com/v1"
$docs = Invoke-RestMethod -Method GET -Uri "$base/documents"
$docId = $docs[0].id
Invoke-RestMethod -Method POST -Uri "$base/study" -ContentType "application/json" -Body (@{ documentIds = @($docId); question = "Summarize this document." } | ConvertTo-Json)
```

Expected: API returns an answer-like payload or a clear error that reveals the required request shape. Use this to decide the exact normalizers in Task 3.

- [ ] **Step 5: Commit nothing**

Do not commit after inspection only. This task produces implementation facts, not source changes.

---

### Task 2: Expand Citation Domain Type Without Breaking Mock Tests

**Files:**
- Modify: `studybot/src/types/domain.ts:30-35`
- Modify: `studybot/api/providers/mock.ts:90-93`
- Test: `studybot/api/test/app.test.ts`

- [ ] **Step 1: Update the citation type**

Change `Citation` in `studybot/src/types/domain.ts` to:

```ts
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
```

- [ ] **Step 2: Update mock citations with file/snippet metadata**

Change the `citations` constant in `studybot/api/providers/mock.ts` to:

```ts
const citations: Citation[] = [
  {
    id: 'cite-1',
    label: 'machine-learning-week-7.pdf · Slide 12',
    filename: 'machine-learning-week-7.pdf',
    documentId: 'doc-machine-learning-101',
    pageNumber: 12,
    location: 'Slide 12',
    snippet: 'Gradient descent updates model weights in the direction that reduces loss.',
    score: 0.94
  },
  {
    id: 'cite-2',
    label: 'machine-learning-week-7.pdf · Slide 18',
    filename: 'machine-learning-week-7.pdf',
    documentId: 'doc-machine-learning-101',
    pageNumber: 18,
    location: 'Slide 18',
    snippet: 'Validation accuracy helps detect overfitting when training accuracy keeps rising.',
    score: 0.89
  }
];
```

- [ ] **Step 3: Add a mock API test for citation file/snippet fields**

Append this test inside `describe('StudyBot API', () => { ... })` in `studybot/api/test/app.test.ts`:

```ts
  it('returns citation file names and snippets with answers', async () => {
    const documents = await json<Array<{ id: string }>>(await app.request('/api/documents'));
    const documentId = documents.find((document) => document.id === 'doc-machine-learning-101')?.id ?? documents[0].id;

    const qa = await json<{ citations: Array<{ filename?: string; snippet: string; location?: string }> }>(await app.request('/api/study', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ documentIds: [documentId], question: 'What is gradient descent?' })
    }));

    expect(qa.citations[0]).toEqual(expect.objectContaining({
      filename: 'machine-learning-week-7.pdf',
      snippet: expect.stringContaining('Gradient descent'),
      location: 'Slide 12'
    }));
  });
```

- [ ] **Step 4: Run the API tests**

Run:

```powershell
npm --prefix studybot test
```

Expected: PASS. If this fails because the exact citation order changed, assert against `qa.citations.find((citation) => citation.filename === 'machine-learning-week-7.pdf')` instead of index `0`.

- [ ] **Step 5: Commit**

```powershell
git add studybot/src/types/domain.ts studybot/api/providers/mock.ts studybot/api/test/app.test.ts
git commit -m @'
Expand StudyBot citation metadata

Co-Authored-By: Claude Opus 4.7 <noreply@anthropic.com>
'@
```

---

### Task 3: Normalize Existing AWS API Gateway Responses in the Frontend Client

**Files:**
- Modify: `studybot/src/lib/api/client.ts`
- Test: `studybot/src/lib/api/client.ts` through typecheck/build

- [ ] **Step 1: Add response helper types below imports**

Add to `studybot/src/lib/api/client.ts` after the imports:

```ts
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
```

- [ ] **Step 2: Add small normalization helpers before `export const apiClient`**

Add:

```ts
function asRecord(value: unknown): UnknownRecord {
  return value && typeof value === 'object' ? value as UnknownRecord : {};
}

function asString(value: unknown, fallback = ''): string {
  return typeof value === 'string' ? value : fallback;
}

function asNumber(value: unknown, fallback = 0): number {
  return typeof value === 'number' ? value : fallback;
}

function normalizeCitation(value: unknown, index: number) {
  const citation = asRecord(value) as AwsCitation;
  const filename = citation.filename || citation.fileName;
  const location = citation.location || (citation.pageNumber || citation.page ? `Page ${citation.pageNumber || citation.page}` : undefined);
  const snippet = citation.snippet || citation.text || citation.content || '';

  return {
    id: citation.id || `citation-${index + 1}`,
    label: citation.label || [filename, location].filter(Boolean).join(' · ') || `Citation ${index + 1}`,
    snippet,
    score: citation.score ?? 0,
    filename,
    documentId: citation.documentId,
    pageNumber: citation.pageNumber || citation.page,
    location,
    sourceUri: citation.sourceUri || citation.uri
  };
}
```

- [ ] **Step 3: Add `normalizeQuestionAnswer` before `export const apiClient`**

Add:

```ts
function normalizeQuestionAnswer(value: unknown, question: string): QuestionAnswer {
  const body = asRecord(value);
  const citations = Array.isArray(body.citations) ? body.citations : Array.isArray(body.sources) ? body.sources : [];

  return {
    id: asString(body.id, `qa-${Date.now()}`),
    question: asString(body.question, question),
    answer: asString(body.answer, asString(body.response, asString(body.output, ''))),
    citations: citations.map(normalizeCitation),
    createdAt: asString(body.createdAt, new Date().toISOString())
  };
}
```

- [ ] **Step 4: Add route constants based on Task 1 findings**

Add near `apiBaseUrl`:

```ts
const routes = {
  documents: '/documents',
  upload: '/upload',
  study: '/study',
  studyGuide: (documentId: string) => `/documents/${documentId}/study-guide`,
  flashcards: (documentId: string) => `/documents/${documentId}/flashcards`,
  quiz: (documentId: string) => `/documents/${documentId}/quiz`
};
```

If AWS CLI inspection shows non-document-scoped routes, use the actual API Gateway paths instead. For example:

```ts
const routes = {
  documents: '/documents',
  upload: '/upload',
  study: '/study',
  studyGuide: () => '/study-guide',
  flashcards: () => '/flashcards',
  quiz: () => '/quiz'
};
```

- [ ] **Step 5: Update `apiClient.ask` to normalize AWS shapes**

Replace the current `ask` entry with:

```ts
  ask: async (documentIds: string[], question: string) => normalizeQuestionAnswer(
    await request<unknown>(routes.study, { method: 'POST', body: JSON.stringify({ documentIds, question } satisfies StudyRequest) }),
    question
  ),
```

- [ ] **Step 6: Update documents/upload/study tools to use route constants**

Replace the matching `apiClient` entries with:

```ts
  documents: () => request<StudyDocument[]>(routes.documents),
  document: (documentId: string) => request<StudyDocument>(`${routes.documents}/${documentId}`),
  createUpload: (filename: string, contentType: string) => request<UploadSession>(routes.upload, { method: 'POST', body: JSON.stringify({ fileName: filename, contentType }) }),
  studyGuide: (documentId: string) => request<StudyGuide>(routes.studyGuide(documentId), { method: 'POST', body: JSON.stringify({ documentId }) }),
  flashcards: (documentId: string) => request<FlashcardDeck>(routes.flashcards(documentId), { method: 'POST', body: JSON.stringify({ documentId }) }),
  quiz: (documentId: string, difficulty: Difficulty) => request<Quiz>(routes.quiz(documentId), { method: 'POST', body: JSON.stringify({ documentId, difficulty }) }),
```

- [ ] **Step 7: Run typecheck**

Run:

```powershell
npm --prefix studybot run typecheck
```

Expected: PASS.

- [ ] **Step 8: Commit**

```powershell
git add studybot/src/lib/api/client.ts
git commit -m @'
Map StudyBot client to AWS study routes

Co-Authored-By: Claude Opus 4.7 <noreply@anthropic.com>
'@
```

---

### Task 4: Connect Study Guide and Flashcards Buttons to Real APIs

**Files:**
- Modify: `studybot/src/features/study-room/StudyRoomPage.tsx`
- Test: typecheck and browser smoke test

- [ ] **Step 1: Import the missing domain types**

Change the import at the top of `StudyRoomPage.tsx` from:

```ts
import type { QuestionAnswer, Quiz, StudyDocument } from '../../types/domain';
```

to:

```ts
import type { FlashcardDeck, QuestionAnswer, Quiz, StudyDocument, StudyGuide } from '../../types/domain';
```

- [ ] **Step 2: Add state for study guide, flashcards, and selected citation**

After the `quiz` state, add:

```ts
  const [studyGuide, setStudyGuide] = useState<StudyGuide | null>(null);
  const [flashcards, setFlashcards] = useState<FlashcardDeck | null>(null);
  const [selectedCitationId, setSelectedCitationId] = useState<string | null>(null);
```

- [ ] **Step 3: Add loading state for study tools**

After `quizLoading`, add:

```ts
  const [toolLoading, setToolLoading] = useState<'study-guide' | 'flashcards' | null>(null);
```

- [ ] **Step 4: Add `createStudyGuide` function before `startQuiz`**

Add:

```ts
  async function createStudyGuide() {
    if (!primaryDocument) return;
    setToolLoading('study-guide');
    setErrorMessage('');
    try {
      setStudyGuide(await apiClient.studyGuide(primaryDocument.id));
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : 'Unable to create study guide.');
    } finally {
      setToolLoading(null);
    }
  }
```

- [ ] **Step 5: Add `createFlashcards` function before `startQuiz`**

Add:

```ts
  async function createFlashcards() {
    if (!primaryDocument) return;
    setToolLoading('flashcards');
    setErrorMessage('');
    try {
      setFlashcards(await apiClient.flashcards(primaryDocument.id));
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : 'Unable to create flashcards.');
    } finally {
      setToolLoading(null);
    }
  }
```

- [ ] **Step 6: Reset tool output when starting a quiz**

Inside `startQuiz`, after `setQuiz(null);`, add:

```ts
    setStudyGuide(null);
    setFlashcards(null);
```

- [ ] **Step 7: Replace placeholder Studio button handlers**

Replace:

```tsx
<Button variant="secondary" onClick={() => setErrorMessage('Connect the study guide API after upload processing is ready.')}><StickyNote size={16} /> Study guide</Button>
<Button variant="secondary" onClick={() => setErrorMessage('Connect the flashcards API after upload processing is ready.')}><BookOpenCheck size={16} /> Flashcards</Button>
<Button variant="secondary" onClick={() => void startQuiz()} disabled={quizLoading || !primaryDocument}><Target size={16} /> Quiz</Button>
```

with:

```tsx
<Button variant="secondary" onClick={() => void createStudyGuide()} disabled={toolLoading !== null || !primaryDocument}><StickyNote size={16} /> {toolLoading === 'study-guide' ? 'Creating...' : 'Study guide'}</Button>
<Button variant="secondary" onClick={() => void createFlashcards()} disabled={toolLoading !== null || !primaryDocument}><BookOpenCheck size={16} /> {toolLoading === 'flashcards' ? 'Creating...' : 'Flashcards'}</Button>
<Button variant="secondary" onClick={() => void startQuiz()} disabled={quizLoading || !primaryDocument}><Target size={16} /> Quiz</Button>
```

- [ ] **Step 8: Render study guide output in the conversation**

Before the quiz loading block, add:

```tsx
          {studyGuide && (
            <article className="assistant-bubble study-guide-card">
              <div className="assistant-label"><StickyNote size={16} /> Study guide</div>
              <div className="study-guide-list">
                {studyGuide.concepts.map((concept) => (
                  <section key={concept.id} className="study-guide-item">
                    <h2>{concept.title}</h2>
                    <p>{concept.explanation}</p>
                    <small>{concept.whyItMatters}</small>
                  </section>
                ))}
              </div>
            </article>
          )}
```

- [ ] **Step 9: Render flashcards output in the conversation**

After the study guide block, add:

```tsx
          {flashcards && (
            <article className="assistant-bubble flashcards-card">
              <div className="assistant-label"><BookOpenCheck size={16} /> Flashcards</div>
              <div className="flashcard-list">
                {flashcards.cards.map((card) => (
                  <section key={card.id} className="flashcard-item">
                    <h2>{card.front}</h2>
                    <p>{card.back}</p>
                    <small>{card.sourceLabel}</small>
                  </section>
                ))}
              </div>
            </article>
          )}
```

- [ ] **Step 10: Run typecheck**

Run:

```powershell
npm --prefix studybot run typecheck
```

Expected: PASS.

- [ ] **Step 11: Commit**

```powershell
git add studybot/src/features/study-room/StudyRoomPage.tsx
git commit -m @'
Connect StudyBot study tool actions

Co-Authored-By: Claude Opus 4.7 <noreply@anthropic.com>
'@
```

---

### Task 5: Render Clickable Per-Answer Citations

**Files:**
- Modify: `studybot/src/features/study-room/StudyRoomPage.tsx`
- Modify: `studybot/src/styles.css`
- Test: browser smoke test

- [ ] **Step 1: Compute the selected citation**

Before `return`, after `quizScore`, add:

```ts
  const answerCitations = messages.flatMap((message) => message.citations);
  const selectedCitation = answerCitations.find((citation) => citation.id === selectedCitationId) ?? latestAnswer?.citations[0] ?? null;
```

- [ ] **Step 2: Replace citation chips under answers with clickable citation cards**

Replace:

```tsx
                <div className="citation-chips">
                  {message.citations.map((citation) => <span key={citation.id}>{citation.label}</span>)}
                </div>
```

with:

```tsx
                <div className="answer-citations">
                  {message.citations.map((citation) => (
                    <button
                      key={citation.id}
                      className={selectedCitationId === citation.id ? 'answer-citation selected' : 'answer-citation'}
                      onClick={() => setSelectedCitationId(citation.id)}
                      type="button"
                    >
                      <strong>{citation.filename || citation.label}</strong>
                      {citation.location && <span>{citation.location}</span>}
                      <small>{citation.snippet}</small>
                    </button>
                  ))}
                </div>
```

- [ ] **Step 3: Replace the right-panel citation content with selected detail**

Replace the current citations card content with:

```tsx
          {selectedCitation ? (
            <article className="citation-detail-card">
              <strong>{selectedCitation.filename || selectedCitation.label}</strong>
              {selectedCitation.location && <span>{selectedCitation.location}</span>}
              <p>{selectedCitation.snippet}</p>
              {selectedCitation.sourceUri && <small>{selectedCitation.sourceUri}</small>}
            </article>
          ) : (
            <p className="panel-note">Cited snippets will appear here after an answer.</p>
          )}
```

Keep the surrounding `<div className="notebook-card compact-card">` and panel title unchanged.

- [ ] **Step 4: Add citation styles**

Append to `studybot/src/styles.css`:

```css
.answer-citations {
  display: grid;
  gap: 0.65rem;
  margin-top: 1rem;
}

.answer-citation {
  display: grid;
  gap: 0.3rem;
  width: 100%;
  border: 1px solid rgba(28, 35, 58, 0.12);
  border-radius: 16px;
  background: rgba(255, 255, 255, 0.78);
  padding: 0.8rem;
  text-align: left;
  color: inherit;
  cursor: pointer;
}

.answer-citation:hover,
.answer-citation.selected {
  border-color: rgba(54, 91, 255, 0.45);
  box-shadow: 0 14px 30px rgba(23, 31, 70, 0.1);
}

.answer-citation strong {
  font-size: 0.88rem;
}

.answer-citation span,
.answer-citation small,
.citation-detail-card span,
.citation-detail-card small {
  color: rgba(28, 35, 58, 0.62);
}

.answer-citation small {
  line-height: 1.45;
}

.citation-detail-card {
  display: grid;
  gap: 0.55rem;
  border: 1px solid rgba(28, 35, 58, 0.12);
  border-radius: 18px;
  background: rgba(255, 255, 255, 0.76);
  padding: 0.95rem;
}

.citation-detail-card p {
  margin: 0;
  line-height: 1.55;
}
```

- [ ] **Step 5: Add study tool card styles if missing**

Append:

```css
.study-guide-list,
.flashcard-list {
  display: grid;
  gap: 0.8rem;
  margin-top: 1rem;
}

.study-guide-item,
.flashcard-item {
  border: 1px solid rgba(28, 35, 58, 0.1);
  border-radius: 18px;
  background: rgba(255, 255, 255, 0.72);
  padding: 0.95rem;
}

.study-guide-item h2,
.flashcard-item h2 {
  margin: 0 0 0.45rem;
  font-size: 1rem;
}

.study-guide-item p,
.flashcard-item p {
  margin: 0 0 0.45rem;
}

.study-guide-item small,
.flashcard-item small {
  color: rgba(28, 35, 58, 0.62);
}
```

- [ ] **Step 6: Run typecheck and build**

Run:

```powershell
npm --prefix studybot run typecheck
npm --prefix studybot run build
```

Expected: both PASS.

- [ ] **Step 7: Commit**

```powershell
git add studybot/src/features/study-room/StudyRoomPage.tsx studybot/src/styles.css
git commit -m @'
Show per-answer StudyBot citations

Co-Authored-By: Claude Opus 4.7 <noreply@anthropic.com>
'@
```

---

### Task 6: Verify Real AWS Flow in Browser

**Files:**
- Read: `studybot/.env.local`
- Modify only if needed: `studybot/.env.local`

- [ ] **Step 1: Confirm frontend API base points at API Gateway**

Check `studybot/.env.local` contains the actual API Gateway base URL, for example:

```text
VITE_API_BASE_URL=https://9r1xtz9sa7.execute-api.ap-southeast-1.amazonaws.com/v1
```

If missing, add it with the actual API ID/stage from Task 1.

- [ ] **Step 2: Start the frontend dev server**

Run:

```powershell
npm --prefix studybot run dev
```

Expected: Vite starts on `http://localhost:5173` or the next available port.

- [ ] **Step 3: Browser smoke test the golden path**

Use Playwright or Chrome DevTools MCP:

1. Open the Vite URL.
2. Confirm documents load from AWS `/v1/documents`.
3. Select a READY document.
4. Ask: `Summarize this source for exam review.`
5. Confirm the answer appears.
6. Confirm citation cards appear directly below the answer with filename and snippet.
7. Click a citation card.
8. Confirm the right citation panel shows the same filename, location, and snippet.
9. Click Study guide, Flashcards, and Quiz.
10. Confirm each tool renders output or a clear backend error message from the real API.

- [ ] **Step 4: Check browser console and network**

Expected: no React runtime errors, no failed CORS preflight for the study endpoints, and no unexpected 404 caused by wrong path mapping.

- [ ] **Step 5: Run final local checks**

Run:

```powershell
npm --prefix studybot test
npm --prefix studybot run typecheck
npm --prefix studybot run build
```

Expected: all PASS.

- [ ] **Step 6: Commit browser/env-safe fixes only**

If source code changed during verification:

```powershell
git add studybot/src/lib/api/client.ts studybot/src/features/study-room/StudyRoomPage.tsx studybot/src/styles.css studybot/src/types/domain.ts studybot/api/providers/mock.ts studybot/api/test/app.test.ts
git commit -m @'
Verify StudyBot AWS study flow

Co-Authored-By: Claude Opus 4.7 <noreply@anthropic.com>
'@
```

Do not commit `studybot/.env.local`.

---

## Self-Review

- Spec coverage: The plan covers AWS API Gateway inspection, route mapping, study guide, flashcards, quiz, Q&A, and inline/right-panel citations.
- Placeholder scan: No `TBD`, `TODO`, or vague implementation-only steps remain.
- Type consistency: Citation, QuestionAnswer, StudyGuide, FlashcardDeck, and Quiz names match existing domain types in `studybot/src/types/domain.ts`.
