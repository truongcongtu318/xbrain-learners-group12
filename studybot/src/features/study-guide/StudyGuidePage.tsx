import { useEffect, useState } from 'react';
import type { StudyGuide } from '../../types/domain';
import { apiClient } from '../../lib/api/client';
import { Card } from '../../components/ui/Card';

export function StudyGuidePage({ activeDocumentId }: { activeDocumentId: string }) {
  const [guide, setGuide] = useState<StudyGuide | null>(null);

  useEffect(() => {
    void apiClient.studyGuide(activeDocumentId).then(setGuide);
  }, [activeDocumentId]);

  return (
    <>
      <header className="page-header">
        <div>
          <h1>One-page guide</h1>
          <p>Exactly five concepts most likely to matter on the exam.</p>
        </div>
      </header>

      <div className="grid">
        {guide?.concepts.map((concept, index) => (
          <Card key={concept.id} title={`${index + 1}. ${concept.title}`}>
            <p>{concept.explanation}</p>
            <p className="muted">Why it matters: {concept.whyItMatters}</p>
          </Card>
        ))}
      </div>
    </>
  );
}
