import { useEffect, useMemo, useState } from 'react';
import { ArrowUp, BookOpenCheck, FileText, GraduationCap, MessageSquareText, Plus, Sparkles, StickyNote, Target } from 'lucide-react';
import type { Citation, QuestionAnswer, SavedFlashcardDeck, SavedQuiz, StudyDocument, StudyGuide } from '../../types/domain';
import type { PageKey } from '../shell/AppShell';
import { apiClient } from '../../lib/api/client';
import { Button } from '../../components/ui/Button';
import { StatusBadge } from '../../components/ui/StatusBadge';

interface StudyRoomPageProps {
  selectedDocumentIds: string[];
  onSelectDocuments: (ids: string[]) => void;
  onNavigate: (page: PageKey) => void;
}

const quickPrompts = [
  'Summarize this source for exam review.',
  'What should I remember from this lecture?',
  'Explain the hardest concept in simple terms.'
];

const maxDemoUploadBytes = 10 * 1024 * 1024;

function citationKey(citation: Citation) {
  return citation.documentId || citation.sourceUri || citation.filename || citation.label;
}

function uniqueCitations(citations: Citation[]) {
  const bySource = new Map<string, Citation>();
  for (const citation of citations) {
    const key = citationKey(citation);
    const current = bySource.get(key);
    if (!current || citation.snippet.length < current.snippet.length) {
      bySource.set(key, citation);
    }
  }
  return [...bySource.values()];
}

function artifactLabel(prefix: string, generatedAt: string, index: number) {
  const date = new Date(generatedAt);
  const label = Number.isNaN(date.getTime()) ? generatedAt : date.toLocaleString([], { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' });
  return `${prefix} ${index + 1} · ${label}`;
}

export function StudyRoomPage({ selectedDocumentIds, onSelectDocuments, onNavigate }: StudyRoomPageProps) {
  const [documents, setDocuments] = useState<StudyDocument[]>([]);
  const [question, setQuestion] = useState('');
  const [messages, setMessages] = useState<QuestionAnswer[]>([]);
  const [quiz, setQuiz] = useState<SavedQuiz | null>(null);
  const [studyGuide, setStudyGuide] = useState<StudyGuide | null>(null);
  const [flashcards, setFlashcards] = useState<SavedFlashcardDeck | null>(null);
  const [flashcardDecks, setFlashcardDecks] = useState<SavedFlashcardDeck[]>([]);
  const [quizzes, setQuizzes] = useState<SavedQuiz[]>([]);
  const [activeStudio, setActiveStudio] = useState<'study-guide' | 'flashcards' | 'quiz' | null>(null);
  const [expandedCitationId, setExpandedCitationId] = useState<string | null>(null);
  const [quizModalOpen, setQuizModalOpen] = useState(false);
  const [flashcardModalOpen, setFlashcardModalOpen] = useState(false);
  const [activeFlashcardIndex, setActiveFlashcardIndex] = useState(0);
  const [flippedFlashcards, setFlippedFlashcards] = useState<Record<string, boolean>>({});
  const [quizAnswers, setQuizAnswers] = useState<Record<string, number>>({});
  const [loading, setLoading] = useState(false);
  const [quizLoading, setQuizLoading] = useState(false);
  const [toolLoading, setToolLoading] = useState<'study-guide' | 'flashcards' | null>(null);
  const [uploadMessage, setUploadMessage] = useState('');
  const [summaryLoadingId, setSummaryLoadingId] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState('');

  const selectedDocuments = useMemo(
    () => documents.filter((document) => selectedDocumentIds.includes(document.id)),
    [documents, selectedDocumentIds]
  );
  const primaryDocument = selectedDocuments[0] ?? documents[0] ?? null;
  const primaryDocumentId = primaryDocument?.id ?? null;

  useEffect(() => {
    let mounted = true;

    async function refreshWorkspace() {
      try {
        const docs = await apiClient.documents().catch(() => []);
        if (!mounted) return;
        setDocuments(docs);
        if (selectedDocumentIds.length === 0 && docs[0]) {
          onSelectDocuments([docs[0].id]);
        } else {
          const availableSelection = selectedDocumentIds.filter((id) => docs.some((document) => document.id === id));
          if (availableSelection.length !== selectedDocumentIds.length) {
            onSelectDocuments(availableSelection);
          }
        }
      } catch (error) {
        if (mounted) setErrorMessage(error instanceof Error ? error.message : 'Unable to load workspace.');
      }
    }

    void refreshWorkspace();
    return () => {
      mounted = false;
    };
  }, [selectedDocumentIds, onSelectDocuments]);

  async function refreshWorkspace() {
    const docs = await apiClient.documents().catch(() => []);
    setDocuments(docs);
    const availableSelection = selectedDocumentIds.filter((id) => docs.some((document) => document.id === id));
    if (availableSelection.length === 0 && docs[0]) {
      onSelectDocuments([docs[0].id]);
    } else if (availableSelection.length !== selectedDocumentIds.length) {
      onSelectDocuments(availableSelection);
    }
  }

  useEffect(() => {
    if (!primaryDocumentId || !primaryDocument || primaryDocument.status !== 'READY') return;
    if (primaryDocument.summary && !primaryDocument.summary.toLowerCase().includes('uploaded to s3')) return;
    let mounted = true;
    setSummaryLoadingId(primaryDocumentId);

    async function generateSummary() {
      const summary = await apiClient.summarizeDocument(primaryDocumentId);
      if (!mounted) return;
      setDocuments((current) => current.map((document) => document.id === primaryDocumentId
        ? { ...document, summary: summary.answer }
        : document));
    }

    void generateSummary().catch(() => undefined).finally(() => {
      if (mounted) setSummaryLoadingId(null);
    });

    return () => {
      mounted = false;
    };
  }, [primaryDocumentId, primaryDocument]);

  useEffect(() => {
    if (!primaryDocumentId) return;
    let mounted = true;

    async function loadSavedStudyTools() {
      const [savedDecks, savedQuizItems] = await Promise.all([
        apiClient.savedFlashcardDecks(primaryDocumentId),
        apiClient.savedQuizzes(primaryDocumentId)
      ]);
      const savedDeck = savedDecks[0] ?? null;
      const savedQuiz = savedQuizItems[0] ?? null;
      if (!mounted) return;
      setFlashcardDecks(savedDecks);
      setQuizzes(savedQuizItems);
      setFlashcards(savedDeck);
      setQuiz(savedQuiz);
      setStudyGuide(null);
      setActiveFlashcardIndex(0);
      setFlippedFlashcards({});

      if (savedQuiz) {
        const progress = await apiClient.quizProgress(savedQuiz);
        if (mounted) setQuizAnswers(progress?.answers ?? {});
      } else {
        setQuizAnswers({});
      }

      setActiveStudio(null);
    }

    void loadSavedStudyTools().catch(() => {
      if (!mounted) return;
      setFlashcardDecks([]);
      setQuizzes([]);
      setFlashcards(null);
      setQuiz(null);
      setQuizAnswers({});
    });

    return () => {
      mounted = false;
    };
  }, [primaryDocumentId]);

  async function upload(file: File) {
    setErrorMessage('');
    setUploadMessage('');
    if (file.type === 'application/pdf' && file.size > maxDemoUploadBytes) {
      setErrorMessage('This PDF is too large for the W7 demo flow. Please upload a lecture PDF under 10 MB and around 40 pages.');
      return;
    }
    setUploadMessage(`Adding ${file.name}...`);
    try {
      const session = await apiClient.createUpload(file.name, file.type || 'application/octet-stream');
      await apiClient.completeUpload(session, file);
      const uploadedDocument = session.document ?? {
        id: session.key ?? file.name,
        filename: file.name,
        status: 'UPLOADING' as const,
        uploadedAt: new Date().toISOString(),
        pageCount: 0,
        sourceType: 'RAW_PDF' as const,
        summary: `Uploaded to S3${session.key ? ` at ${session.key}` : ''}. Processing and indexing can be connected next.`
      };
      setDocuments((current) => [uploadedDocument, ...current.filter((document) => document.id !== uploadedDocument.id)]);
      onSelectDocuments([uploadedDocument.id]);
      setUploadMessage('Source uploaded to S3.');
    } catch (error) {
      setUploadMessage('');
      setErrorMessage(error instanceof Error ? error.message : 'Unable to upload source.');
    }
  }

  async function ask(nextQuestion = question) {
    const trimmedQuestion = nextQuestion.trim();
    if (selectedDocuments.length === 0 || !trimmedQuestion) return;
    setLoading(true);
    setErrorMessage('');
    try {
      const answer = await apiClient.ask(selectedDocuments.map((document) => document.id), trimmedQuestion);
      setMessages((current) => [...current, answer]);
      setQuestion('');
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : 'Unable to answer that question.');
    } finally {
      setLoading(false);
    }
  }

  async function createStudyGuide() {
    if (!primaryDocument) return;
    setToolLoading('study-guide');
    setErrorMessage('');
    setQuiz(null);
    setFlashcards(null);
    try {
      setStudyGuide(await apiClient.studyGuide(primaryDocument.id));
      setActiveStudio('study-guide');
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : 'Unable to create study guide.');
    } finally {
      setToolLoading(null);
    }
  }

  async function createFlashcards() {
    if (!primaryDocument) return;
    setToolLoading('flashcards');
    setErrorMessage('');
    setStudyGuide(null);
    try {
      const nextDeck = await apiClient.flashcards(primaryDocument.id);
      setFlashcards(nextDeck);
      setFlashcardDecks((current) => [nextDeck, ...current.filter((deck) => deck.id !== nextDeck.id)]);
      setActiveStudio('flashcards');
      setActiveFlashcardIndex(0);
      setFlippedFlashcards({});
      setFlashcardModalOpen(true);
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : 'Unable to create flashcards.');
    } finally {
      setToolLoading(null);
    }
  }

  async function startQuiz() {
    if (!primaryDocument) return;
    setQuizLoading(true);
    setErrorMessage('');
    setStudyGuide(null);
    setQuizAnswers({});
    try {
      const nextQuiz = await apiClient.quiz(primaryDocument.id, 'medium');
      setQuiz(nextQuiz);
      setQuizzes((current) => [nextQuiz, ...current.filter((quizItem) => quizItem.id !== nextQuiz.id)]);
      setActiveStudio('quiz');
      setQuizModalOpen(true);
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : 'Unable to create quiz.');
    } finally {
      setQuizLoading(false);
    }
  }

  const quizScore = quiz ? quiz.questions.filter((quizQuestion) => quizAnswers[quizQuestion.id] === quizQuestion.correctIndex).length : 0;

  function answerQuizQuestion(questionId: string, optionIndex: number) {
    if (!quiz) return;
    const answers = { ...quizAnswers, [questionId]: optionIndex };
    setQuizAnswers(answers);
    void apiClient.saveQuizProgress(quiz, answers).catch(() => undefined);
  }

  async function retryQuiz() {
    if (!quiz) return;
    setQuizAnswers({});
    await apiClient.resetQuizProgress(quiz).catch(() => undefined);
  }

  async function selectQuiz(nextQuiz: SavedQuiz) {
    setQuiz(nextQuiz);
    const progress = await apiClient.quizProgress(nextQuiz).catch(() => null);
    setQuizAnswers(progress?.answers ?? {});
  }

  function selectFlashcardDeck(nextDeck: SavedFlashcardDeck) {
    setFlashcards(nextDeck);
    setActiveFlashcardIndex(0);
    setFlippedFlashcards({});
  }

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
        {errorMessage && <p className="panel-note" role="alert">{errorMessage}</p>}

        <div className="panel-heading">
          <span>Sources</span>
          <strong>{documents.length}</strong>
        </div>

        <div className="source-list">
          {documents.map((document) => {
            const selected = selectedDocumentIds.includes(document.id);
            return (
              <button
                key={document.id}
                className={selected ? 'source-card active' : 'source-card'}
                onClick={() => onSelectDocuments(selected
                  ? selectedDocumentIds.filter((id) => id !== document.id)
                  : [...selectedDocumentIds, document.id])}
              >
                <FileText size={17} />
                <span>
                  <strong>{document.filename}</strong>
                  <small>{document.pageCount} pages · {document.sourceType.replaceAll('_', ' ')}</small>
                </span>
                <StatusBadge status={document.status} />
              </button>
            );
          })}
        </div>
      </aside>

      <section className="chat-panel" aria-label="Study chat">
        <div className="conversation-card">
          {selectedDocuments.length ? (
            <article className="assistant-bubble source-intro">
              <div className="assistant-label"><MessageSquareText size={16} /> StudyBot</div>
              <h1>{selectedDocuments.length === 1 ? selectedDocuments[0].filename : `${selectedDocuments.length} selected sources`}</h1>
              <p>{selectedDocuments.length === 1
                ? summaryLoadingId === selectedDocuments[0].id
                  ? 'Generating a student-friendly summary for this source...'
                  : selectedDocuments[0].summary
                : selectedDocuments.map((document) => document.filename).join(', ')}</p>
              <div className="quick-prompts">
                {quickPrompts.map((prompt) => (
                  <button key={prompt} onClick={() => { setQuestion(prompt); void ask(prompt); }} disabled={loading}>
                    {prompt}
                  </button>
                ))}
              </div>
            </article>
          ) : (
            <article className="assistant-bubble source-intro">
              <div className="assistant-label"><MessageSquareText size={16} /> StudyBot</div>
              <h1>No sources yet</h1>
              <p>Upload a file to S3 first, then select one or more ready sources for grounded answers.</p>
            </article>
          )}

          {messages.map((message) => (
            <article className="answer-thread" key={message.id}>
              <div className="user-bubble">{message.question}</div>
              <div className="assistant-bubble">
                <div className="assistant-label"><MessageSquareText size={16} /> StudyBot</div>
                <p>{message.answer}</p>
                <div className="answer-citations">
                  {uniqueCitations(message.citations).map((citation) => {
                    const expanded = expandedCitationId === citationKey(citation);
                    return (
                      <article key={citationKey(citation)} className={expanded ? 'answer-citation expanded' : 'answer-citation'}>
                        <button
                          type="button"
                          onClick={() => setExpandedCitationId(expanded ? null : citationKey(citation))}
                          aria-expanded={expanded}
                        >
                          <strong>{citation.filename || citation.label}</strong>
                          <span>{citation.location || 'Source excerpt'}</span>
                        </button>
                        {expanded && <small>{citation.snippet}</small>}
                      </article>
                    );
                  })}
                </div>
              </div>
            </article>
          ))}
        </div>

        <form className="composer" onSubmit={(event) => { event.preventDefault(); void ask(); }}>
          <textarea value={question} onChange={(event) => setQuestion(event.target.value)} placeholder="Ask anything about the selected sources..." />
          <button type="submit" disabled={loading || selectedDocuments.length === 0 || !question.trim()} aria-label="Send question">
            {loading ? <Sparkles size={18} /> : <ArrowUp size={18} />}
          </button>
        </form>
      </section>

      <aside className="notebook-panel">
        <div className="notebook-card tools-card">
          <div className="panel-title"><Sparkles size={16} /> Studio</div>
          <div className="tool-actions">
            <Button variant="secondary" onClick={() => void createStudyGuide()} disabled={toolLoading !== null || !primaryDocument}><StickyNote size={16} /> {toolLoading === 'study-guide' ? 'Creating...' : 'Study guide'}</Button>
            <Button variant="secondary" onClick={() => void createFlashcards()} disabled={toolLoading !== null || !primaryDocument}><BookOpenCheck size={16} /> {toolLoading === 'flashcards' ? 'Creating...' : 'Flashcards'}</Button>
            <Button variant="secondary" onClick={() => void startQuiz()} disabled={quizLoading || !primaryDocument}><Target size={16} /> {quizLoading ? 'Creating...' : 'Quiz'}</Button>
          </div>
        </div>

        <div className="notebook-card studio-output-card">
          {activeStudio === null && !quizLoading && !toolLoading && !flashcards && !quiz ? (
            <div className="studio-empty">
              <Sparkles size={18} />
              <h2>Build from your source</h2>
              <p>Generate a study guide, flashcards, or quiz without interrupting the chat.</p>
            </div>
          ) : null}

          {toolLoading === 'study-guide' && <p className="panel-note">Creating a study guide...</p>}
          {toolLoading === 'flashcards' && <p className="panel-note">Creating flashcards...</p>}
          {quizLoading && <p className="panel-note">Generating a 10-question quiz...</p>}

          {activeStudio === 'study-guide' && studyGuide && (
            <article className="studio-section">
              <div className="panel-title"><StickyNote size={16} /> Study guide</div>
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

          {flashcards && (
            <article className="studio-section flashcard-launch-card">
              <div className="panel-title"><BookOpenCheck size={16} /> Flashcards</div>
              <h2>{flashcards.cards.length}-card memory deck</h2>
              <p>Practice one card at a time with a tap-to-flip study flow.</p>
              <Button variant="secondary" onClick={() => setFlashcardModalOpen(true)}>Open flashcards</Button>
              {flashcardDecks.length > 1 && (
                <div className="artifact-history">
                  {flashcardDecks.map((deck, index) => (
                    <button
                      key={deck.id}
                      className={flashcards?.id === deck.id ? 'artifact-history-item active' : 'artifact-history-item'}
                      onClick={() => selectFlashcardDeck(deck)}
                    >
                      <span>{artifactLabel('Deck', deck.generatedAt, index)}</span>
                      <small>{deck.cards.length} cards</small>
                    </button>
                  ))}
                </div>
              )}
            </article>
          )}

          {quiz && (
            <article className="studio-section quiz-launch-card">
              <div className="panel-title"><Target size={16} /> Spark Quiz</div>
              <h2>{quiz.questions.length}-question practice quiz</h2>
              <p>{quizScore}/{quiz.questions.length} answered correctly</p>
              <Button variant="secondary" onClick={() => setQuizModalOpen(true)}>Open quiz</Button>
              {quizzes.length > 1 && (
                <div className="artifact-history">
                  {quizzes.map((quizItem, index) => (
                    <button
                      key={quizItem.id}
                      className={quiz?.id === quizItem.id ? 'artifact-history-item active' : 'artifact-history-item'}
                      onClick={() => void selectQuiz(quizItem)}
                    >
                      <span>{artifactLabel('Quiz', quizItem.generatedAt, index)}</span>
                      <small>{quizItem.questions.length} questions</small>
                    </button>
                  ))}
                </div>
              )}
            </article>
          )}
        </div>
      </aside>

      {flashcards && flashcardModalOpen && (
        <div className="study-modal-backdrop" role="presentation" onClick={() => setFlashcardModalOpen(false)}>
          <section className="flashcard-modal" role="dialog" aria-modal="true" aria-label="Flashcards" onClick={(event) => event.stopPropagation()}>
            <header className="study-modal-header">
              <div>
                <p>Memory deck</p>
                <h1>Flashcards</h1>
                <span>{activeFlashcardIndex + 1}/{flashcards.cards.length}</span>
              </div>
              <button type="button" aria-label="Close flashcards" onClick={() => setFlashcardModalOpen(false)}>×</button>
            </header>

            <div className="flashcard-stage">
              {(() => {
                const card = flashcards.cards[activeFlashcardIndex];
                const flipped = Boolean(flippedFlashcards[card.id]);
                return (
                  <button
                    type="button"
                    className={flipped ? 'flip-card flipped' : 'flip-card'}
                    onClick={() => setFlippedFlashcards((current) => ({ ...current, [card.id]: !flipped }))}
                    aria-pressed={flipped}
                  >
                    <span className="flip-card-face flip-card-front">
                      <small>Question</small>
                      <strong>{card.front}</strong>
                      <em>Tap to reveal answer</em>
                    </span>
                    <span className="flip-card-face flip-card-back">
                      <small>Answer</small>
                      <strong>{card.back}</strong>
                      <em>{card.sourceLabel}</em>
                    </span>
                  </button>
                );
              })()}
            </div>

            <footer className="flashcard-controls">
              <Button
                variant="secondary"
                onClick={() => {
                  setActiveFlashcardIndex((current) => Math.max(0, current - 1));
                }}
                disabled={activeFlashcardIndex === 0}
              >
                Previous
              </Button>
              <Button
                variant="secondary"
                onClick={() => {
                  setActiveFlashcardIndex((current) => Math.min(flashcards.cards.length - 1, current + 1));
                }}
                disabled={activeFlashcardIndex === flashcards.cards.length - 1}
              >
                Next
              </Button>
            </footer>
          </section>
        </div>
      )}

      {quiz && quizModalOpen && (
        <div className="study-modal-backdrop" role="presentation" onClick={() => setQuizModalOpen(false)}>
          <section className="quiz-modal" role="dialog" aria-modal="true" aria-label="Spark Quiz" onClick={(event) => event.stopPropagation()}>
            <header className="study-modal-header">
              <div>
                <p>Based on {selectedDocuments.length || 1} source{(selectedDocuments.length || 1) > 1 ? 's' : ''}</p>
                <h1>Spark Quiz</h1>
                <span>{quizScore}/{quiz.questions.length} answered correctly</span>
              </div>
              <div className="study-modal-actions">
                <Button variant="secondary" onClick={() => void retryQuiz()}>Retry</Button>
                <button type="button" aria-label="Close quiz" onClick={() => setQuizModalOpen(false)}>×</button>
              </div>
            </header>

            <div className="quiz-modal-list">
              {quiz.questions.map((quizQuestion, questionIndex) => (
                <section className="quiz-question" key={quizQuestion.id}>
                  <span>{questionIndex + 1} / {quiz.questions.length}</span>
                  <h2>{quizQuestion.prompt}</h2>
                  <div className="quiz-options">
                    {quizQuestion.options.map((option, optionIndex) => {
                      const selectedAnswer = quizAnswers[quizQuestion.id];
                      const answered = selectedAnswer !== undefined;
                      const correct = optionIndex === quizQuestion.correctIndex;
                      const incorrectSelection = answered && selectedAnswer === optionIndex && !correct;
                      const optionClassName = [
                        'quiz-option',
                        answered && correct ? 'correct' : '',
                        incorrectSelection ? 'incorrect' : '',
                        selectedAnswer === optionIndex ? 'selected' : ''
                      ].filter(Boolean).join(' ');

                      return (
                        <button
                          key={option}
                          className={optionClassName}
                          onClick={() => answerQuizQuestion(quizQuestion.id, optionIndex)}
                        >
                          <strong>{String.fromCharCode(65 + optionIndex)}.</strong>
                          <span>{option}</span>
                        </button>
                      );
                    })}
                  </div>
                  {quizAnswers[quizQuestion.id] !== undefined && (
                    <p className="quiz-explanation">Correct answer: {quizQuestion.options[quizQuestion.correctIndex]}. {quizQuestion.explanation}</p>
                  )}
                </section>
              ))}
            </div>
          </section>
        </div>
      )}
    </section>
  );
}
