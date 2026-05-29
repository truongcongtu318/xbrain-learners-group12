import type { ApiConfig } from '../config';
import type { AuthProvider, DocumentProvider, EvidenceProvider, Providers, StudyProvider } from '../types';
import type { Difficulty, FlashcardDeck, QuestionAnswer, Quiz, StudyDocument, StudyGuide, UploadSession, User } from '../../src/types/domain';
import { ApiError } from '../errors';

const REQUIRED_CONFIG = [
  ['STUDYBOT_DOCS_BUCKET', 'S3 document bucket'],
  ['STUDYBOT_TABLE_NAME', 'DynamoDB application table'],
  ['BEDROCK_KB_ID', 'Bedrock Knowledge Base'],
  ['BEDROCK_KB_DATA_SOURCE_ID', 'Bedrock Knowledge Base data source']
] as const;

function configValue(config: ApiConfig, name: (typeof REQUIRED_CONFIG)[number][0]): string {
  switch (name) {
    case 'STUDYBOT_DOCS_BUCKET':
      return config.docsBucket;
    case 'STUDYBOT_TABLE_NAME':
      return config.tableName;
    case 'BEDROCK_KB_ID':
      return config.bedrockKbId;
    case 'BEDROCK_KB_DATA_SOURCE_ID':
      return config.bedrockDataSourceId;
  }
}

function missingConfig(config: ApiConfig): string[] {
  return REQUIRED_CONFIG.filter(([name]) => !configValue(config, name)).map(([name]) => name);
}

function awsConfigMissing(missing: string[]): ApiError {
  return new ApiError('AWS_CONFIG_MISSING', 'AWS mode is missing required deployment environment variables.', 503, { missing });
}

function awsNotImplemented(operation: string): ApiError {
  return new ApiError('AWS_PROVIDER_NOT_IMPLEMENTED', 'AWS provider skeleton is configured, but real AWS integration is not implemented yet.', 501, { operation });
}

class AwsAuthProvider implements AuthProvider {
  constructor(private readonly missing: string[]) {}

  async resolveUser(): Promise<User> {
    if (this.missing.length > 0) throw awsConfigMissing(this.missing);
    throw awsNotImplemented('auth.resolveUser');
  }
}

class AwsDocumentProvider implements DocumentProvider {
  constructor(private readonly missing: string[]) {}

  private assertReady(operation: string): never {
    if (this.missing.length > 0) throw awsConfigMissing(this.missing);
    throw awsNotImplemented(operation);
  }

  async createUploadSession(_user: User, _filename: string, _contentType: string): Promise<UploadSession> {
    this.assertReady('documents.createUploadSession');
  }

  async acceptMockUpload(_user: User, _documentId: string): Promise<StudyDocument> {
    this.assertReady('documents.acceptMockUpload');
  }

  async listDocuments(_user: User): Promise<StudyDocument[]> {
    this.assertReady('documents.listDocuments');
  }

  async getDocument(_user: User, _documentId: string): Promise<StudyDocument> {
    this.assertReady('documents.getDocument');
  }
}

class AwsStudyProvider implements StudyProvider {
  constructor(private readonly missing: string[]) {}

  private assertReady(operation: string): never {
    if (this.missing.length > 0) throw awsConfigMissing(this.missing);
    throw awsNotImplemented(operation);
  }

  async askQuestion(_user: User, _documentIds: string[], _question: string): Promise<QuestionAnswer> {
    this.assertReady('study.askQuestion');
  }

  async generateStudyGuide(_user: User, _documentId: string): Promise<StudyGuide> {
    this.assertReady('study.generateStudyGuide');
  }

  async generateFlashcards(_user: User, _documentId: string): Promise<FlashcardDeck> {
    this.assertReady('study.generateFlashcards');
  }

  async generateQuiz(_user: User, _documentId: string, _difficulty: Difficulty): Promise<Quiz> {
    this.assertReady('study.generateQuiz');
  }
}

class AwsEvidenceProvider implements EvidenceProvider {
  constructor(private readonly missing: string[]) {}

  async getReadiness() {
    const missingSet = new Set(this.missing);

    return {
      mode: 'aws' as const,
      services: REQUIRED_CONFIG.map(([name, label]) => ({
        name: label,
        status: missingSet.has(name) ? ('missing' as const) : ('ready' as const),
        detail: missingSet.has(name)
          ? `Missing ${name}; set this environment variable before AWS deployment.`
          : `${name} is configured for AWS provider skeleton. Runtime operations return AWS_PROVIDER_NOT_IMPLEMENTED until integration is implemented.`
      })),
      retrievalProbes: []
    };
  }
}

export function createAwsProviders(config: ApiConfig): Providers {
  const missing = missingConfig(config);

  return {
    auth: new AwsAuthProvider(missing),
    documents: new AwsDocumentProvider(missing),
    study: new AwsStudyProvider(missing),
    evidence: new AwsEvidenceProvider(missing)
  };
}
