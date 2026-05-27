import type { DocumentStatus } from '../../../types/domain';

const labels: Record<DocumentStatus, string> = {
  UPLOADING: 'Uploading',
  ANALYZING: 'Analyzing',
  INDEXING: 'Indexing',
  READY: 'Ready',
  FAILED: 'Failed'
};

export function StatusBadge({ status }: { status: DocumentStatus }) {
  return <span className={`status status-${status.toLowerCase()}`}>{labels[status]}</span>;
}
