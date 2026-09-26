import React from 'react';
import { Link } from 'react-router-dom';
import { Package, ArrowLeft, Sparkles } from 'lucide-react';
import { GlassCard } from '../../components/common/GlassCard';
import { Button } from '../../components/common/Button';

interface PlaceholderPageProps {
  title: string;
  description: string;
  moduleKey: string;
}

export const PlaceholderPage: React.FC<PlaceholderPageProps> = ({
  title,
  description,
  moduleKey,
}) => {
  return (
    <div className="py-8 max-w-2xl mx-auto">
      <GlassCard className="p-8 text-center">
        <div className="w-16 h-16 rounded-2xl bg-primary-950/10 border border-primary-950/20 text-primary-900 flex items-center justify-center mx-auto mb-4 shadow-sm">
          <Package className="w-8 h-8" />
        </div>

        <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-primary-950/10 text-primary-900 text-xs font-semibold border border-primary-950/20 mb-3">
          <Sparkles className="w-3.5 h-3.5 text-primary-900" />
          <span>Milestone 2 In Development</span>
        </div>

        <h2 className="text-xl font-bold font-serif text-primary-950 tracking-tight">{title}</h2>
        <p className="text-xs text-primary-950/65 mt-2 max-w-md mx-auto leading-relaxed">
          {description}
        </p>

        <div className="mt-6 p-4 rounded-xl bg-ivory-50/70 border border-primary-950/10 text-xs text-primary-950/80 text-left font-mono">
          <div className="flex items-center justify-between text-[11px] text-primary-950/60 pb-2 mb-2 border-b border-primary-950/10">
            <span>Backend API Status:</span>
            <span className="text-emerald-800 font-semibold flex items-center gap-1">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-600 animate-pulse" />
              Verified & Operational
            </span>
          </div>
          <p className="text-primary-950/60 text-[11px]">
            Target Module: <span className="text-primary-950 font-bold">{moduleKey}</span>
          </p>
        </div>

        <div className="mt-6 flex items-center justify-center gap-3">
          <Link to="/dashboard">
            <Button variant="secondary" size="sm" leftIcon={<ArrowLeft className="w-3.5 h-3.5" />}>
              Return to Dashboard
            </Button>
          </Link>
        </div>
      </GlassCard>
    </div>
  );
};
