import React from 'react';
import { StatusBadge } from '../common/StatusBadge';
import { OperationStatus } from '../../types';

interface OperationStatusBadgeProps {
  status: OperationStatus | string;
  size?: 'sm' | 'md';
  className?: string;
}

export const OperationStatusBadge: React.FC<OperationStatusBadgeProps> = ({
  status,
  size = 'sm',
  className = '',
}) => {
  return <StatusBadge status={status} size={size} className={className} />;
};

export default OperationStatusBadge;
