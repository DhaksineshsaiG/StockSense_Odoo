import React from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';

interface PaginationProps {
  currentPage: number;
  totalPages: number;
  totalItems: number;
  pageSize: number;
  onPageChange: (page: number) => void;
  className?: string;
}

export const Pagination: React.FC<PaginationProps> = ({
  currentPage,
  totalPages,
  totalItems,
  pageSize,
  onPageChange,
  className = '',
}) => {
  if (totalItems <= 0 || totalPages <= 1) return null;

  const startItem = (currentPage - 1) * pageSize + 1;
  const endItem = Math.min(currentPage * pageSize, totalItems);

  return (
    <div
      className={`flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-4 border-t border-primary-950/6 text-xs text-primary-800/50 ${className}`}
    >
      <div>
        Showing <span className="font-semibold text-primary-900">{startItem}</span> to{' '}
        <span className="font-semibold text-primary-900">{endItem}</span> of{' '}
        <span className="font-semibold text-primary-900">{totalItems}</span> items
      </div>

      <div className="flex items-center gap-1.5 self-center sm:self-auto">
        <button
          type="button"
          disabled={currentPage <= 1}
          onClick={() => onPageChange(currentPage - 1)}
          className="p-1.5 rounded-lg border border-primary-950/10 text-primary-800/50 hover:text-primary-950 hover:bg-primary-950/[0.04] disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
          aria-label="Previous page"
        >
          <ChevronLeft className="w-4 h-4" />
        </button>

        <span className="px-3 py-1 rounded-lg bg-primary-950/[0.03] border border-primary-950/8 text-primary-900 font-medium">
          Page {currentPage} of {totalPages}
        </span>

        <button
          type="button"
          disabled={currentPage >= totalPages}
          onClick={() => onPageChange(currentPage + 1)}
          className="p-1.5 rounded-lg border border-primary-950/10 text-primary-800/50 hover:text-primary-950 hover:bg-primary-950/[0.04] disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
          aria-label="Next page"
        >
          <ChevronRight className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
};
