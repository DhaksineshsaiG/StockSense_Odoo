import React from 'react';
import { Outlet, Link } from 'react-router-dom';
import { Package } from 'lucide-react';

export const AuthLayout: React.FC = () => {
  return (
    <div className="min-h-screen relative bg-ivory-200 text-primary-950 flex items-center justify-center p-4 sm:p-6 lg:p-8">
      {/* Background Atmosphere */}
      <div className="ambient-bg">
        <div className="blob-1" />
        <div className="blob-2" />
        <div className="blob-3" />
      </div>

      <div className="relative z-10 w-full max-w-md">
        {/* Branding Header */}
        <div className="text-center mb-8">
          <Link to="/" className="inline-flex items-center gap-3 group">
            <div className="w-12 h-12 rounded-2xl bg-primary-950 flex items-center justify-center shadow-lg shadow-primary-950/15 border border-primary-800/30 group-hover:scale-105 transition-transform duration-200">
              <Package className="w-6 h-6 text-ivory-200" />
            </div>
            <div className="text-left">
              <span className="text-2xl font-black text-primary-950 tracking-tight">StockSense</span>
              <p className="text-xs text-primary-800/50">Intelligent Inventory Management</p>
            </div>
          </Link>
        </div>

        {/* Content Outlet (Login/Register/Forgot/OTP/Reset) */}
        <Outlet />
      </div>
    </div>
  );
};
