import { useEffect, useState } from 'react';
import type { PageKey } from '../shell/AppShell';
import type { StudyDocument } from '../../types/domain';
import { apiClient } from '../../lib/api/client';
import { Button } from '../../components/ui/Button';
import { Card } from '../../components/ui/Card';
import { EmptyState } from '../../components/ui/EmptyState';
import { StatusBadge } from '../../components/ui/StatusBadge';

interface DashboardPageProps {
  onNavigate: (page: PageKey) => void;
  onSelectDocument: (id: string) => void;
}

export function DashboardPage({ onNavigate, onSelectDocument }: DashboardPageProps) {
  const [documents, setDocuments] = useState<StudyDocument[]>([]);

  useEffect(() => {
    void apiClient.documents().then(setDocuments);
  }, []);

  return (
    <>
      <header className="page-header">
        <div>
          <h1>Your AI study workspace</h1>
          <p>Upload lecture notes, select one or more sources, and ask cited questions grounded in your materials.</p>
        </div>
        <Button onClick={() => onNavigate('documents')}>Upload lecture</Button>
      </header>

      <div className="grid two section-gap">
        <Card title="Continue studying" eyebrow="Recent documents">
          {documents.length ? (
            <div className="list">
              {documents.map((doc) => (
                <button
                  className="row row-button"
                  key={doc.id}
                  onClick={() => {
                    onSelectDocument(doc.id);
                    onNavigate('study');
                  }}
                >
                  <span>
                    <strong>{doc.filename}</strong>
                    <br />
                    <span className="muted">{doc.summary}</span>
                  </span>
                  <StatusBadge status={doc.status} />
                </button>
              ))}
            </div>
          ) : (
            <EmptyState title="No lectures yet" description="Upload a lecture to start a guided study session." />
          )}
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
