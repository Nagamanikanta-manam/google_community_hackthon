import { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import StageBadge from '../components/StageBadge.jsx';
import { fetchSubmissionStatus } from '../api/client.js';
import { getRecentSubmissionIds } from '../offline/recentSubmissions.js';

export default function TrackStatus() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const [id, setId] = useState(searchParams.get('id') || '');
  const [result, setResult] = useState(null);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const recentIds = getRecentSubmissionIds();

  async function lookup(targetId) {
    if (!targetId) return;
    setLoading(true);
    setError('');
    setResult(null);
    try {
      setResult(await fetchSubmissionStatus(targetId));
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    const initialId = searchParams.get('id');
    if (initialId) lookup(initialId);
    // Only run on first mount - re-lookups happen explicitly via handleSubmit/recent-id clicks.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function handleSubmit(e) {
    e.preventDefault();
    const trimmed = id.trim();
    if (!trimmed) return;
    navigate(`/track?id=${encodeURIComponent(trimmed)}`, { replace: true });
    lookup(trimmed);
  }

  function lookupRecent(rid) {
    setId(rid);
    navigate(`/track?id=${encodeURIComponent(rid)}`, { replace: true });
    lookup(rid);
  }

  return (
    <div className="page">
      <div className="submit-card">
        <h1>Track your report</h1>
        <p>Enter the report ID you received after submitting to check its status.</p>

        <form onSubmit={handleSubmit}>
          <div className="field">
            <label htmlFor="submission-id">Report ID</label>
            <input
              id="submission-id"
              type="text"
              value={id}
              onChange={(e) => setId(e.target.value)}
              placeholder="e.g. 3f2a1b9c-4d5e-..."
            />
          </div>
          <button type="submit" className="submit-btn" disabled={!id.trim() || loading}>
            {loading ? 'Looking up...' : 'Check status'}
          </button>
        </form>

        {recentIds.length > 0 && (
          <div className="field" style={{ marginTop: 24 }}>
            <label>Recent reports from this device</label>
            <div className="icon-row" style={{ flexWrap: 'wrap' }}>
              {recentIds.map((rid) => (
                <button
                  type="button"
                  key={rid}
                  className="icon-btn"
                  style={{ minWidth: 'auto', flex: 'initial', fontSize: '0.8rem', padding: '10px 14px' }}
                  onClick={() => lookupRecent(rid)}
                >
                  {rid.slice(0, 8)}…
                </button>
              ))}
            </div>
          </div>
        )}

        {error && (
          <div className="status-banner error" role="alert">
            {error}
          </div>
        )}

        {result && (
          <div className="status-banner done" role="status" aria-live="polite">
            Status: {result.status}
            <div className="result-card">
              <dl>
                <dt>Theme <StageBadge source={result.stageSources?.extraction} /></dt>
                <dd>{result.theme || 'Pending analysis'}</dd>
                <dt>Urgency</dt>
                <dd>{result.urgency != null ? `${result.urgency} / 5` : '-'}</dd>
                <dt>Summary</dt>
                <dd lang="en">{result.summaryEn || '-'}</dd>
                <dt>Location <StageBadge source={result.stageSources?.geocode} /></dt>
                <dd>{result.resolvedPlace || result.locationText || 'Not detected'}</dd>
                <dt>Submitted</dt>
                <dd>{result.createdAt ? new Date(result.createdAt).toLocaleString() : '-'}</dd>
              </dl>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
