import { Navigate, useLocation } from 'react-router-dom';
import { getAdmin } from '../auth/adminAuth.js';

export default function RequireAdmin({ children }) {
  const location = useLocation();
  const admin = getAdmin();

  if (!admin) {
    const redirect = encodeURIComponent(location.pathname + location.search);
    return <Navigate to={`/admin?redirect=${redirect}`} replace />;
  }

  return children;
}
