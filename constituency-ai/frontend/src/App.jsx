import { Routes, Route, NavLink, useLocation, useNavigate } from 'react-router-dom';
import Home from './pages/Home.jsx';
import CitizenLogin from './pages/CitizenLogin.jsx';
import CitizenSubmit from './pages/CitizenSubmit.jsx';
import TrackStatus from './pages/TrackStatus.jsx';
import AdminLogin from './pages/AdminLogin.jsx';
import MpDashboard from './pages/MpDashboard.jsx';
import ProjectDetail from './pages/ProjectDetail.jsx';
import RequireCitizen from './components/RequireCitizen.jsx';
import RequireAdmin from './components/RequireAdmin.jsx';
import { getCitizen, clearCitizen } from './auth/citizenAuth.js';
import { getAdmin, clearAdmin } from './auth/adminAuth.js';

export default function App() {
  // Subscribing to location forces the nav to re-read auth state after a
  // login/logout navigates, since getCitizen()/getAdmin() aren't reactive.
  useLocation();
  const navigate = useNavigate();
  const citizen = getCitizen();
  const admin = getAdmin();

  function handleCitizenLogout() {
    clearCitizen();
    navigate('/');
  }

  function handleAdminLogout() {
    clearAdmin();
    navigate('/');
  }

  return (
    <div className="app">
      <nav className="topnav">
        <span className="brand">
          <span className="brand-mark" aria-hidden="true">🏛️</span>
          Constituency Priorities
        </span>
        <div className="nav-links">
          <NavLink to="/" end>Home</NavLink>
          <NavLink to="/submit">Citizen Submit</NavLink>
          <NavLink to="/track">Track Status</NavLink>
          <span className="nav-divider" aria-hidden="true" />
          {citizen ? (
            <>
              <span className="nav-user">{citizen.name}</span>
              <button type="button" className="nav-link-btn" onClick={handleCitizenLogout}>
                Log out
              </button>
            </>
          ) : (
            <NavLink to="/login">Citizen Login</NavLink>
          )}
          {admin ? (
            <>
              <span className="nav-user">{admin.username} (MP)</span>
              <button type="button" className="nav-link-btn" onClick={handleAdminLogout}>
                Log out
              </button>
            </>
          ) : (
            <NavLink to="/admin">MP Login</NavLink>
          )}
        </div>
      </nav>
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/login" element={<CitizenLogin />} />
        <Route
          path="/submit"
          element={
            <RequireCitizen>
              <CitizenSubmit />
            </RequireCitizen>
          }
        />
        <Route
          path="/track"
          element={
            <RequireCitizen>
              <TrackStatus />
            </RequireCitizen>
          }
        />
        <Route path="/admin" element={<AdminLogin />} />
        <Route
          path="/mp-dashboard"
          element={
            <RequireAdmin>
              <MpDashboard />
            </RequireAdmin>
          }
        />
        <Route
          path="/mp-dashboard/project"
          element={
            <RequireAdmin>
              <ProjectDetail />
            </RequireAdmin>
          }
        />
      </Routes>
    </div>
  );
}
