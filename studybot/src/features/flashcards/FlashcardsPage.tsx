import { useEffect, useState } from 'react';
import type { FlashcardDeck } from '../../types/domain';
import { apiClient } from '../../lib/api/client';
import { Button } from '../../components/ui/Button';
import { Card } from '../../components/ui/Card';

export function FlashcardsPage({ activeDocumentId }: { activeDocumentId: string }) {
  const [deck, setDeck] = useState<FlashcardDeck | null>(null);
  const [flipped, setFlipped] = useState<Record<string, boolean>>({});
  const [reviewState, setReviewState] = useState<Record<string, 'known' | 'later'>>({});

  useEffect(() => {
    void apiClient.flashcards(activeDocumentId).then(setDeck);
  }, [activeDocumentId]);

  return (
    <>
      <header className="page-header">
        <div>
          <h1>Flashcards</h1>
          <p>Flip cards and mark what needs review later.</p>
        </div>
      </header>

      <div className="grid three">
        {deck?.cards.map((card) => (
          <Card key={card.id} title={card.sourceLabel}>
            <p>{flipped[card.id] ? card.back : card.front}</p>
            <div className="form-actions split-actions">
              <Button variant="secondary" onClick={() => setFlipped((state) => ({ ...state, [card.id]: !state[card.id] }))}>Flip</Button>
              <Button variant="ghost" onClick={() => setReviewState((state) => ({ ...state, [card.id]: 'known' }))}>Known</Button>
              <Button variant="ghost" onClick={() => setReviewState((state) => ({ ...state, [card.id]: 'later' }))}>Review later</Button>
            </div>
            {reviewState[card.id] && <p className="muted">Marked as {reviewState[card.id] === 'known' ? 'known' : 'review later'}.</p>}
          </Card>
        ))}
      </div>
    </>
  );
}
