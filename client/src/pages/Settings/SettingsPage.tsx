import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import {
  Settings as SettingsIcon,
  User as UserIcon,
  ShieldCheck,
  UserCheck,
  LogOut,
  FileText,
  Lock,
  ArrowRight,
} from 'lucide-react';

import { GlassCard } from '../../components/common/GlassCard';
import { Button } from '../../components/common/Button';
import { Badge } from '../../components/common/Badge';
import { useAuth } from '../../contexts/AuthContext';

export const SettingsPage: React.FC = () => {
  const navigate = useNavigate();
  const { user, logout } = useAuth();
  const [isLoggingOut, setIsLoggingOut] = useState(false);

  const handleLogout = async () => {
    setIsLoggingOut(true);
    try {
      logout();
      navigate('/login');
    } catch (err) {
      console.error('Logout error:', err);
      setIsLoggingOut(false);
    }
  };

  const isManager = user?.role === 'MANAGER';

  return (
    <div className="space-y-6 max-w-4xl">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-primary-950/10 border border-primary-950/15 flex items-center justify-center text-primary-900 shadow-sm">
            <SettingsIcon className="w-5 h-5" />
          </div>
          <div>
            <h1 className="text-2xl font-bold font-serif text-primary-950 tracking-tight">Settings</h1>
            <p className="text-xs text-primary-950/60 mt-0.5">
              System preferences, connected databases, and active session controls.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2.5">
          <Button
            variant="secondary"
            size="sm"
            onClick={() => navigate('/profile')}
            leftIcon={<UserIcon className="w-3.5 h-3.5" />}
          >
            My Profile
          </Button>
          <Button
            variant="danger"
            size="sm"
            onClick={handleLogout}
            isLoading={isLoggingOut}
            leftIcon={<LogOut className="w-3.5 h-3.5" />}
          >
            Logout
          </Button>
        </div>
      </div>

      <div className="space-y-6">
        {/* Account Overview Card */}
        <GlassCard className="p-6 space-y-5">
          <div className="flex items-center justify-between pb-4 border-b border-primary-950/10">
            <div className="flex items-center gap-2.5">
              <UserIcon className="w-4 h-4 text-primary-900" />
              <h2 className="text-xs font-bold font-serif text-primary-950 uppercase tracking-wider">
                Account Information
              </h2>
            </div>
            <Link
              to="/profile"
              className="text-xs text-primary-900 hover:text-primary-800 font-medium inline-flex items-center gap-1 group transition-colors"
            >
              <span>View Full Profile</span>
              <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-0.5 transition-transform" />
            </Link>
          </div>

          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-4 rounded-xl bg-ivory-50/70 border border-primary-950/10">
            <div className="flex items-center gap-3.5">
              <div className="w-12 h-12 rounded-xl bg-primary-950 text-ivory-100 flex items-center justify-center text-lg font-bold shadow-md shadow-primary-950/20 border border-primary-900 font-serif">
                {user?.name ? user.name.charAt(0).toUpperCase() : 'U'}
              </div>
              <div>
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="text-base font-bold text-primary-950">{user?.name || 'StockSense User'}</span>
                  {isManager ? (
                    <Badge variant="warning" size="sm">
                      <ShieldCheck className="w-3 h-3 text-amber-700 mr-0.5" />
                      MANAGER
                    </Badge>
                  ) : (
                    <Badge variant="info" size="sm">
                      <UserCheck className="w-3 h-3 text-primary-800 mr-0.5" />
                      STAFF
                    </Badge>
                  )}
                </div>
                <p className="text-xs text-primary-950/60 mt-0.5">{user?.email}</p>
              </div>
            </div>

            <div className="flex sm:flex-col sm:items-end justify-between items-center text-xs">
              <span className="text-primary-950/50 text-[11px]">Role Permission</span>
              <span className="font-semibold text-primary-950 mt-0.5">
                {isManager ? 'Full System Admin' : 'Warehouse Operator'}
              </span>
            </div>
          </div>

          <div className="p-3.5 rounded-xl bg-primary-950/5 border border-primary-950/10 text-xs text-primary-950/70 flex items-start gap-2.5">
            <Lock className="w-4 h-4 text-primary-900 flex-shrink-0 mt-0.5" />
            <div>
              <span className="font-semibold text-primary-950">Server-Enforced Access: </span>
              User role and privilege assignments are managed strictly by backend authentication services. To alter permissions, please contact your organization administrator.
            </div>
          </div>
        </GlassCard>

        {/* Operational Sequence Formats */}
        <GlassCard className="p-6 space-y-5">
          <div className="flex items-center gap-2.5 pb-4 border-b border-primary-950/10">
            <FileText className="w-4 h-4 text-primary-900" />
            <h2 className="text-xs font-bold font-serif text-primary-950 uppercase tracking-wider">
              Operational Sequences
            </h2>
          </div>

          <p className="text-xs text-primary-950/65">
            StockSense automatically assigns distinct chronological reference numbers to all inventory movements using the configured sequence patterns below:
          </p>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
            <div className="p-3.5 rounded-xl bg-ivory-50/70 border border-primary-950/10 space-y-1">
              <div className="flex items-center justify-between text-xs">
                <span className="text-primary-950/60 font-medium">Receipts (Incoming)</span>
                <span className="text-[10px] font-semibold text-emerald-800 uppercase bg-emerald-100/70 px-1.5 py-0.5 rounded border border-emerald-300/40">Active</span>
              </div>
              <div className="text-sm font-mono font-semibold text-primary-950">REC-YYYYMM-XXXX</div>
            </div>

            <div className="p-3.5 rounded-xl bg-ivory-50/70 border border-primary-950/10 space-y-1">
              <div className="flex items-center justify-between text-xs">
                <span className="text-primary-950/60 font-medium">Delivery Orders (Outgoing)</span>
                <span className="text-[10px] font-semibold text-primary-900 uppercase bg-primary-950/10 px-1.5 py-0.5 rounded border border-primary-950/20">Active</span>
              </div>
              <div className="text-sm font-mono font-semibold text-primary-950">DEL-YYYYMM-XXXX</div>
            </div>

            <div className="p-3.5 rounded-xl bg-ivory-50/70 border border-primary-950/10 space-y-1">
              <div className="flex items-center justify-between text-xs">
                <span className="text-primary-950/60 font-medium">Internal Transfers</span>
                <span className="text-[10px] font-semibold text-primary-900 uppercase bg-primary-950/10 px-1.5 py-0.5 rounded border border-primary-950/20">Active</span>
              </div>
              <div className="text-sm font-mono font-semibold text-primary-950">INT-YYYYMM-XXXX</div>
            </div>

            <div className="p-3.5 rounded-xl bg-ivory-50/70 border border-primary-950/10 space-y-1">
              <div className="flex items-center justify-between text-xs">
                <span className="text-primary-950/60 font-medium">Inventory Adjustments</span>
                <span className="text-[10px] font-semibold text-amber-800 uppercase bg-amber-100/70 px-1.5 py-0.5 rounded border border-amber-300/40">Active</span>
              </div>
              <div className="text-sm font-mono font-semibold text-primary-950">ADJ-YYYYMM-XXXX</div>
            </div>
          </div>
        </GlassCard>
      </div>
    </div>
  );
};

export default SettingsPage;
