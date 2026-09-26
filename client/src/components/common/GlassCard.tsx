import React from 'react';

interface GlassCardProps extends React.HTMLAttributes<HTMLDivElement> {
  children: React.ReactNode;
  variant?: 'default' | 'dense' | 'interactive';
  glow?: 'none' | 'primary' | 'amber' | 'emerald' | 'rose';
  className?: string;
}

export const GlassCard: React.FC<GlassCardProps> = ({
  children,
  variant = 'default',
  glow = 'none',
  className = '',
  ...props
}) => {
  const glowStyles = {
    none: '',
    primary: 'hover:border-primary-300/30 hover:shadow-[0_8px_30px_rgba(74,14,26,0.08)]',
    amber: 'hover:border-amber-300/30 hover:shadow-[0_8px_30px_rgba(217,146,0,0.06)]',
    emerald: 'hover:border-emerald-300/30 hover:shadow-[0_8px_30px_rgba(16,185,129,0.06)]',
    rose: 'hover:border-rose-300/30 hover:shadow-[0_8px_30px_rgba(225,29,72,0.06)]',
  };

  const paddingStyle = variant === 'dense' ? 'p-4' : 'p-6';

  return (
    <div
      className={`glass-card ${paddingStyle} ${glowStyles[glow]} ${className}`}
      {...props}
    >
      {children}
    </div>
  );
};
