import { useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { setCitizen } from '../auth/citizenAuth.js';

export default function CitizenLogin() {
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const redirectTo = searchParams.get('redirect') || '/submit';

  function handleSubmit(e) {
    e.preventDefault();
    const trimmedName = name.trim();
    const trimmedPhone = phone.trim();
    if (!trimmedName || !trimmedPhone) return;
    setCitizen({ name: trimmedName, phone: trimmedPhone });
    navigate(redirectTo, { replace: true });
  }

  return (
    <div className="page auth-shell">
      <div className="submit-card auth-card">
        <div className="auth-avatar" aria-hidden="true">🙋</div>
        <h1>Sign in to continue</h1>
        <p>Tell us who you are so your MP's office knows who reported each issue.</p>
        <form onSubmit={handleSubmit}>
          <div className="field">
            <label htmlFor="citizen-name">Your name</label>
            <input
              id="citizen-name"
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. Ramesh Kumar"
            />
          </div>
          <div className="field">
            <label htmlFor="citizen-phone">Phone number</label>
            <input
              id="citizen-phone"
              type="tel"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              placeholder="e.g. 9876543210"
            />
          </div>
          <button type="submit" className="submit-btn" disabled={!name.trim() || !phone.trim()}>
            Continue
          </button>
        </form>
      </div>
    </div>
  );
}
