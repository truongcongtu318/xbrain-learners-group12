import { useEffect, useState } from 'react';
import type { Difficulty, Quiz } from '../../types/domain';
import { apiClient } from '../../lib/api/client';
import { Card } from '../../components/ui/Card';

export function QuizPage({ activeDocumentId }: { activeDocumentId: string }) {
  const [difficulty, setDifficulty] = useState<Difficulty>('medium');
  const [quiz, setQuiz] = useState<Quiz | null>(null);
  const [answers, setAnswers] = useState<Record<string, number>>({});

  useEffect(() => {
    setAnswers({});
    void apiClient.quiz(activeDocumentId, difficulty).then(setQuiz);
  }, [activeDocumentId, difficulty]);

  const score = quiz ? quiz.questions.filter((question) => answers[question.id] === question.correctIndex).length : 0;

  return (
    <>
      <header className="page-header">
        <div>
          <h1>Quiz</h1>
          <p>Ten multiple-choice questions with explanations.</p>
        </div>
        <select className="select page-control" value={difficulty} onChange={(event) => setDifficulty(event.target.value as Difficulty)}>
          <option value="easy">Easy</option>
          <option value="medium">Medium</option>
          <option value="hard">Hard</option>
        </select>
      </header>

      <Card title="Score" eyebrow="Current attempt">
        <strong className="score-text">{score}/{quiz?.questions.length ?? 10}</strong>
      </Card>

      <div className="grid section-gap">
        {quiz?.questions.map((question) => (
          <Card key={question.id} title={question.prompt}>
            <div className="list">
              {question.options.map((option, index) => (
                <button className="row row-button" key={option} onClick={() => setAnswers((state) => ({ ...state, [question.id]: index }))}>
                  <span>{option}</span>
                  <span className="muted">{answers[question.id] === index ? 'Selected' : ''}</span>
                </button>
              ))}
            </div>
            {answers[question.id] !== undefined && (
              <div className="quiz-feedback">
                <strong>Correct answer: {question.options[question.correctIndex]}</strong>
                <p className="muted">{question.explanation}</p>
              </div>
            )}
          </Card>
        ))}
      </div>
    </>
  );
}
