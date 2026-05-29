# StudyBot NotebookLM-lite Redesign Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Redesign StudyBot from a dashboard-first SaaS UI into a NotebookLM-lite source-grounded study workspace.

**Architecture:** Keep the existing React/Vite/Hono/mock API architecture. Move the learner experience into a three-column workspace: sources on the left, grounded chat in the center, and source/study actions on the right. Reuse existing API client methods and domain contracts; do not change backend routes or provider behavior.

**Tech Stack:** React, TypeScript, Vite, Hono API, Zod contracts, Vitest, lucide-react, CSS modules via global `styles.css`.

---

## File structure and responsibilities

- Modify `studybot/src/App.tsx`
  - Make the study workspace the default page.
  - Keep `activeDocumentId` as the single selected source state.
  - Pass navigation and document selection into the workspace.

- Modify `studybot/src/features/shell/AppShell.tsx`
  - Replace the current large dashboard sidebar with a minimal warm app frame.
  - Keep `PageKey` compatibility for existing pages.
  - Hide evidence/readiness as a small secondary link.

- Modify `studybot/src/features/study-room/StudyRoomPage.tsx`
  - Convert this page into the primary three-column NotebookLM-lite workspace.
  - Fetch documents, current document, weekly progress, and Q&A state.
  - Include source list, upload flow, grounded chat, citations, study actions, and progress summary.

- Modify `studybot/src/features/documents/DocumentsPage.tsx`
  - Keep as a secondary full-page source manager.
  - Make its copy/style consistent with the new source library language.
  - Make document rows selectable so they update `activeDocumentId`.

- Modify `studybot/src/styles.css`
  - Replace blue/teal dashboard tokens with warm academic tokens.
  - Add classes for app frame, source panel, chat panel, notebook panel, composer, citation chips, and responsive behavior.
  - Preserve existing generic classes where reused by secondary pages.

- No backend files should change.

---

### Task 1: Make Study Room the Default Experience

**Files:**
- Modify: `studybot/src/App.tsx`

- [ ] **Step 1: Change the initial page state**

Update `studybot/src/App.tsx` so the app opens on the study workspace, not the dashboard.

```tsx
import { useState } from 'react';
import { AppShell, type PageKey } from './features/shell/AppShell';
import { DashboardPage } from './features/dashboard/DashboardPage';
import { DocumentsPage } from './features/documents/DocumentsPage';
import { EvidencePage } from './features/evidence/EvidencePage';
import { FlashcardsPage } from './features/flashcards/FlashcardsPage';
import { ProgressPage } from './features/progress/ProgressPage';
import { QuizPage } from './features/quiz/QuizPage';
import { StudyGuidePage } from './features/study-guide/StudyGuidePage';
import { StudyRoomPage } from './features/study-room/StudyRoomPage';

export function App() {
  const [page, setPage] = useState<PageKey>('study');
  const [activeDocumentId, setActiveDocumentId] = useState('doc-machine-learning-101');

  const content = {
    dashboard: <DashboardPage onNavigate={setPage} onSelectDocument={setActiveDocumentId} />,
    documents: <DocumentsPage onSelectDocument={setActiveDocumentId} />,
    study: <StudyRoomPage activeDocumentId={activeDocumentId} onSelectDocument={setActiveDocumentId} onNavigate={setPage} />,
    guide: <StudyGuidePage activeDocumentId={activeDocumentId} />,
    flashcards: <FlashcardsPage activeDocumentId={activeDocumentId} />,
    quiz: <QuizPage activeDocumentId={activeDocumentId} />,
    progress: <ProgressPage />,
    evidence: <EvidencePage />
  }[page];

  return (
    <AppShell currentPage={page} onNavigate={setPage}>
      {content}
    </AppShell>
  );
}
```

- [ ] **Step 2: Run typecheck and expect the new prop error**

Run:

```bash
npm --prefix studybot run typecheck
```

Expected: FAIL because `StudyRoomPage` does not yet accept `onSelectDocument` and `onNavigate`.

- [ ] **Step 3: Do not commit yet**

This task intentionally leaves a type error for Task 3 to fix when the workspace component is implemented.

---

### Task 2: Simplify the App Shell Navigation

**Files:**
- Modify: `studybot/src/features/shell/AppShell.tsx`

- [ ] **Step 1: Replace dashboard-heavy navigation with a light frame**

Replace the file with:

```tsx
import type { PropsWithChildren } from 'react';
import { BookOpen, FileText, GraduationCap, LineChart, ShieldCheck, Sparkles, StickyNote, Trophy } from 'lucide-react';

export type PageKey = 'dashboard' | 'documents' | 'study' | 'guide' | 'flashcards' | 'quiz' | 'progress' | 'evidence';

const navItems: Array<{ key: Exclude<PageKey, 'dashboard' | 'evidence'>; label: string; icon: typeof BookOpen }> = [
  { key: 'study', label: 'Workspace', icon: BookOpen },
  { key: 'documents', label: 'Sources', icon: FileText },
  { key: 'guide', label: 'Guide', icon: StickyNote },
  { key: 'flashcards', label: 'Cards', icon: Sparkles },
  { key: 'quiz', label: 'Quiz', icon: Trophy },
  { key: 'progress', label: 'Progress', icon: LineChart }
];

interface AppShellProps {
  currentPage: PageKey;
  onNavigate: (page: PageKey) => void;
}

export function AppShell({ currentPage, onNavigate, children }: PropsWithChildren<AppShellProps>) {
  return (
    <div className="app-shell">
      <aside className="app-rail" aria-label="StudyBot navigation">
        <button className="rail-brand" onClick={() => onNavigate('study')} aria-label="Go to workspace">
          <GraduationCap size={22} />
        </button>
        <nav className="rail-nav">
          {navItems.map((item) => {
            const Icon = item.icon;
            return (
              <button key={item.key} className={currentPage === item.key ? 'rail-item active' : 'rail-item'} onClick={() => onNavigate(item.key)} title={item.label}>
                <Icon size={18} />
                <span>{item.label}</span>
              </button>
            );
          })}
        </nav>
        <button className="rail-readiness" onClick={() => onNavigate('evidence')} title="Demo readiness">
          <ShieldCheck size={16} />
        </button>
      </aside>
      <main className="main-area">{children}</main>
    </div>
  );
}
```

- [ ] **Step 2: Run typecheck**

Run:

```bash
npm --prefix studybot run typecheck
```

Expected: still FAIL only because `StudyRoomPage` props are not implemented yet.

- [ ] **Step 3: Do not commit yet**

Commit after Task 3 makes the app typecheck.

---

### Task 3: Build the NotebookLM-lite Workspace

**Files:**
- Modify: `studybot/src/features/study-room/StudyRoomPage.tsx`

- [ ] **Step 1: Replace StudyRoomPage with the workspace implementation**

Replace `studybot/src/features/study-room/StudyRoomPage.tsx` with:

```tsx
import { useEffect, useMemo, useState } from 'react';
import { ArrowUp, FileText, GraduationCap, Layers3, MessageSquareText, Plus, Sparkles, StickyNote, Trophy } from 'lucide-react';
import type { QuestionAnswer, StudyDocument, WeeklyProgress } from '../../types/domain';
import type { PageKey } from '../shell/AppShell';
import { apiClient } from '../../lib/api/client';
import { Button } from '../../components/ui/Button';
import { StatusBadge } from '../../components/ui/StatusBadge';

interface StudyRoomPageProps {
  activeDocumentId: string;
  onSelectDocument: (id: string) => void;
  onNavigate: (page: PageKey) => void;
}

const quickPrompts = [
  'Summarize this source for exam review.',
  'What should I remember from this lecture?',
  'Explain the hardest concept in simple terms.'
];

export function StudyRoomPage({ activeDocumentId, onSelectDocument, onNavigate }: StudyRoomPageProps) {
  const [documents, setDocuments] = useState<StudyDocument[]>([]);
  const [progress, setProgress] = useState<WeeklyProgress | null>(null);
  const [question, setQuestion] = useState('What should I remember for the exam?');
  const [messages, setMessages] = useState<QuestionAnswer[]>([]);
  const [loading, setLoading] = useState(false);
  const [uploadMessage, setUploadMessage] = useState('');

  const activeDocument = useMemo(
    () => documents.find((document) => document.id === activeDocumentId) ?? documents[0] ?? null,
    [activeDocumentId, documents]
  );

  async function refreshWorkspace() {
    const [docs, weekly] = await Promise.all([apiClient.documents(), apiClient.weeklyProgress()]);
    setDocuments(docs);
    setProgress(weekly);
    if (!docs.some((document) => document.id === activeDocumentId) && docs[0]) {
      onSelectDocument(docs[0].id);
    }
  }

  useEffect(() => {
    void refreshWorkspace();
  }, []);

  async function upload(file: File) {
    setUploadMessage(`Adding ${file.name}...`);
    const session = await apiClient.createUpload(file.name, file.type || 'application/octet-stream');
    await apiClient.completeUpload(session, file);
    onSelectDocument(session.document.id);
    setUploadMessage('Source ready for study.');
    await refreshWorkspace();
  }

  async function ask(nextQuestion = question) {
    if (!activeDocument || !nextQuestion.trim()) return;
    setLoading(true);
    const answer = await apiClient.ask(activeDocument.id, nextQuestion);
    setMessages((current) => [...current, answer]);
    setQuestion('');
    setLoading(false);
  }

  const latestAnswer = messages[messages.length - 1];

  return (
    <section className="study-workspace">
      <aside className="sources-panel">
        <div className="workspace-brand">
          <GraduationCap size={22} />
          <span>StudyBot</span>
        </div>

        <label className="source-upload">
          <Plus size={16} />
          <span>Add source</span>
          <input type="file" accept=".pdf,.txt,.md" onChange={(event) => { const file = event.target.files?.[0]; if (file) void upload(file); }} />
        </label>
        {uploadMessage && <p className="panel-note">{uploadMessage}</p>}

        <div className="panel-heading">
          <span>Sources</span>
          <strong>{documents.length}</strong>
        </div>

        <div className="source-list">
          {documents.map((document) => (
            <button key={document.id} className={activeDocument?.id === document.id ? 'source-card active' : 'source-card'} onClick={() => onSelectDocument(document.id)}>
              <FileText size={17} />
              <span>
                <strong>{document.filename}</strong>
                <small>{document.pageCount} pages · {document.sourceType.replaceAll('_', ' ')}</small>
              </span>
              <StatusBadge status={document.status} />
            </button>
          ))}
        </div>
      </aside>

      <main className="chat-panel">
        <header className="chat-header">
          <span className="eyebrow">Grounded study chat</span>
          <h1>{activeDocument?.filename ?? 'Choose a source'}</h1>
          <p>{activeDocument?.summary ?? 'Add or select a learning source to begin.'}</p>
        </header>

        <div className="quick-prompts">
          {quickPrompts.map((prompt) => (
            <button key={prompt} onClick={() => { setQuestion(prompt); void ask(prompt); }} disabled={!activeDocument || loading}>
              {prompt}
            </button>
          ))}
        </div>

        <div className="conversation-card">
          {messages.length ? (
            messages.map((message) => (
              <article className="answer-thread" key={message.id}>
                <div className="user-bubble">{message.question}</div>
                <div className="assistant-bubble">
                  <div className="assistant-label"><MessageSquareText size={16} /> StudyBot</div>
                  <p>{message.answer}</p>
                  <div className="citation-chips">
                    {message.citations.map((citation) => <span key={citation.id}>{citation.label}</span>)}
                  </div>
                </div>
              </article>
            ))
          ) : (
            <div className="empty-conversation">
              <Layers3 size={34} />
              <h2>Ask questions grounded in your source.</h2>
              <p>StudyBot will answer with citations so you can verify the exact lecture context.</p>
            </div>
          )}
        </div>

        <form className="composer" onSubmit={(event) => { event.preventDefault(); void ask(); }}>
          <textarea value={question} onChange={(event) => setQuestion(event.target.value)} placeholder="Ask anything about this source..." />
          <button type="submit" disabled={loading || !activeDocument || !question.trim()} aria-label="Send question">
            {loading ? <Sparkles size={18} /> : <ArrowUp size={18} />}
          </button>
        </form>
      </main>

      <aside className="notebook-panel">
        <div className="notebook-card source-summary">
          <span className="eyebrow">Source summary</span>
          <h2>{activeDocument?.filename ?? 'No source selected'}</h2>
          <p>{activeDocument?.summary ?? 'Upload a lecture, notes, or markdown file to create a study workspace.'}</p>
        </div>

        <div className="notebook-card">
          <span className="eyebrow">Study tools</span>
          <div className="tool-actions">
            <Button variant="secondary" onClick={() => onNavigate('guide')}><StickyNote size={16} /> Generate guide</Button>
            <Button variant="secondary" onClick={() => onNavigate('flashcards')}><Sparkles size={16} /> Make flashcards</Button>
            <Button variant="secondary" onClick={() => onNavigate('quiz')}><Trophy size={16} /> Start quiz</Button>
          </div>
        </div>

        <div className="notebook-card">
          <span className="eyebrow">Recent citations</span>
          {latestAnswer ? (
            <div className="citation-list">
              {latestAnswer.citations.map((citation) => (
                <article className="citation-card" key={citation.id}>
                  <strong>{citation.label}</strong>
                  <p>{citation.snippet}</p>
                  <small>{Math.round(citation.score * 100)}% match</small>
                </article>
              ))}
            </div>
          ) : (
            <p className="panel-note">Ask a question to collect cited source snippets here.</p>
          )}
        </div>

        <div className="notebook-card progress-mini">
          <span className="eyebrow">This week</span>
          <strong>{progress?.topicsStudied.length ?? '—'} topics</strong>
          <span>{progress?.flashcardsReviewed ?? '—'} cards reviewed · {progress?.quizAverage ?? '—'}% quiz average</span>
        </div>
      </aside>
    </section>
  );
}
```

- [ ] **Step 2: Run typecheck**

Run:

```bash
npm --prefix studybot run typecheck
```

Expected: PASS.

- [ ] **Step 3: Commit the workspace structure**

```bash
git add studybot/src/App.tsx studybot/src/features/shell/AppShell.tsx studybot/src/features/study-room/StudyRoomPage.tsx
git commit -m "Redesign StudyBot around source-grounded workspace"
```

---

### Task 4: Warm NotebookLM-lite Styling

**Files:**
- Modify: `studybot/src/styles.css`

- [ ] **Step 1: Replace the design tokens and app shell styles**

Replace the top of `studybot/src/styles.css`, from `:root` through `.main-area`, with:

```css
:root {
  --bg: #f4efe7;
  --surface: #fffaf2;
  --surface-soft: #f8f0e4;
  --surface-strong: #efe2d1;
  --text: #2f251b;
  --muted: #7c6f62;
  --line: #e3d4c1;
  --accent: #b8613c;
  --accent-soft: #f3ded1;
  --amber: #c9892b;
  --red: #b94a3a;
  --shadow: 0 18px 50px rgba(86, 62, 39, 0.12);
  font-family: ui-rounded, Aptos, "Segoe UI", "Trebuchet MS", sans-serif;
}

* {
  box-sizing: border-box;
}

body {
  margin: 0;
  color: var(--text);
  background:
    radial-gradient(circle at 18% 0%, rgba(255, 249, 236, 0.95) 0, transparent 30rem),
    radial-gradient(circle at 88% 12%, rgba(232, 196, 166, 0.4) 0, transparent 28rem),
    var(--bg);
}

button,
input,
select,
textarea {
  font: inherit;
}

button {
  cursor: pointer;
}

.app-shell {
  min-height: 100vh;
  display: grid;
  grid-template-columns: 76px 1fr;
}

.app-rail {
  position: sticky;
  top: 0;
  height: 100vh;
  padding: 18px 12px;
  border-right: 1px solid var(--line);
  background: rgba(255, 250, 242, 0.8);
  backdrop-filter: blur(18px);
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 18px;
}

.rail-brand,
.rail-item,
.rail-readiness {
  border: 0;
  color: var(--muted);
  background: transparent;
}

.rail-brand {
  width: 44px;
  height: 44px;
  border-radius: 16px;
  display: grid;
  place-items: center;
  background: var(--accent);
  color: white;
  box-shadow: var(--shadow);
}

.rail-nav {
  display: grid;
  gap: 10px;
  width: 100%;
}

.rail-item {
  width: 52px;
  min-height: 52px;
  border-radius: 18px;
  display: grid;
  place-items: center;
  gap: 3px;
  font-size: 0.66rem;
  font-weight: 800;
}

.rail-item span {
  max-width: 48px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.rail-item.active,
.rail-item:hover,
.rail-readiness:hover {
  background: var(--accent-soft);
  color: var(--accent);
}

.rail-readiness {
  margin-top: auto;
  width: 40px;
  height: 40px;
  border-radius: 14px;
}

.main-area {
  width: 100%;
  min-width: 0;
  padding: 0;
}
```

- [ ] **Step 2: Append workspace-specific styles**

Add these styles to the end of `studybot/src/styles.css`:

```css
.study-workspace {
  min-height: 100vh;
  display: grid;
  grid-template-columns: 300px minmax(420px, 1fr) 340px;
}

.sources-panel,
.notebook-panel {
  height: 100vh;
  position: sticky;
  top: 0;
  overflow: auto;
  padding: 22px;
}

.sources-panel {
  border-right: 1px solid var(--line);
  background: rgba(255, 250, 242, 0.66);
}

.notebook-panel {
  border-left: 1px solid var(--line);
  background: rgba(248, 240, 228, 0.74);
  display: grid;
  align-content: start;
  gap: 14px;
}

.workspace-brand {
  display: flex;
  align-items: center;
  gap: 10px;
  margin-bottom: 22px;
  font-size: 1.05rem;
  font-weight: 900;
  color: var(--accent);
}

.source-upload {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  min-height: 48px;
  border: 1px dashed var(--line);
  border-radius: 18px;
  background: var(--surface);
  color: var(--accent);
  font-weight: 850;
}

.source-upload input {
  display: none;
}

.panel-note {
  color: var(--muted);
  font-size: 0.9rem;
}

.panel-heading {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin: 24px 0 12px;
  color: var(--muted);
  font-size: 0.82rem;
  font-weight: 900;
  text-transform: uppercase;
  letter-spacing: 0.08em;
}

.source-list {
  display: grid;
  gap: 10px;
}

.source-card {
  display: grid;
  grid-template-columns: auto 1fr auto;
  gap: 10px;
  align-items: center;
  width: 100%;
  border: 1px solid var(--line);
  border-radius: 18px;
  padding: 12px;
  background: rgba(255, 250, 242, 0.72);
  color: var(--text);
  text-align: left;
}

.source-card.active,
.source-card:hover {
  border-color: rgba(184, 97, 60, 0.42);
  background: var(--accent-soft);
}

.source-card strong,
.source-card small {
  display: block;
}

.source-card small {
  margin-top: 3px;
  color: var(--muted);
  font-size: 0.78rem;
}

.chat-panel {
  min-width: 0;
  padding: 34px clamp(24px, 4vw, 54px);
  display: grid;
  grid-template-rows: auto auto 1fr auto;
  gap: 18px;
}

.chat-header h1 {
  margin: 6px 0 8px;
  font-size: clamp(2rem, 4vw, 3.8rem);
  line-height: 0.96;
  letter-spacing: -0.06em;
}

.chat-header p {
  margin: 0;
  max-width: 760px;
  color: var(--muted);
}

.quick-prompts {
  display: flex;
  flex-wrap: wrap;
  gap: 10px;
}

.quick-prompts button {
  border: 1px solid var(--line);
  border-radius: 999px;
  padding: 9px 12px;
  background: rgba(255, 250, 242, 0.78);
  color: var(--text);
  font-weight: 750;
}

.conversation-card {
  min-height: 360px;
  border: 1px solid var(--line);
  border-radius: 28px;
  padding: 22px;
  background: rgba(255, 250, 242, 0.82);
  box-shadow: var(--shadow);
  overflow: auto;
}

.answer-thread {
  display: grid;
  gap: 12px;
  margin-bottom: 20px;
}

.user-bubble,
.assistant-bubble {
  border-radius: 22px;
  padding: 14px 16px;
}

.user-bubble {
  justify-self: end;
  max-width: 78%;
  background: var(--accent);
  color: white;
}

.assistant-bubble {
  max-width: 86%;
  background: var(--surface-soft);
  border: 1px solid var(--line);
}

.assistant-label {
  display: flex;
  align-items: center;
  gap: 8px;
  color: var(--accent);
  font-weight: 900;
}

.citation-chips {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  margin-top: 12px;
}

.citation-chips span {
  border-radius: 999px;
  padding: 6px 9px;
  background: var(--surface);
  border: 1px solid var(--line);
  color: var(--muted);
  font-size: 0.78rem;
  font-weight: 850;
}

.empty-conversation {
  min-height: 310px;
  display: grid;
  place-items: center;
  align-content: center;
  gap: 10px;
  color: var(--muted);
  text-align: center;
}

.empty-conversation h2 {
  margin: 0;
  color: var(--text);
}

.composer {
  display: grid;
  grid-template-columns: 1fr auto;
  gap: 10px;
  align-items: end;
  border: 1px solid var(--line);
  border-radius: 24px;
  padding: 10px;
  background: rgba(255, 250, 242, 0.92);
  box-shadow: var(--shadow);
}

.composer textarea {
  min-height: 54px;
  max-height: 160px;
  resize: vertical;
  border: 0;
  outline: 0;
  padding: 10px;
  color: var(--text);
  background: transparent;
}

.composer button {
  width: 42px;
  height: 42px;
  border: 0;
  border-radius: 16px;
  display: grid;
  place-items: center;
  background: var(--accent);
  color: white;
}

.notebook-card {
  border: 1px solid var(--line);
  border-radius: 22px;
  padding: 16px;
  background: rgba(255, 250, 242, 0.78);
}

.notebook-card h2 {
  margin: 7px 0;
  letter-spacing: -0.03em;
}

.tool-actions {
  display: grid;
  gap: 10px;
  margin-top: 12px;
}

.tool-actions .btn {
  justify-content: center;
  display: inline-flex;
  align-items: center;
  gap: 8px;
}

.citation-list {
  display: grid;
  gap: 10px;
  margin-top: 12px;
}

.citation-card {
  border: 1px solid var(--line);
  border-radius: 16px;
  padding: 12px;
  background: var(--surface-soft);
}

.citation-card p {
  color: var(--muted);
}

.citation-card small {
  color: var(--accent);
  font-weight: 900;
}

.progress-mini {
  display: grid;
  gap: 6px;
}

.progress-mini strong {
  font-size: 1.6rem;
  letter-spacing: -0.04em;
}

@media (max-width: 1180px) {
  .study-workspace {
    grid-template-columns: 260px 1fr;
  }

  .notebook-panel {
    grid-column: 1 / -1;
    height: auto;
    position: static;
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }
}

@media (max-width: 820px) {
  .app-shell {
    grid-template-columns: 1fr;
  }

  .app-rail {
    position: static;
    height: auto;
    flex-direction: row;
    overflow-x: auto;
  }

  .rail-nav {
    display: flex;
  }

  .study-workspace {
    grid-template-columns: 1fr;
  }

  .sources-panel,
  .notebook-panel {
    height: auto;
    position: static;
  }
}
```

- [ ] **Step 3: Update existing color-dependent classes**

In `studybot/src/styles.css`, replace old token references that no longer exist:

```css
.brand-mark {
  color: var(--accent);
}

.nav-item.active,
.nav-item:hover {
  background: var(--accent-soft);
  color: var(--accent);
}

.readiness-link:hover {
  color: var(--accent);
}

.eyebrow {
  color: var(--accent);
}

.btn-primary {
  background: var(--accent);
  color: white;
  border: 0;
}

.btn-secondary {
  background: var(--accent-soft);
  color: var(--accent);
  border-color: rgba(184, 97, 60, 0.22);
}

.btn-ghost {
  background: transparent;
  color: var(--accent);
}

.status {
  background: var(--accent-soft);
  color: var(--accent);
}

.status-ready {
  background: #e4f1dc;
  color: #4c7a35;
}

.status-uploading,
.status-analyzing,
.status-indexing {
  background: #fff1cf;
  color: #8a5a13;
}

.citation {
  background: var(--surface-soft);
}
```

- [ ] **Step 4: Run typecheck and build**

Run:

```bash
npm --prefix studybot run typecheck
npm --prefix studybot run build
```

Expected: both PASS.

- [ ] **Step 5: Commit styling**

```bash
git add studybot/src/styles.css
git commit -m "Apply warm NotebookLM-lite visual system"
```

---

### Task 5: Align the Secondary Sources Page

**Files:**
- Modify: `studybot/src/features/documents/DocumentsPage.tsx`

- [ ] **Step 1: Update copy and make document rows selectable**

Replace the return block in `DocumentsPage` with:

```tsx
  return (
    <>
      <header className="page-header">
        <div>
          <h1>Sources</h1>
          <p>Add lectures, notes, and markdown sources that StudyBot can use for grounded study sessions.</p>
        </div>
      </header>

      <div className="grid two">
        <Card title="Add source" eyebrow="PDF, TXT, or MD">
          <label className="empty-state upload-zone">
            <strong>Choose a learning source</strong>
            <p>Mock mode processes it instantly. AWS mode uses a presigned upload session.</p>
            <input type="file" accept=".pdf,.txt,.md" onChange={(event) => { const file = event.target.files?.[0]; if (file) void upload(file); }} />
          </label>
          {message && <p className="muted">{message}</p>}
        </Card>

        <Card title="Source library" eyebrow="Ready to study">
          {documents.length ? (
            <div className="list">
              {documents.map((doc) => (
                <button className="row row-button" key={doc.id} onClick={() => onSelectDocument(doc.id)}>
                  <span>
                    <strong>{doc.filename}</strong>
                    <br />
                    <span className="muted">{doc.pageCount} pages · {doc.sourceType.replaceAll('_', ' ')}</span>
                  </span>
                  <StatusBadge status={doc.status} />
                </button>
              ))}
            </div>
          ) : (
            <EmptyState title="No sources yet" description="Upload your first lecture file to begin." />
          )}
        </Card>
      </div>
    </>
  );
```

- [ ] **Step 2: Run typecheck**

Run:

```bash
npm --prefix studybot run typecheck
```

Expected: PASS.

- [ ] **Step 3: Commit sources page alignment**

```bash
git add studybot/src/features/documents/DocumentsPage.tsx
git commit -m "Align source library copy with workspace redesign"
```

---

### Task 6: Verify Existing Behavior with Tests

**Files:**
- No source changes expected.

- [ ] **Step 1: Run test suite**

Run:

```bash
npm --prefix studybot test
```

Expected: PASS. Existing API/mock tests should still pass because backend contracts did not change.

- [ ] **Step 2: Run production build**

Run:

```bash
npm --prefix studybot run build
```

Expected: PASS.

- [ ] **Step 3: If no source changes were needed, do not commit**

Only commit if a real issue was fixed. Do not create an empty commit.

---

### Task 7: Browser Verification

**Files:**
- No source changes expected unless browser testing reveals a bug.

- [ ] **Step 1: Start the API server**

Run:

```bash
npm --prefix studybot run api:dev
```

Expected: dev API starts and serves `/api` routes.

- [ ] **Step 2: Start the frontend dev server**

Run:

```bash
npm --prefix studybot run dev
```

Expected: Vite prints a local URL.

- [ ] **Step 3: Open the app in a browser**

Use the Vite local URL.

Expected first impression:

- App opens on the source-grounded workspace.
- Left side shows sources and Add source.
- Center shows current document and grounded chat.
- Right side shows source summary, study tools, citations, and progress.

- [ ] **Step 4: Verify golden path**

In the browser:

1. Ask “What should I remember for the exam?”
2. Confirm an answer appears in the center conversation.
3. Confirm citation chips appear below the answer.
4. Confirm citation cards appear in the right panel.
5. Click “Generate guide” and confirm the guide page still renders.
6. Return to Workspace.
7. Click “Make flashcards” and confirm flashcards still render.
8. Return to Workspace.
9. Click “Start quiz” and confirm quiz still renders.
10. Return to Workspace.
11. Upload a `.txt`, `.md`, or `.pdf` mock file.
12. Confirm the new source appears in the source list and becomes selected.

- [ ] **Step 5: Verify responsive behavior**

Resize the browser to tablet/mobile widths.

Expected:

- Rail does not block content.
- Workspace columns stack without horizontal overflow.
- Composer remains usable.
- Source cards and notebook cards remain readable.

- [ ] **Step 6: Check browser console**

Expected: no new runtime errors. Existing favicon issue should remain fixed.

- [ ] **Step 7: Commit browser fixes if needed**

If browser verification required fixes:

```bash
git add studybot/src/App.tsx studybot/src/features/shell/AppShell.tsx studybot/src/features/study-room/StudyRoomPage.tsx studybot/src/features/documents/DocumentsPage.tsx studybot/src/styles.css
git commit -m "Fix NotebookLM-lite workspace browser issues"
```

If no fixes were needed, do not commit.

---

## Self-review checklist

- Spec coverage:
  - Three-column workspace: Task 3 and Task 4.
  - Sources visible and selectable: Task 3 and Task 5.
  - Grounded chat central with citations: Task 3.
  - Study tools as right-panel actions: Task 3.
  - Warm academic visual style: Task 4.
  - Evidence/readiness secondary: Task 2.
  - Backend unchanged: all tasks avoid API/provider changes.
  - Browser verification: Task 7.

- Placeholder scan:
  - No TBD/TODO/fill-in-later steps.
  - All code-changing tasks include concrete code.

- Type consistency:
  - `PageKey` remains compatible with existing pages.
  - `StudyRoomPage` props in Task 1 match the interface introduced in Task 3.
  - Domain fields use existing `StudyDocument`, `QuestionAnswer`, `WeeklyProgress`, and `Citation` properties.
