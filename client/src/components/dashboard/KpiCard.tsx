import React from 'react';
import { GlassCard } from '../common/GlassCard';

interface KpiCardProps {
  title: string;
  value: number | string;
  subtitle?: string;
  icon: React.ReactNode;
  glow?: 'none' | 'primary' | 'amber' | 'emerald' | 'rose';
  trend?: {
    label: string;
    isPositive?: boolean;
  };
  onClick?: () => void;
}

export const KpiCard: React.FC<KpiCardProps> = ({
  title,
  value,
  subtitle,
  icon,
  glow = 'primary',
  trend,
  onClick,
}) => {
  const iconBgStyles = {
    none: 'bg-primary-950/5 text-primary-800 border-primary-950/10',
    primary: 'bg-primary-950/10 text-primary-900 border-primary-950/15',
    amber: 'bg-amber-500/10 text-amber-700 border-amber-500/20',
    emerald: 'bg-emerald-500/10 text-emerald-700 border-emerald-500/20',
    rose: 'bg-rose-500/10 text-rose-700 border-rose-500/20',
  };

  return (
    <GlassCard
      glow={glow}
      onClick={onClick}
      className={`relative overflow-hidden group transition-all duration-200 ${
        onClick ? 'cursor-pointer hover:-translate-y-0.5' : ''
      }`}
    >
      <div className="flex items-start justify-between">
        <div>
          <p className="text-xs font-semibold text-primary-800/60 uppercase tracking-wider">{title}</p>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-2xl sm:text-3xl font-black text-primary-950 tracking-tight">
              {typeof value === 'number' ? value.toLocaleString() : value}
            </span>
            {subtitle && (
              <span className="text-xs text-primary-800/60 font-medium">{subtitle}</span>
            )}
          </div>
        </div>

        <div
          className={`w-11 h-11 rounded-xl flex items-center justify-center border shadow-sm group-hover:scale-110 transition-transform ${iconBgStyles[glow]}`}
        >
          {icon}
        </div>
      </div>

      {trend && (
        <div className="mt-3 pt-3 border-t border-primary-950/8 flex items-center gap-1.5 text-xs text-primary-800/60">
          <span
            className={`font-semibold ${
              trend.isPositive ? 'text-emerald-700' : 'text-amber-700'
            }`}
          >
            {trend.label}
          </span>
        </div>
      )}
    </GlassCard>
  );
};
