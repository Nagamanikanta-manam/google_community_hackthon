import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import VoiceRecorder from '../components/VoiceRecorder.jsx';
import PhotoUpload from '../components/PhotoUpload.jsx';
import StageBadge from '../components/StageBadge.jsx';
import { submitCitizenReport } from '../api/client.js';
import { queueSubmission, getPendingCount, flushQueue, isNetworkError } from '../offline/offlineQueue.js';
import { rememberSubmissionId } from '../offline/recentSubmissions.js';
import { getCitizen } from '../auth/citizenAuth.js';

const LANGUAGES = [
  { key: 'hi', label: 'हिन्दी (Hindi)' },
  { key: 'te', label: 'తెలుగు (Telugu)' },
  { key: 'en', label: 'English' },
];

export default function CitizenSubmit() {
  const [mode, setMode] = useState('text'); // 'text' | 'voice'
  const [text, setText] = useState('');
  const [languageKey, setLanguageKey] = useState('hi');
  const [audioBlob, setAudioBlob] = useState(null);
  const [photoFile, setPhotoFile] = useState(null);
  const [status, setStatus] = useState(null); // null | 'processing' | 'done' | 'error' | 'queued'
  const [result, setResult] = useState(null);
  const [errorMsg, setErrorMsg] = useState('');
  const [pendingCount, setPendingCount] = useState(0);

  const canSubmit = (mode === 'text' ? text.trim().length > 0 : !!audioBlob) && status !== 'processing';

  function refreshPendingCount() {
    getPendingCount().then(setPendingCount);
  }

  useEffect(() => {
    refreshPendingCount();
    const onOnline = () =>
      flushQueue(submitCitizenReport).then(async () => {
        const remaining = await getPendingCount();
        setPendingCount(remaining);
        // A successful flush resolves the "you're offline, saved for later" state -
        // otherwise it would sit on screen forever after the network comes back.
        setStatus((prev) => (prev === 'queued' ? null : prev));
      });
    window.addEventListener('online', onOnline);
    onOnline(); // also flush anything left over from a previous offline session
    return () => window.removeEventListener('online', onOnline);
  }, []);

  function getLocation() {
    return new Promise((resolve) => {
      if (!navigator.geolocation) return resolve(null);
      navigator.geolocation.getCurrentPosition(
        (pos) => resolve({ lat: pos.coords.latitude, lng: pos.coords.longitude }),
        () => resolve(null),
        { timeout: 4000 }
      );
    });
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setErrorMsg('');
    setResult(null);

    const loc = await getLocation();
    const citizen = getCitizen();
    const payload = {
      text: mode === 'text' ? text : '',
      languageKey,
      audioBlob: mode === 'voice' ? audioBlob : null,
      photoFile,
      citizenName: citizen?.name,
      citizenPhone: citizen?.phone,
      lat: loc?.lat,
      lng: loc?.lng,
    };

    if (!navigator.onLine) {
      await queueSubmission({ ...payload, photoBlob: payload.photoFile });
      setStatus('queued');
      refreshPendingCount();
      return;
    }

    setStatus('processing');
    try {
      const response = await submitCitizenReport(payload);
      setResult(response);
      setStatus('done');
      if (response.id) rememberSubmissionId(response.id);
    } catch (err) {
      console.error('Submission failed:', err);
      if (isNetworkError(err)) {
        await queueSubmission({ ...payload, photoBlob: payload.photoFile });
        setStatus('queued');
        refreshPendingCount();
      } else {
        setErrorMsg('Something went wrong while processing your report. Please try again in a moment.');
        setStatus('error');
      }
    }
  }

  return (
    <div className="page">
      <div className="submit-card">
        <h1>Report a development need in your area</h1>
        <p>Speak, type, or send a photo — in your own language. Your MP's office will review it.</p>

        <form onSubmit={handleSubmit} aria-busy={status === 'processing'}>
          <div className="field">
            <label htmlFor="language-select">Language</label>
            <select id="language-select" value={languageKey} onChange={(e) => setLanguageKey(e.target.value)}>
              {LANGUAGES.map((l) => (
                <option key={l.key} value={l.key}>
                  {l.label}
                </option>
              ))}
            </select>
          </div>

          <div className="field">
            <label id="submit-mode-label">How would you like to submit?</label>
            <div className="icon-row" role="group" aria-labelledby="submit-mode-label">
              <button
                type="button"
                className={`icon-btn ${mode === 'voice' ? 'active' : ''}`}
                aria-pressed={mode === 'voice'}
                onClick={() => setMode('voice')}
              >
                <span aria-hidden="true">🎙️</span>
                <span className="label">Voice</span>
              </button>
              <button
                type="button"
                className={`icon-btn ${mode === 'text' ? 'active' : ''}`}
                aria-pressed={mode === 'text'}
                onClick={() => setMode('text')}
              >
                <span aria-hidden="true">⌨️</span>
                <span className="label">Text</span>
              </button>
            </div>
          </div>

          {mode === 'voice' ? (
            <div className="field">
              <VoiceRecorder onRecorded={setAudioBlob} />
            </div>
          ) : (
            <div className="field">
              <label htmlFor="issue-text">Describe the issue</label>
              <textarea
                id="issue-text"
                lang={languageKey}
                value={text}
                onChange={(e) => setText(e.target.value)}
                placeholder="e.g. The road near the bus stand has a large pothole..."
              />
            </div>
          )}

          <div className="field">
            <label>Photo (optional)</label>
            <PhotoUpload onSelected={setPhotoFile} />
          </div>

          <button type="submit" className="submit-btn" disabled={!canSubmit}>
            {status === 'processing' ? 'Processing with AI...' : 'Submit'}
          </button>
        </form>

        {pendingCount > 0 && (
          <div className="status-banner processing" role="status" aria-live="polite">
            {pendingCount} report{pendingCount > 1 ? 's' : ''} saved on this device, waiting to send.
          </div>
        )}
        {status === 'processing' && (
          <div className="status-banner processing" role="status" aria-live="polite">
            Transcribing, translating, and analyzing your report...
          </div>
        )}
        {status === 'queued' && (
          <div className="status-banner processing" role="status" aria-live="polite">
            You're offline — your report has been saved and will be sent automatically once you're back
            online.
          </div>
        )}
        {status === 'error' && (
          <div className="status-banner error" role="alert">
            Error: {errorMsg}
          </div>
        )}
        {status === 'done' && result && (
          <div className="status-banner done" role="status" aria-live="polite">
            Thank you — your report has been recorded and analyzed. You can{' '}
            <Link to={`/track?id=${encodeURIComponent(result.id)}`}>track its status</Link> any time.
            <div className="result-card">
              <dl>
                <dt>Report ID</dt>
                <dd>{result.id}</dd>
                <dt>Theme <StageBadge source={result.stageSources?.extraction} /></dt>
                <dd>{result.theme}</dd>
                <dt>Urgency</dt>
                <dd>{result.urgency} / 5</dd>
                <dt>Transcript <StageBadge source={result.stageSources?.stt} /></dt>
                <dd lang={result.detectedLanguage || languageKey}>{result.transcriptOriginal}</dd>
                <dt>Translation <StageBadge source={result.stageSources?.translate} /></dt>
                <dd lang="en">{result.transcriptEn}</dd>
                <dt>Summary</dt>
                <dd lang="en">{result.summaryEn}</dd>
                <dt>Location <StageBadge source={result.stageSources?.geocode} /></dt>
                <dd>{result.resolvedPlace || result.locationText || 'Not detected'}</dd>
                {result.damageDescription && (
                  <>
                    <dt>Photo analysis</dt>
                    <dd lang="en">{result.damageDescription}</dd>
                  </>
                )}
              </dl>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
