import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import RankedListItem from '../components/RankedListItem.jsx';
import HotspotMap from '../components/HotspotMap.jsx';
import { fetchRankings, fetchMapPoints, fetchStats } from '../api/client.js';
import { THEMES, themeClass } from '../theme.js';
import { getAdmin, clearAdmin } from '../auth/adminAuth.js';

const THEME_OPTIONS = ['all', ...THEMES];

export default function MpDashboard() {
  const navigate = useNavigate();
  const token = getAdmin()?.token || '';
  const [rankings, setRankings] = useState([]);
  const [mapPoints, setMapPoints] = useState([]);
  const [stats, setStats] = useState(null);
  const [themeFilter, setThemeFilter] = useState('all');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!token) {
      setError('You are not signed in. Please log in again.');
      setLoading(false);
      return;
    }
    async function load() {
      try {
        const [r, m, s] = await Promise.all([
          fetchRankings(token),
          fetchMapPoints(token),
          fetchStats(token),
        ]);
        setRankings(r);
        setMapPoints(m);
        setStats(s);
      } catch (err) {
        if (err.message === 'unauthorized') {
          clearAdmin();
          navigate('/admin?error=invalid');
          return;
        }
        setError(err.message);
      } finally {
        setLoading(false);
      }
    }
    load();
  }, [token, navigate]);

  const filteredRankings = useMemo(
    () => (themeFilter === 'all' ? rankings : rankings.filter((r) => r.theme === themeFilter)),
    [rankings, themeFilter]
  );

  const filteredMapPoints = useMemo(
    () => (themeFilter === 'all' ? mapPoints : mapPoints.filter((p) => p.theme === themeFilter)),
    [mapPoints, themeFilter]
  );

  function openDrilldown(project) {
    const params = new URLSearchParams({
      theme: project.theme || '',
      location: project.location_text || '',
      title: project.project_title || '',
      rationale: project.rationale || '',
    });
    navigate(`/mp-dashboard/project?${params.toString()}`);
  }

  if (loading) return <div className="page">Loading dashboard...</div>;
  if (error) {
    return (
      <div className="page">
        <div className="status-banner error">Failed to load dashboard: {error}</div>
      </div>
    );
  }

  return (
    <div className="page">
      <div className="dashboard-stats">
        <div className="stat-tile">
          <div className="value">{stats?.total_submissions ?? 0}</div>
          <div className="label">Submissions processed</div>
        </div>
        <div className="stat-tile">
          <div className="value">{stats?.theme_count ?? 0}</div>
          <div className="label">Themes</div>
        </div>
        <div className="stat-tile">
          <div className="value">{stats?.ward_count ?? 0}</div>
          <div className="label">Wards / villages</div>
        </div>
      </div>

      <div className="dashboard-section">
        <h2>Recommended development works</h2>
        <div className="filter-row">
          <select value={themeFilter} onChange={(e) => setThemeFilter(e.target.value)}>
            {THEME_OPTIONS.map((t) => (
              <option key={t} value={t}>
                {t === 'all' ? 'All themes' : t}
              </option>
            ))}
          </select>
        </div>
        <div className="theme-legend">
          {THEMES.map((t) => (
            <span className="legend-item" key={t}>
              <span className={`legend-swatch ${themeClass(t)}`} />
              {t}
            </span>
          ))}
        </div>
        {filteredRankings.length === 0 && <p className="empty-state">No ranked projects yet — run the seed, cluster, and scoring scripts.</p>}
        {filteredRankings.map((project, i) => (
          <RankedListItem key={project.cluster_id} rank={i + 1} project={project} onClick={openDrilldown} />
        ))}
      </div>

      <div className="dashboard-section">
        <h2>Hotspot map</h2>
        <HotspotMap
          points={filteredMapPoints}
          onMarkerClick={(p) =>
            openDrilldown({
              theme: p.theme,
              location_text: p.location_text,
              project_title: `${p.theme} — ${p.resolved_place || p.location_text}`,
              rationale: 'Selected from the hotspot map.',
            })
          }
        />
      </div>
    </div>
  );
}
