import React from 'react';
import { Navigate, Outlet } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';

interface ProtectedRouteProps {
  requiredRole?: 'Admin' | 'SalesWorker';
}

export const ProtectedRoute: React.FC<ProtectedRouteProps> = ({ requiredRole }) => {
  const { user, isAuthenticated, isRestoring } = useAuth();   // CHANGED — added isRestoring

  if (isRestoring) {                                          // ADDED
    return <div className="admin-state">Loading…</div>;
  }

  if (!isAuthenticated || !user) {
    return <Navigate to="/login" replace />;
  }

  if (requiredRole && user.role !== requiredRole) {
    return <Navigate to={user.role === 'Admin' ? '/admin/dashboard' : '/billing/dashboard'} replace />;
  }

  return <Outlet />;
};

export default ProtectedRoute;