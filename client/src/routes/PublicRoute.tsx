import React from 'react';
import { Navigate, Outlet } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { Package, Loader2 } from 'lucide-react';

export const PublicRoute: React.FC = () => {
  const { isAuthenticated, loading } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen bg-ivory-100 flex flex-col items-center justify-center relative">
        <div className="relative z-10 flex flex-col items-center">
          <div className="w-14 h-14 rounded-2xl bg-primary-950 flex items-center justify-center shadow-xl shadow-primary-950/20 border border-primary-900 mb-4 animate-pulse">
            <Package className="w-7 h-7 text-ivory-100" />
          </div>
          <div className="flex items-center gap-2 text-primary-950/70 text-sm font-medium">
            <Loader2 className="w-4 h-4 animate-spin text-primary-950" />
            <span>Connecting...</span>
          </div>
        </div>
      </div>
    );
  }

  if (isAuthenticated) {
    return <Navigate to="/dashboard" replace />;
  }

  return <Outlet />;
};
