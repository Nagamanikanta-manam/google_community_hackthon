import { useRef, useState } from 'react';

export default function VoiceRecorder({ onRecorded }) {
  const [recording, setRecording] = useState(false);
  const [hasClip, setHasClip] = useState(false);
  const [error, setError] = useState('');
  const mediaRecorderRef = useRef(null);
  const chunksRef = useRef([]);

  async function startRecording() {
    setError('');
    let stream;
    try {
      stream = await navigator.mediaDevices.getUserMedia({ audio: true });
    } catch (err) {
      setError(
        err.name === 'NotAllowedError'
          ? 'Microphone access was denied. Please allow microphone permission and try again.'
          : 'Could not access the microphone on this device/browser. Try the Text option instead.'
      );
      return;
    }

    const recorder = new MediaRecorder(stream, { mimeType: 'audio/webm;codecs=opus' });
    chunksRef.current = [];

    recorder.ondataavailable = (e) => {
      if (e.data.size > 0) chunksRef.current.push(e.data);
    };
    recorder.onstop = () => {
      const blob = new Blob(chunksRef.current, { type: 'audio/webm' });
      onRecorded(blob);
      setHasClip(true);
      stream.getTracks().forEach((t) => t.stop());
    };

    recorder.start();
    mediaRecorderRef.current = recorder;
    setRecording(true);
  }

  function stopRecording() {
    mediaRecorderRef.current?.stop();
    setRecording(false);
  }

  return (
    <div>
      <button
        type="button"
        className={`icon-btn ${recording ? 'active' : ''}`}
        aria-pressed={recording}
        onClick={recording ? stopRecording : startRecording}
      >
        <span aria-hidden="true">{recording ? '⏹️' : '🎤'}</span>
        <span className="label">{recording ? 'Stop recording' : 'Record voice note'}</span>
      </button>
      {recording && (
        <p className="recording-indicator" role="status" aria-live="polite">
          Recording... speak now
        </p>
      )}
      {hasClip && !recording && (
        <p className="recording-indicator" role="status" aria-live="polite">
          Voice note attached ✓
        </p>
      )}
      {error && (
        <p className="status-banner error" role="alert">
          {error}
        </p>
      )}
    </div>
  );
}
