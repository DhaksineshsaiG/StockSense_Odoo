import React from 'react';
import { Badge, BadgeVariant } from './Badge';

interface StatusBadgeProps {
  status: string;
  size?: 'sm' | 'md';
  className?: string;
}

export const StatusBadge: React.FC<StatusBadgeProps> = ({ status, size = 'sm', className = '' }) => {
  const normalized = (status || '').toUpperCase();

  let variant: BadgeVariant = 'default';
  let dotColor = 'bg-primary-400';

  switch (normalized) {
    case 'DONE':
    case 'COMPLETED':
      variant = 'success';
      dotColor = 'bg-emerald-500';
      break;
    case 'READY':
    case 'ASSIGNED':
      variant = 'info';
      dotColor = 'bg-primary-600';
      break;
    case 'WAITING':
    case 'CONFIRMED':
      variant = 'warning';
      dotColor = 'bg-amber-500';
      break;
    case 'DRAFT':
      variant = 'default';
      dotColor = 'bg-primary-400';
      break;
    case 'CANCELED':
    case 'CANCELLED':
      variant = 'danger';
      dotColor = 'bg-rose-500';
      break;
    default:
      variant = 'primary';
      dotColor = 'bg-primary-600';
  }

  return (
    <Badge variant={variant} size={size} className={className}>
      <span className={`w-1.5 h-1.5 rounded-full ${dotColor} mr-0.5`} />
      {normalized}
    </Badge>
  );
};
