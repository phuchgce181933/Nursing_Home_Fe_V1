import { Navigate } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import { getHomePath } from '../constants/routes';
import LoadingSpinner from './ui/LoadingSpinner';

function ProtectedRoute({ children, requiredRole }) {
  const { token, user, loading } = useAuth();
  const normalizedRole = user?.role?.toLowerCase();
  const normalizedRequiredRole = requiredRole?.toLowerCase();

  if (loading) {
    return <LoadingSpinner />;
  }

  if (!token) {
    return <Navigate to="/login" replace />;
  }

  if (normalizedRequiredRole && normalizedRole !== normalizedRequiredRole) {
    return <Navigate to={getHomePath(normalizedRole)} replace />;
  }

  return children;
}

export default ProtectedRoute;
