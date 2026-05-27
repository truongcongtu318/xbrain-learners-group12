import type { Difficulty } from '../../src/types/domain';
import type { Providers } from '../types';

export class StudyService {
  constructor(private readonly providers: Providers) {}

  async askQuestion(headers: Headers, documentId: string, question: string) {
    const user = await this.providers.auth.resolveUser(headers);
    return this.providers.study.askQuestion(user, documentId, question);
  }

  async generateStudyGuide(headers: Headers, documentId: string) {
    const user = await this.providers.auth.resolveUser(headers);
    return this.providers.study.generateStudyGuide(user, documentId);
  }

  async generateFlashcards(headers: Headers, documentId: string) {
    const user = await this.providers.auth.resolveUser(headers);
    return this.providers.study.generateFlashcards(user, documentId);
  }

  async generateQuiz(headers: Headers, documentId: string, difficulty: Difficulty) {
    const user = await this.providers.auth.resolveUser(headers);
    return this.providers.study.generateQuiz(user, documentId, difficulty);
  }

  async getWeeklyProgress(headers: Headers) {
    const user = await this.providers.auth.resolveUser(headers);
    return this.providers.study.getWeeklyProgress(user);
  }
}
