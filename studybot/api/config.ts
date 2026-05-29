import type { AppMode } from './types';

export interface ApiConfig {
  mode: AppMode;
  awsRegion: string;
  docsBucket: string;
  tableName: string;
  bedrockKbId: string;
  bedrockDataSourceId: string;
  bedrockModelId: string;
  bedrockEmbeddingModelId: string;
  cognitoUserPoolId: string;
  cognitoClientId: string;
}

export function loadConfig(env: NodeJS.ProcessEnv = process.env): ApiConfig {
  const mode = env.APP_MODE === 'aws' ? 'aws' : 'mock';

  return {
    mode,
    awsRegion: env.AWS_REGION || 'us-east-1',
    docsBucket: env.STUDYBOT_DOCS_BUCKET || '',
    tableName: env.STUDYBOT_TABLE_NAME || '',
    bedrockKbId: env.BEDROCK_KB_ID || '',
    bedrockDataSourceId: env.BEDROCK_KB_DATA_SOURCE_ID || '',
    bedrockModelId: env.BEDROCK_MODEL_ID || 'anthropic.claude-3-5-haiku-20241022-v1:0',
    bedrockEmbeddingModelId: env.BEDROCK_EMBEDDING_MODEL_ID || 'amazon.titan-embed-text-v2:0',
    cognitoUserPoolId: env.COGNITO_USER_POOL_ID || '',
    cognitoClientId: env.COGNITO_CLIENT_ID || ''
  };
}
