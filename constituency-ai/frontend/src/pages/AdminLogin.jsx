import { useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { setAdmin } from '../auth/adminAuth.js';

export default function AdminLogin() {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const redirectTo = searchParams.get('redirect') || '/mp-dashboard';
  const invalidLogin = searchParams.get('error') === 'invalid';

  function handleSubmit(e) {
    e.preventDefault();
    const trimmedUsername = username.trim();
    const trimmedPassword = password.trim();
    if (!trimmedUsername || !trimmedPassword) return;
    // The password doubles as the admin API token (ADMIN_TOKEN in backend/.env) -
    // this just gives it a login-style UI instead of asking admins to paste a raw
    // ?token= value into the URL.
    setAdmin({ username: trimmedUsername, token: trimmedPassword });
    navigate(redirectTo, { replace: true });
  }

  return (
    <div className="page auth-shell">
      <div className="submit-card auth-card">
        <div className="auth-avatar" aria-hidden="true">🏛️</div>
        <h1>MP Dashboard login</h1>
        <p>Sign in to view ranked development priorities for your constituency.</p>
        <div className="auth-hint">
          Demo credentials — username: <strong>admin</strong>, password: <strong>demo</strong>
        </div>
        {invalidLogin && (
          <div className="status-banner error" role="alert">
            Incorrect username or password. Please try again.
          </div>
        )}
        <form onSubmit={handleSubmit}>
          <div className="field">
            <label htmlFor="admin-username">Username</label>
            <input
              id="admin-username"
              type="text"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              placeholder="admin"
              autoComplete="username"
            />
          </div>
          <div className="field">
            <label htmlFor="admin-password">Password</label>
            <input
              id="admin-password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="demo"
              autoComplete="current-password"
            />
          </div>
          <button type="submit" className="submit-btn" disabled={!username.trim() || !password.trim()}>
            Sign in
          </button>
        </form>
      </div>
    </div>
  );
}
