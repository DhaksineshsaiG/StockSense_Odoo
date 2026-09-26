import React from 'react';

export const Skeleton: React.FC<{ className?: string }> = ({ className = '' }) => (
  <div className={`shimmer rounded bg-primary-950/[0.04] ${className}`} />
);

export const KpiCardSkeleton: React.FC = () => (
  <div className="glass-card p-6 flex flex-col justify-between">
    <div className="flex items-center justify-between">
      <Skeleton className="h-4 w-28" />
      <Skeleton className="h-10 w-10 rounded-xl" />
    </div>
    <div className="mt-4">
      <Skeleton className="h-8 w-20" />
      <Skeleton className="h-3 w-36 mt-2" />
    </div>
  </div>
);

export const TableRowSkeleton: React.FC<{ columns?: number }> = ({ columns = 5 }) => (
  <tr className="border-b border-primary-950/5">
    {Array.from({ length: columns }).map((_, idx) => (
      <td key={idx} className="py-3 px-4">
        <Skeleton className="h-4 w-full max-w-[120px]" />
      </td>
    ))}
  </tr>
);

export const LoadingSkeleton: React.FC<{ lines?: number; className?: string }> = ({
  lines = 3,
  className = '',
}) => (
  <div className={`space-y-2.5 ${className}`}>
    {Array.from({ length: lines }).map((_, i) => (
      <Skeleton key={i} className="h-4 w-full" />
    ))}
  </div>
);
