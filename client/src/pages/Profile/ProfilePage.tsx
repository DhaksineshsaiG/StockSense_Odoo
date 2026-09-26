import React, { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import {
  User as UserIcon,
  Mail,
  ShieldCheck,
  UserCheck,
  Calendar,
  Clock,
  LogOut,
  Settings,
  CheckCircle2,
  RefreshCw,
  Shield,
} from 'lucide-react';

import { GlassCard } from '../../components/common/GlassCard';
import { Button } from '../../components/common/Button';
import { LoadingSkeleton } from '../../components/common/LoadingSkeleton';
import { ErrorState } from '../../components/common/ErrorState';
import { useAuth } from '../../contexts/AuthContext';
import { authApi } from '../../api/auth';
import { User } from '../../types';

export const ProfilePage: React.FC = () => {
  const navigate = useNavigate();
  const { user: authUser, logout } = useAuth();

  const [profile, setProfile] = useState<User | null>(authUser);
  const [isLoading, setIsLoading] = useState(!authUser);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchProfile = async (showRefreshing = false) => {
    if (showRefreshing) setIsRefreshing(true);
    else if (!profile) setIsLoading(true);
    setError(null);

    try {
      const data = await authApi.getMe();
      setProfile(data);
    } catch (err: any) {
      console.error('Failed to load profile:', err);
      setError(err?.response?.data?.message || err?.response?.data?.error || 'Unable to retrieve user profile.');
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  };

  useEffect(() => {
    fetchProfile();
  }, []);

  const user = profile || authUser;
  const isManager = user?.role === 'MANAGER';

  const memberDate = user?.createdAt ? new Date(user.createdAt) : null;
  const updatedDate = user?.updatedAt ? new Date(user.updatedAt) : null;

  return (
    <div className="space-y-6 max-w-4xl">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-primary-950/5 border border-primary-950/10 flex items-center justify-center text-primary-900 shadow-sm">
            <UserIcon className="w-5 h-5" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-primary-950 tracking-tight">Profile</h1>
            <p className="text-xs text-primary-800/60 mt-0.5">
              Manage your StockSense account information.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2.5">
          <Button
            variant="secondary"
            size="sm"
            onClick={() => fetchProfile(true)}
            isLoading={isRefreshing}
            leftIcon={<RefreshCw className={`w-3.5 h-3.5 ${isRefreshing ? 'animate-spin' : ''}`} />}
          >
            Refresh
          </Button>

          <Button
            variant="secondary"
            size="sm"
            onClick={() => navigate('/settings')}
            leftIcon={<Settings className="w-3.5 h-3.5" />}
          >
            Settings
          </Button>

          <Button
            variant="danger"
            size="sm"
            onClick={logout}
            leftIcon={<LogOut className="w-3.5 h-3.5" />}
          >
            Logout
          </Button>
        </div>
      </div>

      {isLoading ? (
        <GlassCard className="p-6">
          <LoadingSkeleton lines={6} />
        </GlassCard>
      ) : error ? (
        <GlassCard className="p-8">
          <ErrorState
            title="Profile Error"
            message={error}
            onRetry={() => fetchProfile(true)}
          />
        </GlassCard>
      ) : user ? (
        <div className="space-y-6">
          {/* Main Profile Card */}
          <GlassCard className="p-6">
            <div className="flex flex-col sm:flex-row sm:items-center gap-6 pb-6 border-b border-primary-950/10">
              {/* Avatar Initials Badge */}
              <div className="w-20 h-20 rounded-2xl bg-primary-950 flex items-center justify-center text-ivory-100 text-3xl font-extrabold shadow-lg border border-primary-900 flex-shrink-0">
                {user.name ? user.name.charAt(0).toUpperCase() : 'U'}
              </div>

              {/* Name, Email & Role */}
              <div className="flex-1 space-y-2">
                <div className="flex items-center gap-3 flex-wrap">
                  <h2 className="text-xl font-bold text-primary-950 tracking-tight">{user.name}</h2>

                  {isManager ? (
                    <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold bg-amber-500/10 text-amber-800 border border-amber-500/25">
                      <ShieldCheck className="w-3.5 h-3.5 text-amber-700" />
                      <span>MANAGER</span>
                    </span>
                  ) : (
                    <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold bg-primary-950/10 text-primary-900 border border-primary-950/20">
                      <UserCheck className="w-3.5 h-3.5 text-primary-900" />
                      <span>STAFF</span>
                    </span>
                  )}

                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold bg-emerald-500/10 text-emerald-700 border border-emerald-500/20">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-600 animate-pulse" />
                    <span>Active Session</span>
                  </span>
                </div>

                <div className="flex items-center gap-2 text-xs text-primary-800/80">
                  <Mail className="w-4 h-4 text-primary-800/50" />
                  <span>{user.email}</span>
                </div>
              </div>
            </div>

            {/* Account Metadata Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-6">
              <div className="p-4 rounded-xl bg-ivory-100 border border-primary-950/10 space-y-1 shadow-sm">
                <span className="text-[10px] uppercase font-bold text-primary-800/60 tracking-wider flex items-center gap-1">
                  <Calendar className="w-3 h-3 text-primary-900" />
                  <span>Member Since</span>
                </span>
                <p className="text-sm font-semibold text-primary-950">
                  {memberDate
                    ? memberDate.toLocaleDateString(undefined, {
                        month: 'short',
                        day: 'numeric',
                        year: 'numeric',
                      })
                    : '—'}
                </p>
              </div>

              <div className="p-4 rounded-xl bg-ivory-100 border border-primary-950/10 space-y-1 shadow-sm">
                <span className="text-[10px] uppercase font-bold text-primary-800/60 tracking-wider flex items-center gap-1">
                  <Clock className="w-3 h-3 text-primary-900" />
                  <span>Last Updated</span>
                </span>
                <p className="text-sm font-semibold text-primary-950">
                  {updatedDate
                    ? updatedDate.toLocaleDateString(undefined, {
                        month: 'short',
                        day: 'numeric',
                        year: 'numeric',
                      })
                    : memberDate?.toLocaleDateString() || '—'}
                </p>
              </div>
            </div>
          </GlassCard>

          {/* Role & Permissions Info Card */}
          <GlassCard className="p-6 space-y-4">
            <div className="flex items-center gap-2 pb-3 border-b border-primary-950/10">
              <Shield className="w-4 h-4 text-primary-900" />
              <h3 className="text-sm font-bold text-primary-950 uppercase tracking-wider">
                Role & Permissions Overview
              </h3>
            </div>

            <div className="text-xs text-primary-800/80 space-y-3">
              <div className="p-3.5 rounded-xl bg-ivory-100 border border-primary-950/10 space-y-1.5 shadow-sm">
                <div className="font-semibold text-primary-950 flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-emerald-700" />
                  <span>Current Tier: {user.role}</span>
                </div>
                <p className="text-primary-800/70 text-xs leading-relaxed">
                  {isManager
                    ? 'As a Manager, you hold full administrative authority across StockSense. You can configure multi-warehouse facilities, manage storage location topologies, create and delete product categories, and oversee all inbound receipts, deliveries, internal transfers, and physical inventory adjustments.'
                    : 'As a Staff member, you hold operational inventory execution privileges. You can record and process receipts, manage deliveries, transfer inventory between locations, and perform inventory adjustments. Modifying physical facilities or deleting system catalog entries is restricted to managers.'}
                </p>
              </div>

              <div className="p-3 rounded-xl bg-primary-950/5 border border-primary-950/10 text-primary-900 text-xs flex items-center justify-between">
                <span>Account roles are centrally assigned and enforced by the backend API.</span>
                <span className="text-[10px] font-mono text-primary-800 uppercase font-semibold">Immutable Session</span>
              </div>
            </div>
          </GlassCard>
        </div>
      ) : null}
    </div>
  );
};

export default ProfilePage;
