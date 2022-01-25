import React from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import Layout from './Layout';
import Loader from './Loader';

export default function ProtectedRoute() {
  const { user, loading } = useAuth();
  const location = useLocation();

  if (loading) return <Loader fullPage />;
  if (!user) return <Navigate to="/login" replace state={{ from: location }} />;
  return <Layout />;
}

export function GuestRoute({ children }) {
  const { user, loading } = useAuth();
  if (loading) return <Loader fullPage />;
  if (user) return <Navigate to="/" replace />;
  return children;
}

export function RoleRoute({ role, children }) {
  const { user } = useAuth();
  if (user.role !== role) return <Navigate to="/" replace />;
  return children;
}
