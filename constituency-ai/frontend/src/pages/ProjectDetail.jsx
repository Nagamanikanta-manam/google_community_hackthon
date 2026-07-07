import { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import SubmissionDrilldown from '../components/SubmissionDrilldown.jsx';
import { fetchSubmissions } from '../api/client.js';
import { getAdmin, clearAdmin } from '../auth/adminAuth.js';

export default function ProjectDetail() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const token = getAdmin()?.token || '';
  const theme = searchParams.get('theme') || '';
  const location = searchParams.get('location') || '';

  const project = {
    theme,
    location_text: location,
    project_title: searchParams.get('title') || theme,
    rationale: searchParams.get('rationale') || '',
  };

  const [submissions, setSubmissions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!token) {
      setError('You are not signed in. Please log in again.');
      setLoading(false);
      return;
    }
    fetchSubmissions(token, theme, location)
      .then(setSubmissions)
      .catch((err) => {
        if (err.message === 'unauthorized') {
          clearAdmin();
          navigate('/admin?error=invalid');
          return;
        }
        setError(err.message);
      })
      .finally(() => setLoading(false));
  }, [token, theme, location, navigate]);

  function backToDashboard() {
    navigate('/mp-dashboard');
  }

  if (loading) return <div className="page">Loading project...</div>;

  return (
    <div className="page">
      {error && (
        <div className="status-banner error" role="alert">
          {error}
        </div>
      )}
      <SubmissionDrilldown project={project} submissions={submissions} onClose={backToDashboard} />
    </div>
  );
}
