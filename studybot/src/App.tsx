import { useState } from 'react';
import { AppShell, type PageKey } from './features/shell/AppShell';
import { DashboardPage } from './features/dashboard/DashboardPage';
import { DocumentsPage } from './features/documents/DocumentsPage';
import { EvidencePage } from './features/evidence/EvidencePage';
import { FlashcardsPage } from './features/flashcards/FlashcardsPage';
import { QuizPage } from './features/quiz/QuizPage';
import { StudyGuidePage } from './features/study-guide/StudyGuidePage';
import { StudyRoomPage } from './features/study-room/StudyRoomPage';

export function App() {
  const [page, setPage] = useState<PageKey>('study');
  const [selectedDocumentIds, setSelectedDocumentIds] = useState<string[]>([]);

  const primaryDocumentId = selectedDocumentIds[0] ?? '';
  const selectSingleDocument = (id: string) => setSelectedDocumentIds([id]);

  const content = {
    dashboard: <DashboardPage onNavigate={setPage} onSelectDocument={selectSingleDocument} />,
    documents: <DocumentsPage onSelectDocument={selectSingleDocument} />,
    study: <StudyRoomPage selectedDocumentIds={selectedDocumentIds} onSelectDocuments={setSelectedDocumentIds} onNavigate={setPage} />,
    guide: <StudyGuidePage activeDocumentId={primaryDocumentId} />,
    flashcards: <FlashcardsPage activeDocumentId={primaryDocumentId} />,
    quiz: <QuizPage activeDocumentId={primaryDocumentId} />,
    evidence: <EvidencePage />
  }[page];

  return (
    <AppShell currentPage={page} onNavigate={setPage}>
      {content}
    </AppShell>
  );
}
