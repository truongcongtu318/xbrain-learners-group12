import type { PropsWithChildren } from 'react';

export type PageKey = 'dashboard' | 'documents' | 'study' | 'guide' | 'flashcards' | 'quiz' | 'evidence';

export function AppShell({ children }: PropsWithChildren<{ currentPage: PageKey; onNavigate: (page: PageKey) => void }>) {
  return <main className="main-area">{children}</main>;
}
