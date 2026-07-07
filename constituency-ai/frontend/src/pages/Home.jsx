import { Link } from 'react-router-dom';

const FEATURES = [
  {
    icon: '🎙️',
    title: 'Speak, type, or snap a photo',
    description: 'Report a pothole, water shortage, or school issue in your own language — no app install needed.',
  },
  {
    icon: '🤖',
    title: 'AI reads every report',
    description: 'Speech-to-text, translation, and Gemini extract the theme, urgency, and location automatically.',
  },
  {
    icon: '📊',
    title: 'MPs see what matters most',
    description: 'Similar reports are clustered and ranked against real demographic data, not just complaint volume.',
  },
];

export default function Home() {
  return (
    <div className="page">
      <div className="hero">
        <span className="hero-badge">AI for constituency development</span>
        <h1>Your voice, prioritized by evidence.</h1>
        <p className="lead">
          Report development needs in your area — potholes, water shortages, school issues, and more —
          by voice, text, or photo, in your own language. AI clusters and ranks reports so your MP's
          office can see the most urgent, widely-shared needs first.
        </p>
        <div className="hero-actions">
          <Link to="/submit" className="btn btn-primary">
            <span aria-hidden="true">📢</span> Report an issue
          </Link>
          <Link to="/track" className="btn btn-secondary">
            <span aria-hidden="true">🔍</span> Track my report
          </Link>
        </div>
      </div>

      <div className="features-grid">
        {FEATURES.map((f) => (
          <div className="feature-card" key={f.title}>
            <span className="feature-icon" aria-hidden="true">{f.icon}</span>
            <h3>{f.title}</h3>
            <p>{f.description}</p>
          </div>
        ))}
      </div>
    </div>
  );
}
