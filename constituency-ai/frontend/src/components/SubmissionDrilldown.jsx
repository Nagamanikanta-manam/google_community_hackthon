import { themeClass } from '../theme.js';

export default function SubmissionDrilldown({ project, submissions, onClose }) {
  if (!project) return null;

  return (
    <div className="dashboard-section">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 12 }}>
        <h2>
          {project.project_title}{' '}
          <span className={`theme-badge ${themeClass(project.theme)}`}>{project.theme}</span>
        </h2>
        <button className="submit-btn close-btn" onClick={onClose}>
          Back to dashboard
        </button>
      </div>
      <p className="rationale">{project.rationale}</p>

      <div className="drilldown-list">
        {submissions.length === 0 && <p className="empty-state">No raw submissions found for this cluster yet.</p>}
        {submissions.map((s) => (
          <div className="submission-row" key={s.id}>
            <div>{s.summaryEn || s.transcriptEn || s.transcriptOriginal}</div>
            <div className="meta">
              {s.detectedLanguage ? `Original language: ${s.detectedLanguage} · ` : ''}
              Urgency {s.urgency ?? '-'}/5 · Sentiment {s.sentiment ?? '-'} ·{' '}
              {s.createdAt ? new Date(s.createdAt).toLocaleDateString() : ''}
            </div>
            {s.transcriptOriginal && s.transcriptOriginal !== s.transcriptEn && (
              <div className="meta">Original: {s.transcriptOriginal}</div>
            )}
            {s.audioUrl && (
              <audio controls src={s.audioUrl} style={{ marginTop: 6, width: '100%' }} />
            )}
            {s.photoUrl && (
              <img src={s.photoUrl} alt="submission" style={{ marginTop: 6, maxWidth: 200, borderRadius: 8 }} />
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
