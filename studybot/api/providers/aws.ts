import type { ApiConfig } from '../config';
import type { Providers } from '../types';
import { ApiError } from '../errors';
import { createMockProviders } from './mock';

function missingConfig(config: ApiConfig): string[] {
  const required = [
    ['STUDYBOT_DOCS_BUCKET', config.docsBucket],
    ['STUDYBOT_TABLE_NAME', config.tableName],
    ['BEDROCK_KB_ID', config.bedrockKbId],
    ['BEDROCK_KB_DATA_SOURCE_ID', config.bedrockDataSourceId]
  ] as const;
  return required.filter(([, value]) => !value).map(([name]) => name);
}

export function createAwsProviders(config: ApiConfig): Providers {
  const missing = missingConfig(config);
  if (missing.length > 0) {
    const mock = createMockProviders();
    return {
      ...mock,
      evidence: {
        async getReadiness() {
          return {
            mode: 'aws',
            services: missing.map((name) => ({ name, status: 'missing' as const, detail: 'Set this environment variable before AWS deployment.' })),
            retrievalProbes: []
          };
        }
      },
      documents: {
        ...mock.documents,
        async createUploadSession() {
          throw new ApiError('AWS_CONFIG_MISSING', 'AWS mode is missing required deployment environment variables.', 503, { missing });
        }
      }
    };
  }

  return createMockProviders();
}
