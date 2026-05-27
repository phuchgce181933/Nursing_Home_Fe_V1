import { Navigate } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import { getHomePath } from '../constants/routes';
import LoadingSpinner from './ui/LoadingSpinner';

function ProtectedRoute({ children, requiredRole }) {
  const { token, user, loading } = useAuth();

  if (loading) {
    return <LoadingSpinner />;
  }

  if (!token) {
    return <Navigate to="/login" replace />;
  }

  if (requiredRole && user?.role !== requiredRole) {
    return <Navigate to={getHomePath(user?.role)} replace />;
  }

  return children;
}

export default ProtectedRoute;
