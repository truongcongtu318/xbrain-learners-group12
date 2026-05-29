import { useEffect, useState } from 'react';
import type { EvidenceReadiness } from '../../types/domain';
import { apiClient } from '../../lib/api/client';
import { Card } from '../../components/ui/Card';

export function EvidencePage() {
  const [evidence, setEvidence] = useState<EvidenceReadiness | null>(null);

  useEffect(() => {
    void apiClient.evidence().then(setEvidence);
  }, []);

  return (
    <>
      <header className="page-header">
        <div>
          <h1>Demo readiness</h1>
          <p>A focused evidence view for graders and deployment checks, kept away from the main learner flow.</p>
        </div>
      </header>

      <div className="grid two">
        <Card title="Service mapping" eyebrow={`Mode: ${evidence?.mode ?? 'loading'}`}>
          <div className="list">
            {evidence?.services.map((service) => (
              <div className="row" key={service.name}>
                <span>
                  <strong>{service.name}</strong>
                  <br />
                  <span className="muted">{service.detail}</span>
                </span>
                <span className="muted">{service.status}</span>
              </div>
            ))}
          </div>
        </Card>

        <Card title="Retrieval probes" eyebrow="Quality evidence">
          <div className="list">
            {evidence?.retrievalProbes.map((probe) => (
              <div className="citation" key={probe.question}>
                <strong>{probe.question}</strong>
                <p>{probe.retrievedSource} · relevance {probe.relevance}</p>
              </div>
            ))}
          </div>
        </Card>
      </div>
    </>
  );
}
