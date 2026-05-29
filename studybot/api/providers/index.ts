import type { ApiConfig } from '../config';
import type { Providers } from '../types';
import { createAwsProviders } from './aws';
import { createMockProviders } from './mock';

export function createProviders(config: ApiConfig): Providers {
  return config.mode === 'aws' ? createAwsProviders(config) : createMockProviders();
}
