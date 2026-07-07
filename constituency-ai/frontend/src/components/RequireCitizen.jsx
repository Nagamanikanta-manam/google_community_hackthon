import { Navigate, useLocation } from 'react-router-dom';
import { getCitizen } from '../auth/citizenAuth.js';

export default function RequireCitizen({ children }) {
  const location = useLocation();
  const citizen = getCitizen();

  if (!citizen) {
    const redirect = encodeURIComponent(location.pathname + location.search);
    return <Navigate to={`/login?redirect=${redirect}`} replace />;
  }

  return children;
}
