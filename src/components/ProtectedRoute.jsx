import { Navigate } from 'react-router-dom';
import useAuth from '../hooks/useAuth';

const getHomePath = (role) => {
  switch (role) {
    case 'admin':
      return '/admin/dashboard';
    case 'doctor':
      return '/doctor/dashboard';
    case 'nurse':
      return '/nurse/dashboard';
    case 'family':
      return '/family/dashboard';
    case 'manager':
      return '/manager/dashboard';
    default:
      return '/profile';
  }
};

function ProtectedRoute({ children, requiredRole }) {
  const { token, user, loading } = useAuth();

  if (loading) {
    return <div>Loading...</div>;
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