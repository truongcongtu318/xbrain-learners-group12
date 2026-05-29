import { useEffect, useState } from 'react';
import type { StudyDocument } from '../../types/domain';
import { apiClient } from '../../lib/api/client';
import { Card } from '../../components/ui/Card';
import { EmptyState } from '../../components/ui/EmptyState';
import { StatusBadge } from '../../components/ui/StatusBadge';

export function DocumentsPage({ onSelectDocument }: { onSelectDocument: (id: string) => void }) {
  const [documents, setDocuments] = useState<StudyDocument[]>([]);
  const [message, setMessage] = useState('');

  async function refresh() {
    setDocuments(await apiClient.documents().catch(() => []));
  }

  useEffect(() => {
    void refresh();
  }, []);

  async function upload(file: File) {
    setMessage(`Uploading ${file.name}...`);
    const session = await apiClient.createUpload(file.name, file.type || 'application/octet-stream');
    await apiClient.completeUpload(session, file);
    if (session.document) {
      onSelectDocument(session.document.id);
    }
    setMessage(`Uploaded to S3${session.key ? ` at ${session.key}` : ''}.`);
    await refresh();
  }

  return (
    <>
      <header className="page-header">
        <div>
          <h1>Sources</h1>
          <p>Add lectures, notes, and markdown sources that StudyBot can use for grounded study sessions.</p>
        </div>
      </header>

      <div className="grid two">
        <Card title="Add source" eyebrow="PDF, TXT, or MD">
          <label className="empty-state upload-zone">
            <strong>Choose a learning source</strong>
            <p>The browser uploads directly to the private S3 bucket through a presigned URL.</p>
            <input type="file" accept=".pdf,.txt,.md" onChange={(event) => { const file = event.target.files?.[0]; if (file) void upload(file); }} />
          </label>
          {message && <p className="muted">{message}</p>}
        </Card>

        <Card title="Source library" eyebrow="Ready to study">
          {documents.length ? (
            <div className="list">
              {documents.map((doc) => (
                <button className="row row-button" key={doc.id} onClick={() => onSelectDocument(doc.id)}>
                  <span>
                    <strong>{doc.filename}</strong>
                    <br />
                    <span className="muted">{doc.pageCount} pages · {doc.sourceType.replaceAll('_', ' ')}</span>
                  </span>
                  <StatusBadge status={doc.status} />
                </button>
              ))}
            </div>
          ) : (
            <EmptyState title="No sources yet" description="Upload your first lecture file to begin." />
          )}
        </Card>
      </div>
    </>
  );
}
